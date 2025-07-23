import React, { useRef, useEffect } from 'react';
import { Send, Image, Link } from 'lucide-react';

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
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newPostContent]);

  return (
    <div className="rounded-lg p-4 mb-6" style={{backgroundColor: '#171717'}}>
      {replyingTo && (
        <div className="mb-3 p-2 bg-orange-900/20 rounded border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <span className="text-sm text-orange-400">
              Replying to @{replyingTo.username}
            </span>
            <button 
              onClick={() => setReplyingTo(null)}
              className="text-orange-400 hover:text-orange-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <form onSubmit={onSubmit}>
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
              placeholder={replyingTo ? "Write a reply..." : "Share your thoughts about this event..."}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white placeholder-gray-400"
              rows="1"
              style={{ minHeight: '40px', maxHeight: '120px' }}
            />
            <div className="flex items-center justify-between mt-3">
              <div className="flex space-x-2">
                <button 
                  type="button" 
                  className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
                >
                  <Image className="w-4 h-4" />
                </button>
                <button 
                  type="button" 
                  className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
                >
                  <Link className="w-4 h-4" />
                </button>
              </div>
              <button
                type="submit"
                disabled={!newPostContent.trim() || posting}
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
      </form>
    </div>
  );
};

export default ETInput;