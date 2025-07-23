import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Send, 
  Heart, 
  MessageCircle, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Users,
  Calendar,
  MapPin,
  Image,
  Link
} from 'lucide-react';
import Sidebar from '../sidebar/Sidebar';
import Header from '../header/Header';

const EventThread = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [threadInfo, setThreadInfo] = useState(null);
  const [posts, setPosts] = useState([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showDropdown, setShowDropdown] = useState(null);
  const postsEndRef = useRef(null);
  const textareaRef = useRef(null);
  const mainContentRef = useRef(null);

  // Get current user from token
  useEffect(() => {
    const getCurrentUser = () => {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
      } catch (e) {
        console.error('Error getting current user:', e);
        return null;
      }
    };

    const user = getCurrentUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
  }, [navigate]);

  // Auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Fetch thread info and posts
  useEffect(() => {
    if (eventId && currentUser) {
      fetchThreadInfo();
      fetchPosts();
    }
  }, [eventId, currentUser]);

  // Auto-scroll to bottom when new posts are added
  useEffect(() => {
    if (postsEndRef.current) {
      postsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [posts]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newPostContent]);

  const fetchThreadInfo = async () => {
    try {
      const response = await fetch(`http://localhost:5000/eventthreads/${eventId}/info`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setThreadInfo(data);
      } else if (response.status === 403) {
        const errorData = await response.json();
        setError(errorData.error || 'You must be attending this event to view the thread');
      } else {
        throw new Error('Failed to fetch thread info');
      }
    } catch (err) {
      console.error('Error fetching thread info:', err);
      setError('Failed to load thread information');
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/eventthreads/${eventId}/posts?limit=50&sort_order=1`, {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setPosts(data.posts);
      } else if (response.status === 403) {
        const errorData = await response.json();
        setError(errorData.error || 'You must be attending this event to view the thread');
      } else {
        throw new Error('Failed to fetch posts');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load thread posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    
    if (!newPostContent.trim() || posting) return;

    setPosting(true);
    try {
      const postData = {
        content: newPostContent.trim(),
        post_type: 'text',
        reply_to: replyingTo?._id || null
      };

      const response = await fetch(`http://localhost:5000/eventthreads/${eventId}/posts`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(postData)
      });

      if (response.ok) {
        const data = await response.json();
        
        // Add the new post to the posts array
        const newPost = {
          ...data.post,
          profile_picture: currentUser.profile_picture,
          user_full_name: currentUser.full_name,
          is_liked_by_user: false,
          replies: []
        };

        // If it's a reply, update the parent post's replies
        if (replyingTo) {
          setPosts(prevPosts => 
            prevPosts.map(post => 
              post._id === replyingTo._id 
                ? { ...post, replies: [...post.replies, newPost], replies_count: post.replies_count + 1 }
                : post
            )
          );
        } else {
          setPosts(prevPosts => [...prevPosts, newPost]);
        }

        // Clear form
        setNewPostContent('');
        setReplyingTo(null);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to post message');
      }
    } catch (err) {
      console.error('Error posting message:', err);
      alert('Network error. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleLikePost = async (postId, isReply = false, parentPostId = null) => {
    try {
      const response = await fetch(`http://localhost:5000/eventthreads/posts/${postId}/like`, {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        
        if (isReply && parentPostId) {
          // Update reply within parent post
          setPosts(prevPosts =>
            prevPosts.map(post =>
              post._id === parentPostId
                ? {
                    ...post,
                    replies: post.replies.map(reply =>
                      reply._id === postId
                        ? {
                            ...reply,
                            is_liked_by_user: data.liked,
                            likes_count: data.liked ? reply.likes_count + 1 : Math.max(0, reply.likes_count - 1)
                          }
                        : reply
                    )
                  }
                : post
            )
          );
        } else {
          // Update main post
          setPosts(prevPosts =>
            prevPosts.map(post =>
              post._id === postId
                ? {
                    ...post,
                    is_liked_by_user: data.liked,
                    likes_count: data.liked ? post.likes_count + 1 : Math.max(0, post.likes_count - 1)
                  }
                : post
            )
          );
        }
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleDeletePost = async (postId, isReply = false, parentPostId = null) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`http://localhost:5000/eventthreads/posts/${postId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        if (isReply && parentPostId) {
          // Remove reply from parent post
          setPosts(prevPosts =>
            prevPosts.map(post =>
              post._id === parentPostId
                ? {
                    ...post,
                    replies: post.replies.filter(reply => reply._id !== postId),
                    replies_count: Math.max(0, post.replies_count - 1)
                  }
                : post
            )
          );
        } else {
          // Remove main post
          setPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
        }
      }
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const handleEditPost = async (postId, newContent, isReply = false, parentPostId = null) => {
    try {
      const response = await fetch(`http://localhost:5000/eventthreads/posts/${postId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ content: newContent })
      });

      if (response.ok) {
        if (isReply && parentPostId) {
          // Update reply within parent post
          setPosts(prevPosts =>
            prevPosts.map(post =>
              post._id === parentPostId
                ? {
                    ...post,
                    replies: post.replies.map(reply =>
                      reply._id === postId
                        ? { ...reply, content: newContent, updated_at: new Date().toISOString() }
                        : reply
                    )
                  }
                : post
            )
          );
        } else {
          // Update main post
          setPosts(prevPosts =>
            prevPosts.map(post =>
              post._id === postId
                ? { ...post, content: newContent, updated_at: new Date().toISOString() }
                : post
            )
          );
        }
        
        setEditingPost(null);
        setEditContent('');
      }
    } catch (err) {
      console.error('Error editing post:', err);
    }
  };

  const getProfilePictureUrl = (profilePicture) => {
    if (profilePicture?.trim()) {
      return profilePicture.startsWith('http')
        ? profilePicture
        : `http://localhost:5000/uploads/profile_pictures/${profilePicture}`;
    }
    return "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ccircle cx='50' cy='35' r='15' fill='%23bdbdbd'/%3E%3Cellipse cx='50' cy='85' rx='25' ry='20' fill='%23bdbdbd'/%3E%3C/svg%3E";
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const canEditOrDelete = (post) => {
    return currentUser && (
      currentUser._id === post.user_id || 
      currentUser.id === post.user_id || 
      currentUser.sub === post.user_id
    );
  };

  if (error) {
    return (
      <div className="h-screen overflow-hidden font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
        <Header />
        <Sidebar />
        <div className="ml-64 h-full overflow-y-auto p-6">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-400 text-lg mb-4">{error}</div>
              <button 
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!threadInfo) {
    return (
      <div className="h-screen overflow-hidden font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
        <Header />
        <Sidebar />
        <div className="ml-64 h-full overflow-y-auto p-6">
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
      <Header />
      <Sidebar />
      <div 
        ref={mainContentRef}
        className="ml-64 h-full overflow-y-auto p-6 scrollbar-custom"
      >
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-700 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <div>
                <h1 className="text-white text-2xl font-bold">{threadInfo.event.title}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{threadInfo.thread_stats.total_attendees} attending</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MessageCircle className="w-4 h-4" />
                    <span>{threadInfo.thread_stats.total_posts} posts</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(threadInfo.event.event_datetime).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Post Input Box */}
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
          
          <form onSubmit={handlePostSubmit}>
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
                    <button type="button" className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors">
                      <Image className="w-4 h-4" />
                    </button>
                    <button type="button" className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors">
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

        {/* Posts Feed */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No posts yet</h3>
              <p className="text-gray-400">Be the first to start the conversation!</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post._id} className="rounded-lg p-4" style={{backgroundColor: '#171717'}}>
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
                        onClick={() => setShowDropdown(showDropdown === post._id ? null : post._id)}
                        className="p-1 hover:bg-gray-700 rounded transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>
                      
                      {showDropdown === post._id && (
                        <div className="absolute right-0 mt-1 w-32 bg-gray-800 rounded-md shadow-lg border border-gray-600 z-10">
                          <button
                            onClick={() => {
                              setEditingPost(post._id);
                              setEditContent(post.content);
                              setShowDropdown(null);
                            }}
                            className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => {
                              handleDeletePost(post._id);
                              setShowDropdown(null);
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
                {editingPost === post._id ? (
                  <div className="mb-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white"
                      rows="3"
                    />
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() => handleEditPost(post._id, editContent)}
                        className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600 font-bold transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingPost(null);
                          setEditContent('');
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
                    onClick={() => handleLikePost(post._id)}
                    className={`flex items-center space-x-1 hover:text-red-400 transition-colors ${
                      post.is_liked_by_user ? 'text-red-400' : ''
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.is_liked_by_user ? 'fill-current' : ''}`} />
                    <span>{post.likes_count || 0}</span>
                  </button>
                  
                  <button
                    onClick={() => setReplyingTo(post)}
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
                      <div key={reply._id} className="relative">
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
                                onClick={() => setShowDropdown(showDropdown === reply._id ? null : reply._id)}
                                className="p-1 hover:bg-gray-700 rounded transition-colors"
                              >
                                <MoreVertical className="w-3 h-3 text-gray-400" />
                              </button>
                              
                              {showDropdown === reply._id && (
                                <div className="absolute right-0 mt-1 w-32 bg-gray-800 rounded-md shadow-lg border border-gray-600 z-10">
                                  <button
                                    onClick={() => {
                                      setEditingPost(reply._id);
                                      setEditContent(reply.content);
                                      setShowDropdown(null);
                                    }}
                                    className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                                  >
                                    <Edit className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleDeletePost(reply._id, true, post._id);
                                      setShowDropdown(null);
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
                        
                        {editingPost === reply._id ? (
                          <div>
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-white text-sm"
                              rows="2"
                            />
                            <div className="flex space-x-2 mt-2">
                              <button
                                onClick={() => handleEditPost(reply._id, editContent, true, post._id)}
                                className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600 font-bold transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPost(null);
                                  setEditContent('');
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
                              onClick={() => handleLikePost(reply._id, true, post._id)}
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
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        
        {/* Scroll anchor */}
        <div ref={postsEndRef} />
      </div>
    </div>
  );
};

export default EventThread;