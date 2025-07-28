// MindPost.jsx
import { useState } from 'react';

export default function MindPost({ post, onDelete, isDeleting }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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

  const handleDeleteClick = () => setShowDeleteConfirm(true);
  const handleConfirmDelete = () => {
    onDelete(post._id);
    setShowDeleteConfirm(false);
  };
  const handleCancelDelete = () => setShowDeleteConfirm(false);

  const getProfilePictureUrl = () => {
    if (post.profile_picture) {
      if (post.profile_picture.startsWith('http')) return post.profile_picture;
      return `http://localhost:5000/uploads/profile_pictures/${post.profile_picture}`;
    }
    return `http://localhost:5000/static/default/default-avatar.png`;
  };

  return (
    <div className="flex items-start gap-3 group mb-6">
      {/* User Avatar */}
      <img
        src={getProfilePictureUrl()}
        alt={`${post.username || 'User'}'s profile`}
        onError={(e) => {
          e.target.src = `http://localhost:5000/static/default/default-avatar.png`;
        }}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
      />

      {/* Post Content */}
      <div className="flex-1 min-w-0 relative">
        {/* Username */}
        <div className="text-sm text-gray-300 mb-1 font-medium ml-2">
          @{post.username || 'Unknown User'}
        </div>

        {/* Speech Bubble */}
        <div className="relative bg-gray-700 text-white rounded-2xl px-4 py-3 shadow-md max-w-lg ml-2">
          {/* Tail */}
          <div className="absolute -left-2 bottom-2 w-0 h-0 border-t-[10px] border-t-gray-700 border-l-[10px] border-l-transparent"></div>

          {/* Delete Button (hover) */}
          {post.is_own_post && (
            <button
              onClick={handleDeleteClick}
              disabled={isDeleting}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-400 transition-opacity opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-gray-600"
              title="Delete this post"
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
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
          <div className="text-xs text-gray-400 mt-2 text-right">
            {formatDate(post.created_at)}
          </div>
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
