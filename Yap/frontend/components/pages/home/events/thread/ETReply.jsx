import React, { useState } from 'react';
import { Heart, MoreVertical, Edit, Trash2 } from 'lucide-react';

const ETReply = ({ 
  reply, 
  parentPostId, 
  currentUser, 
  onLike, 
  onDelete, 
  onEdit, 
  getProfilePictureUrl, 
  formatTime, 
  canEditOrDelete 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingReply, setEditingReply] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);

  const handleEdit = async () => {
    await onEdit(reply._id, editContent);
    setEditingReply(false);
  };

  return (
    <div className="relative">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-2 mb-2">
          <img
            src={getProfilePictureUrl(reply.profile_picture)}
            alt={reply.username}
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="font-medium text-white text-sm">
            {reply.user_full_name || reply.username}
          </span>
          <span className="text-gray-500 text-xs">{formatTime(reply.created_at)}</span>
        </div>
        
        {canEditOrDelete(reply) && (
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-1 hover:bg-gray-700 rounded transition-colors"
            >
              <MoreVertical className="w-3 h-3 text-gray-400" />
            </button>
            
            {showDropdown && (
              <div className="absolute right-0 mt-1 w-32 bg-gray-800 rounded-md shadow-lg border border-gray-600 z-10">
                <button
                  onClick={() => {
                    setEditingReply(true);
                    setShowDropdown(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  <Edit className="w-3 h-3" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => {
                    onDelete(reply._id);
                    setShowDropdown(false);
                  }}
                  className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {editingReply ? (
        <div>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white text-sm"
            rows="2"
          />
          <div className="flex space-x-2 mt-2">
            <button
              onClick={handleEdit}
              className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600 font-bold transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditingReply(false);
                setEditContent(reply.content);
              }}
              className="bg-gray-600 text-gray-300 px-3 py-1 rounded text-xs hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-300 text-sm whitespace-pre-wrap mb-2">{reply.content}</p>
          <button
            onClick={() => onLike(reply._id)}
            className={`flex items-center space-x-1 text-xs hover:text-red-400 transition-colors ${
              reply.is_liked_by_user ? 'text-red-400' : 'text-gray-400'
            }`}
          >
            <Heart className={`w-3 h-3 ${reply.is_liked_by_user ? 'fill-current' : ''}`} />
            <span>{reply.likes_count || 0}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ETReply;