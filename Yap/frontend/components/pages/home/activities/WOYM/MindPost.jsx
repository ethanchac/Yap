// MindPost.jsx
import { useState } from 'react';
import { API_BASE_URL } from '../../../../../services/config';
import { useTheme } from '../../../../../contexts/ThemeContext';
import { getProfilePictureUrl, getDefaultProfilePicture } from '../../../../../utils/profileUtils';

export default function MindPost({ post, onDelete, isDeleting }) {
  const { isDarkMode } = useTheme(); // Add this hook

  // format the date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getPostProfilePictureUrl = () => {
    return getProfilePictureUrl(post.profile_picture);
  };

  const bubbleColor = isDarkMode ? '#1c1c1c' : '#f3f4f6';

  return (
    <div className="flex items-start gap-3 group mb-6">
      {/* User Avatar */}
      <img
        src={getPostProfilePictureUrl()}
        alt={`${post.username || 'User'}'s profile`}
        onError={(e) => {
          e.target.src = getDefaultProfilePicture();
        }}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />

      {/* Post Content */}
      <div className="flex-1 min-w-0 relative">
        {/* Username */}
        <div className={`text-sm mb-1 font-medium ml-2 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          @{post.username || 'Unknown User'}
        </div>

        {/* Speech Bubble */}
        <div 
          className={`relative rounded-2xl px-4 py-3 shadow-md max-w-lg ml-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`} 
          style={{ backgroundColor: bubbleColor }}
        >
          {/* Tail */}
          <div 
            className="absolute -left-2 bottom-2 w-0 h-0 border-l-[10px] border-l-transparent" 
            style={{ 
              borderTopColor: bubbleColor, 
              borderTopWidth: '10px' 
            }}
          ></div>

          {/* Delete Button */}
          {post.is_own_post && (
            <button
              onClick={() => onDelete(post._id)}
              disabled={isDeleting}
              className={`absolute top-2 right-2 transition-opacity opacity-70 hover:opacity-100 p-1 rounded-full ${
                isDarkMode
                  ? 'text-gray-400 hover:text-red-400 hover:bg-gray-600'
                  : 'text-gray-500 hover:text-red-500 hover:bg-gray-200'
              }`}
              title="Delete this post"
            >
              {isDeleting ? (
                <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
                  isDarkMode ? 'border-red-400' : 'border-red-500'
                }`}></div>
              ) : (
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
            </button>
          )}

          {/* Post Content */}
          <p className="text-base leading-snug whitespace-pre-wrap break-words pr-8">
            {post.content}
          </p>

          {/* Timestamp */}
          <div className={`text-xs mt-2 text-right ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {formatDate(post.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}