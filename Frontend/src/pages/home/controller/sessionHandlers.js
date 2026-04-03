import { io } from 'socket.io-client';
import { logoutRequest } from '../../../services/authApi';
import {
  fetchChatMessagesRequest,
  fetchChatsRequest,
  updateChatTitleRequest
} from '../../../services/chatApi';
import {
  addMessage,
  createChat,
  renameChat,
  setChatMessages,
  setChats,
  setCurrentChat
} from '../../../store/chatSlice';
import { generateChatTitleFromResponse, normalizeFetchedMessages } from '../chatHelpers';

export const bootstrapAuthenticatedSession = async ({
  dispatch,
  preferredChatId,
  setIsAuthenticated,
  setSocket,
  setIsDraftChatActive,
  setDraftMessages,
  setThinkingChatId,
  setIsDraftResponding,
  ignoreNextAiResponseRef,
  pendingPromptRef,
  onSocketReady,
  isDisposedRef
}) => {
  try {
    // Start in New Chat mode by default; only route chat id should switch to chat view.
    setIsDraftChatActive(true);
    setDraftMessages([]);

    const fetchedChats = await fetchChatsRequest();

    if (isDisposedRef.current) {
      return null;
    }

    setIsAuthenticated(true);
    dispatch(setChats(fetchedChats));

    const chatList = Array.isArray(fetchedChats) ? fetchedChats : [];
    const targetChat = preferredChatId
      ? chatList.find((chat) => String(chat.id ?? chat._id) === String(preferredChatId))
      : null;

    if (targetChat?.id || targetChat?._id) {
      const targetChatId = targetChat.id ?? targetChat._id;
      dispatch(setCurrentChat(targetChatId));
      setIsDraftChatActive(false);
      setDraftMessages([]);

      try {
        const fetchedMessages = await fetchChatMessagesRequest(targetChatId);
        const normalizedMessages = normalizeFetchedMessages(fetchedMessages);
        dispatch(setChatMessages({ chatId: targetChatId, messages: normalizedMessages }));
      } catch (error) {
        console.error('Fetch recent chat messages failed:', error);
      }
    } else {
      // No chat id in URL (or id not found): keep app in New Chat interface.
      setIsDraftChatActive(true);
      setDraftMessages([]);
    }

    const tempSocket = io('http://localhost:3000', {
      withCredentials: true
    });

    setSocket(tempSocket);

    tempSocket.on('ai-response', (message) => {
      if (ignoreNextAiResponseRef.current) {
        ignoreNextAiResponseRef.current = false;
        pendingPromptRef.current = null;
        setThinkingChatId(null);
        setIsDraftResponding(false);
        return;
      }

      const pendingPrompt = pendingPromptRef.current;
      pendingPromptRef.current = null;
      setThinkingChatId(null);
      setIsDraftResponding(false);

      if (pendingPrompt?.draft) {
        const committedChatId = message.chat;
        if (!committedChatId) {
          return;
        }

        dispatch(
          createChat({
            chatId: committedChatId,
            initialMessage: {
              id: pendingPrompt.messageId,
              sender: 'user',
              text: pendingPrompt.text,
              feedback: null
            }
          })
        );

        setIsDraftChatActive(false);
        setDraftMessages([]);
      }

      const aiBasedTitle = generateChatTitleFromResponse(message.content || '');
      if (aiBasedTitle && aiBasedTitle !== 'New Chat') {
        dispatch(renameChat({ chatId: message.chat, title: aiBasedTitle }));

        updateChatTitleRequest(message.chat, aiBasedTitle).catch((error) => {
          console.error('Persist AI title failed:', error);
        });
      }

      dispatch(
        addMessage({
          chatId: message.chat,
          message: {
            id: Date.now(),
            sender: 'ai',
            text: message.content,
            feedback: null
          }
        })
      );
    });

    tempSocket.on('ai-error', (error) => {
      pendingPromptRef.current = null;
      setThinkingChatId(null);
      setIsDraftResponding(false);
      console.error('AI error from server:', error);
    });

    tempSocket.on('connect_error', () => {
      setIsAuthenticated(false);
      tempSocket.disconnect();
      setSocket(null);
    });

    onSocketReady?.(tempSocket);
    return tempSocket;
  } catch (error) {
    setIsAuthenticated(false);
    setSocket(null);

    if (error?.response?.status === 401) {
      dispatch(setChats([]));
      return null;
    }

    console.error('Fetch chats failed:', error);
    return null;
  }
};

export const logoutFlow = async ({
  socket,
  setSocket,
  setIsAuthenticated,
  dispatch,
  setIsDraftChatActive,
  setDraftMessages,
  setInputMessage,
  setRetryEditTarget,
  setThinkingChatId,
  setIsDraftResponding,
  navigate
}) => {
  try {
    await logoutRequest();
  } catch (error) {
    console.error('Logout request failed:', error);
  }

  if (socket) {
    socket.disconnect();
    setSocket(null);
  }

  setIsAuthenticated(false);
  dispatch(setChats([]));
  setIsDraftChatActive(true);
  setDraftMessages([]);
  setInputMessage('');
  setRetryEditTarget(null);
  setThinkingChatId(null);
  setIsDraftResponding(false);
  navigate('/login');
};
