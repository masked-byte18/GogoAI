import ChatSidebar from '../components/home/ChatSidebar';
import ChatHeader from '../components/home/ChatHeader';
import ChatMessages from '../components/home/ChatMessages';
import ChatInput from '../components/home/ChatInput';
import { useHomeChatController } from './home/useHomeChatController';
import '../components/home/HomeLayout.css';

const Home = () => {
  const {
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
    handleStopThinking,
    handleToggleArchive,
    handleToggleFeedback,
    handleTogglePinChat,
    handleLogout,
    inputMessage,
    aiLimitNotice,
    isAuthenticated,
    isAiThinking,
    isCurrentChatThinking,
    isDraftChatActive,
    isSidebarOpen,
    messages,
    processingChatId,
    recentGems,
    privateGems,
    privateGemIds,
    hasPrivateAccessPassword,
    isPrivateGemsUnlocked,
    unlockPrivateGems,
    lockPrivateGems,
    startDraftChatWithGem,
    retryInputFocusKey,
    stoppedMessageIds,
    setInputMessage,
    toggleSidebar
  } = useHomeChatController();

  return (
    <main className='page page-home'>
      <div className='chat-shell'>
        {isSidebarOpen && (
          <div className='chat-sidebar-overlay' onClick={toggleSidebar}></div>
        )}

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

        <section className='chat-main'>
          <ChatHeader activeChatTitle={activeChatTitle} toggleSidebar={toggleSidebar} />

          <ChatMessages
            messages={messages}
            isAiThinking={isCurrentChatThinking}
            stoppedMessageIds={stoppedMessageIds}
            onToggleFeedback={handleToggleFeedback}
            onRefreshResponse={handleRefreshResponse}
            onRetryUserMessage={handleRetryUserMessage}
          />

          <ChatInput
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            handleSendMessage={handleSendMessage}
            isAiThinking={isCurrentChatThinking}
            onStopThinking={handleStopThinking}
            retryInputFocusKey={retryInputFocusKey}
            aiLimitNotice={aiLimitNotice}
          />
        </section>
      </div>
    </main>
  );
};

export default Home;
