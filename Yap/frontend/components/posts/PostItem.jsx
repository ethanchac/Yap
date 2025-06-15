import { useState, useEffect } from 'react';
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
        <div>
            <div>
                {/* Profile Picture */}
                <img 
                    src={getProfilePictureUrl()}
                    alt={`${post.username}'s profile`}
                    onClick={handleProfilePhotoClick}
                    onError={(e) => {
                        // Fallback to default avatar if image fails to load
                        e.target.src = `http://localhost:5000/static/default/default-avatar.png`;
                    }}
                    className='w-15 h-15'
                />
                
                <div>
                    <strong 
                        onClick={handleUsernameClick}
                    >
                        @{post.username}
                    </strong>
                    <div>
                        {formatDate(post.created_at)}
                    </div>
                </div>
            </div>
            
            <p>{post.content}</p>
            
            <div>
                <button 
                    onClick={handleLike}
                    disabled={loading}
                >
                    <span>{liked ? '❤️' : '🤍'}</span>
                    <span>{likesCount}</span>
                </button>
                
                <button 
                    onClick={handleCommentClick}
                >
                    <span>💬</span>
                    <span>{post.comments_count}</span>
                </button>
            </div>
        </div>
    );
}

export default PostItem;