// MindPost.jsx
import { useState } from 'react';

export default function MindPost({ post, onDelete, isDeleting }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Format the date
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
    
    // For older posts, show the actual date
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    onDelete(post._id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Generate a consistent color for each user based on their ID
  const getUserColor = (userId) => {
    // Simple hash function to generate consistent colors
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-purple-400 to-purple-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-red-400 to-red-600',
      'from-yellow-400 to-yellow-600',
      'from-teal-400 to-teal-600',
    ];
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Get user initials from user ID (you might want to use actual username/name later)
  const getUserInitials = (userId) => {
    // For now, just use first 2 characters of user ID
    // Later you can fetch actual user data and use real initials
    return userId.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex gap-3 group">
      {/* User Avatar */}
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${
        post.is_own_post ? 'from-orange-400 to-orange-600' : getUserColor(post.created_by)
      } flex items-center justify-center flex-shrink-0`}>
        <span className="text-white font-bold text-sm">
          {post.is_own_post ? 'You' : getUserInitials(post.created_by)}
        </span>
      </div>

      {/* Post Content */}
      <div className="flex-1 min-w-0">
        {/* Speech Bubble */}
        <div className="relative bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
          {/* Delete Button - Only show for own posts */}
          {post.is_own_post && (
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
              title="Delete this post"
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          )}

          {/* Post Content */}
          <p className="text-white text-base leading-relaxed whitespace-pre-wrap break-words pr-8">
            {post.content}
          </p>
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-400 mt-1 ml-2">
          {formatDate(post.created_at)}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-white text-lg font-bold mb-4">Delete Post</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 text-white rounded-lg font-bold transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={handleCancelDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}