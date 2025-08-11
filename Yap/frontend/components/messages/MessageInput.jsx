import { useState, useRef, useEffect } from 'react';
import EmojiPicker from './EmojiPicker';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from '../../services/config';

function MessageInput({ 
    conversation, 
    onSendMessage, 
    sending = false,
    disabled = false,
    onTypingStart,
    onTypingStop
}) {
    const [newMessage, setNewMessage] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [attachedImage, setAttachedImage] = useState(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const typingTimeoutRef = useRef(null);
    const { isDarkMode } = useTheme();

    // Handle clicking outside emoji picker to close it
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };

        if (showEmojiPicker) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showEmojiPicker]);

    // Handle typing indicators
    const handleTyping = () => {
        if (disabled || !onTypingStart || !onTypingStop) return;

        if (!isTyping) {
            setIsTyping(true);
            onTypingStart();
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 3 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            onTypingStop();
        }, 3000);
    };

    // Stop typing when component unmounts or conversation changes
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (isTyping && onTypingStop) {
                onTypingStop();
            }
        };
    }, [conversation?._id, isTyping, onTypingStop]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event bubbling
        
        if ((!newMessage.trim() && !attachedImage) || sending || disabled) {
            console.log('❌ Cannot send: empty message and no attachment, already sending, or disabled');
            return;
        }

        const messageContent = newMessage.trim();
        
        // Stop typing indicator immediately
        if (isTyping && onTypingStop) {
            setIsTyping(false);
            onTypingStop();
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        }
        
        // Clear input immediately for better UX (optimistic update)
        setNewMessage('');
        
        try {
            // Call the parent's send message handler with content and attachment
            const result = await onSendMessage(messageContent, attachedImage);
            
            // Clear attachment after sending
            setAttachedImage(null);
            
            // If the result is a string, it means there was an error and we should restore the message
            if (typeof result === 'string') {
                setNewMessage(result);
            }
        } catch (error) {
            console.error('❌ Error in handleSubmit:', error);
            // Restore message content on error
            setNewMessage(messageContent);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Please select a valid image file (PNG, JPG, JPEG, GIF, WEBP)');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        setUploadingImage(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(`${API_BASE_URL}/messages/upload-attachment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                setAttachedImage({
                    url: data.imageUrl,
                    s3_key: data.s3_key,
                    filename: data.filename
                });
            } else {
                alert(data.error || 'Failed to upload image');
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image');
        } finally {
            setUploadingImage(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const removeAttachment = () => {
        setAttachedImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleInputChange = (e) => {
        setNewMessage(e.target.value);
        handleTyping();
    };

    const handleEmojiClick = (emoji) => {
        const cursorPosition = inputRef.current?.selectionStart || newMessage.length;
        const newText = newMessage.slice(0, cursorPosition) + emoji + newMessage.slice(cursorPosition);
        setNewMessage(newText);
        setShowEmojiPicker(false);
        handleTyping();
        
        // Focus back on input and set cursor position after emoji
        setTimeout(() => {
            inputRef.current?.focus();
            inputRef.current?.setSelectionRange(cursorPosition + emoji.length, cursorPosition + emoji.length);
        }, 0);
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker(!showEmojiPicker);
    };

    // Handle Enter key press
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    // Handle input focus/blur for typing indicators
    const handleInputBlur = () => {
        // Stop typing when user leaves input
        setTimeout(() => {
            if (isTyping && onTypingStop) {
                setIsTyping(false);
                onTypingStop();
                if (typingTimeoutRef.current) {
                    clearTimeout(typingTimeoutRef.current);
                }
            }
        }, 1000); // Small delay to allow for quick focus changes
    };

    return (
        <div className={`border-t p-4 ${
            isDarkMode ? 'border-gray-600' : 'border-gray-300'
        }`}>
            {/* Connection status indicator */}
            {disabled && (
                <div className="mb-2 text-center">
                    <span className={`text-sm ${
                        isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                        Connection lost - Unable to send messages
                    </span>
                </div>
            )}
            
            {/* Image attachment preview */}
            {attachedImage && (
                <div className={`mb-3 p-3 rounded-lg ${
                    isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                    <div className="flex items-start space-x-3">
                        <img
                            src={attachedImage.url}
                            alt="Attachment preview"
                            className="w-16 h-16 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                            <p className={`text-sm font-medium ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                                Image ready to send
                            </p>
                            <p className={`text-xs ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                {attachedImage.filename}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={removeAttachment}
                            className={`p-1 rounded-full transition-colors ${
                                isDarkMode
                                    ? 'text-gray-400 hover:text-white hover:bg-gray-600'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
                            }`}
                            title="Remove attachment"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}
            
            <form onSubmit={handleSubmit} className="flex items-center space-x-3">
                {/* Emoji Button with Picker */}
                <div className="relative" ref={emojiPickerRef}>
                    <button 
                        type="button"
                        onClick={toggleEmojiPicker}
                        className={`p-2 rounded-full transition-colors ${
                            showEmojiPicker 
                                ? isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-800'
                                : isDarkMode ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                        }`}
                        disabled={sending || disabled}
                        title="Add emoji"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                            <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M9 9h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M15 9h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                    </button>
                    
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                    )}
                </div>
                
                <div className="flex-1 relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        onBlur={handleInputBlur}
                        placeholder={`Message ${conversation?.other_participant?.username || 'user'}...`}
                        className={`w-full rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors ${
                            isDarkMode 
                                ? 'bg-gray-600 text-white placeholder-gray-400' 
                                : 'bg-gray-100 text-gray-900 placeholder-gray-500'
                        } ${
                            disabled ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        disabled={sending || disabled}
                        autoComplete="off"
                        maxLength={1000}
                    />
                    
                    {/* Image attachment button */}
                    <button 
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${
                            uploadingImage
                                ? 'text-orange-500'
                                : isDarkMode 
                                    ? 'text-gray-400 hover:text-white' 
                                    : 'text-gray-500 hover:text-gray-700'
                        }`}
                        disabled={sending || disabled || uploadingImage}
                        title="Attach image"
                    >
                        {uploadingImage ? (
                            <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" stroke="currentColor" strokeWidth="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="2"/>
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                        )}
                    </button>
                    
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpg,image/jpeg,image/gif,image/webp"
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                </div>
                
                {/* Send Button */}
                {(newMessage.trim() || attachedImage) && (
                    <button 
                        type="submit"
                        disabled={sending || disabled}
                        className={`p-3 rounded-lg transition-all duration-200 ${
                            sending || disabled
                                ? isDarkMode 
                                    ? 'bg-gray-600 cursor-not-allowed' 
                                    : 'bg-gray-400 cursor-not-allowed'
                                : 'bg-orange-500 hover:bg-orange-600 transform hover:scale-105'
                        } text-white`}
                        title={disabled ? 'Connection lost' : sending ? 'Sending...' : 'Send message'}
                    >
                        {sending ? (
                            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2"/>
                            </svg>
                        )}
                    </button>
                )}
            </form>
            
            {/* Character count (show when approaching limit) */}
            {newMessage.length > 800 && (
                <div className={`text-xs mt-1 text-right ${
                    newMessage.length > 950 
                        ? 'text-red-500' 
                        : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                    {newMessage.length}/1000
                </div>
            )}
        </div>
    );
}

export default MessageInput;