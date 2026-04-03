import './NewChatModal.css';

const NewChatModal = ({
  isOpen,
  heading,
  description,
  label,
  actionLabel,
  title,
  onTitleChange,
  onCancel,
  onCreate
}) => {

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    onCreate();
  };

  return (
    <div className='new-chat-modal-overlay' onClick={onCancel}>
      <div className='new-chat-modal' onClick={(event) => event.stopPropagation()}>
        <h3>{heading}</h3>
        <p>{description}</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor='new-chat-title'>{label}</label>
          <input
            id='new-chat-title'
            type='text'
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder='Enter chat title'
            autoFocus
          />

          <div className='new-chat-modal-actions'>
            <button type='button' className='new-chat-cancel' onClick={onCancel}>
              Cancel
            </button>
            <button type='submit' className='new-chat-create'>
              {actionLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewChatModal;
