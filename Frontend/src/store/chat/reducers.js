import {
  createChatRecord,
  ensureCurrentChat,
  generateTitleFromMessage,
  touchChat
} from './helpers';

const createChat = (state, action) => {
  const { chatId, initialMessage } = action.payload;

  state.chats.unshift(createChatRecord(chatId, 'New Chat'));
  state.currentChatId = chatId;
  state.messagesByChat[chatId] = [initialMessage];
};

const setCurrentChat = (state, action) => {
  const chatId = action.payload;
  const chatExists = state.chats.some((chat) => chat.id === chatId && !chat.archived);

  if (chatExists) {
    state.currentChatId = chatId;
  }
};

const addMessage = (state, action) => {
  const { chatId, message } = action.payload;

  if (!state.messagesByChat[chatId]) {
    state.messagesByChat[chatId] = [];
  }

  state.messagesByChat[chatId].push(message);
  touchChat(state, chatId);

  if (message.sender === 'user') {
    const chat = state.chats.find((item) => item.id === chatId);
    if (chat && chat.title === 'New Chat') {
      chat.title = generateTitleFromMessage(message.text);
    }
  }
};

const editUserMessage = (state, action) => {
  const { chatId, messageId, nextText } = action.payload;
  const chatMessages = state.messagesByChat[chatId] || [];

  let wasUpdated = false;

  state.messagesByChat[chatId] = chatMessages.map((message) => {
    if (message.id !== messageId || message.sender !== 'user') {
      return message;
    }

    wasUpdated = true;
    return {
      ...message,
      text: nextText
    };
  });

  if (wasUpdated) {
    touchChat(state, chatId);
  }
};

const toggleMessageFeedback = (state, action) => {
  const { chatId, messageId, feedbackType } = action.payload;
  const chatMessages = state.messagesByChat[chatId] || [];

  state.messagesByChat[chatId] = chatMessages.map((message) => {
    if (message.id !== messageId || message.sender !== 'ai') {
      return message;
    }

    return {
      ...message,
      feedback: message.feedback === feedbackType ? null : feedbackType
    };
  });

  touchChat(state, chatId);
};

const refreshAiMessage = (state, action) => {
  const { chatId, messageId, nextText } = action.payload;
  const chatMessages = state.messagesByChat[chatId] || [];

  state.messagesByChat[chatId] = chatMessages.map((message) => {
    if (message.id !== messageId || message.sender !== 'ai') {
      return message;
    }

    return {
      ...message,
      text: nextText,
      feedback: null
    };
  });

  touchChat(state, chatId);
};

const renameChat = (state, action) => {
  const { chatId, title } = action.payload;
  const chat = state.chats.find((item) => item.id === chatId);

  if (!chat) {
    return;
  }

  const nextTitle = title.trim();
  if (!nextTitle) {
    return;
  }

  chat.title = nextTitle;
  chat.updatedAt = Date.now();
};

const togglePinChat = (state, action) => {
  const chatId = action.payload;
  const chatIndex = state.chats.findIndex((item) => item.id === chatId);

  if (chatIndex === -1) {
    return;
  }

  const [chat] = state.chats.splice(chatIndex, 1);
  chat.pinned = !chat.pinned;
  chat.updatedAt = Date.now();

  if (chat.pinned) {
    state.chats.unshift(chat);
  } else {
    const firstUnpinnedIndex = state.chats.findIndex((item) => !item.pinned);
    if (firstUnpinnedIndex === -1) {
      state.chats.push(chat);
    } else {
      state.chats.splice(firstUnpinnedIndex, 0, chat);
    }
  }
};

const setChats = (state, action) => {
  const incomingChats = Array.isArray(action.payload) ? action.payload : [];

  state.chats = incomingChats
    .map((chat) => {
      const resolvedId = chat.id ?? chat._id;

      if (!resolvedId) {
        return null;
      }

      return {
        ...chat,
        id: resolvedId,
        title: chat.title || 'New Chat',
        pinned: Boolean(chat.pinned),
        archived: Boolean(chat.archived),
        updatedAt: chat.updatedAt || Date.now()
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const left = new Date(a.lastActivity || a.updatedAt || 0).getTime();
      const right = new Date(b.lastActivity || b.updatedAt || 0).getTime();
      return right - left;
    });

  const hasActiveCurrentChat = state.chats.some(
    (chat) => chat.id === state.currentChatId && !chat.archived
  );

  if (!hasActiveCurrentChat) {
    ensureCurrentChat(state);
  }
};

const setChatMessages = (state, action) => {
  const { chatId, messages } = action.payload;

  if (!chatId) {
    return;
  }

  state.messagesByChat[chatId] = Array.isArray(messages) ? messages : [];
};

const toggleArchiveChat = (state, action) => {
  const chatId = action.payload;
  const chat = state.chats.find((item) => item.id === chatId);

  if (!chat) {
    return;
  }

  chat.archived = !chat.archived;
  chat.updatedAt = Date.now();

  if (chat.archived && state.currentChatId === chatId) {
    ensureCurrentChat(state);
  }

  if (!state.currentChatId) {
    ensureCurrentChat(state);
  }
};

const deleteChat = (state, action) => {
  const chatId = action.payload;

  state.chats = state.chats.filter((chat) => chat.id !== chatId);
  delete state.messagesByChat[chatId];

  if (state.currentChatId === chatId) {
    ensureCurrentChat(state);
  }
};

const reorderChats = (state, action) => {
  const { fromChatId, toChatId } = action.payload;

  if (fromChatId === toChatId) {
    return;
  }

  const fromIndex = state.chats.findIndex((chat) => chat.id === fromChatId);
  const toIndex = state.chats.findIndex((chat) => chat.id === toChatId);

  if (fromIndex === -1 || toIndex === -1) {
    return;
  }

  const [movedChat] = state.chats.splice(fromIndex, 1);
  state.chats.splice(toIndex, 0, movedChat);
  movedChat.updatedAt = Date.now();
};

export const chatReducers = {
  createChat,
  setCurrentChat,
  addMessage,
  editUserMessage,
  toggleMessageFeedback,
  refreshAiMessage,
  renameChat,
  togglePinChat,
  setChats,
  setChatMessages,
  toggleArchiveChat,
  deleteChat,
  reorderChats
};
