import React, { useState } from 'react';
import { Heart, MessageCircle, MoreVertical, Edit, Trash2, UserPlus, UserMinus } from 'lucide-react';
import ETReply from './ETReply';

const ETPost = ({ 
  post, 
  currentUser, 
  onLike, 
  onDelete, 
  onEdit, 
  onReply, 
  getProfilePictureUrl, 
  formatTime, 
  canEditOrDelete 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingPost, setEditingPost] = useState(false);
  const [editContent, setEditContent] = useState(post.content);

  const handleEdit = async () => {
    await onEdit(post._id, editContent);
    setEditingPost(false);
  };

  // Special rendering for join notifications
  if (post.post_type === 'join_notification') {
    return (
      <div className="rounded-lg p-4 bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-700/30">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-600 rounded-full">
            <UserPlus className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center space-x-3 flex-1">
            <img
              src={getProfilePictureUrl(post.profile_picture)}
              alt={post.username}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex items-center space-x-2">
              <span className="font-medium text-green-400">
                {post.user_full_name || post.username}
              </span>
              <span className="text-green-300">joined the event</span>
              <span className="text-gray-500 text-sm">•</span>
              <span className="text-gray-500 text-sm">{formatTime(post.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Special rendering for leave notifications
  if (post.post_type === 'leave_notification') {
    return (
      <div className="rounded-lg p-4 bg-gradient-to-r from-red-900/20 to-rose-900/20 border border-red-700/30">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-red-600 rounded-full">
            <UserMinus className="w-4 h-4 text-white" />
          </div>
          <div className="flex items-center space-x-3 flex-1">
            <img
              src={getProfilePictureUrl(post.profile_picture)}
              alt={post.username}
              className="w-8 h-8 rounded-full object-cover"
            />
            <div className="flex items-center space-x-2">
              <span className="font-medium text-red-400">
                {post.user_full_name || post.username}
              </span>
              <span className="text-red-300">left the event</span>
              <span className="text-gray-500 text-sm">•</span>
              <span className="text-gray-500 text-sm">{formatTime(post.created_at)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Regular post rendering
  return (
    <div className="rounded-lg p-4" style={{backgroundColor: '#171717'}}>
      {/* Post Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <img
            src={getProfilePictureUrl(post.profile_picture)}
            alt={post.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-white">
                {post.user_full_name || post.username}
              </span>
              <span className="text-gray-400">@{post.username}</span>
              <span className="text-gray-500 text-sm">•</span>
              <span className="text-gray-500 text-sm">{formatTime(post.created_at)}</span>
              {post.updated_at !== post.created_at && (
                <span className="text-gray-500 text-sm">(edited)</span>
              )}
            </div>
          </div>
        </div>
        
        {canEditOrDelete(post) && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-1 w-32 bg-[#1c1c1c] rounded-md shadow-lg border border-gray-600 z-10">
                <button
                  onClick={() => {
                    setEditingPost(true);
                    setShowDropdown(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    onDelete(post._id);
                    setShowDropdown(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post Content */}
      {editingPost ? (
        <div className="mb-3">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-[#1c1c1c] border border-gray-600 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white"
            rows="3"
          />
          <div className="flex space-x-2 mt-2">
            <button
              onClick={handleEdit}
              className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600 font-bold transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingPost(false);
                setEditContent(post.content);
              }}
              className="bg-gray-600 text-gray-300 px-3 py-1 rounded text-sm hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-3">
          {/* Text Content */}
          {post.content && (
            <p className="text-gray-300 whitespace-pre-wrap mb-3">{post.content}</p>
          )}
          
          {/* Image Content - Updated for S3 with better sizing */}
          {post.post_type === 'image' && post.secure_image_urls && post.secure_image_urls.length > 0 && (
            <div className="mt-3">
              <div className={`grid gap-2 rounded-lg overflow-hidden ${
                post.secure_image_urls.length === 1 ? 'grid-cols-1 max-w-md' :
                post.secure_image_urls.length === 2 ? 'grid-cols-2 max-w-2xl' :
                post.secure_image_urls.length === 3 ? 'grid-cols-2 max-w-2xl' :
                'grid-cols-2 max-w-2xl'
              }`}>
                {post.secure_image_urls.map((url, index) => (
                  <div key={index} className={`${
                    post.secure_image_urls.length === 3 && index === 0 ? 'col-span-2' : ''
                  }`}>
                    <img
                      src={url}
                      alt={`Post image ${index + 1}`}
                      className="w-full max-h-80 object-contain cursor-pointer hover:opacity-95 transition-opacity rounded-lg"
                      onClick={() => {
                        window.open(url, '_blank');
                      }}
                      onError={(e) => {
                        console.error('Failed to load image:', url);
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Post Actions */}
      <div className="flex items-center space-x-4 text-sm text-gray-400">
        <button
          onClick={() => onLike(post._id)}
          className={`flex items-center space-x-1 hover:text-red-400 transition-colors ${
            post.is_liked_by_user ? 'text-red-400' : ''
          }`}
        >
          <Heart className={`w-4 h-4 ${post.is_liked_by_user ? 'fill-current' : ''}`} />
          <span>{post.likes_count || 0}</span>
        </button>
        
        <button
          onClick={() => onReply(post)}
          className="flex items-center space-x-1 hover:text-orange-400 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{post.replies_count || 0}</span>
        </button>
      </div>

      {/* Replies */}
      {post.replies && post.replies.length > 0 && (
        <div className="mt-4 border-l-2 border-gray-600 pl-4 space-y-3">
          {post.replies.map((reply) => (
            <ETReply
              key={reply._id}
              reply={reply}
              parentPostId={post._id}
              currentUser={currentUser}
              onLike={(replyId) => onLike(replyId, true, post._id)}
              onDelete={(replyId) => onDelete(replyId, true, post._id)}
              onEdit={(replyId, content) => onEdit(replyId, content, true, post._id)}
              getProfilePictureUrl={getProfilePictureUrl}
              formatTime={formatTime}
              canEditOrDelete={canEditOrDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ETPost;