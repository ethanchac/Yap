import { useState, useEffect } from 'react';
import { Heart, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function PostItem({ post }) {
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(post.likes_count);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Check if user has liked this post when component mounts
    useEffect(() => {
        checkLikeStatus();
    }, [post._id]);

    const checkLikeStatus = async () => {
        const token = localStorage.getItem('token');
        if (!token) return; // User not logged in

        try {
            const response = await fetch(`http://localhost:5000/posts/${post._id}/like-status`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setLiked(data.liked);
            }
        } catch (error) {
            console.error('Error checking like status:', error);
        }
    };

    const handleLike = async () => {
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert('Please login to like posts');
            return;
        }

        // Debug logs
        console.log('Attempting to like post:');
        console.log('Post ID:', post._id);
        console.log('Post object:', post);
        console.log('URL:', `http://localhost:5000/posts/${post._id}/like`);

        setLoading(true);

        try {
            const response = await fetch(`http://localhost:5000/posts/${post._id}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Response status:', response.status);

            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                setLiked(data.liked);
                setLikesCount(prev => data.liked ? prev + 1 : prev - 1);
            } else {
                alert(data.error || 'Failed to like post');
            }
        } catch (error) {
            console.error('Network error:', error);
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCommentClick = () => {
        // Debug: Log the post ID and navigation path
        console.log('Navigating to comments for post ID:', post._id);
        console.log('Navigation path:', `/post/${post._id}/comments`);
        
        // Navigate to comments page
        navigate(`/post/${post._id}/comments`);
    };

    const handleUsernameClick = (e) => {
        e.stopPropagation(); // Prevent event bubbling
        // Navigate to user's profile
        navigate(`/profile/${post.user_id}`);
    };

    const handleProfilePhotoClick = (e) => {
        e.stopPropagation(); // Prevent event bubbling
        // Navigate to user's profile
        navigate(`/profile/${post.user_id}`);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    // Function to get profile picture URL or default
    const getProfilePictureUrl = () => {
        if (post.profile_picture) {
            // If it's already a full URL (like from your upload system), use it directly
            if (post.profile_picture.startsWith('http')) {
                return post.profile_picture;
            }
            // If it's just a filename, this shouldn't happen with your current system
            // but keeping it as fallback
            return `http://localhost:5000/uploads/profile_pictures/${post.profile_picture}`;
        }
        // Default profile picture if none exists
        return `http://localhost:5000/static/default/default-avatar.png`;
    };

    return (
        <div className="rounded-lg p-6 font-bold mb-4" style={{fontFamily: 'Albert Sans', backgroundColor: '#1f2937'}}>
            <div className="flex items-start space-x-3">
                {/* Profile Picture */}
                <img 
                    src={getProfilePictureUrl()}
                    alt={`${post.username}'s profile`}
                    onClick={handleProfilePhotoClick}
                    onError={(e) => {
                        // Fallback to default avatar if image fails to load
                        e.target.src = `http://localhost:5000/static/default/default-avatar.png`;
                    }}
                    className='w-12 h-12 rounded-full cursor-pointer hover:opacity-80 transition-opacity object-cover'
                />
                
                <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                        <strong 
                            onClick={handleUsernameClick}
                            className="text-white hover:text-gray-300 cursor-pointer transition-colors"
                        >
                            @{post.username}
                        </strong>
                        <div className="text-gray-400 text-sm">
                            {formatDate(post.created_at)}
                        </div>
                    </div>
                    
                    <p className="text-white mb-4 leading-relaxed">{post.content}</p>
                    
                    <div className="flex items-center space-x-6">
                        <button 
                            onClick={handleLike}
                            disabled={loading}
                            className="flex items-center space-x-1 text-gray-400 hover:text-red-400 transition-colors disabled:opacity-50"
                        >
                            <Heart 
                                className={`w-5 h-5 ${liked ? 'fill-red-500 text-red-500' : ''}`}
                            />
                            <span className="text-sm font-bold">{likesCount}</span>
                        </button>
                        
                        <button 
                            onClick={handleCommentClick}
                            className="flex items-center space-x-1 text-gray-400 hover:text-blue-400 transition-colors"
                        >
                            <MessageCircle className="w-5 h-5" />
                            <span className="text-sm font-bold">{post.comments_count}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PostItem;