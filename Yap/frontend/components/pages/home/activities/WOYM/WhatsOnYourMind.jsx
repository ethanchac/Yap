// WhatsOnYourMind.jsx
import { useState, useEffect } from 'react';
import MindPost from './MindPost';

const API_URL = 'http://localhost:5000/api/activities/whatsonmind';

export default function WhatsOnYourMind() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Create post state
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);

  // Load posts and current user on component mount
  useEffect(() => {
    fetchCurrentUser();
    fetchPosts();
  }, []);

  const getAuthHeaders = () => {
    // Get the JWT token from localStorage
    const token = localStorage.getItem('token');
    
    console.log('🔍 Frontend: Token from localStorage:', token ? 'Token exists' : 'No token found');
    
    if (!token) {
      console.log('🔍 Frontend: No token, sending basic headers');
      return {
        'Content-Type': 'application/json'
      };
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    console.log('🔍 Frontend: Sending headers:', headers);
    return headers;
  };

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch('http://localhost:5000/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.profile || data);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const getCurrentUserProfilePicture = () => {
    if (currentUser?.profile_picture) {
      if (currentUser.profile_picture.startsWith('http')) {
        return currentUser.profile_picture;
      }
      return `http://localhost:5000/uploads/profile_pictures/${currentUser.profile_picture}`;
    }
    return `http://localhost:5000/static/default/default-avatar.png`;
  };

  const fetchPosts = async () => {
    console.log('🔍 Frontend: Starting fetchPosts...');
    console.log('🔍 Frontend: API_URL:', API_URL);
    
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: getAuthHeaders(),
        mode: 'cors',
        credentials: 'include'
      });
      
      console.log('🔍 Frontend: Response received:', response);
      console.log('🔍 Frontend: Response status:', response.status);
      console.log('🔍 Frontend: Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Frontend: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('🔍 Frontend: Data received:', data);
      
      if (Array.isArray(data)) {
        setPosts(data);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error('🔍 Frontend: Fetch error:', err);
      console.error('🔍 Frontend: Error message:', err.message);
      setError(err.message || 'Failed to load posts.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!newPost.trim()) {
      setError('Please write something before posting.');
      return;
    }

    if (newPost.length > 500) {
      setError('Post cannot exceed 500 characters.');
      return;
    }

    setPosting(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content: newPost.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create post');
      }

      const createdPost = await response.json();
      
      // Add user profile data to the created post
      createdPost.username = currentUser?.username || 'You';
      createdPost.profile_picture = currentUser?.profile_picture;
      
      // Add the new post to the beginning of the list (newest first)
      setPosts(prev => [createdPost, ...prev]);
      
      // Reset form
      setNewPost('');
      
    } catch (err) {
      console.error('Error creating post:', err);
      setError(err.message || 'Failed to create post. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setDeleting(postId);

    try {
      const response = await fetch(`${API_URL}/${postId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete post');
      }

      // Remove the post from the list
      setPosts(prev => prev.filter(p => p._id !== postId));

    } catch (err) {
      console.error('Error deleting post:', err);
      setError(err.message || 'Failed to delete post. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg p-4" style={{ backgroundColor: '#171717' }}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-20 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
              <div className="flex-1 h-16 bg-gray-700 rounded"></div>
            </div>
            <div className="flex gap-3">
              <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
              <div className="flex-1 h-12 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-4 bg-[#171717] flex flex-col h-full">
      {/* Header */}
      <div className="mb-6 flex-shrink-0">
        <h2 className="text-white text-xl font-bold mb-4">What's on Your Mind?</h2>
        
        {/* Create Post Form */}
        <form onSubmit={handleCreatePost} className="space-y-3">
          <div className="flex gap-3">
            {/* Current User Avatar */}
            <img 
              src={getCurrentUserProfilePicture()}
              alt="Your profile"
              onError={(e) => {
                e.target.src = `http://localhost:5000/static/default/default-avatar.png`;
              }}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            
            {/* Input Field */}
            <div className="flex-1">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none"
                rows={3}
                maxLength={500}
                disabled={posting}
              />
              <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-400">
                  {newPost.length}/500 characters
                </div>
                <button
                  type="submit"
                  disabled={posting || !newPost.trim()}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
                >
                  {posting ? 'Posting...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-800 text-red-300 rounded-lg flex-shrink-0">
          {error}
        </div>
      )}

      {/* Posts List */}
      {posts.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-gray-700 flex-1 flex flex-col justify-center" style={{ backgroundColor: '#171717' }}>
          <p className="text-gray-400 mb-4">No posts yet. Share what's on your mind!</p>
        </div>
      ) : (
        <div className="space-y-4 flex-1 overflow-y-auto">
          {posts.map((post) => (
            <MindPost
              key={post._id}
              post={post}
              onDelete={handleDeletePost}
              isDeleting={deleting === post._id}
            />
          ))}
        </div>
      )}
    </div>
  );
}