import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ChatSidebar from '../components/home/ChatSidebar';
import ChatHeader from '../components/home/ChatHeader';
import { useHomeChatController } from './home/useHomeChatController';
import {
  fetchMyBotsRequest,
  fetchPrivateAccessSettingsRequest,
  fetchPublicBotsRequest,
  updateFeaturedInPublicRequest,
  deleteBotRequest,
  setupPrivateAccessRequest,
  updatePrivateAccessPasswordRequest
} from '../services/botApi';
import gemIconAsset from '../assets/gem.png';
import '../components/home/HomeLayout.css';
import './Gems.css';

const SparkIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d='M12 3l1.9 3.9L18 8.8l-3.1 3 0.7 4.2-3.6-1.9-3.6 1.9 0.7-4.2-3.1-3 4.1-1.9L12 3z'></path>
  </svg>
);

const InfoIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <circle cx='12' cy='12' r='9'></circle>
    <line x1='12' y1='10' x2='12' y2='16'></line>
    <line x1='12' y1='7' x2='12.01' y2='7'></line>
  </svg>
);

const MoreIcon = () => (
  <svg viewBox='0 0 24 24' fill='currentColor' aria-hidden='true'>
    <circle cx='12' cy='6' r='1.8'></circle>
    <circle cx='12' cy='12' r='1.8'></circle>
    <circle cx='12' cy='18' r='1.8'></circle>
  </svg>
);

const ShareIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <circle cx='18' cy='5' r='3'></circle>
    <circle cx='6' cy='12' r='3'></circle>
    <circle cx='18' cy='19' r='3'></circle>
    <line x1='8.8' y1='10.7' x2='15.3' y2='6.2'></line>
    <line x1='8.8' y1='13.3' x2='15.3' y2='17.8'></line>
  </svg>
);

const EditIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d='M12 20h9'></path>
    <path d='M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z'></path>
  </svg>
);

const UploadMenuIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d='M12 16V4'></path>
    <path d='M8 8l4-4 4 4'></path>
    <path d='M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4'></path>
  </svg>
);

const DeleteMenuIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.9' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d='M3 6h18'></path>
    <path d='M8 6V4h8v2'></path>
    <path d='M6 6l1 14h10l1-14'></path>
    <path d='M10 11v6'></path>
    <path d='M14 11v6'></path>
  </svg>
);

const pickAvatarColor = (index) => {
  const colors = ['#8f4a00', '#005f96', '#7c3aed', '#0f766e', '#9a3412'];
  return colors[index % colors.length];
};

const toInitial = (name) => String(name || '').trim().charAt(0).toUpperCase() || 'G';
const normalizeVisibility = (value) => String(value || '').trim().toLowerCase();

const EyeIcon = ({ isOpen }) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d='M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z'></path>
    <circle cx='12' cy='12' r='3'></circle>
    {!isOpen && <line x1='4' y1='20' x2='20' y2='4'></line>}
  </svg>
);

const Gems = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    chats,
    createNewChat,
    currentChatId,
    handleDeleteChat,
    handleRenameChat,
    handleReorderChats,
    handleSelectChatWithMessages,
    handleShareChat,
    handleToggleArchive,
    handleTogglePinChat,
    handleLogout,
    isAuthenticated,
    isDraftChatActive,
    isSidebarOpen,
    processingChatId,
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
    toggleSidebar
  } = useHomeChatController({ enableRouteSync: false });

  const [publicBots, setPublicBots] = useState([]);
  const [myBots, setMyBots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [hasGlobalPrivatePassword, setHasGlobalPrivatePassword] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    recoveryAnswer: '',
    newPassword: '',
    setupPassword: '',
    setupRecoveryAnswer: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [isUnlockingPrivate, setIsUnlockingPrivate] = useState(false);
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [featureUpdatingById, setFeatureUpdatingById] = useState({});
  const [openActionsBotId, setOpenActionsBotId] = useState('');
  const [actionsMenuPosition, setActionsMenuPosition] = useState({ top: 0, right: 0 });
  const [deletingBotId, setDeletingBotId] = useState('');

  const createdGemId = searchParams.get('created') || '';

  useEffect(() => {
    let cancelled = false;

    const loadBots = async () => {
      try {
        setIsLoading(true);
        setLoadError('');

        const [fetchedPublicBots, fetchedMyBots, privateAccessSettings] = await Promise.all([
          fetchPublicBotsRequest(),
          fetchMyBotsRequest(),
          fetchPrivateAccessSettingsRequest()
        ]);

        if (cancelled) {
          return;
        }

        const myIds = new Set((Array.isArray(fetchedMyBots) ? fetchedMyBots : []).map((bot) => String(bot.id || bot._id || '')));

        const filteredPublic = (Array.isArray(fetchedPublicBots) ? fetchedPublicBots : []).filter(
          (bot) => !myIds.has(String(bot.id || bot._id || ''))
        );

        setPublicBots(filteredPublic);
        setMyBots(Array.isArray(fetchedMyBots) ? fetchedMyBots : []);
        setHasGlobalPrivatePassword(Boolean(privateAccessSettings?.hasPassword));
      } catch {
        if (!cancelled) {
          setLoadError('Unable to load gems right now.');
          setPublicBots([]);
          setMyBots([]);
          setHasGlobalPrivatePassword(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadBots();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event) => {
      const target = event.target;
      if (target instanceof Element && (target.closest('.gem-actions-menu-wrap') || target.closest('.gem-actions-menu'))) {
        return;
      }

      setOpenActionsBotId('');
    };

    document.addEventListener('mousedown', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (!openActionsBotId) {
      return undefined;
    }

    const handleWindowScroll = () => {
      setOpenActionsBotId('');
    };

    window.addEventListener('scroll', handleWindowScroll, true);
    window.addEventListener('resize', handleWindowScroll);

    return () => {
      window.removeEventListener('scroll', handleWindowScroll, true);
      window.removeEventListener('resize', handleWindowScroll);
    };
  }, [openActionsBotId]);

  const visiblePublicBots = useMemo(() => {
    const all = Array.isArray(publicBots) ? publicBots : [];
    return isExpanded ? all : all.slice(0, 4);
  }, [isExpanded, publicBots]);

  const publicMyBots = useMemo(() => {
    return (Array.isArray(myBots) ? myBots : []).filter(
      (bot) => normalizeVisibility(bot?.visibility) !== 'private'
    );
  }, [myBots]);

  const privateMyBots = useMemo(() => {
    return (Array.isArray(myBots) ? myBots : []).filter(
      (bot) => normalizeVisibility(bot?.visibility) === 'private'
    );
  }, [myBots]);

  const handleStartChatWithBot = (bot) => {
    const botId = String(bot?.id || bot?._id || '');
    if (!botId) {
      return;
    }

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    startDraftChatWithGem({
      id: botId,
      name: String(bot?.name || '').trim() || 'New Gem Chat'
    });
  };

  const handleSubmitPasswordForm = async () => {
    if (isSubmittingPassword) {
      return;
    }

    setPasswordError('');
    setPasswordSuccess('');
    setIsSubmittingPassword(true);

    try {
      if (!hasGlobalPrivatePassword) {
        await setupPrivateAccessRequest({
          password: passwordForm.setupPassword,
          recoveryAnswer: passwordForm.setupRecoveryAnswer
        });
        setHasGlobalPrivatePassword(true);
        setPasswordSuccess('Private gems password has been set.');
      } else {
        await updatePrivateAccessPasswordRequest({
          currentPassword: passwordForm.currentPassword,
          recoveryAnswer: passwordForm.recoveryAnswer,
          newPassword: passwordForm.newPassword
        });
        setPasswordSuccess('Private gems password updated successfully.');
      }

      setPasswordForm({
        currentPassword: '',
        recoveryAnswer: '',
        newPassword: '',
        setupPassword: '',
        setupRecoveryAnswer: ''
      });
    } catch (error) {
      setPasswordError(error?.response?.data?.message || 'Unable to save private gems password.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleUnlockPrivateInManager = async () => {
    if (isUnlockingPrivate) {
      return;
    }

    setUnlockError('');
    setIsUnlockingPrivate(true);

    const result = await unlockPrivateGemsInManager(unlockPassword);
    if (!result?.ok) {
      setUnlockError(result?.message || 'Unable to unlock private gems');
      setIsUnlockingPrivate(false);
      return;
    }

    setUnlockPassword('');
    setUnlockError('');
    setIsUnlockModalOpen(false);
    setIsUnlockingPrivate(false);
  };

  const handleToggleFeaturedUpload = async (bot) => {
    const botId = String(bot?.id || bot?._id || '');
    if (!botId) {
      return;
    }

    if (featureUpdatingById[botId]) {
      return;
    }

    const isPublic = normalizeVisibility(bot?.visibility) === 'public';
    if (!isPublic) {
      return;
    }

    const nextValue = !(bot?.featuredInPublic === true);
    setFeatureUpdatingById((prev) => ({ ...prev, [botId]: true }));

    setMyBots((prev) =>
      (Array.isArray(prev) ? prev : []).map((item) => {
        const itemId = String(item?.id || item?._id || '');
        if (itemId !== botId) {
          return item;
        }

        return {
          ...item,
          featuredInPublic: nextValue
        };
      })
    );

    try {
      const updated = await updateFeaturedInPublicRequest(botId, nextValue);

      setMyBots((prev) =>
        (Array.isArray(prev) ? prev : []).map((item) => {
          const itemId = String(item?.id || item?._id || '');
          if (itemId !== botId) {
            return item;
          }

          return {
            ...item,
            ...(updated || {}),
            featuredInPublic: updated?.featuredInPublic === true
          };
        })
      );
    } catch (error) {
      setMyBots((prev) =>
        (Array.isArray(prev) ? prev : []).map((item) => {
          const itemId = String(item?.id || item?._id || '');
          if (itemId !== botId) {
            return item;
          }

          return {
            ...item,
            featuredInPublic: bot?.featuredInPublic === true
          };
        })
      );

      setLoadError(error?.response?.data?.message || 'Unable to update featured gem setting.');
    } finally {
      setFeatureUpdatingById((prev) => ({ ...prev, [botId]: false }));
    }
  };

  const handleDeleteGem = async (bot) => {
    const botId = String(bot?.id || bot?._id || '');
    if (!botId || deletingBotId) {
      return;
    }

    const name = String(bot?.name || '').trim() || 'this gem';
    const confirmed = window.confirm(`Delete ${name}?`);
    if (!confirmed) {
      return;
    }

    setDeletingBotId(botId);
    setOpenActionsBotId('');

    const previousMyBots = Array.isArray(myBots) ? [...myBots] : [];
    setMyBots((prev) => (Array.isArray(prev) ? prev.filter((item) => String(item?.id || item?._id || '') !== botId) : []));

    try {
      await deleteBotRequest(botId);
    } catch (error) {
      setMyBots(previousMyBots);
      setLoadError(error?.response?.data?.message || 'Unable to delete gem right now.');
    } finally {
      setDeletingBotId('');
    }
  };

  const openActionsMenu = (botId, triggerElement) => {
    if (!triggerElement) {
      return;
    }

    const rect = triggerElement.getBoundingClientRect();
    setActionsMenuPosition({
      top: Math.round(rect.bottom + 8),
      right: Math.round(window.innerWidth - rect.right)
    });

    setOpenActionsBotId((prev) => (prev === botId ? '' : botId));
  };

  return (
    <main className='page page-home'>
      <section className='chat-shell'>
        {isSidebarOpen && <div className='chat-sidebar-overlay' onClick={toggleSidebar}></div>}

        <ChatSidebar
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          chatHistory={chats}
          processingChatId={processingChatId}
          activeChat={isDraftChatActive ? null : currentChatId}
          setActiveChat={handleSelectChatWithMessages}
          createNewChat={createNewChat}
          onShareChat={handleShareChat}
          onRenameChat={handleRenameChat}
          onTogglePinChat={handleTogglePinChat}
          onToggleArchiveChat={handleToggleArchive}
          onDeleteChat={handleDeleteChat}
          onReorderChats={handleReorderChats}
          isAuthenticated={isAuthenticated}
          recentGems={recentGems}
          privateGems={privateGems}
          privateGemIds={privateGemIds}
          hasPrivateAccessPassword={hasPrivateAccessPassword}
          isPrivateGemsUnlocked={isPrivateGemsUnlocked}
          onUnlockPrivateGems={unlockPrivateGems}
          onLockPrivateGems={lockPrivateGems}
          onStartChatWithGem={startDraftChatWithGem}
          onLogout={handleLogout}
        />

        <div className='chat-main gems-main'>
          <div className='gems-mobile-header'>
            <ChatHeader activeChatTitle='Gems' toggleSidebar={toggleSidebar} />
          </div>

          <div className='gems-body'>
            <section className='gems-page-head'>
              <div className='gems-page-title-wrap'>
                <img src={gemIconAsset} alt='' aria-hidden='true' className='gems-page-title-icon' />
                <h1>Gem manager</h1>
              </div>
            </section>

            {loadError && <p className='gems-load-error'>{loadError}</p>}

            <section className='gems-section'>
              <div className='gems-section-head'>
                <h2>Featured Gems</h2>
                {publicBots.length > 4 && (
                  <button
                    type='button'
                    className='gems-show-more-btn'
                    onClick={() => setIsExpanded((prev) => !prev)}
                  >
                    {isExpanded ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>

              <div className='premade-grid' role='list'>
                {visiblePublicBots.map((bot, index) => {
                  const botId = String(bot.id || bot._id || '');

                  return (
                  <article
                    key={botId}
                    className='premade-card'
                    role='listitem'
                    onClick={() => handleStartChatWithBot(bot)}
                  >
                    <div className='premade-card-top'>
                      <span className='premade-avatar' style={{ background: bot.avatarBackground || pickAvatarColor(index) }}>
                        {bot.avatarUrl ? <img src={bot.avatarUrl} alt={bot.name || 'Gem avatar'} /> : <SparkIcon />}
                      </span>
                      <span className='premade-badge'>Experiment</span>
                      <button
                        type='button'
                        className='icon-btn icon-btn-ghost'
                        aria-label='More options'
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreIcon />
                      </button>
                    </div>

                    <h3>{bot.name || 'Untitled Gem'}</h3>
                    <p>{bot.description || 'No description yet.'}</p>
                  </article>
                );})}

                {!isLoading && visiblePublicBots.length === 0 && (
                  <p className='gems-empty'>No featured gems available yet.</p>
                )}
              </div>
            </section>

            <section className='gems-section'>
              <div className='gems-section-head my-gems-head'>
                <div className='my-gems-title-wrap'>
                  <h2>My Gems</h2>
                  <span className='my-gems-info' title='Gems created by you'>
                    <InfoIcon />
                  </span>
                </div>

                <div className='my-gems-actions'>
                  <button type='button' className='new-gem-btn primary' onClick={() => navigate('/gems/new')}>
                    <span>+</span>
                    <span>New Gem</span>
                  </button>

                  <button
                    type='button'
                    className='new-gem-btn secondary'
                    onClick={() => {
                      setIsPasswordModalOpen(true);
                      setPasswordError('');
                      setPasswordSuccess('');
                    }}
                  >
                    <span>{hasGlobalPrivatePassword ? 'Update Password' : 'Set Password'}</span>
                  </button>
                </div>
              </div>

              <div className='my-gems-list' role='list'>
                {publicMyBots.map((bot, index) => {
                  const botId = String(bot.id || bot._id || '');
                  const isJustCreated = Boolean(createdGemId) && botId === String(createdGemId);

                  return (
                    <article
                      key={botId}
                      className={`my-gem-row ${isJustCreated ? 'newly-created' : ''}`}
                      role='listitem'
                      onClick={() => handleStartChatWithBot(bot)}
                    >
                      <div className='my-gem-main'>
                        <span
                          className='my-gem-avatar'
                          style={{
                            background: bot.avatarBackground || pickAvatarColor(index)
                          }}
                        >
                          {bot.avatarUrl ? (
                            <img src={bot.avatarUrl} alt={bot.name || 'Gem avatar'} />
                          ) : (
                            toInitial(bot.name)
                          )}
                        </span>

                        <div className='my-gem-copy'>
                          <h3>{bot.name || 'Untitled Gem'}</h3>
                          <p>{bot.description || 'No description yet.'}</p>
                        </div>
                      </div>

                      <div className='my-gem-actions'>
                        <button
                          type='button'
                          className='icon-btn'
                          aria-label='Share gem'
                          onClick={(event) => event.stopPropagation()}
                        >
                          <ShareIcon />
                        </button>
                        <button
                          type='button'
                          className='icon-btn'
                          aria-label='Edit gem'
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/gems/${encodeURIComponent(botId)}/edit`);
                          }}
                        >
                          <EditIcon />
                        </button>
                        <div className='gem-actions-menu-wrap' onClick={(event) => event.stopPropagation()}>
                          <button
                            type='button'
                            className='icon-btn'
                            aria-label='More gem actions'
                            aria-expanded={openActionsBotId === botId}
                            onClick={(event) => {
                              openActionsMenu(botId, event.currentTarget);
                            }}
                          >
                            <MoreIcon />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {!isLoading && publicMyBots.length === 0 && <p className='gems-empty'>No public gems in your account yet.</p>}
              </div>

              {openActionsBotId
                ? createPortal(
                    (() => {
                      const selectedBot = publicMyBots.find((item) => {
                        const id = String(item?.id || item?._id || '');
                        return id === openActionsBotId;
                      });

                      if (!selectedBot) {
                        return null;
                      }

                      const selectedBotId = String(selectedBot.id || selectedBot._id || '');
                      const selectedIsFeaturedUploaded = selectedBot?.featuredInPublic === true;
                      const selectedIsFeatureUpdating = featureUpdatingById[selectedBotId] === true;
                      const selectedIsDeleting = deletingBotId === selectedBotId;

                      return (
                        <div
                          className='gem-actions-menu'
                          style={{ top: `${actionsMenuPosition.top}px`, right: `${actionsMenuPosition.right}px` }}
                          role='menu'
                          aria-label='Gem actions menu'
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type='button'
                            className='gem-actions-menu-item'
                            disabled={selectedIsFeatureUpdating || selectedIsDeleting}
                            onClick={() => {
                              handleToggleFeaturedUpload(selectedBot);
                              setOpenActionsBotId('');
                            }}
                          >
                            <span className='gem-actions-menu-item-content'>
                              <UploadMenuIcon />
                              <span>{selectedIsFeaturedUploaded ? 'Remove from Featured Gems' : 'Upload to Featured Gems'}</span>
                            </span>
                          </button>
                          <button
                            type='button'
                            className='gem-actions-menu-item danger'
                            disabled={selectedIsDeleting || selectedIsFeatureUpdating}
                            onClick={() => {
                              handleDeleteGem(selectedBot);
                            }}
                          >
                            <span className='gem-actions-menu-item-content'>
                              <DeleteMenuIcon />
                              <span>{selectedIsDeleting ? 'Deleting...' : 'Delete Gem'}</span>
                            </span>
                          </button>
                        </div>
                      );
                    })(),
                    document.body
                  )
                : null}
            </section>

            <section className='gems-section'>
              <div className='gems-section-head'>
                <h2>Private Gems</h2>
                {hasGlobalPrivatePassword ? (
                  <button
                    type='button'
                    className='gems-show-more-btn'
                    onClick={() => {
                      if (isPrivateGemsUnlockedInManager) {
                        lockPrivateGemsInManager();
                        return;
                      }

                      setIsUnlockModalOpen(true);
                      setUnlockError('');
                    }}
                  >
                    {isPrivateGemsUnlockedInManager ? 'Lock' : 'Unlock Private Gems'}
                  </button>
                ) : null}
              </div>

              {!hasGlobalPrivatePassword && privateMyBots.length === 0 ? (
                <p className='gems-empty'>Set a global private gems password to use private gems.</p>
              ) : !hasGlobalPrivatePassword ? (
                <>
                  <p className='gems-empty'>
                    Private password is not set yet. Showing existing private gems for your account.
                  </p>
                  <div className='my-gems-list' role='list'>
                    {privateMyBots.map((bot, index) => {
                      const botId = String(bot.id || bot._id || '');
                      const isJustCreated = Boolean(createdGemId) && botId === String(createdGemId);

                      return (
                        <article
                          key={botId}
                          className={`my-gem-row ${isJustCreated ? 'newly-created' : ''}`}
                          role='listitem'
                          onClick={() => handleStartChatWithBot(bot)}
                        >
                          <div className='my-gem-main'>
                            <span
                              className='my-gem-avatar'
                              style={{
                                background: bot.avatarBackground || pickAvatarColor(index)
                              }}
                            >
                              {bot.avatarUrl ? (
                                <img src={bot.avatarUrl} alt={bot.name || 'Gem avatar'} />
                              ) : (
                                toInitial(bot.name)
                              )}
                            </span>

                            <div className='my-gem-copy'>
                              <h3>{bot.name || 'Untitled Gem'}</h3>
                              <p>{bot.description || 'No description yet.'}</p>
                            </div>
                          </div>

                          <div className='my-gem-actions'>
                            <button
                              type='button'
                              className='icon-btn'
                              aria-label='Share gem'
                              onClick={(event) => event.stopPropagation()}
                            >
                              <ShareIcon />
                            </button>
                            <button
                              type='button'
                              className='icon-btn'
                              aria-label='Edit gem'
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/gems/${encodeURIComponent(botId)}/edit`);
                              }}
                            >
                              <EditIcon />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : !isPrivateGemsUnlockedInManager ? (
                <p className='gems-empty'>Private gems are hidden until you unlock them.</p>
              ) : (
                <div className='my-gems-list' role='list'>
                  {privateMyBots.map((bot, index) => {
                    const botId = String(bot.id || bot._id || '');
                    const isJustCreated = Boolean(createdGemId) && botId === String(createdGemId);

                    return (
                      <article
                        key={botId}
                        className={`my-gem-row ${isJustCreated ? 'newly-created' : ''}`}
                        role='listitem'
                        onClick={() => handleStartChatWithBot(bot)}
                      >
                        <div className='my-gem-main'>
                          <span
                            className='my-gem-avatar'
                            style={{
                              background: bot.avatarBackground || pickAvatarColor(index)
                            }}
                          >
                            {bot.avatarUrl ? (
                              <img src={bot.avatarUrl} alt={bot.name || 'Gem avatar'} />
                            ) : (
                              toInitial(bot.name)
                            )}
                          </span>

                          <div className='my-gem-copy'>
                            <h3>{bot.name || 'Untitled Gem'}</h3>
                            <p>{bot.description || 'No description yet.'}</p>
                          </div>
                        </div>

                        <div className='my-gem-actions'>
                          <button
                            type='button'
                            className='icon-btn'
                            aria-label='Share gem'
                            onClick={(event) => event.stopPropagation()}
                          >
                            <ShareIcon />
                          </button>
                          <button
                            type='button'
                            className='icon-btn'
                            aria-label='Edit gem'
                            onClick={(event) => {
                              event.stopPropagation();
                              navigate(`/gems/${encodeURIComponent(botId)}/edit`);
                            }}
                          >
                            <EditIcon />
                          </button>
                        </div>
                      </article>
                    );
                  })}

                  {!isLoading && privateMyBots.length === 0 && (
                    <p className='gems-empty'>No private gems found.</p>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      </section>

      {isPasswordModalOpen && (
        <div className='gems-password-modal-backdrop' onClick={() => setIsPasswordModalOpen(false)}>
          <div className='gems-password-modal' onClick={(event) => event.stopPropagation()}>
            <h3>{hasGlobalPrivatePassword ? 'Update private gems password' : 'Set private gems password'}</h3>

            {!hasGlobalPrivatePassword ? (
              <>
                <label>
                  <span>New password</span>
                  <div className='modal-password-input-wrap'>
                    <input
                      type={showSetupPassword ? 'text' : 'password'}
                      value={passwordForm.setupPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, setupPassword: event.target.value }))
                      }
                    />
                    <button
                      type='button'
                      className='modal-password-visibility-btn'
                      aria-label={showSetupPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowSetupPassword((prev) => !prev)}
                    >
                      <EyeIcon isOpen={showSetupPassword} />
                    </button>
                  </div>
                </label>
                <label>
                  <span>What is your favourite thing? (backup answer)</span>
                  <input
                    type='text'
                    value={passwordForm.setupRecoveryAnswer}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, setupRecoveryAnswer: event.target.value }))
                    }
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  <span>Current password (optional if recovery answer is provided)</span>
                  <div className='modal-password-input-wrap'>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                      }
                    />
                    <button
                      type='button'
                      className='modal-password-visibility-btn'
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                    >
                      <EyeIcon isOpen={showCurrentPassword} />
                    </button>
                  </div>
                </label>
                <label>
                  <span>Backup answer (optional if current password is provided)</span>
                  <input
                    type='text'
                    value={passwordForm.recoveryAnswer}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, recoveryAnswer: event.target.value }))
                    }
                  />
                </label>
                <label>
                  <span>New password</span>
                  <div className='modal-password-input-wrap'>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(event) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                      }
                    />
                    <button
                      type='button'
                      className='modal-password-visibility-btn'
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowNewPassword((prev) => !prev)}
                    >
                      <EyeIcon isOpen={showNewPassword} />
                    </button>
                  </div>
                </label>
              </>
            )}

            {passwordError && <p className='gems-password-error'>{passwordError}</p>}
            {passwordSuccess && <p className='gems-password-success'>{passwordSuccess}</p>}

            <div className='gems-password-modal-actions'>
              <button type='button' onClick={() => setIsPasswordModalOpen(false)}>
                Close
              </button>
              <button type='button' onClick={handleSubmitPasswordForm} disabled={isSubmittingPassword}>
                {isSubmittingPassword ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isUnlockModalOpen && (
        <div className='gems-password-modal-backdrop' onClick={() => setIsUnlockModalOpen(false)}>
          <div className='gems-password-modal' onClick={(event) => event.stopPropagation()}>
            <h3>Unlock private gems</h3>
            <label>
              <span>Private gems password</span>
              <div className='modal-password-input-wrap'>
                <input
                  type={showUnlockPassword ? 'text' : 'password'}
                  value={unlockPassword}
                  onChange={(event) => setUnlockPassword(event.target.value)}
                />
                <button
                  type='button'
                  className='modal-password-visibility-btn'
                  aria-label={showUnlockPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowUnlockPassword((prev) => !prev)}
                >
                  <EyeIcon isOpen={showUnlockPassword} />
                </button>
              </div>
            </label>

            {unlockError && <p className='gems-password-error'>{unlockError}</p>}

            <div className='gems-password-modal-actions'>
              <button type='button' onClick={() => setIsUnlockModalOpen(false)}>
                Cancel
              </button>
              <button type='button' onClick={handleUnlockPrivateInManager} disabled={isUnlockingPrivate}>
                {isUnlockingPrivate ? 'Unlocking...' : 'Unlock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Gems;
