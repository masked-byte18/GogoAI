import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './ChatMessages.css';

const CopyIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round'>
    <rect x='9' y='9' width='13' height='13' rx='2'></rect>
    <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'></path>
  </svg>
);

const LikeIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M14 9V5a3 3 0 0 0-3-3L7 9v11h11.28a2 2 0 0 0 2-1.68l1.3-7A2 2 0 0 0 19.6 9H14z'></path>
    <path d='M7 22H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h3'></path>
  </svg>
);

const DislikeIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M10 15v4a3 3 0 0 0 3 3l4-7V4H5.72a2 2 0 0 0-2 1.68l-1.3 7A2 2 0 0 0 4.4 15H10z'></path>
    <path d='M17 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3'></path>
  </svg>
);

const ShareIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round'>
    <circle cx='18' cy='5' r='3'></circle>
    <circle cx='6' cy='12' r='3'></circle>
    <circle cx='18' cy='19' r='3'></circle>
    <path d='M8.6 13.5 15.4 17.5'></path>
    <path d='M15.4 6.5 8.6 10.5'></path>
  </svg>
);

const RefreshIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M21 2v6h-6'></path>
    <path d='M3 12a9 9 0 0 1 15-6.7L21 8'></path>
    <path d='M3 22v-6h6'></path>
    <path d='M21 12a9 9 0 0 1-15 6.7L3 16'></path>
  </svg>
);

const RetryIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M21 12a9 9 0 1 1-2.64-6.36'></path>
    <path d='M21 3v6h-6'></path>
  </svg>
);

const MoreIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
    <circle cx='6' cy='12' r='1.6'></circle>
    <circle cx='12' cy='12' r='1.6'></circle>
    <circle cx='18' cy='12' r='1.6'></circle>
  </svg>
);

const SpeakerIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round'>
    <polygon points='11 5 6 9 3 9 3 15 6 15 11 19 11 5'></polygon>
    <path d='M15.5 8.5a5 5 0 0 1 0 7'></path>
    <path d='M18.5 6a9 9 0 0 1 0 12'></path>
  </svg>
);

const toSpeechText = (rawText) => {
  const text = String(rawText || '');

  return text
    .replace(/```[\s\S]*?```/g, ' ') // remove fenced code blocks
    .replace(/`([^`]+)`/g, '$1') // inline code
    .replace(/^\s{0,3}#{1,6}\s+/gm, '') // markdown headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // bold
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1') // italic
    .replace(/_([^_]+)_/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ') // images
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') // links
    .replace(/^\s*[-*+]\s+/gm, '') // unordered bullets
    .replace(/^\s*\d+\.\s+/gm, '') // ordered bullets
    .replace(/^\s*>\s?/gm, '') // blockquotes
    .replace(/\n{2,}/g, '. ') // tighten large gaps for speech
    .replace(/\s+/g, ' ')
    .trim();
};

const getPreferredSootheVoice = () => {
  if (!window.speechSynthesis) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) {
    return null;
  }

  const femaleHints = ['female', 'zira', 'aria', 'samantha', 'serena', 'susan', 'hazel'];
  const soothingPriority = [
    'google uk english female',
    'microsoft zira',
    'microsoft aria',
    'samantha',
    'serena'
  ];

  const englishVoices = voices.filter((voice) => voice.lang?.toLowerCase().startsWith('en'));
  const voicePool = englishVoices.length ? englishVoices : voices;

  for (const preferredName of soothingPriority) {
    const matched = voicePool.find((voice) => voice.name.toLowerCase().includes(preferredName));
    if (matched) {
      return matched;
    }
  }

  const femaleMatch = voicePool.find((voice) => {
    const name = voice.name.toLowerCase();
    return femaleHints.some((hint) => name.includes(hint));
  });

  return femaleMatch || voicePool[0] || null;
};

const ChatMessages = ({
  messages,
  isAiThinking = false,
  stoppedMessageIds,
  onToggleFeedback,
  onRefreshResponse,
  onRetryUserMessage
}) => {
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const [sharedMessageId, setSharedMessageId] = useState(null);
  const [menuOpenMessageId, setMenuOpenMessageId] = useState(null);
  const [speakingMessageId, setSpeakingMessageId] = useState(null);
  const speechRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!event.target.closest('.message-action-menu-wrap')) {
        setMenuOpenMessageId(null);
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);

    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (!messagesContainerRef.current) {
      return;
    }

    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
  }, [messages, isAiThinking]);

  const handleCopy = async (messageId, messageText) => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 1500);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleShare = async (messageId, messageText) => {
    try {
      if (navigator.share) {
        await navigator.share({ text: messageText });
      } else {
        await navigator.clipboard.writeText(messageText);
      }
      setSharedMessageId(messageId);
      setTimeout(() => setSharedMessageId(null), 1500);
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const toggleActionMenu = (messageId) => {
    setMenuOpenMessageId((prev) => (prev === messageId ? null : messageId));
  };

  const handleReadAloud = (messageId, messageText) => {
    if (!window.speechSynthesis) {
      return;
    }

    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      setMenuOpenMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();

    const speechText = toSpeechText(messageText);
    const utterance = new SpeechSynthesisUtterance(speechText || '');
    const selectedVoice = getPreferredSootheVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      utterance.lang = selectedVoice.lang;
    }

    utterance.volume = 0.48;
    utterance.rate = 0.72;
    utterance.pitch = 0.9;
    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    speechRef.current = utterance;
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
    setMenuOpenMessageId(null);
  };

  return (
    <div className='chat-messages' ref={messagesContainerRef}>
      {messages.length === 0 && (
        <div className='welcome-panel'>
          <h2>What can I help you with today?</h2>
          <p>Ask for ideas, code support, debugging help, or architecture suggestions.</p>
        </div>
      )}

      {messages.map((msg, index) => {
        const isStoppedUserMessage =
          msg.sender === 'user' &&
          index === messages.length - 1 &&
          !isAiThinking &&
          stoppedMessageIds instanceof Set &&
          stoppedMessageIds.has(msg.id);

        return (
        <div key={msg.id} className={`message-row ${msg.sender}`}>
          <div className='message-avatar'>{msg.sender === 'ai' ? 'AI' : 'You'}</div>
          <div className='message-content'>
            <div className={`message-bubble ${msg.sender}`}>
              {msg.sender === 'ai' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
              ) : (
                msg.text
              )}
            </div>

            {msg.sender === 'user' && isStoppedUserMessage && (
              <div className='message-actions user-message-actions'>
                <button
                  type='button'
                  className='message-action-btn'
                  onClick={() => onRetryUserMessage?.(msg.id)}
                  title='Retry this prompt'
                  aria-label='Retry this prompt'
                >
                  <RetryIcon />
                </button>
              </div>
            )}

            {msg.sender === 'ai' && (
              <div className='message-actions'>
                <button
                  type='button'
                  className={`message-action-btn ${copiedMessageId === msg.id ? 'active' : ''}`}
                  onClick={() => handleCopy(msg.id, msg.text)}
                  title='Copy'
                  aria-label='Copy response'
                >
                  <CopyIcon />
                </button>

                <button
                  type='button'
                  className={`message-action-btn ${msg.feedback === 'like' ? 'active' : ''}`}
                  onClick={() => onToggleFeedback(msg.id, 'like')}
                  title='Like'
                  aria-label='Like response'
                >
                  <LikeIcon />
                </button>

                <button
                  type='button'
                  className={`message-action-btn ${msg.feedback === 'dislike' ? 'active' : ''}`}
                  onClick={() => onToggleFeedback(msg.id, 'dislike')}
                  title='Dislike'
                  aria-label='Dislike response'
                >
                  <DislikeIcon />
                </button>

                <button
                  type='button'
                  className={`message-action-btn ${sharedMessageId === msg.id ? 'active' : ''}`}
                  onClick={() => handleShare(msg.id, msg.text)}
                  title='Share'
                  aria-label='Share response'
                >
                  <ShareIcon />
                </button>

                <button
                  type='button'
                  className='message-action-btn'
                  onClick={() => onRefreshResponse(msg.id)}
                  title='Refresh response'
                  aria-label='Refresh response'
                >
                  <RefreshIcon />
                </button>

                <div className='message-action-menu-wrap'>
                  <button
                    type='button'
                    className={`message-action-btn ${menuOpenMessageId === msg.id ? 'active' : ''}`}
                    onClick={() => toggleActionMenu(msg.id)}
                    title='More actions'
                    aria-label='More actions'
                  >
                    <MoreIcon />
                  </button>

                  {menuOpenMessageId === msg.id && (
                    <div className='message-action-menu' role='menu'>
                      <button
                        type='button'
                        className='message-action-menu-item'
                        onClick={() => handleReadAloud(msg.id, msg.text)}
                      >
                        <SpeakerIcon />
                        <span>{speakingMessageId === msg.id ? 'Stop reading' : 'Read aloud'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      );})}

      {isAiThinking && (
        <div className='message-row ai'>
          <div className='message-avatar'>AI</div>
          <div className='message-content'>
            <div className='message-bubble ai ai-thinking-bubble' aria-live='polite' aria-label='AI is thinking'>
              <span className='thinking-dot'></span>
              <span className='thinking-dot'></span>
              <span className='thinking-dot'></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatMessages;
