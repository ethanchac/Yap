import React, { useState, useEffect } from 'react';
import { X, ImageIcon, Send, Smile, Hash, AtSign } from 'lucide-react';
import { API_BASE_URL } from '../../../services/config';

function CreatePost() {
    // Post state
    const [content, setContent] = useState('');
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);
    const [postMessage, setPostMessage] = useState('');
    const [postError, setPostError] = useState('');
    
    // Image upload state
    const [selectedImages, setSelectedImages] = useState([]);
    const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
    const [uploadingImages, setUploadingImages] = useState(false);

    // Interactive buttons state
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showHashtagSuggestions, setShowHashtagSuggestions] = useState(false);
    const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);

    // Common emojis for quick selection
    const commonEmojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '💯', '✨', '😍', '🤔', '😭', '😎', '🥳', '🤩', '😅', '🙏'];

    // Common hashtags for suggestions
    const commonHashtags = ['#yapp', '#life', '#fun', '#friends', '#love', '#happy'];

    // Mock user suggestions for mentions (in real app, this would come from API)
    const userSuggestions = [
        { id: 1, username: 'john_doe', name: 'John Doe' },
        { id: 2, username: 'jane_smith', name: 'Jane Smith' },
        { id: 3, username: 'mike_wilson', name: 'Mike Wilson' },
        { id: 4, username: 'sarah_jones', name: 'Sarah Jones' },
        { id: 5, username: 'alex_brown', name: 'Alex Brown' }
    ];

    // Emoji picker functionality
    const handleEmojiClick = (emoji) => {
        const textarea = document.querySelector('textarea');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = content.substring(0, start) + emoji + content.substring(end);
        setContent(newContent);
        setShowEmojiPicker(false);
        
        // Set cursor position after emoji
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + emoji.length, start + emoji.length);
        }, 0);
    };

    // Hashtag functionality
    const handleHashtagClick = (hashtag) => {
        const textarea = document.querySelector('textarea');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newContent = content.substring(0, start) + hashtag + ' ' + content.substring(end);
        setContent(newContent);
        setShowHashtagSuggestions(false);
        
        // Set cursor position after hashtag
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + hashtag.length + 1, start + hashtag.length + 1);
        }, 0);
    };

    // Mention functionality
    const handleMentionClick = (user) => {
        const textarea = document.querySelector('textarea');
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const mention = `@${user.username} `;
        const newContent = content.substring(0, start) + mention + content.substring(end);
        setContent(newContent);
        setShowMentionSuggestions(false);
        
        // Set cursor position after mention
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + mention.length, start + mention.length);
        }, 0);
    };

    // Close all dropdowns when clicking outside
    const handleClickOutside = (e) => {
        // Don't close if clicking on the button itself or inside the dropdown
        if (e.target.closest('.dropdown-container') || e.target.closest('.dropdown-button')) {
            return;
        }
        setShowEmojiPicker(false);
        setShowHashtagSuggestions(false);
        setShowMentionSuggestions(false);
    };

    // Add click outside listener
    useEffect(() => {
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    // Debug function to test dropdowns
    const testDropdown = (type) => {
        console.log(`Testing ${type} dropdown`);
        if (type === 'emoji') {
            setShowEmojiPicker(true);
            setShowHashtagSuggestions(false);
            setShowMentionSuggestions(false);
        } else if (type === 'hashtag') {
            setShowEmojiPicker(false);
            setShowHashtagSuggestions(true);
            setShowMentionSuggestions(false);
        } else if (type === 'mention') {
            setShowEmojiPicker(false);
            setShowHashtagSuggestions(false);
            setShowMentionSuggestions(true);
        }
    };

    // Image handling functions
    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        const maxImages = 4; // Limit to 4 images per post
        const maxSize = 5 * 1024 * 1024; // 5MB per image
        
        if (selectedImages.length + files.length > maxImages) {
            setPostError(`You can only upload up to ${maxImages} images per post`);
            return;
        }

        const validFiles = [];
        const newPreviewUrls = [];

        files.forEach(file => {
            // Check file size
            if (file.size > maxSize) {
                setPostError(`Image "${file.name}" is too large. Maximum size is 5MB.`);
                return;
            }

            // Check file type
            if (!file.type.startsWith('image/')) {
                setPostError(`"${file.name}" is not a valid image file.`);
                return;
            }

            validFiles.push(file);
            newPreviewUrls.push(URL.createObjectURL(file));
        });

        setSelectedImages(prev => [...prev, ...validFiles]);
        setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
        setPostError(''); // Clear any previous errors
    };

    const removeImage = (index) => {
        // Revoke the object URL to free memory
        URL.revokeObjectURL(imagePreviewUrls[index]);
        
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImages = async () => {
        if (selectedImages.length === 0) return [];

        setUploadingImages(true);
        const uploadedImageUrls = [];

        try {
            const token = localStorage.getItem('token');
            
            for (const image of selectedImages) {
                const formData = new FormData();
                formData.append('image', image);

                const response = await fetch(`${API_BASE_URL}/posts/upload-image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                const data = await response.json();
                
                if (response.ok) {
                    uploadedImageUrls.push(data.imageUrl);
                } else {
                    throw new Error(data.error || 'Failed to upload image');
                }
            }

            return uploadedImageUrls;
        } finally {
            setUploadingImages(false);
        }
    };

    const handlePostSubmit = async (e) => {
        e.preventDefault();
        
        if (!content.trim() && selectedImages.length === 0) {
            setPostError('Content or images are required');
            return;
        }

        setIsSubmittingPost(true);
        setPostError('');
        setPostMessage('');

        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                setPostError('You must be logged in to create a post');
                setIsSubmittingPost(false);
                return;
            }

            // Upload images first if any are selected
            let imageUrls = [];
            if (selectedImages.length > 0) {
                imageUrls = await uploadImages();
            }

            const response = await fetch(`${API_BASE_URL}/posts/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: content.trim(),
                    images: imageUrls // Send the uploaded image URLs
                })
            });

            const data = await response.json();

            if (response.ok) {
                setPostMessage('Post created successfully!');
                setContent(''); // clear the form
                
                // Clear images
                imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
                setSelectedImages([]);
                setImagePreviewUrls([]);
            } else {
                setPostError(data.error || 'Failed to create post');
            }
        } catch (err) {
            setPostError('Network error. Please try again.');
        } finally {
            setIsSubmittingPost(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Enhanced Post Creation Form */}
            <form onSubmit={handlePostSubmit} className="space-y-6">
                {/* Modern Textarea */}
                <div className="relative">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's on your mind? Share your thoughts, moments, or experiences..."
                        maxLength={280}
                        disabled={isSubmittingPost}
                        className="w-full p-6 bg-gray-800/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 resize-none h-40 text-lg leading-relaxed transition-all duration-300 backdrop-blur-sm"
                    />
                    
                    {/* Character Counter */}
                    <div className="absolute bottom-4 right-4">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-300 ${
                            content.length > 260 
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                                : content.length > 200
                                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                : 'bg-gray-600/50 text-gray-400 border border-gray-500/30'
                        }`}>
                            {content.length}/280
                        </div>
                    </div>
                </div>
                
                {/* Enhanced Image Upload Section */}
                <div className="space-y-4">
                    {/* Modern Image Upload Button */}
                    <div className="flex items-center justify-between">
                        <label 
                            htmlFor="image-upload"
                            className="flex items-center space-x-3 px-6 py-3 bg-gradient-to-r from-orange-500/20 to-pink-500/20 hover:from-orange-500/30 hover:to-pink-500/30 text-orange-400 rounded-xl cursor-pointer transition-all duration-300 border border-orange-500/30 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-500/25"
                        >
                            <ImageIcon className="w-5 h-5" />
                            <span className="font-semibold">Add Photos</span>
                        </label>
                        <input
                            id="image-upload"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                            disabled={isSubmittingPost || uploadingImages}
                        />
                        <div className="flex items-center space-x-2 text-gray-400">
                            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium">
                                {selectedImages.length}/4 images
                            </span>
                        </div>
                    </div>

                    {/* Enhanced Image Previews */}
                    {imagePreviewUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                            {imagePreviewUrls.map((url, index) => (
                                <div key={index} className="relative group overflow-hidden rounded-xl">
                                    <img 
                                        src={url} 
                                        alt={`Preview ${index + 1}`}
                                        className="w-full h-40 object-cover rounded-xl border border-gray-600/50 transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-lg"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {/* Enhanced Action Bar with Functional Buttons */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-700/50 relative">
                    <div className="flex items-center space-x-4">
                        {/* Emoji Button */}
                        <div className="dropdown-container relative">
                            <button 
                                type="button" 
                                onClick={() => testDropdown('emoji')}
                                className="dropdown-button p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/20 rounded-lg transition-all duration-300"
                            >
                                <Smile className="w-5 h-5" />
                            </button>
                            
                            {/* Emoji Picker Dropdown */}
                            {showEmojiPicker && (
                                <div className="absolute bottom-full left-0 mb-2 p-3 bg-gray-800 border border-orange-500 rounded-xl shadow-2xl z-50 min-w-64" style={{display: 'block', position: 'absolute'}}>
                                    <div className="grid grid-cols-8 gap-2">
                                        {commonEmojis.map((emoji, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleEmojiClick(emoji)}
                                                className="p-2 text-2xl hover:bg-gray-700 rounded-lg transition-colors duration-200 hover:scale-110"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Hashtag Button */}
                        <div className="dropdown-container relative">
                            <button 
                                type="button" 
                                onClick={() => testDropdown('hashtag')}
                                className="dropdown-button p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/20 rounded-lg transition-all duration-300"
                            >
                                <Hash className="w-5 h-5" />
                            </button>
                            
                            {/* Hashtag Suggestions Dropdown */}
                            {showHashtagSuggestions && (
                                <div className="absolute bottom-full left-0 mb-2 p-3 bg-gray-800 border border-orange-500 rounded-xl shadow-2xl z-50 min-w-48" style={{display: 'block', position: 'absolute'}}>
                                    <div className="space-y-2">
                                        {commonHashtags.map((hashtag, index) => (
                                            <button
                                                key={index}
                                                type="button"
                                                onClick={() => handleHashtagClick(hashtag)}
                                                className="w-full p-2 text-left text-gray-300 hover:text-orange-400 hover:bg-gray-700 rounded-lg transition-colors duration-200"
                                            >
                                                {hashtag}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mention Button */}
                        <div className="dropdown-container relative">
                            <button 
                                type="button" 
                                onClick={() => testDropdown('mention')}
                                className="dropdown-button p-2 text-gray-400 hover:text-orange-400 hover:bg-orange-500/20 rounded-lg transition-all duration-300"
                            >
                                <AtSign className="w-5 h-5" />
                            </button>
                            
                            {/* Mention Suggestions Dropdown */}
                            {showMentionSuggestions && (
                                <div className="absolute bottom-full left-0 mb-2 p-3 bg-gray-800 border border-orange-500 rounded-xl shadow-2xl z-50 min-w-56" style={{display: 'block', position: 'absolute'}}>
                                    <div className="space-y-2">
                                        {userSuggestions.map((user) => (
                                            <button
                                                key={user.id}
                                                type="button"
                                                onClick={() => handleMentionClick(user)}
                                                className="w-full p-2 text-left text-gray-300 hover:text-orange-400 hover:bg-gray-700 rounded-lg transition-colors duration-200 flex items-center space-x-3"
                                            >
                                                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-medium">{user.name}</div>
                                                    <div className="text-sm text-gray-400">@{user.username}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={
                            isSubmittingPost || 
                            uploadingImages || 
                            (!content.trim() && selectedImages.length === 0)
                        }
                        className="flex items-center space-x-2 px-8 py-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
                    >
                        {isSubmittingPost ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Posting...</span>
                            </>
                        ) : uploadingImages ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Uploading...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                <span>Create Post</span>
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Enhanced Success/Error Messages */}
            {postMessage && (
                <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-300 rounded-xl backdrop-blur-sm animate-in slide-in-from-top-2">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="font-medium">{postMessage}</span>
                    </div>
                </div>
            )}

            {postError && (
                <div className="p-4 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 text-red-300 rounded-xl backdrop-blur-sm animate-in slide-in-from-top-2">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                        <span className="font-medium">{postError}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CreatePost;