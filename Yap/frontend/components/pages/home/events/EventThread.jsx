import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../../sidebar/Sidebar';
import Header from '../../../header/Header';
import ETHeader from './thread/ETHeader';
import ETInput from './thread/ETInput';
import ETPostsFeed from './thread/ETPostsFeed';

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
  const postsEndRef = useRef(null);
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
        <ETHeader threadInfo={threadInfo} />
        
        <ETInput
          newPostContent={newPostContent}
          setNewPostContent={setNewPostContent}
          onSubmit={handlePostSubmit}
          posting={posting}
          replyingTo={replyingTo}
          setReplyingTo={setReplyingTo}
          currentUser={currentUser}
          getProfilePictureUrl={getProfilePictureUrl}
        />

        <ETPostsFeed
          posts={posts}
          loading={loading}
          currentUser={currentUser}
          onLike={handleLikePost}
          onDelete={handleDeletePost}
          onEdit={handleEditPost}
          onReply={setReplyingTo}
          getProfilePictureUrl={getProfilePictureUrl}
          formatTime={formatTime}
          canEditOrDelete={canEditOrDelete}
        />
        
        {/* Scroll anchor */}
        <div ref={postsEndRef} />
      </div>
    </div>
  );
};

export default EventThread;