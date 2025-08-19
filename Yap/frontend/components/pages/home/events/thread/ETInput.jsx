import React, { useRef, useEffect, useState } from 'react';
import { Send, Image, Link, X } from 'lucide-react';
import { useTheme } from '../../../../../contexts/ThemeContext';

const ETInput = ({ 
  newPostContent, 
  setNewPostContent, 
  onSubmit, 
  posting, 
  replyingTo, 
  setReplyingTo, 
  currentUser,
  getProfilePictureUrl 
}) => {
  const { isDarkMode } = useTheme();
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newPostContent]);

  // Clean up image previews when component unmounts
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => {
        if (preview.url) {
          URL.revokeObjectURL(preview.url);
        }
      });
    };
  }, []);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;

    // Check if adding these files would exceed the limit (4 images max)
    if (selectedImages.length + files.length > 4) {
      alert('You can only upload up to 4 images per post.');
      return;
    }

    const validFiles = [];
    const newPreviews = [];

    files.forEach(file => {
      // Validate file type
      const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert(`Invalid file type for ${file.name}. Only PNG, JPG, JPEG, GIF, and WEBP are allowed.`);
        return;
      }

      // Validate file size (10MB per file)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB per image.`);
        return;
      }

      validFiles.push(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      newPreviews.push({
        file,
        url: previewUrl,
        id: Date.now() + Math.random() // Unique ID for each image
      });
    });

    if (validFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...validFiles]);
      setImagePreviews(prev => [...prev, ...newPreviews]);
    }

    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    // Revoke the URL to free memory
    if (imagePreviews[index]?.url) {
      URL.revokeObjectURL(imagePreviews[index].url);
    }

    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeAllImages = () => {
    // Revoke all URLs to free memory
    imagePreviews.forEach(preview => {
      if (preview.url) {
        URL.revokeObjectURL(preview.url);
      }
    });

    setSelectedImages([]);
    setImagePreviews([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Allow submission if there's content OR images
    if ((!newPostContent.trim() && selectedImages.length === 0) || posting) return;

    await onSubmit(e, selectedImages);
    
    // Clear images after successful post
    removeAllImages();
  };

  return (
    <div className={`rounded-lg p-4 mb-6 ${
      isDarkMode ? 'bg-[#1c1c1c]' : 'bg-gray-100'
    }`}>
      {replyingTo && (
        <div className={`mb-3 p-2 rounded border-l-4 border-orange-500 ${
          isDarkMode ? 'bg-orange-900/20' : 'bg-orange-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-sm ${
              isDarkMode ? 'text-orange-400' : 'text-orange-600'
            }`}>
              Replying to @{replyingTo.username}
            </span>
            <button 
              onClick={() => setReplyingTo(null)}
              className={`transition-colors ${
                isDarkMode 
                  ? 'text-orange-400 hover:text-orange-300' 
                  : 'text-orange-600 hover:text-orange-700'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <div onSubmit={handleSubmit}>
        <div className="flex space-x-3">
          <img
            src={getProfilePictureUrl(currentUser?.profile_picture)}
            alt="Your profile"
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder={replyingTo ? "Write a reply..." : selectedImages.length > 0 ? "Add a caption (optional)..." : "Share your thoughts about this event..."}
              className={`w-full border rounded-lg px-4 py-3 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent ${
                isDarkMode 
                  ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                  : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
              }`}
              style={{ 
                minHeight: '60px', 
                maxHeight: '150px'
              }}
              rows="2"
            />
            
            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {imagePreviews.length} image{imagePreviews.length > 1 ? 's' : ''} selected
                  </span>
                  <button
                    type="button"
                    onClick={removeAllImages}
                    className={`text-sm transition-colors ${
                      isDarkMode 
                        ? 'text-red-400 hover:text-red-300'
                        : 'text-red-600 hover:text-red-700'
                    }`}
                  >
                    Remove all
                  </button>
                </div>
                <div className={`grid gap-2 ${
                  imagePreviews.length === 1 ? 'grid-cols-1' : 
                  imagePreviews.length === 2 ? 'grid-cols-2' : 
                  'grid-cols-2 md:grid-cols-3'
                }`}>
                  {imagePreviews.map((preview, index) => (
                    <div key={preview.id} className="relative group">
                      <img
                        src={preview.url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex space-x-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpg,image/jpeg,image/gif,image/webp"
                  onChange={handleImageSelect}
                  className="hidden"
                  multiple
                />
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImages || selectedImages.length >= 4}
                  className={`p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDarkMode
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                  title={selectedImages.length >= 4 ? 'Maximum 4 images per post' : 'Add images'}
                >
                  <Image className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  className={`p-2 rounded transition-colors ${
                    isDarkMode
                      ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                      : 'text-gray-600 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Link className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                {selectedImages.length > 0 && (
                  <span className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {selectedImages.length}/4
                  </span>
                )}
                <button
                  type="submit"
                  onClick={handleSubmit}
                  disabled={(!newPostContent.trim() && selectedImages.length === 0) || posting}
                  className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-bold transition-colors"
                >
                  {posting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{posting ? 'Posting...' : 'Post'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ETInput;