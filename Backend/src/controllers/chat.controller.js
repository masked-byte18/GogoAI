const chatModel = require("../models/chat.model");
const messageModel = require("../models/message.model");
const { botModel } = require("../models/bot.model");
const aiService = require("../services/ai.service");

const guestAbortControllers = new Map();
const cancelledGuestRequestIds = new Set();

function isAbortError(error) {
    return error?.name === 'AbortError' || error?.code === 'ABORT_ERR';
}

async function createChat(req,res){
    const { title, botId } = req.body;
    const user = req.user;

    let resolvedBotId = null;
    if (botId) {
        const bot = await botModel.findOne({ _id: botId, user: user._id }).lean();
        if (!bot) {
            return res.status(404).json({ message: 'Bot not found for current user' });
        }

        resolvedBotId = bot._id;
    }


    const chat = await chatModel.create({
        user:user._id,
        title,
        bot: resolvedBotId
    });

    res.status(201).json({
        message: "Chat created successfully",
        chat: {
            _id: chat._id,
            title: chat.title,
            lastActivity: chat.lastActivity,
            user: chat.user,
            bot: chat.bot
        }
    })
}

async function getChats(req,res){
    const user = req.user;

    // First pass: identify disabled-memory chats for this user.
    const currentChats = await chatModel
        .find({ user: user._id })
        .populate('bot', 'memoryEnabled')
        .select('_id bot')
        .lean();

    const disabledChatIds = currentChats
        .filter((chat) => {
            const bot = chat?.bot;
            return bot && typeof bot === 'object' && bot.memoryEnabled === false;
        })
        .map((chat) => chat._id);

    if (disabledChatIds.length > 0) {
        // Remove messages written while memory was disabled.
        await messageModel.deleteMany({
            chat: { $in: disabledChatIds },
            memoryEnabledSnapshot: false
        });

        // If a disabled chat has zero AI/model replies after cleanup, delete the whole chat.
        const disabledChatsWithAi = await messageModel.distinct('chat', {
            chat: { $in: disabledChatIds },
            role: 'model'
        });

        const keepSet = new Set(disabledChatsWithAi.map((id) => String(id)));
        const deleteChatIds = disabledChatIds.filter((id) => !keepSet.has(String(id)));

        if (deleteChatIds.length > 0) {
            await Promise.all([
                chatModel.deleteMany({ _id: { $in: deleteChatIds }, user: user._id }),
                messageModel.deleteMany({ chat: { $in: deleteChatIds } })
            ]);
        }
    }

    const chats = await chatModel
        .find({user: user._id})
        .populate('bot', 'name avatarUrl avatarBackground visibility memoryEnabled')
        .sort({ lastActivity: -1, updatedAt: -1, createdAt: -1 });

    res.status(200).json({
        message:"Chats retrieved successfully",
        chats: chats.map(chat=>({
            _id:chat._id,
            title:chat.title,
            lastActivity:chat.lastActivity,
            user: chat.user,
            bot: chat.bot,
            aiResponseCount: Number(chat.aiResponseCount || 0)
        }))
    });
}

async function getMessages(req,res){
    const chatId = req.params.id;
    const messages = await messageModel.find({chat: chatId}).sort({createdAt: -1});

    res.status(200).json({
        message: "Messages retrieved successfully",
        messages: messages
    })
}

async function updateChatTitle(req, res) {
    const chatId = req.params.id;
    const user = req.user;
    const title = (req.body?.title || '').trim();

    if (!title) {
        return res.status(400).json({ message: 'Title is required' });
    }

    const chat = await chatModel.findOne({ _id: chatId, user: user._id });

    if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
    }

    chat.title = title;
    await chat.save();

    res.status(200).json({
        message: 'Chat title updated successfully',
        chat: {
            _id: chat._id,
            title: chat.title,
            lastActivity: chat.lastActivity,
            user: chat.user,
            bot: chat.bot
        }
    });
}

async function deleteChat(req, res) {
    const chatId = req.params.id;
    const user = req.user;

    const chat = await chatModel.findOne({ _id: chatId, user: user._id });

    if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
    }

    await Promise.all([
        chatModel.deleteOne({ _id: chatId, user: user._id }),
        messageModel.deleteMany({ chat: chatId })
    ]);

    res.status(200).json({
        message: 'Chat deleted successfully',
        chatId
    });
}

async function generateGuestResponse(req, res) {
    const content = String(req.body?.content || '').trim();
    const requestId = String(req.body?.requestId || '').trim() || null;

    if (!content) {
        return res.status(400).json({ message: 'content is required' });
    }

    if (requestId && cancelledGuestRequestIds.has(requestId)) {
        cancelledGuestRequestIds.delete(requestId);
        return res.status(499).json({ message: 'Guest response cancelled' });
    }

    const abortController = new AbortController();
    if (requestId) {
        guestAbortControllers.set(requestId, abortController);
    }

    if (requestId && cancelledGuestRequestIds.has(requestId)) {
        abortController.abort();
    }

    let response;
    try {
        response = await aiService.generateResponse([
            {
                role: 'user',
                parts: [{ text: content }]
            }
        ], {
            signal: abortController.signal
        });
    } catch (error) {
        if (isAbortError(error)) {
            return res.status(499).json({ message: 'Guest response cancelled' });
        }

        console.error('Guest response generation failed:', error);
        return res.status(500).json({ message: 'Failed to generate guest response' });
    } finally {
        if (requestId) {
            guestAbortControllers.delete(requestId);
            cancelledGuestRequestIds.delete(requestId);
        }
    }

    res.status(200).json({
        message: 'Guest response generated successfully',
        content: response
    });
}

async function cancelGuestResponse(req, res) {
    const requestId = String(req.body?.requestId || '').trim();

    if (!requestId) {
        return res.status(400).json({ message: 'requestId is required' });
    }

    const controller = guestAbortControllers.get(requestId);
    cancelledGuestRequestIds.add(requestId);

    setTimeout(() => {
        cancelledGuestRequestIds.delete(requestId);
    }, 60 * 1000);

    if (controller) {
        controller.abort();
        guestAbortControllers.delete(requestId);
    }

    res.status(200).json({
        message: 'Guest response cancellation requested',
        requestId
    });
}

module.exports ={
    createChat,getChats,getMessages,updateChatTitle,deleteChat,generateGuestResponse,cancelGuestResponse
}