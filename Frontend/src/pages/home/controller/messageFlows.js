import {
  addMessage,
  createChat,
  editUserMessage,
  renameChat,
  setChatMessages
} from '../../../store/chatSlice';
import { guestAiResponseRequest } from '../../../services/chatApi';
import { generateChatTitleFromResponse } from '../chatHelpers';
import { isAiTokenLimitError } from '../../../utils/aiLimit';

export const handleGuestSendFlow = async ({
  dispatch,
  inputMessage,
  currentChatId,
  isDraftChatActive,
  pendingPromptRef,
  guestAbortControllerRef,
  setThinkingChatId,
  setIsDraftChatActive,
  setDraftMessages,
  setRetryEditTarget,
  setInputMessage,
  onAiLimitReached
}) => {
  const userText = inputMessage;
  const trimmedUserText = userText.trim();
  const userMessageId = Date.now();
  const shouldCreateNewChat = !currentChatId || isDraftChatActive;
  const localChatId = shouldCreateNewChat ? `guest-${userMessageId}` : currentChatId;
  const guestRequestId = `guest-${userMessageId}-${Math.floor(Math.random() * 1000000)}`;
  const abortController = new AbortController();
  guestAbortControllerRef.current = abortController;

  if (shouldCreateNewChat) {
    dispatch(
      createChat({
        chatId: localChatId,
        initialMessage: { id: userMessageId, sender: 'user', text: userText, feedback: null }
      })
    );
  } else {
    dispatch(
      addMessage({
        chatId: localChatId,
        message: { id: userMessageId, sender: 'user', text: userText, feedback: null }
      })
    );
  }

  // Immediately switch from draft view to the created chat while AI is processing.
  setIsDraftChatActive(false);
  setDraftMessages([]);
  setRetryEditTarget(null);
  setInputMessage('');
  pendingPromptRef.current = {
    chatId: localChatId,
    messageId: userMessageId,
    text: userText,
    draft: shouldCreateNewChat,
    retryExisting: false,
    guestRequestId
  };
  setThinkingChatId(localChatId);

  try {
    const guestResponse = await guestAiResponseRequest(trimmedUserText, {
      requestId: guestRequestId,
      signal: abortController.signal
    });

    if (pendingPromptRef.current?.guestRequestId !== guestRequestId) {
      return;
    }

    dispatch(
      addMessage({
        chatId: localChatId,
        message: {
          id: Date.now(),
          sender: 'ai',
          text: guestResponse || 'Unable to generate response in guest mode right now.',
          feedback: null
        }
      })
    );

    dispatch(
      renameChat({
        chatId: localChatId,
        title: generateChatTitleFromResponse(trimmedUserText)
      })
    );

    pendingPromptRef.current = null;
  } catch (error) {
    const wasCancelled = error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';

    if (wasCancelled) {
      return;
    }

    dispatch(
      addMessage({
        chatId: localChatId,
        message: {
          id: Date.now(),
          sender: 'ai',
          text: 'Guest mode response failed. Please try again.',
          feedback: null
        }
      })
    );

    if (isAiTokenLimitError(error)) {
      onAiLimitReached?.();
    }

    console.error('Guest AI response failed:', error);
    pendingPromptRef.current = null;
  } finally {
    if (guestAbortControllerRef.current === abortController) {
      guestAbortControllerRef.current = null;
    }

    if (pendingPromptRef.current?.guestRequestId === guestRequestId) {
      pendingPromptRef.current = null;
    }

    setThinkingChatId((activeChatId) => (activeChatId === localChatId ? null : activeChatId));
  }
};

export const handleAuthenticatedSendFlow = async ({
  dispatch,
  inputMessage,
  currentChatId,
  isDraftChatActive,
  isDraftResponding,
  retryEditTarget,
  messagesByChat,
  socket,
  setRetryEditTarget,
  setInputMessage,
  setDraftMessages,
  setIsDraftResponding,
  setIsDraftChatActive,
  setThinkingChatId,
  pendingPromptRef,
  draftBotId,
  draftTitle
}) => {
  if (!socket?.connected) {
    return;
  }

  if (isDraftChatActive || !currentChatId) {
    if (isDraftResponding) {
      return;
    }

    if (!isDraftChatActive) {
      setIsDraftChatActive(true);
    }

    const userText = inputMessage;
    const trimmedUserText = userText.trim();
    const userMessage = { id: Date.now(), sender: 'user', text: userText, feedback: null };
    setDraftMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsDraftResponding(true);

    const draftRequestChatId = `draft-${userMessage.id}`;
    pendingPromptRef.current = {
      chatId: draftRequestChatId,
      messageId: userMessage.id,
      text: userText,
      draft: true,
      retryExisting: false,
      botId: draftBotId || null,
      draftTitle: String(draftTitle || '').trim() || 'New Chat'
    };

    setThinkingChatId(draftRequestChatId);
    socket.emit('ai-message', {
      chat: draftRequestChatId,
      draft: true,
      botId: draftBotId || null,
      draftTitle: String(draftTitle || '').trim() || 'New Chat',
      messageId: userMessage.id,
      content: trimmedUserText
    });
    return;
  }

  const userText = inputMessage;
  const trimmedUserText = userText.trim();
  let userMessageId = Date.now();
  let isRetryEditSend = false;

  if (
    retryEditTarget?.chatId === currentChatId &&
    retryEditTarget?.messageId != null
  ) {
    const currentMessages = messagesByChat[currentChatId] || [];
    const lastMessage = currentMessages[currentMessages.length - 1];
    const isSameLastUserMessage =
      lastMessage?.sender === 'user' && lastMessage.id === retryEditTarget.messageId;

    if (isSameLastUserMessage) {
      userMessageId = retryEditTarget.messageId;
      isRetryEditSend = true;
      dispatch(
        editUserMessage({
          chatId: currentChatId,
          messageId: retryEditTarget.messageId,
          nextText: userText
        })
      );
    }
  }

  if (!isRetryEditSend) {
    const userMessage = { id: userMessageId, sender: 'user', text: userText, feedback: null };
    dispatch(addMessage({ chatId: currentChatId, message: userMessage }));
  }

  setRetryEditTarget(null);

  pendingPromptRef.current = {
    chatId: currentChatId,
    messageId: userMessageId,
    text: userText,
    draft: false,
    retryExisting: isRetryEditSend
  };

  setInputMessage('');

  if (socket?.connected) {
    setThinkingChatId(currentChatId);
    socket.emit('ai-message', {
      chat: currentChatId,
      messageId: userMessageId,
      content: trimmedUserText
    });
  }
};

export const retryUserMessageFlow = ({
  currentChatId,
  isDraftChatActive,
  messagesByChat,
  messageId,
  setInputMessage,
  setRetryEditTarget,
  setRetryInputFocusKey
}) => {
  if (!currentChatId || isDraftChatActive) {
    return;
  }

  const currentMessages = messagesByChat[currentChatId] || [];
  const userIndex = currentMessages.findIndex(
    (message) => message.id === messageId && message.sender === 'user'
  );

  if (userIndex === -1) {
    return;
  }

  const selectedUserMessage = currentMessages[userIndex];
  const isLastMessage = userIndex === currentMessages.length - 1;

  if (!isLastMessage || !selectedUserMessage.text?.trim()) {
    return;
  }

  setInputMessage(selectedUserMessage.text);
  setRetryEditTarget({ chatId: currentChatId, messageId: selectedUserMessage.id });
  setRetryInputFocusKey((prev) => prev + 1);
};

export const stopThinkingFlow = ({
  isAiThinking,
  isAuthenticated,
  socket,
  cancelGuestResponseRequest,
  guestAbortControllerRef,
  pendingPromptRef,
  setInputMessage,
  setRetryInputFocusKey,
  dispatch,
  messagesByChat,
  setIsDraftChatActive,
  setDraftMessages,
  ignoreNextAiResponseRef,
  setThinkingChatId,
  setIsDraftResponding,
  setStoppedMessageIds
}) => {
  if (!isAiThinking) {
    return;
  }

  const pendingPrompt = pendingPromptRef.current;
  if (pendingPrompt) {
    if (pendingPrompt.guestRequestId) {
      guestAbortControllerRef.current?.abort();
      cancelGuestResponseRequest?.(pendingPrompt.guestRequestId).catch((error) => {
        console.error('Cancel guest response failed:', error);
      });
    }

    if (isAuthenticated && socket?.connected) {
      socket.emit('stop-ai', {
        chat: pendingPrompt.chatId,
        messageId: pendingPrompt.messageId
      });
    }

    setInputMessage(pendingPrompt.text || '');
    setRetryInputFocusKey((prev) => prev + 1);

    if (pendingPrompt.draft) {
      setIsDraftChatActive(true);
      setDraftMessages([]);
    } else if (!pendingPrompt.retryExisting) {
      const currentMessages = messagesByChat[pendingPrompt.chatId] || [];
      const nextMessages = currentMessages.filter((message) => message.id !== pendingPrompt.messageId);
      dispatch(setChatMessages({ chatId: pendingPrompt.chatId, messages: nextMessages }));
    }

    // Track this message as explicitly stopped so the retry button shows
    if (pendingPrompt.messageId != null) {
      setStoppedMessageIds?.((prev) => {
        const next = new Set(prev);
        next.add(pendingPrompt.messageId);
        return next;
      });
    }
  }

  ignoreNextAiResponseRef.current = true;
  pendingPromptRef.current = null;
  setThinkingChatId(null);
  setIsDraftResponding(false);
};
