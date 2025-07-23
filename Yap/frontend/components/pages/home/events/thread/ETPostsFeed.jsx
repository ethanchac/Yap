import React from 'react';
import { MessageCircle } from 'lucide-react';
import ETPost from './ETPost';

const ETPostsFeed = ({ 
  posts, 
  loading, 
  currentUser, 
  onLike, 
  onDelete, 
  onEdit, 
  onReply, 
  getProfilePictureUrl, 
  formatTime, 
  canEditOrDelete 
}) => {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No posts yet</h3>
        <p className="text-gray-400">Be the first to start the conversation!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <ETPost
          key={post._id}
          post={post}
          currentUser={currentUser}
          onLike={onLike}
          onDelete={onDelete}
          onEdit={onEdit}
          onReply={onReply}
          getProfilePictureUrl={getProfilePictureUrl}
          formatTime={formatTime}
          canEditOrDelete={canEditOrDelete}
        />
      ))}
    </div>
  );
};

export default ETPostsFeed;