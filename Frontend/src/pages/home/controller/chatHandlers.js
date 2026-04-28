import {
  deleteChatRequest,
  fetchChatsRequest,
  fetchChatMessagesRequest,
  updateChatTitleRequest
} from '../../../services/chatApi';
import {
  deleteChat,
  renameChat,
  setChatMessages,
  setChats,
  setCurrentChat,
  toggleArchiveChat,
  togglePinChat,
  reorderChats
} from '../../../store/chatSlice';
import { buildShareText, normalizeFetchedMessages } from '../chatHelpers';

const EPHEMERAL_CHAT_MESSAGES_STORAGE_KEY = 'ephemeral-chat-messages-v1';

const readEphemeralMessages = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(EPHEMERAL_CHAT_MESSAGES_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
};

export const createNewChatState = ({
  draftReplyTimerRef,
  setIsDraftChatActive,
  setDraftMessages,
  setRetryEditTarget,
  setIsSidebarOpen
}) => {
  if (draftReplyTimerRef.current) {
    clearTimeout(draftReplyTimerRef.current);
    draftReplyTimerRef.current = null;
  }

  setIsDraftChatActive(true);
  setDraftMessages([]);
  setRetryEditTarget(null);

  if (window.innerWidth < 768) {
    setIsSidebarOpen(false);
  }
};

export const renameChatWithPersistence = ({ dispatch, isAuthenticated, chatId, title }) => {
  if (!chatId) {
    return;
  }

  const nextTitle = title.trim();
  if (!nextTitle) {
    return;
  }

  dispatch(renameChat({ chatId, title: nextTitle }));

  if (!isAuthenticated) {
    return;
  }

  updateChatTitleRequest(chatId, nextTitle).catch((error) => {
    console.error('Persist chat title failed:', error);
  });
};

export const togglePinChatState = ({ dispatch, chatId }) => {
  dispatch(togglePinChat(chatId));
};

export const toggleArchiveChatState = ({ dispatch, chatId }) => {
  dispatch(toggleArchiveChat(chatId));
};

export const reorderChatsState = ({ dispatch, fromChatId, toChatId }) => {
  dispatch(reorderChats({ fromChatId, toChatId }));
};

export const deleteChatWithPersistence = async ({ dispatch, isAuthenticated, chatId }) => {
  dispatch(deleteChat(chatId));

  if (!isAuthenticated) {
    return;
  }

  try {
    await deleteChatRequest(chatId);
  } catch (error) {
    console.error('Delete chat failed:', error);

    fetchChatList({ dispatch });
  }
};

export const shareChatTranscript = async ({ chats, messagesByChat, chatId }) => {
  const selectedChat = chats.find((chat) => chat.id === chatId);
  const selectedMessages = messagesByChat[chatId] || [];

  if (!selectedChat) {
    return;
  }

  const shareText = buildShareText(selectedChat, selectedMessages);

  try {
    if (navigator.share) {
      await navigator.share({ title: selectedChat.title, text: shareText });
    } else {
      await navigator.clipboard.writeText(shareText);
    }
  } catch (error) {
    console.error('Share chat failed:', error);
  }
};

export const selectChatState = ({
  dispatch,
  draftReplyTimerRef,
  setIsDraftChatActive,
  setDraftMessages,
  setRetryEditTarget,
  chatId
}) => {
  if (draftReplyTimerRef.current) {
    clearTimeout(draftReplyTimerRef.current);
    draftReplyTimerRef.current = null;
  }

  setIsDraftChatActive(false);
  setDraftMessages([]);
  setRetryEditTarget(null);
  dispatch(setCurrentChat(chatId));
};

export const fetchAndSetMessages = async ({ dispatch, isAuthenticated, chatId, chats = [] }) => {
  if (!isAuthenticated) {
    return;
  }

  try {
    const fetchedMessages = await fetchChatMessagesRequest(chatId);
    const normalizedMessages = normalizeFetchedMessages(fetchedMessages);

    if (normalizedMessages.length === 0) {
      const selectedChat = (Array.isArray(chats) ? chats : []).find(
        (chat) => String(chat?.id || '') === String(chatId || '')
      );
      const botConfig = selectedChat?.bot;
      const isMemoryDisabled =
        typeof botConfig === 'object' && botConfig !== null
          ? botConfig.memoryEnabled === false
          : false;

      if (isMemoryDisabled) {
        const cacheMap = readEphemeralMessages();
        const cachedMessages = Array.isArray(cacheMap[String(chatId)])
          ? cacheMap[String(chatId)]
          : [];

        if (cachedMessages.length > 0) {
          dispatch(setChatMessages({ chatId, messages: cachedMessages }));
          return;
        }
      }
    }

    dispatch(setChatMessages({ chatId, messages: normalizedMessages }));
  } catch (error) {
    console.error('Fetch chat messages failed:', error);
  }
};

export const fetchChatList = ({ dispatch }) => {
  fetchChatsRequest()
    .then((fetchedChats) => {
      dispatch(setChats(fetchedChats));
    })
    .catch((fetchError) => {
      console.error('Fetch chats after delete failure failed:', fetchError);
    });
};
