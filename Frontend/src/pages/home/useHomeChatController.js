import { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  toggleMessageFeedback
} from '../../store/chatSlice';
import {
  createNewChatState,
  deleteChatWithPersistence,
  fetchAndSetMessages,
  renameChatWithPersistence,
  reorderChatsState,
  selectChatState,
  shareChatTranscript,
  toggleArchiveChatState,
  togglePinChatState
} from './controller/chatHandlers';
import {
  handleAuthenticatedSendFlow,
  handleGuestSendFlow,
  retryUserMessageFlow,
  stopThinkingFlow
} from './controller/messageFlows';
import { bootstrapAuthenticatedSession, logoutFlow } from './controller/sessionHandlers';
import { cancelGuestResponseRequest } from '../../services/chatApi';
import { fetchMyBotsRequest, fetchPrivateAccessSettingsRequest, verifyPrivateAccessRequest } from '../../services/botApi';
import { hasAuthSessionHint } from '../../services/authSession';

const DRAFT_CHAT_INPUT_KEY = 'draft-chat';
const CHAT_INPUT_DRAFTS_STORAGE_KEY = 'chat-input-drafts-v1';
const EPHEMERAL_CHAT_MESSAGES_STORAGE_KEY = 'ephemeral-chat-messages-v1';

const readDraftsFromLocalStorage = () => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(CHAT_INPUT_DRAFTS_STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
      return {};
    }

    return parsedValue;
  } catch {
    return {};
  }
};

const resolveInputContextKey = ({ isDraftChatActive, currentChatId }) => {
  if (isDraftChatActive || !currentChatId) {
    return DRAFT_CHAT_INPUT_KEY;
  }

  return `chat:${String(currentChatId)}`;
};

export const useHomeChatController = ({ enableRouteSync = true } = {}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { chatId: routeChatId } = useParams();

  const chats = useSelector((state) => state.chat.chats);
  const currentChatId = useSelector((state) => state.chat.currentChatId);
  const messagesByChat = useSelector((state) => state.chat.messagesByChat);

  const [socket, setSocket] = useState(null);
  const [isDraftChatActive, setIsDraftChatActive] = useState(false);
  const [draftMessages, setDraftMessages] = useState([]);
  const [isDraftResponding, setIsDraftResponding] = useState(false);
  const [thinkingChatId, setThinkingChatId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [availableBots, setAvailableBots] = useState([]);
  const [hasPrivateAccessPassword, setHasPrivateAccessPassword] = useState(false);
  const [isPrivateGemsUnlocked, setIsPrivateGemsUnlocked] = useState(false);
  const [isPrivateGemsUnlockedInManager, setIsPrivateGemsUnlockedInManager] = useState(false);
  const [inputDraftByContext, setInputDraftByContext] = useState(() => readDraftsFromLocalStorage());
  const [retryInputFocusKey, setRetryInputFocusKey] = useState(0);
  const [retryEditTarget, setRetryEditTarget] = useState(null);
  const [draftGemContext, setDraftGemContext] = useState(() => {
    const stateDraftGem = location?.state?.draftGemContext;
    if (!stateDraftGem?.id) {
      return null;
    }

    return {
      id: String(stateDraftGem.id),
      name: String(stateDraftGem.name || '').trim() || 'New Gem Chat'
    };
  });

  const draftReplyTimerRef = useRef(null);
  const initialRouteChatIdRef = useRef(routeChatId);
  const ignoreNextAiResponseRef = useRef(false);
  const pendingPromptRef = useRef(null);
  const guestAbortControllerRef = useRef(null);

  const activeInputContextKey = resolveInputContextKey({
    isDraftChatActive,
    currentChatId
  });

  const inputMessage = inputDraftByContext[activeInputContextKey] || '';

  const setInputMessage = (nextValue) => {
    setInputDraftByContext((prev) => {
      const previousValue = prev[activeInputContextKey] || '';
      const resolvedValue = typeof nextValue === 'function' ? nextValue(previousValue) : nextValue;

      if (resolvedValue === previousValue) {
        return prev;
      }

      return {
        ...prev,
        [activeInputContextKey]: resolvedValue
      };
    });
  };

  const messages = isDraftChatActive ? draftMessages : messagesByChat[currentChatId] || [];
  const isAiThinking = Boolean(thinkingChatId);
  const isCurrentChatThinking = isDraftChatActive
    ? Boolean(isDraftResponding)
    : Boolean(currentChatId) && thinkingChatId === currentChatId;

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let cancelled = false;

    const loadBots = async () => {
      try {
        const [bots, privateAccessSettings] = await Promise.all([
          fetchMyBotsRequest(),
          fetchPrivateAccessSettingsRequest()
        ]);

        if (!cancelled) {
          setAvailableBots(Array.isArray(bots) ? bots : []);
          setHasPrivateAccessPassword(Boolean(privateAccessSettings?.hasPassword));
        }
      } catch {
        if (!cancelled) {
          setAvailableBots([]);
          setHasPrivateAccessPassword(false);
        }
      }
    };

    loadBots();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const recentGems = useMemo(() => {
    if (!isAuthenticated) {
      return [];
    }

    const botById = new Map();
    for (const bot of availableBots) {
      const botId = bot?.id ?? bot?._id;
      if (botId != null) {
        botById.set(String(botId), bot);
      }
    }

    const seen = new Set();
    const picks = [];

    for (const chat of chats) {
      const rawBot = chat?.bot;
      const chatBotId =
        typeof rawBot === 'object' && rawBot !== null
          ? rawBot.id ?? rawBot._id
          : rawBot;

      if (!chatBotId) {
        continue;
      }

      const normalizedId = String(chatBotId);

      if (seen.has(normalizedId)) {
        continue;
      }

      const matchedBot = botById.get(normalizedId);
      if (!matchedBot) {
        continue;
      }

      seen.add(normalizedId);
      picks.push({
        id: normalizedId,
        name: matchedBot.name || 'Untitled Gem',
        avatarUrl: matchedBot.avatarUrl || '',
        avatarBackground: matchedBot.avatarBackground || '',
        visibility: matchedBot.visibility || 'private'
      });

      if (picks.length >= 2) {
        break;
      }
    }

    return picks;
  }, [availableBots, chats, isAuthenticated]);

  const privateGems = useMemo(() => {
    if (!isAuthenticated) {
      return [];
    }

    return (Array.isArray(availableBots) ? availableBots : [])
      .filter((bot) => String(bot?.visibility || '').toLowerCase() === 'private')
      .map((bot) => ({
        id: String(bot?.id ?? bot?._id ?? ''),
        name: String(bot?.name || '').trim() || 'Untitled Gem',
        avatarUrl: String(bot?.avatarUrl || '').trim(),
        avatarBackground: String(bot?.avatarBackground || '').trim()
      }))
      .filter((bot) => bot.id);
  }, [availableBots, isAuthenticated]);

  const privateGemIds = useMemo(
    () => new Set(privateGems.map((gem) => String(gem.id))),
    [privateGems]
  );

  const unlockPrivateGems = async (password) => {
    const normalizedPassword = String(password || '').trim();
    if (!normalizedPassword) {
      return { ok: false, message: 'Password is required.' };
    }

    if (!hasPrivateAccessPassword) {
      return { ok: false, message: 'Private gems password is not set yet.' };
    }

    try {
      await verifyPrivateAccessRequest(normalizedPassword);
      setIsPrivateGemsUnlocked(true);
      return { ok: true, message: '' };
    } catch (error) {
      return {
        ok: false,
        message: error?.response?.data?.message || 'Invalid password'
      };
    }
  };

  const lockPrivateGems = () => {
    setIsPrivateGemsUnlocked(false);
  };

  const unlockPrivateGemsInManager = async (password) => {
    const normalizedPassword = String(password || '').trim();
    if (!normalizedPassword) {
      return { ok: false, message: 'Password is required.' };
    }

    if (!hasPrivateAccessPassword) {
      return { ok: false, message: 'Private gems password is not set yet.' };
    }

    try {
      await verifyPrivateAccessRequest(normalizedPassword);
      setIsPrivateGemsUnlockedInManager(true);
      return { ok: true, message: '' };
    } catch (error) {
      return {
        ok: false,
        message: error?.response?.data?.message || 'Invalid password'
      };
    }
  };

  const lockPrivateGemsInManager = () => {
    setIsPrivateGemsUnlockedInManager(false);
  };

  useEffect(() => {
    const draftTimer = draftReplyTimerRef.current;

    return () => {
      if (draftTimer) {
        clearTimeout(draftTimer);
      }
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        CHAT_INPUT_DRAFTS_STORAGE_KEY,
        JSON.stringify(inputDraftByContext)
      );
    } catch {
      // Ignore localStorage write failures.
    }
  }, [inputDraftByContext]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const nextCache = {};

      for (const chat of chats) {
        const chatId = String(chat?.id || '');
        if (!chatId) {
          continue;
        }

        const botConfig = chat?.bot;
        const isMemoryDisabled =
          typeof botConfig === 'object' && botConfig !== null
            ? botConfig.memoryEnabled === false
            : false;

        if (!isMemoryDisabled) {
          continue;
        }

        const chatMessages = messagesByChat[chatId];
        if (!Array.isArray(chatMessages) || chatMessages.length === 0) {
          continue;
        }

        nextCache[chatId] = chatMessages;
      }

      window.localStorage.setItem(
        EPHEMERAL_CHAT_MESSAGES_STORAGE_KEY,
        JSON.stringify(nextCache)
      );
    } catch {
      // Ignore localStorage write failures.
    }
  }, [chats, messagesByChat]);

  const createNewChat = () => {
    createNewChatState({
      draftReplyTimerRef,
      setIsDraftChatActive,
      setDraftMessages,
      setRetryEditTarget,
      setIsDraftResponding,
      setThinkingChatId,
      setIsSidebarOpen
    });

    setDraftGemContext(null);

    navigate('/');
  };

  const startDraftChatWithGem = (gem) => {
    const gemId = String(gem?.id || '').trim();
    if (!gemId) {
      return;
    }

    const nextDraftGemContext = {
      id: gemId,
      name: String(gem?.name || '').trim() || 'New Gem Chat'
    };

    createNewChatState({
      draftReplyTimerRef,
      setIsDraftChatActive,
      setDraftMessages,
      setRetryEditTarget,
      setIsDraftResponding,
      setThinkingChatId,
      setIsSidebarOpen
    });

    setDraftGemContext(nextDraftGemContext);

    navigate('/', {
      state: {
        draftGemContext: nextDraftGemContext
      }
    });
  };

  const handleRenameChat = (chatId, title) => {
    renameChatWithPersistence({
      dispatch,
      isAuthenticated,
      chatId,
      title
    });
  };

  const handleTogglePinChat = (chatId) => {
    togglePinChatState({ dispatch, chatId });
  };

  const handleToggleArchive = (chatId) => {
    toggleArchiveChatState({ dispatch, chatId });
  };

  const handleDeleteChat = async (chatId) => {
    await deleteChatWithPersistence({ dispatch, isAuthenticated, chatId });
  };

  const handleReorderChats = (fromChatId, toChatId) => {
    reorderChatsState({ dispatch, fromChatId, toChatId });
  };

  const handleShareChat = async (chatId) => {
    await shareChatTranscript({ chats, messagesByChat, chatId });
  };

  const handleSelectChat = (chatId) => {
    selectChatState({
      dispatch,
      draftReplyTimerRef,
      setIsDraftChatActive,
      setDraftMessages,
      setRetryEditTarget,
      setIsDraftResponding,
      chatId
    });

    navigate(`/chats/${chatId}`);
  };

  const handleSelectChatWithMessages = async (chatId) => {
    handleSelectChat(chatId);

    const isChatThinking = String(thinkingChatId || '') === String(chatId || '');
    const isPendingPromptChat =
      String(pendingPromptRef.current?.chatId || '') === String(chatId || '');

    // While a prompt is in-flight, local optimistic messages are newer than backend fetch results.
    if (isChatThinking || isPendingPromptChat) {
      return;
    }

    await fetchAndSetMessages({ dispatch, isAuthenticated, chatId, chats });
  };

  useEffect(() => {
    if (!hasAuthSessionHint()) {
      setIsAuthenticated(false);
      setSocket(null);
      return undefined;
    }

    const isDisposedRef = { current: false };
    let tempSocket = null;

    bootstrapAuthenticatedSession({
      dispatch,
      preferredChatId: initialRouteChatIdRef.current,
      setIsAuthenticated,
      setSocket,
      setIsDraftChatActive,
      setDraftMessages,
      setThinkingChatId,
      setIsDraftResponding,
      ignoreNextAiResponseRef,
      pendingPromptRef,
      onSocketReady: (socketInstance) => {
        tempSocket = socketInstance;
      },
      isDisposedRef
    });

    return () => {
      isDisposedRef.current = true;
      if (tempSocket) {
        tempSocket.disconnect();
      }
    };
  }, [dispatch]);

  useEffect(() => {
    if (!enableRouteSync) {
      return;
    }

    if (isDraftChatActive) {
      if (routeChatId) {
        navigate('/', { replace: true });
      }
      return;
    }

    if (currentChatId && String(currentChatId) !== String(routeChatId || '')) {
      navigate(`/chats/${currentChatId}`, { replace: true });
    }
  }, [currentChatId, enableRouteSync, isDraftChatActive, navigate, routeChatId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    if (isAiThinking) return;

    if (!isAuthenticated) {
      await handleGuestSendFlow({
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
        setInputMessage
      });
      return;
    }

    ignoreNextAiResponseRef.current = false;

    await handleAuthenticatedSendFlow({
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
      draftBotId: draftGemContext?.id || null,
      draftTitle: draftGemContext?.name || 'New Chat'
    });
  };

  const handleToggleFeedback = (messageId, feedbackType) => {
    if (!currentChatId || isDraftChatActive) {
      return;
    }

    dispatch(toggleMessageFeedback({ chatId: currentChatId, messageId, feedbackType }));
  };

  const handleRefreshResponse = (aiMessageId) => {
    if (!currentChatId || isDraftChatActive) {
      return;
    }

    const currentMessages = messagesByChat[currentChatId] || [];
    let sourceUserMessage = null;

    if (aiMessageId != null) {
      const aiIndex = currentMessages.findIndex(
        (message) => message.id === aiMessageId && message.sender === 'ai'
      );

      if (aiIndex !== -1) {
        for (let index = aiIndex - 1; index >= 0; index -= 1) {
          const candidate = currentMessages[index];
          if (candidate?.sender === 'user' && candidate.text?.trim()) {
            sourceUserMessage = candidate;
            break;
          }
        }
      }
    }

    if (!sourceUserMessage) {
      sourceUserMessage = [...currentMessages]
        .reverse()
        .find((message) => message.sender === 'user' && message.text?.trim());
    }

    if (!sourceUserMessage?.text) {
      return;
    }

    setRetryEditTarget(null);
    setInputMessage(sourceUserMessage.text);
    setRetryInputFocusKey((prev) => prev + 1);
  };

  const handleRetryUserMessage = (messageId) => {
    retryUserMessageFlow({
      currentChatId,
      isDraftChatActive,
      messagesByChat,
      messageId,
      setInputMessage,
      setRetryEditTarget,
      setRetryInputFocusKey
    });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleLogout = async () => {
    setIsPrivateGemsUnlocked(false);
    setIsPrivateGemsUnlockedInManager(false);

    await logoutFlow({
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
    });
  };

  const handleStopThinking = () => {
    stopThinkingFlow({
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
      setIsDraftResponding
    });
  };

  const activeChatTitle = isDraftChatActive
    ? draftGemContext?.name || 'New Chat'
    : chats.find((chat) => chat.id === currentChatId)?.title || 'New Chat';

  return {
    activeChatTitle,
    chats,
    createNewChat,
    currentChatId,
    handleDeleteChat,
    handleRefreshResponse,
    handleRenameChat,
    handleReorderChats,
    handleRetryUserMessage,
    handleSelectChatWithMessages,
    handleSendMessage,
    handleShareChat,
    handleLogout,
    handleStopThinking,
    handleToggleArchive,
    handleToggleFeedback,
    handleTogglePinChat,
    inputMessage,
    isAuthenticated,
    isAiThinking,
    isCurrentChatThinking,
    isDraftChatActive,
    isSidebarOpen,
    messages,
    processingChatId: thinkingChatId,
    recentGems,
    privateGems,
    privateGemIds,
    hasPrivateAccessPassword,
    isPrivateGemsUnlocked,
    unlockPrivateGems,
    lockPrivateGems,
    isPrivateGemsUnlockedInManager,
    unlockPrivateGemsInManager,
    lockPrivateGemsInManager,
    startDraftChatWithGem,
    retryInputFocusKey,
    setInputMessage,
    toggleSidebar
  };
};
