import axios from 'axios';

const CHAT_API_BASE = 'https://gogoai-7lzb.onrender.com/api/chat';

export const createChatRequest = async (title, botId = null) => {
  const response = await axios.post(
    CHAT_API_BASE,
    {
      title,
      botId
    },
    {
      withCredentials: true
    }
  );

  return response.data?.chat || null;
};

export const fetchChatsRequest = async () => {
  const response = await axios.get(CHAT_API_BASE, {
    withCredentials: true
  });

  return response.data?.chats || [];
};

export const fetchChatMessagesRequest = async (chatId) => {
  const response = await axios.get(`${CHAT_API_BASE}/messages/${chatId}`, {
    withCredentials: true
  });

  return response.data?.messages || [];
};

export const updateChatTitleRequest = async (chatId, title) => {
  const response = await axios.patch(
    `${CHAT_API_BASE}/${chatId}/title`,
    { title },
    {
      withCredentials: true
    }
  );

  return response.data?.chat || null;
};

export const deleteChatRequest = async (chatId) => {
  const response = await axios.delete(`${CHAT_API_BASE}/${chatId}`, {
    withCredentials: true
  });

  return response.data || null;
};

export const guestAiResponseRequest = async (content, options = {}) => {
  const response = await axios.post(
    `${CHAT_API_BASE}/guest-response`,
    {
      content,
      requestId: options.requestId
    },
    {
      signal: options.signal
    }
  );

  return response.data?.content || '';
};

export const cancelGuestResponseRequest = async (requestId) => {
  if (!requestId) {
    return null;
  }

  const response = await axios.post(`${CHAT_API_BASE}/guest-response/cancel`, {
    requestId
  });

  return response.data || null;
};
