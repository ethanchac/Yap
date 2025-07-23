import React, { useState } from 'react';
import { Heart, MessageCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';
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
              <div className="absolute right-0 mt-1 w-32 bg-gray-800 rounded-md shadow-lg border border-gray-600 z-10">
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
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white"
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
          <p className="text-gray-300 whitespace-pre-wrap">{post.content}</p>
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