import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ShareIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7'></path>
    <path d='M12 16V4'></path>
    <path d='M8 8l4-4 4 4'></path>
  </svg>
);

const RenameIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M12 20h9'></path>
    <path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z'></path>
  </svg>
);

const PinIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M15 3l6 6-3 1-3 6-2-2-4 4'></path>
    <path d='M2 22l7-7'></path>
  </svg>
);

const ArchiveIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
    <rect x='3' y='4' width='18' height='4' rx='1'></rect>
    <path d='M5 8v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8'></path>
    <path d='M10 13h4'></path>
  </svg>
);

const DeleteIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round'>
    <path d='M3 6h18'></path>
    <path d='M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2'></path>
    <path d='M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6'></path>
    <path d='M10 11v6'></path>
    <path d='M14 11v6'></path>
  </svg>
);

const ChatItemMenu = ({
  isOpen,
  isActive,
  isPinned,
  isArchived,
  onToggleMenu,
  onShare,
  onRename,
  onTogglePin,
  onToggleArchive,
  onDelete
}) => {
  const toggleRef = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState({ top: 0, left: 0 });
  const [menuDirection, setMenuDirection] = useState('down');

  const updatePosition = useCallback(() => {
    if (!isOpen || !toggleRef.current || !menuRef.current) {
      return;
    }

    const triggerRect = toggleRef.current.getBoundingClientRect();
    const menuRect = menuRef.current.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 8;

    const canOpenUp = triggerRect.top - gap - menuRect.height >= viewportPadding;
    const direction = canOpenUp ? 'up' : 'down';

    const rawTop = direction === 'up'
      ? triggerRect.top - menuRect.height - gap
      : triggerRect.bottom + gap;

    const rawLeft = triggerRect.left;

    const top = Math.max(
      viewportPadding,
      Math.min(rawTop, window.innerHeight - menuRect.height - viewportPadding)
    );

    const left = Math.max(
      viewportPadding,
      Math.min(rawLeft, window.innerWidth - menuRect.width - viewportPadding)
    );

    setMenuDirection(direction);
    setMenuStyle({ top, left });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const frameId = window.requestAnimationFrame(updatePosition);

    const handleViewportChange = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <div className='chat-item-menu-wrap'>
      <button
        ref={toggleRef}
        type='button'
        className={`chat-item-menu-toggle ${isOpen ? 'open' : ''} ${isActive ? 'active' : ''}`}
        onClick={onToggleMenu}
        aria-label='Chat options'
        title='Chat options'
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={`chat-item-menu chat-item-menu-floating ${menuDirection}`}
            style={menuStyle}
          >
            <button type='button' onClick={onShare}>
              <ShareIcon />
              <span>Share chat</span>
            </button>
            <button type='button' onClick={onRename}>
              <RenameIcon />
              <span>Rename</span>
            </button>
            <div className='chat-item-menu-divider'></div>
            <button type='button' onClick={onTogglePin}>
              <PinIcon />
              <span>{isPinned ? 'Unpin chat' : 'Pin chat'}</span>
            </button>
            <button type='button' onClick={onToggleArchive}>
              <ArchiveIcon />
              <span>{isArchived ? 'Unarchive chat' : 'Archive'}</span>
            </button>
            <button type='button' className='danger' onClick={onDelete}>
              <DeleteIcon />
              <span>Delete</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ChatItemMenu;
