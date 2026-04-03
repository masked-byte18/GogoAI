const { Server } = require("socket.io");
const cookie = require("cookie");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user.model");
const chatModel = require("../models/chat.model");
const aiService = require("../services/ai.service");
const messageModel = require("../models/message.model");
const { botModel } = require("../models/bot.model");
const { createMemory, queryMemory } = require("../services/vector.service");

const socketAbortControllers = new Map();
const socketCancelledRequests = new Map();

function buildRequestKey(chatId, messageId) {
  return `${String(chatId)}:${String(messageId)}`;
}

function isAbortError(error) {
  return error?.name === "AbortError" || error?.code === "ABORT_ERR";
}

function buildBotSystemInstruction(bot) {
  if (!bot) {
    return undefined;
  }

  const knowledgeLines = (bot.knowledgeFiles || [])
    .map((file, index) => {
      const fileName = String(file?.name || '').trim();
      const fileType = String(file?.type || '').trim();
      const fileUrl = String(file?.url || '').trim();

      if (!fileName && !fileType && !fileUrl) {
        return null;
      }

      return `${index + 1}. name: ${fileName || 'unknown'}, type: ${fileType || 'unknown'}, url: ${fileUrl || 'n/a'}`;
    })
    .filter(Boolean)
    .join("\n");

  return [
    "You are a custom bot configured by the user.",
    "Follow this bot profile strictly while answering.",
    "",
    `Bot Name: ${String(bot.name || '').trim() || 'Unnamed Bot'}`,
    `Bot Description: ${String(bot.description || '').trim() || 'No description provided.'}`,
    `Bot Instructions: ${String(bot.instructions || '').trim() || 'No special instructions provided.'}`,
    `Memory Enabled: ${bot.memoryEnabled ? 'true' : 'false'}`,
    "",
    "Knowledge Files:",
    knowledgeLines || "No files attached.",
    "",
    "Formatting style:",
    "1. Keep responses clean, readable, and practical.",
    "2. Do not use asterisk-based markdown formatting.",
    "3. Do not use hashtag headings.",
    "4. Prefer short sections, numbered points, and clear spacing.",
    "5. Avoid decorative formatting and walls of text.",
    "",
    "Response rules:",
    "1. Prioritize bot instructions and description while answering.",
    "2. Use attached knowledge file metadata context when relevant.",
    "3. If knowledge content is not directly available, be transparent and avoid inventing file contents.",
    "4. Keep answers aligned with this bot identity and purpose."
  ].join("\n");
}

function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors:{
      origin:'http://localhost:5173',
      allowedHeaders: ["Content-Type","Authorization"],
      credentials:true
    }
  });

  io.use(async (socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers?.cookie || "");

    console.log("Socket connection cookies:", cookies);

    if (!cookies.token) {
      return next(new Error("Authentication error: No token provided"));
    }
    try {
      const decoded = jwt.verify(cookies.token, process.env.JWT_SECRET);
      const user = await userModel.findById(decoded.id);
      socket.user = user;

      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    socketAbortControllers.set(socket.id, new Map());
    socketCancelledRequests.set(socket.id, new Set());

    socket.on("stop-ai", (payload) => {
      const fallbackKey =
        payload?.chat && payload?.messageId != null
          ? (String(payload.chat).startsWith('draft-')
              ? `draft:${socket.id}:${String(payload.messageId)}`
              : buildRequestKey(payload.chat, payload.messageId))
          : null;

      const requestKey = String(payload?.requestKey || '').trim() || fallbackKey;

      if (!requestKey) {
        return;
      }

      const controllers = socketAbortControllers.get(socket.id);
      const cancelledRequests = socketCancelledRequests.get(socket.id);
      cancelledRequests?.add(requestKey);
      const controller = controllers?.get(requestKey);

      if (controller) {
        controller.abort();
        controllers.delete(requestKey);
      }
    });

    socket.on("ai-message", async (messagePayload) => {
      let requestKey = null;
      try {
        const isDraftRequest = Boolean(messagePayload?.draft);

        if (
          !messagePayload ||
          messagePayload.messageId == null ||
          typeof messagePayload.content !== "string" ||
          !messagePayload.content.trim()
        ) {
          socket.emit("ai-error", {
            message: "Invalid payload: 'content' must be a non-empty string",
          });
          return;
        }

        if (!isDraftRequest && !messagePayload.chat) {
          socket.emit("ai-error", {
            message: "Invalid payload: 'chat' is required",
          });
          return;
        }

        requestKey = isDraftRequest
          ? `draft:${socket.id}:${String(messagePayload.messageId)}`
          : buildRequestKey(messagePayload.chat, messagePayload.messageId);
        const controllers = socketAbortControllers.get(socket.id);
        const cancelledRequests = socketCancelledRequests.get(socket.id);
        const requestAbortController = new AbortController();
        controllers?.set(requestKey, requestAbortController);

        const shouldStop = () =>
          Boolean(
            requestAbortController.signal.aborted || cancelledRequests?.has(requestKey)
          );

        if (shouldStop()) {
          requestAbortController.abort();
          return;
        }

        const trimmedContent = messagePayload.content.trim();

        if (isDraftRequest) {
          let botId = null;
          let botDoc = null;

          if (messagePayload.botId) {
            botDoc = await botModel
              .findOne({ _id: messagePayload.botId, user: socket.user._id })
              .lean();

            if (!botDoc) {
              socket.emit("ai-error", { message: "Bot not found" });
              return;
            }

            botId = botDoc._id;
          }

          const isMemoryEnabled = botDoc ? Boolean(botDoc.memoryEnabled) : true;
          const resolvedSystemInstruction = buildBotSystemInstruction(botDoc || null);

          const vectors = isMemoryEnabled
            ? await aiService.generateVector(trimmedContent, {
                signal: requestAbortController.signal,
              })
            : null;

          if (isMemoryEnabled && shouldStop()) {
            return;
          }

          const response = await aiService.generateResponse(
            [
              {
                role: "user",
                parts: [{ text: trimmedContent }],
              },
            ],
            {
              signal: requestAbortController.signal,
              systemInstruction: resolvedSystemInstruction || undefined,
            }
          );

          if (shouldStop()) {
            return;
          }

          const responseVectors = isMemoryEnabled
            ? await aiService.generateVector(response, {
                signal: requestAbortController.signal,
              })
            : null;

          if (isMemoryEnabled && shouldStop()) {
            return;
          }

          const chatTitle = String(messagePayload?.draftTitle || "").trim() || "New Chat";
          const committedChat = await chatModel.create({
            user: socket.user._id,
            title: chatTitle,
            bot: botId,
            aiResponseCount: 1,
          });

          const [userMessage, responseMessage] = await Promise.all([
            messageModel.create({
              chat: committedChat._id,
              user: socket.user._id,
              bot: botId,
              content: trimmedContent,
              role: "user",
              memoryEnabledSnapshot: isMemoryEnabled,
            }),
            messageModel.create({
              chat: committedChat._id,
              user: socket.user._id,
              bot: botId,
              content: response,
              role: "model",
              memoryEnabledSnapshot: isMemoryEnabled,
            }),
          ]);

          if (isMemoryEnabled) {
            await Promise.all([
              createMemory({
                vectors,
                messageId: userMessage._id,
                metadata: {
                  chat: String(committedChat._id),
                  user: String(socket.user._id),
                  bot: botId ? String(botId) : '',
                  text: trimmedContent,
                },
              }),
              createMemory({
                vectors: responseVectors,
                messageId: responseMessage._id,
                metadata: {
                  chat: String(committedChat._id),
                  user: String(socket.user._id),
                  bot: botId ? String(botId) : '',
                  text: response,
                },
              }),
            ]);
          }

          socket.emit("ai-response", {
            chat: committedChat._id,
            content: response,
            draftCommitted: true,
          });

          return;
        }

        const chatDoc = await chatModel
          .findOne({ _id: messagePayload.chat, user: socket.user._id })
          .populate('bot', 'name description instructions knowledgeFiles memoryEnabled')
          .lean();

        if (!chatDoc) {
          socket.emit("ai-error", { message: "Chat not found" });
          return;
        }

        const botId = chatDoc?.bot?._id || null;
        const botContextSystemInstruction = buildBotSystemInstruction(chatDoc?.bot || null);
        const isMemoryEnabled = chatDoc?.bot ? Boolean(chatDoc.bot.memoryEnabled) : true;
        const resolvedSystemInstruction = botContextSystemInstruction || undefined;

        const vectors = isMemoryEnabled
          ? await aiService.generateVector(trimmedContent, {
              signal: requestAbortController.signal,
            })
          : null;

        if (isMemoryEnabled && shouldStop()) {
          return;
        }

        const memoryPromise = isMemoryEnabled
          ? queryMemory({
              queryVector: vectors,
              limit: 5,
              metadata: {
                user: String(socket.user._id),
                chat: String(messagePayload.chat),
                bot: botId ? String(botId) : ''
              }
            })
          : Promise.resolve([]);

        const [memory, chatHistory] = await Promise.all([
          memoryPromise,
          messageModel
            .find({ chat: messagePayload.chat })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean(),
        ]);

        const stm = chatHistory
          .map((item) => ({
            role: item.role,
            parts: [{ text: item.content }],
          }))
          .reverse();

        stm.push({
          role: "user",
          parts: [{ text: trimmedContent }],
        });

        const ltm = [
          {
            role: "user",
            parts: [
              {
                text: `These are some previous messages from the chat, use them to generate a response
                ${memory.map((item) => item.metadata.text).filter(Boolean).join("\n")}`,
              },
            ],
          },
        ];

        const response = await aiService.generateResponse([...ltm, ...stm], {
          signal: requestAbortController.signal,
          systemInstruction: resolvedSystemInstruction || undefined
        });

        if (shouldStop()) {
          return;
        }

        const data = {
          chat: messagePayload.chat,
          content: response,
        };
        socket.emit("ai-response", data);

        if (shouldStop()) {
          return;
        }

        const responseVectors = isMemoryEnabled
          ? await aiService.generateVector(response, {
              signal: requestAbortController.signal,
            })
          : null;

        if (isMemoryEnabled && shouldStop()) {
          return;
        }

        await chatModel.findByIdAndUpdate(messagePayload.chat, {
          lastActivity: new Date(),
          $inc: { aiResponseCount: 1 },
        });

        const [userMessage, responseMessage] = await Promise.all([
          messageModel.create({
            chat: messagePayload.chat,
            user: socket.user._id,
            bot: botId,
            content: trimmedContent,
            role: "user",
            memoryEnabledSnapshot: isMemoryEnabled,
          }),
          messageModel.create({
            chat: messagePayload.chat,
            user: socket.user._id,
            bot: botId,
            content: response,
            role: "model",
            memoryEnabledSnapshot: isMemoryEnabled,
          }),
        ]);

        if (isMemoryEnabled) {
          await Promise.all([
            createMemory({
              vectors,
              messageId: userMessage._id,
              metadata: {
                chat: String(messagePayload.chat),
                user: String(socket.user._id),
                bot: botId ? String(botId) : '',
                text: trimmedContent,
              },
            }),
            createMemory({
              vectors: responseVectors,
              messageId: responseMessage._id,
              metadata: {
                chat: String(messagePayload.chat),
                user: String(socket.user._id),
                bot: botId ? String(botId) : '',
                text: response,
              },
            }),
          ]);
        }

      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        console.error("Error in ai-message handler:", error.message || error);
        socket.emit("ai-error", { message: "Failed to process AI message" });
      } finally {
        if (requestKey) {
          const controllers = socketAbortControllers.get(socket.id);
          controllers?.delete(requestKey);
          const cancelledRequests = socketCancelledRequests.get(socket.id);
          cancelledRequests?.delete(requestKey);
        }
      }
    });

    socket.on("disconnect", () => {
      const controllers = socketAbortControllers.get(socket.id);
      if (controllers) {
        controllers.forEach((controller) => controller.abort());
      }
      socketAbortControllers.delete(socket.id);
      socketCancelledRequests.delete(socket.id);
    });
  });
}

module.exports = initSocketServer;
