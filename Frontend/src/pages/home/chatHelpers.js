export const generateChatTitleFromResponse = (responseText) => {
  const cleaned = (responseText || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return 'New Chat';
  }

  const words = cleaned.split(' ').slice(0, 6);
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const normalizeFetchedMessages = (fetchedMessages) => {
  return [...(Array.isArray(fetchedMessages) ? fetchedMessages : [])]
    .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime())
    .map((message) => ({
      id: message._id || Date.now(),
      sender: message.role === 'model' ? 'ai' : 'user',
      text: message.content || '',
      feedback: null
    }));
};

export const buildShareText = (selectedChat, selectedMessages) => {
  const transcript = (selectedMessages || [])
    .map((message) => `${message.sender === 'ai' ? 'AI' : 'You'}: ${message.text}`)
    .join('\n');

  return `Chat: ${selectedChat.title}\n\n${transcript || 'No messages yet.'}`;
};
