import { useEffect, useRef, useState } from 'react';
import ChatItemMenu from './ChatItemMenu';

const PinIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M15 3l6 6-3 1-3 6-2-2-4 4'></path>
    <path d='M2 22l7-7'></path>
  </svg>
);

const ChatHistoryItem = ({
  chat,
  isActive,
  isProcessing = false,
  onSelect,
  onShare,
  onRename,
  onTogglePin,
  onToggleArchive,
  onDelete,
  onReorder
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(chat.title);
  const itemRef = useRef(null);
  const renameInputRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (event.target instanceof Element && event.target.closest('.chat-item-menu-floating')) {
        return;
      }

      if (itemRef.current && !itemRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  const handleStartRename = () => {
    setIsMenuOpen(false);
    setRenameValue(chat.title);
    setIsRenaming(true);
  };

  const handleCancelRename = () => {
    setRenameValue(chat.title);
    setIsRenaming(false);
  };

  const handleCommitRename = () => {
    const nextTitle = renameValue.trim();

    if (!nextTitle) {
      handleCancelRename();
      return;
    }

    if (nextTitle !== chat.title) {
      onRename(chat.id, nextTitle);
    }

    setIsRenaming(false);
  };

  const handleDragStart = (event) => {
    if (chat.archived || isProcessing) {
      return;
    }

    event.dataTransfer.setData('text/chat-id', String(chat.id));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event) => {
    if (!chat.archived && !isProcessing) {
      event.preventDefault();
    }
  };

  const handleDrop = (event) => {
    if (chat.archived || isProcessing) {
      return;
    }

    event.preventDefault();
    const draggedChatId = String(event.dataTransfer.getData('text/chat-id') || '').trim();

    if (draggedChatId && draggedChatId !== String(chat.id)) {
      onReorder(draggedChatId, chat.id);
    }
  };

  return (
    <li
      ref={itemRef}
      className={`history-entry ${chat.archived ? 'archived' : ''}`}
      draggable={!chat.archived && !isRenaming && !isProcessing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={`history-item-shell ${isActive ? 'active' : ''}`}>
        <button
          type='button'
          className={`history-item ${isActive ? 'active' : ''} ${isRenaming ? 'renaming' : ''}`}
          onClick={() => onSelect(chat.id)}
          disabled={chat.archived || isRenaming}
        >
          <span className='history-item-title-row'>
            {isRenaming ? (
              <input
                ref={renameInputRef}
                type='text'
                className='history-item-title-input'
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onBlur={handleCommitRename}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleCommitRename();
                  }

                  if (event.key === 'Escape') {
                    event.preventDefault();
                    handleCancelRename();
                  }
                }}
                aria-label='Rename chat title'
              />
            ) : (
              <span className='history-item-title'>{chat.title}</span>
            )}
          </span>
        </button>

        <div className='history-item-controls'>
          {chat.pinned && (
            <span className='history-pinned-icon' title='Pinned'>
              <PinIcon />
            </span>
          )}

          <ChatItemMenu
            isOpen={isMenuOpen}
            isActive={isActive}
            isPinned={chat.pinned}
            isArchived={chat.archived}
            onToggleMenu={() => setIsMenuOpen((prev) => !prev)}
            onShare={() => {
              setIsMenuOpen(false);
              onShare(chat.id);
            }}
            onRename={() => {
              handleStartRename();
            }}
            onTogglePin={() => {
              setIsMenuOpen(false);
              onTogglePin(chat.id);
            }}
            onToggleArchive={() => {
              setIsMenuOpen(false);
              onToggleArchive(chat.id);
            }}
            onDelete={() => {
              setIsMenuOpen(false);
              onDelete(chat.id);
            }}
          />
        </div>
      </div>
    </li>
  );
};

export default ChatHistoryItem;
