export const createChatRecord = (id, title) => ({
  id,
  title,
  pinned: false,
  archived: false,
  updatedAt: Date.now()
});

export const generateTitleFromMessage = (text) => {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return 'New Chat';
  }

  const words = cleaned.split(' ').slice(0, 6);
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const touchChat = (state, chatId) => {
  const chat = state.chats.find((item) => item.id === chatId);
  if (chat) {
    chat.updatedAt = Date.now();
  }
};

export const ensureCurrentChat = (state) => {
  const availableChat = state.chats.find((chat) => !chat.archived);
  state.currentChatId = availableChat ? availableChat.id : null;
};
