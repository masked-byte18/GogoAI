import { useEffect, useRef } from 'react';
import './ChatInput.css';

const ChatInput = ({
  inputMessage,
  setInputMessage,
  handleSendMessage,
  isAiThinking = false,
  onStopThinking,
  retryInputFocusKey = 0,
  aiLimitNotice = ''
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    inputRef.current.focus();
    const textLength = inputRef.current.value.length;
    inputRef.current.setSelectionRange(textLength, textLength);
  }, [retryInputFocusKey]);

  const handleSubmit = (event) => {
    if (isAiThinking) {
      event.preventDefault();
      onStopThinking?.();
      return;
    }

    handleSendMessage(event);
  };
    
  return (
    <form className='chat-input-area' onSubmit={handleSubmit}>
      {aiLimitNotice ? <p className='chat-input-limit-notice'>{aiLimitNotice}</p> : null}
      <input
        ref={inputRef}
        type='text'
        placeholder='Message AI...'
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
      />
      <button type='submit' aria-label={isAiThinking ? 'Stop response' : 'Send message'} className={isAiThinking ? 'stop-mode' : ''}>
        {isAiThinking ? (
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='send-icon'>
            <rect x='7' y='7' width='10' height='10' rx='2'></rect>
          </svg>
        ) : (
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className='send-icon'>
            <line x1='22' y1='2' x2='11' y2='13'></line>
            <polygon points='22 2 15 22 11 13 2 9 22 2'></polygon>
          </svg>
        )}
      </button>
    </form>
  );
};

export default ChatInput;
