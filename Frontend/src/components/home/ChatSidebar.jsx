import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import ChatHistoryItem from './ChatHistoryItem';
import gemIconAsset from '../../assets/gem.png';
import './ChatSidebar.css';

const ArrowRightIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.1' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d='M9 6l6 6-6 6'></path>
  </svg>
);

const EyeIcon = ({ isOpen }) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d='M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z'></path>
    <circle cx='12' cy='12' r='3'></circle>
    {!isOpen && <line x1='4' y1='20' x2='20' y2='4'></line>}
  </svg>
);

const ChatSidebar = ({
  isSidebarOpen,
  toggleSidebar,
  chatHistory,
  processingChatId,
  activeChat,
  setActiveChat,
  createNewChat,
  onShareChat,
  onRenameChat,
  onTogglePinChat,
  onToggleArchiveChat,
  onDeleteChat,
  onReorderChats,
  isAuthenticated,
  recentGems = [],
  privateGems = [],
  privateGemIds = new Set(),
  hasPrivateAccessPassword = false,
  isPrivateGemsUnlocked = false,
  onUnlockPrivateGems,
  onLockPrivateGems,
  onStartChatWithGem,
  onLogout
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrivatePromptOpen, setIsPrivatePromptOpen] = useState(false);
  const [privatePasswordInput, setPrivatePasswordInput] = useState('');
  const [showPrivatePassword, setShowPrivatePassword] = useState(false);
  const [privatePasswordError, setPrivatePasswordError] = useState('');
  const [isUnlockingPrivate, setIsUnlockingPrivate] = useState(false);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const matchesSearch = (chat) => {
    if (!normalizedSearch) {
      return true;
    }

    return String(chat?.title || '').toLowerCase().includes(normalizedSearch);
  };

  const visibleChats = chatHistory.filter((chat) => {
    if (chat.archived) {
      return false;
    }

    const rawBot = chat?.bot;
    const chatBotId =
      typeof rawBot === 'object' && rawBot !== null
        ? rawBot.id ?? rawBot._id
        : rawBot;

    if (!isPrivateGemsUnlocked && chatBotId && privateGemIds.has(String(chatBotId))) {
      return false;
    }

    return true;
  });

  const archivedChats = chatHistory.filter((chat) => {
    if (!chat.archived) {
      return false;
    }

    const rawBot = chat?.bot;
    const chatBotId =
      typeof rawBot === 'object' && rawBot !== null
        ? rawBot.id ?? rawBot._id
        : rawBot;

    if (!isPrivateGemsUnlocked && chatBotId && privateGemIds.has(String(chatBotId))) {
      return false;
    }

    return true;
  });

  const filteredVisibleChats = visibleChats.filter(matchesSearch);
  const filteredArchivedChats = archivedChats.filter(matchesSearch);

  const sortedVisibleChats = [...filteredVisibleChats].sort((left, right) => {
    const leftProcessing = left.id === processingChatId;
    const rightProcessing = right.id === processingChatId;

    if (leftProcessing && !rightProcessing) {
      return -1;
    }

    if (!leftProcessing && rightProcessing) {
      return 1;
    }

    return 0;
  });

  const sortedArchivedChats = [...filteredArchivedChats].sort((left, right) => {
    const leftProcessing = left.id === processingChatId;
    const rightProcessing = right.id === processingChatId;

    if (leftProcessing && !rightProcessing) {
      return -1;
    }

    if (!leftProcessing && rightProcessing) {
      return 1;
    }

    return 0;
  });

  const handleReorder = (fromChatId, toChatId) => {
    if (!fromChatId || !toChatId || fromChatId === toChatId) {
      return;
    }

    if (String(fromChatId) === String(processingChatId) || String(toChatId) === String(processingChatId)) {
      return;
    }

    onReorderChats(fromChatId, toChatId);
  };

  const canShowEmptySearchState = normalizedSearch && sortedVisibleChats.length === 0 && sortedArchivedChats.length === 0;

  const displayedGems = useMemo(() => {
    const allGems = Array.isArray(recentGems) ? recentGems : [];
    return allGems
      .filter((gem) => {
        const gemId = String(gem?.id || '');
        const isPrivateByVisibility = String(gem?.visibility || '').toLowerCase() === 'private';
        const isPrivateById = gemId && privateGemIds.has(gemId);

        return !isPrivateByVisibility && !isPrivateById;
      })
      .slice(0, 2);
  }, [privateGemIds, recentGems]);

  const displayedPrivateGems = useMemo(() => {
    return Array.isArray(privateGems) ? privateGems : [];
  }, [privateGems]);

  const handlePrivateUnlock = async () => {
    if (!onUnlockPrivateGems || isUnlockingPrivate) {
      return;
    }

    setIsUnlockingPrivate(true);
    setPrivatePasswordError('');

    const result = await onUnlockPrivateGems(privatePasswordInput);

    if (!result?.ok) {
      setPrivatePasswordError(result?.message || 'Unable to unlock private gems');
      setIsUnlockingPrivate(false);
      return;
    }

    setPrivatePasswordInput('');
    setPrivatePasswordError('');
    setIsPrivatePromptOpen(false);
    setIsUnlockingPrivate(false);
  };

  return (
    <aside className={`chat-sidebar ${isSidebarOpen ? 'open' : ''}`}>
      <div className='sidebar-header'>
        <p className='sidebar-kicker'>Workspace</p>
        <h2>Conversations</h2>
        <p className='sidebar-subtitle'>Pick a thread or start a new one.</p>

        <div className='sidebar-search-wrap'>
          <input
            type='text'
            className='sidebar-search-input'
            placeholder='Search chats'
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label='Search chats'
          />
        </div>

        <div className='sidebar-actions'>
          <button className='new-chat-btn' onClick={createNewChat} title='New Chat'>
            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <line x1='12' y1='5' x2='12' y2='19'></line>
              <line x1='5' y1='12' x2='19' y2='12'></line>
            </svg>
            <span>New Chat</span>
          </button>
          <button className='close-btn' onClick={toggleSidebar} aria-label='Close sidebar'>
            &times;
          </button>
        </div>
      </div>

      <div className='sidebar-scroll'>
        {isAuthenticated && (
          <>
          <section className='sidebar-gems-section'>
            <div className='sidebar-section-header'>
              <p>Gems</p>
              <Link className='sidebar-section-arrow' to='/gems' aria-label='Open Gems'>
                <ArrowRightIcon />
              </Link>
            </div>

            {displayedGems.length > 0 ? (
              <div className='sidebar-gems-list'>
                {displayedGems.map((gem) => {
                  const gemId = String(gem.id || '');

                  if (onStartChatWithGem) {
                    return (
                      <button
                        key={gemId}
                        type='button'
                        className='sidebar-gem-item'
                        onClick={() => onStartChatWithGem(gem)}
                      >
                        {gem.avatarUrl ? (
                          <span className='sidebar-gem-avatar'>
                            <img src={gem.avatarUrl} alt={gem.name} />
                          </span>
                        ) : (
                          <span className='sidebar-gem-icon'>
                            <img src={gemIconAsset} alt='' className='sidebar-gem-fallback-icon' />
                          </span>
                        )}
                        <span className='sidebar-gem-name'>{gem.name}</span>
                      </button>
                    );
                  }

                  return (
                    <Link key={gemId} className='sidebar-gem-item' to='/gems'>
                      {gem.avatarUrl ? (
                        <span className='sidebar-gem-avatar'>
                          <img src={gem.avatarUrl} alt={gem.name} />
                        </span>
                      ) : (
                        <span className='sidebar-gem-icon'>
                          <img src={gemIconAsset} alt='' className='sidebar-gem-fallback-icon' />
                        </span>
                      )}
                      <span className='sidebar-gem-name'>{gem.name}</span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className='sidebar-section-empty'>No gems used yet.</p>
            )}
          </section>

          <section className='sidebar-gems-section'>
            <div className='sidebar-section-header'>
              <p>Private Gems</p>
            </div>

            {!hasPrivateAccessPassword ? (
              <p className='sidebar-section-empty'>Set private gems password in Gem Editor first.</p>
            ) : !isPrivateGemsUnlocked ? (
              <button
                type='button'
                className='sidebar-private-unlock-btn'
                onClick={() => {
                  setIsPrivatePromptOpen(true);
                  setPrivatePasswordError('');
                }}
              >
                Unlock Private Gems
              </button>
            ) : displayedPrivateGems.length > 0 ? (
              <div className='sidebar-gems-list'>
                {displayedPrivateGems.map((gem) => (
                  <button
                    key={gem.id}
                    type='button'
                    className='sidebar-gem-item'
                    onClick={() => onStartChatWithGem?.(gem)}
                  >
                    {gem.avatarUrl ? (
                      <span className='sidebar-gem-avatar'>
                        <img src={gem.avatarUrl} alt={gem.name} />
                      </span>
                    ) : (
                      <span className='sidebar-gem-icon'>
                        <img src={gemIconAsset} alt='' className='sidebar-gem-fallback-icon' />
                      </span>
                    )}
                    <span className='sidebar-gem-name'>{gem.name}</span>
                  </button>
                ))}
                <button type='button' className='sidebar-private-lock-btn' onClick={onLockPrivateGems}>
                  Lock Private Gems
                </button>
              </div>
            ) : (
              <p className='sidebar-section-empty'>No private gems found.</p>
            )}
          </section>
          </>
        )}

        <section className='sidebar-chats-section'>
          <div className='sidebar-section-header'>
            <p>Chats</p>
          </div>

          {canShowEmptySearchState ? (
            <p className='sidebar-section-empty'>No chats found.</p>
          ) : (
            <>
              <ul className='history-list'>
                {sortedVisibleChats.map((chat) => (
                  <ChatHistoryItem
                    key={chat.id}
                    chat={chat}
                    isActive={activeChat === chat.id}
                    onSelect={setActiveChat}
                    onShare={onShareChat}
                    onRename={onRenameChat}
                    onTogglePin={onTogglePinChat}
                    onToggleArchive={onToggleArchiveChat}
                    onDelete={onDeleteChat}
                    isProcessing={String(chat.id) === String(processingChatId || '')}
                    onReorder={handleReorder}
                  />
                ))}
              </ul>

              {sortedArchivedChats.length > 0 && (
                <div className='archived-group'>
                  <p className='archived-title'>Archived</p>
                  <ul className='history-list archived-list'>
                    {sortedArchivedChats.map((chat) => (
                      <ChatHistoryItem
                        key={chat.id}
                        chat={chat}
                        isActive={false}
                        onSelect={setActiveChat}
                        onShare={onShareChat}
                        onRename={onRenameChat}
                        onTogglePin={onTogglePinChat}
                        onToggleArchive={onToggleArchiveChat}
                        onDelete={onDeleteChat}
                        isProcessing={String(chat.id) === String(processingChatId || '')}
                        onReorder={handleReorder}
                      />
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <div className='sidebar-footer'>
        <p className='sidebar-tip'>Tip: press Enter to send quickly.</p>
        {isAuthenticated ? (
          <button type='button' className='sidebar-logout-btn' onClick={onLogout}>
            Log Out
          </button>
        ) : (
          <div className='sidebar-auth-links'>
            <Link className='sidebar-auth-link login' to='/login'>
              Login
            </Link>
            <Link className='sidebar-auth-link signup' to='/register'>
              Sign Up
            </Link>
          </div>
        )}
      </div>

      {isPrivatePromptOpen && (
        <div className='sidebar-private-modal-backdrop' onClick={() => setIsPrivatePromptOpen(false)}>
          <div className='sidebar-private-modal' onClick={(event) => event.stopPropagation()}>
            <h3>Unlock Private Gems</h3>
            <p>Enter your global private gems password.</p>
            <div className='sidebar-password-input-wrap'>
              <input
                type={showPrivatePassword ? 'text' : 'password'}
                value={privatePasswordInput}
                onChange={(event) => setPrivatePasswordInput(event.target.value)}
                placeholder='Enter password'
              />
              <button
                type='button'
                className='sidebar-password-visibility-btn'
                aria-label={showPrivatePassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPrivatePassword((prev) => !prev)}
              >
                <EyeIcon isOpen={showPrivatePassword} />
              </button>
            </div>
            {privatePasswordError && <p className='sidebar-private-error'>{privatePasswordError}</p>}
            <div className='sidebar-private-modal-actions'>
              <button type='button' onClick={() => setIsPrivatePromptOpen(false)}>
                Cancel
              </button>
              <button type='button' onClick={handlePrivateUnlock} disabled={isUnlockingPrivate}>
                {isUnlockingPrivate ? 'Unlocking...' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default ChatSidebar;
