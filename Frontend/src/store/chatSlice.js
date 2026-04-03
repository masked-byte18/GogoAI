import { createSlice } from '@reduxjs/toolkit';
import { initialChatState } from './chat/initialState';
import { chatReducers } from './chat/reducers';

const chatSlice = createSlice({
  name: 'chat',
  initialState: initialChatState,
  reducers: chatReducers
});

export const {
  createChat,
  setCurrentChat,
  addMessage,
  editUserMessage,
  toggleMessageFeedback,
  refreshAiMessage,
  renameChat,
  togglePinChat,
  toggleArchiveChat,
  deleteChat,
  reorderChats,
  setChats,
  setChatMessages
} = chatSlice.actions;

export default chatSlice.reducer;
