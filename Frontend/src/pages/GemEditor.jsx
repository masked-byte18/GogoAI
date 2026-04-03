import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ChatSidebar from '../components/home/ChatSidebar';
import ChatHeader from '../components/home/ChatHeader';
import { useHomeChatController } from './home/useHomeChatController';
import {
  createBotRequest,
  fetchAvatarPaletteRequest,
  fetchBotByIdRequest,
  fetchPrivateAccessSettingsRequest,
  previewBotResponseRequest,
  setupPrivateAccessRequest,
  updateBotRequest
} from '../services/botApi';
import { AI_LIMIT_NOTICE_TEXT, isAiTokenLimitError } from '../utils/aiLimit';
import '../components/home/HomeLayout.css';
import './GemEditor.css';

const AI_LIMIT_NOTICE_DURATION_MS = 3600;

const DEFAULT_FORM = {
  name: '',
  description: '',
  instructions: '',
  visibility: 'private',
  memoryEnabled: true,
  avatarBackground: '',
  avatarFile: null,
  knowledgeFiles: []
};

const BackIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d='M15 18l-6-6 6-6'></path>
  </svg>
);

const InfoIcon = () => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <circle cx='12' cy='12' r='9'></circle>
    <line x1='12' y1='10' x2='12' y2='16'></line>
    <line x1='12' y1='7' x2='12.01' y2='7'></line>
  </svg>
);

const validateForm = (formState) => {
  const nextErrors = {};

  if (!String(formState.name || '').trim()) {
    nextErrors.name = 'Name is required.';
  }

  if (!String(formState.description || '').trim()) {
    nextErrors.description = 'Description is required.';
  }

  if (!String(formState.instructions || '').trim()) {
    nextErrors.instructions = 'Instructions are required.';
  }

  return nextErrors;
};

const getPreviewErrorMessage = (error) => {
  const status = Number(error?.response?.status || 0);
  const apiMessage = String(error?.response?.data?.message || '').trim();

  if (status === 401) {
    return 'Session expired. Please log in again.';
  }

  if (status === 429) {
    return 'Too many requests. Please try again in a moment.';
  }

  if (status >= 500) {
    return 'Server error. Please try again shortly.';
  }

  if (apiMessage) {
    return apiMessage;
  }

  if (!error?.response) {
    return 'Network issue. Check your connection and try again.';
  }

  return 'Preview failed. Please try again.';
};

const EyeIcon = ({ isOpen }) => (
  <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
    <path d='M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z'></path>
    <circle cx='12' cy='12' r='3'></circle>
    {!isOpen && <line x1='4' y1='20' x2='20' y2='4'></line>}
  </svg>
);

const GemEditor = () => {
  const navigate = useNavigate();
  const { gemId } = useParams();

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
    startDraftChatWithGem,
    toggleSidebar
  } = useHomeChatController({ enableRouteSync: false });

  const isEditMode = Boolean(gemId);

  const [activeTab, setActiveTab] = useState('editor');
  const [formState, setFormState] = useState(DEFAULT_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [palette, setPalette] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [previewMessages, setPreviewMessages] = useState([]);
  const [previewInput, setPreviewInput] = useState('');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [previewLimitNotice, setPreviewLimitNotice] = useState('');
  const [hasGlobalPrivatePassword, setHasGlobalPrivatePassword] = useState(false);
  const [isPrivateSetupOpen, setIsPrivateSetupOpen] = useState(false);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupRecoveryAnswer, setSetupRecoveryAnswer] = useState('');
  const [setupPrivateError, setSetupPrivateError] = useState('');
  const [isSettingPrivatePassword, setIsSettingPrivatePassword] = useState(false);
  const [showSetupPassword, setShowSetupPassword] = useState(false);

  useEffect(() => {
    if (!previewLimitNotice) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setPreviewLimitNotice('');
    }, AI_LIMIT_NOTICE_DURATION_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [previewLimitNotice]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setIsLoading(true);

        const [fetchedPalette, fetchedBot, privateSettings] = await Promise.all([
          fetchAvatarPaletteRequest(),
          isEditMode ? fetchBotByIdRequest(gemId) : Promise.resolve(null),
          fetchPrivateAccessSettingsRequest()
        ]);

        if (cancelled) {
          return;
        }

        const resolvedPalette = Array.isArray(fetchedPalette) ? fetchedPalette : [];
        setPalette(resolvedPalette);
        setHasGlobalPrivatePassword(Boolean(privateSettings?.hasPassword));

        if (fetchedBot) {
          setFormState({
            name: fetchedBot.name || '',
            description: fetchedBot.description || '',
            instructions: fetchedBot.instructions || '',
            visibility: fetchedBot.visibility || 'private',
            memoryEnabled: fetchedBot.memoryEnabled !== false,
            avatarBackground: fetchedBot.avatarBackground || resolvedPalette[0] || '',
            avatarFile: null,
            knowledgeFiles: []
          });
        } else {
          setFormState((prev) => ({
            ...prev,
            avatarBackground: prev.avatarBackground || resolvedPalette[0] || ''
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setGlobalError(error?.response?.data?.message || 'Unable to load gem editor data.');
          setHasGlobalPrivatePassword(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [gemId, isEditMode]);

  const previewTitle = useMemo(() => {
    const name = String(formState.name || '').trim();
    return name || 'New Gem';
  }, [formState.name]);

  const previewDescription = useMemo(() => {
    const description = String(formState.description || '').trim();
    return description || 'Preview your gem behavior before saving.';
  }, [formState.description]);

  const avatarFallback = useMemo(() => {
    return previewTitle.charAt(0).toUpperCase() || 'G';
  }, [previewTitle]);

  const avatarFileLabel = useMemo(() => {
    if (!formState.avatarFile) {
      return 'No avatar selected';
    }

    return formState.avatarFile.name || '1 avatar selected';
  }, [formState.avatarFile]);

  const knowledgeFilesLabel = useMemo(() => {
    const files = Array.isArray(formState.knowledgeFiles) ? formState.knowledgeFiles : [];
    if (files.length === 0) {
      return 'No knowledge files selected';
    }

    if (files.length === 1) {
      return files[0]?.name || '1 file selected';
    }

    return `${files.length} files selected`;
  }, [formState.knowledgeFiles]);

  const handleFieldChange = (key, value) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) {
        return prev;
      }
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async () => {
    const nextErrors = validateForm(formState);
    setFieldErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setGlobalError('Please fix required fields before saving.');
      setActiveTab('editor');
      return;
    }

    setIsSaving(true);
    setGlobalError('');

    if (formState.visibility === 'private' && !hasGlobalPrivatePassword) {
      setGlobalError('Set your global private gems password first.');
      setIsSaving(false);
      setActiveTab('editor');
      return;
    }

    try {
      const payload = {
        name: formState.name,
        description: formState.description,
        instructions: formState.instructions,
        visibility: formState.visibility,
        memoryEnabled: formState.memoryEnabled,
        avatarBackground: formState.avatarBackground,
        avatarFile: formState.avatarFile,
        knowledgeFiles: formState.knowledgeFiles
      };

      const savedBot = isEditMode
        ? await updateBotRequest(gemId, payload)
        : await createBotRequest(payload);

      if (!savedBot) {
        throw new Error('No gem returned from save request');
      }

      navigate(`/gems?created=${encodeURIComponent(String(savedBot.id || savedBot._id || ''))}`);
    } catch (error) {
      setGlobalError(error?.response?.data?.message || 'Failed to save gem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetupPrivatePassword = async () => {
    if (isSettingPrivatePassword) {
      return;
    }

    setSetupPrivateError('');
    setIsSettingPrivatePassword(true);

    try {
      await setupPrivateAccessRequest({
        password: setupPassword,
        recoveryAnswer: setupRecoveryAnswer
      });

      setHasGlobalPrivatePassword(true);
      setIsPrivateSetupOpen(false);
      setSetupPassword('');
      setSetupRecoveryAnswer('');
    } catch (error) {
      setSetupPrivateError(error?.response?.data?.message || 'Failed to set private gems password.');
    } finally {
      setIsSettingPrivatePassword(false);
    }
  };

  const handlePreviewSend = async () => {
    if (!String(previewInput || '').trim() || isPreviewLoading) {
      return;
    }

    const baseErrors = validateForm(formState);
    if (baseErrors.name || baseErrors.description || baseErrors.instructions) {
      setFieldErrors((prev) => ({
        ...prev,
        name: baseErrors.name || prev.name,
        description: baseErrors.description || prev.description,
        instructions: baseErrors.instructions || prev.instructions
      }));
      setGlobalError('Name, description, and instructions are required for preview chat.');
      setActiveTab('editor');
      return;
    }

    const userPrompt = previewInput.trim();
    const userMessageId = Date.now();

    setPreviewError('');
    setPreviewInput('');
    setPreviewMessages((prev) => [...prev, { id: userMessageId, sender: 'user', text: userPrompt }]);
    setIsPreviewLoading(true);

    try {
      const aiText = await previewBotResponseRequest({
        botId: gemId,
        prompt: userPrompt,
        name: formState.name,
        description: formState.description,
        instructions: formState.instructions
      });

      setPreviewMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'ai', text: aiText || 'No response.' }]);
    } catch (error) {
      setPreviewMessages((prev) => prev.filter((message) => message.id !== userMessageId));
      setPreviewInput(userPrompt);
      setPreviewError(getPreviewErrorMessage(error));

      if (isAiTokenLimitError(error)) {
        setPreviewLimitNotice(AI_LIMIT_NOTICE_TEXT);
      }
    } finally {
      setIsPreviewLoading(false);
    }
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

        <div className='chat-main gem-editor-main'>
          <div className='gem-editor-mobile-header'>
            <ChatHeader activeChatTitle={isEditMode ? 'Edit Gem' : 'New Gem'} toggleSidebar={toggleSidebar} />
          </div>

          <div className='gem-editor-shell'>
            <div className='gem-editor-top'>
              <button type='button' className='gem-back-btn' onClick={() => navigate('/gems')}>
                <BackIcon />
              </button>

              <div className='gem-head-meta'>
                <span className='gem-head-avatar' style={{ background: formState.avatarBackground || '#4b5563' }}>
                  {avatarFallback}
                </span>
                <div>
                  <p className='gem-head-kicker'>Gem</p>
                  <h1>{isEditMode ? previewTitle : 'New Gem'}</h1>
                </div>
              </div>

              <button type='button' className='gem-save-btn' onClick={handleSubmit} disabled={isSaving || isLoading}>
                {isSaving ? 'Saving...' : isEditMode ? 'Update' : 'Save'}
              </button>
            </div>

            <div className='gem-editor-tabs'>
              <button
                type='button'
                className={`gem-tab ${activeTab === 'editor' ? 'active' : ''}`}
                onClick={() => setActiveTab('editor')}
              >
                Editor
              </button>
              <button
                type='button'
                className={`gem-tab ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                Preview
              </button>
            </div>

            {globalError && <p className='gem-global-error'>{globalError}</p>}

            <div className='gem-editor-panels'>
              <section className={`gem-panel editor-panel ${activeTab === 'editor' ? 'active' : ''}`}>
                <label className='gem-field'>
                  <span>Name</span>
                  <input
                    type='text'
                    value={formState.name}
                    onChange={(event) => handleFieldChange('name', event.target.value)}
                    placeholder='Give your Gem a name'
                  />
                  {fieldErrors.name && <em className='field-error'>{fieldErrors.name}</em>}
                </label>

                <label className='gem-field'>
                  <span>Description</span>
                  <textarea
                    value={formState.description}
                    onChange={(event) => handleFieldChange('description', event.target.value)}
                    placeholder='Describe what this gem helps with'
                    rows={3}
                  />
                  {fieldErrors.description && <em className='field-error'>{fieldErrors.description}</em>}
                </label>

                <label className='gem-field'>
                  <span className='field-inline'>
                    <span>Instructions</span>
                    <InfoIcon />
                  </span>
                  <textarea
                    value={formState.instructions}
                    onChange={(event) => handleFieldChange('instructions', event.target.value)}
                    placeholder='How should this gem behave?'
                    rows={7}
                  />
                  {fieldErrors.instructions && <em className='field-error'>{fieldErrors.instructions}</em>}
                </label>

                <div className='gem-field-grid'>
                  <label className='gem-field'>
                    <span>Visibility</span>
                    <select
                      value={formState.visibility}
                      onChange={(event) => handleFieldChange('visibility', event.target.value)}
                    >
                      <option value='private'>Private</option>
                      <option value='public'>Public</option>
                    </select>
                  </label>

                  <label className='gem-field'>
                    <span>Memory</span>
                    <select
                      value={formState.memoryEnabled ? 'true' : 'false'}
                      onChange={(event) => handleFieldChange('memoryEnabled', event.target.value === 'true')}
                    >
                      <option value='true'>Enabled</option>
                      <option value='false'>Disabled</option>
                    </select>
                  </label>
                </div>

                {formState.visibility === 'private' && !hasGlobalPrivatePassword && (
                  <div className='gem-private-setup-hint'>
                    <p>
                      Private gems use one global password. Set it once, then it applies to all private gems.
                    </p>
                    <button type='button' onClick={() => setIsPrivateSetupOpen(true)}>
                      Set password
                    </button>
                  </div>
                )}

                {formState.visibility === 'private' && hasGlobalPrivatePassword && (
                  <p className='gem-private-setup-ready'>Private gems password is configured for this account.</p>
                )}

                <label className='gem-field'>
                  <span>Avatar Background</span>
                  <div className='gem-avatar-palette' role='radiogroup' aria-label='Avatar background palette'>
                    {(palette.length ? palette : [formState.avatarBackground || '#4b5563']).map((item, index) => {
                      const paletteValue = String(item || '').trim();
                      const isSelected = paletteValue === String(formState.avatarBackground || '').trim();

                      return (
                        <button
                          key={`${paletteValue || 'default'}-${index}`}
                          type='button'
                          className={`gem-avatar-swatch ${isSelected ? 'selected' : ''}`}
                          style={{ background: paletteValue || '#4b5563' }}
                          onClick={() => handleFieldChange('avatarBackground', paletteValue)}
                          title={paletteValue || 'Default'}
                          aria-label={`Avatar background ${index + 1}`}
                          aria-checked={isSelected}
                          role='radio'
                        ></button>
                      );
                    })}
                  </div>
                </label>

                <label className='gem-field'>
                  <span>Avatar (optional)</span>
                  <div className='gem-file-input-wrap'>
                    <label className='gem-file-trigger'>
                      <input
                        type='file'
                        accept='image/*'
                        onChange={(event) => handleFieldChange('avatarFile', event.target.files?.[0] || null)}
                      />
                      <span>Choose avatar</span>
                    </label>
                    <p className='gem-file-meta'>{avatarFileLabel}</p>
                  </div>
                </label>

                <label className='gem-field'>
                  <span>Knowledge Files (optional)</span>
                  <div className='gem-file-input-wrap'>
                    <label className='gem-file-trigger'>
                      <input
                        type='file'
                        multiple
                        accept='.pdf,.txt,.doc,.docx'
                        onChange={(event) => handleFieldChange('knowledgeFiles', Array.from(event.target.files || []))}
                      />
                      <span>Choose knowledge files</span>
                    </label>
                    <p className='gem-file-meta'>{knowledgeFilesLabel}</p>
                  </div>
                </label>
              </section>

              <section className={`gem-panel preview-panel ${activeTab === 'preview' ? 'active' : ''}`}>
                <div className='preview-card'>
                  <span className='preview-avatar' style={{ background: formState.avatarBackground || '#4b5563' }}>
                    {avatarFallback}
                  </span>
                  <h3>{previewTitle}</h3>
                  <p>{previewDescription}</p>
                </div>

                <div className='preview-chat-log'>
                  {previewMessages.length === 0 && (
                    <p className='preview-empty'>Preview chat is temporary. Nothing here is saved to database or memory.</p>
                  )}

                  {previewMessages.map((message) => (
                    <div key={message.id} className={`preview-msg ${message.sender === 'user' ? 'user' : 'ai'}`}>
                      {message.text}
                    </div>
                  ))}
                </div>

                <form
                  className='preview-chat-input-wrap'
                  onSubmit={(event) => {
                    event.preventDefault();
                    handlePreviewSend();
                  }}
                >
                  {previewLimitNotice ? <p className='ai-limit-notice'>{previewLimitNotice}</p> : null}
                  <input
                    value={previewInput}
                    onChange={(event) => {
                      setPreviewInput(event.target.value);
                      if (previewError) {
                        setPreviewError('');
                      }
                    }}
                    placeholder='Ask Gem in preview mode'
                  />
                  <button type='submit' disabled={isPreviewLoading}>
                    {isPreviewLoading ? '...' : 'Send'}
                  </button>
                </form>

                {previewError && <p className='preview-chat-error'>{previewError}</p>}
              </section>
            </div>
          </div>
        </div>
      </section>

      {isPrivateSetupOpen && (
        <div className='gem-private-modal-backdrop' onClick={() => setIsPrivateSetupOpen(false)}>
          <div className='gem-private-modal' onClick={(event) => event.stopPropagation()}>
            <h3>Set global private gems password</h3>

            <label>
              <span>New password</span>
              <div className='gem-modal-password-input-wrap'>
                <input
                  type={showSetupPassword ? 'text' : 'password'}
                  value={setupPassword}
                  onChange={(event) => setSetupPassword(event.target.value)}
                />
                <button
                  type='button'
                  className='gem-modal-password-visibility-btn'
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
                value={setupRecoveryAnswer}
                onChange={(event) => setSetupRecoveryAnswer(event.target.value)}
              />
            </label>

            {setupPrivateError && <p className='gem-private-modal-error'>{setupPrivateError}</p>}

            <div className='gem-private-modal-actions'>
              <button type='button' onClick={() => setIsPrivateSetupOpen(false)}>
                Cancel
              </button>
              <button type='button' onClick={handleSetupPrivatePassword} disabled={isSettingPrivatePassword}>
                {isSettingPrivatePassword ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default GemEditor;
