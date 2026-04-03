import './ChatHeader.css';
import logoAsset from '../../assets/logo.png';

const ChatHeader = ({ activeChatTitle, toggleSidebar }) => {
  return (
    <header className='chat-header'>
      <div className='chat-header-left'>
        <button className='hamburger-btn' onClick={toggleSidebar} aria-label='Open sidebar'>
          <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <line x1='3' y1='12' x2='21' y2='12'></line>
            <line x1='3' y1='6' x2='21' y2='6'></line>
            <line x1='3' y1='18' x2='21' y2='18'></line>
          </svg>
        </button>
        <span className='chat-header-logo-wrap'>
          <img src={logoAsset} alt='GogoAI logo' className='chat-header-logo' />
        </span>
        <div>
          <p className='chat-header-kicker'>GogoAI</p>
          <h1>{activeChatTitle}</h1>
        </div>
      </div>

      <div className='chat-header-right'>
        <span className='status-chip'>Online</span>
      </div>
    </header>
  );
};

export default ChatHeader;
