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

        setLoading(true);

        try {
            const response = await fetch(`http://localhost:5000/posts/${post._id}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                setLiked(data.liked);
                setLikesCount(prev => data.liked ? prev + 1 : prev - 1);
            } else {
                alert(data.error || 'Failed to like post');
            }
        } catch (error) {
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCommentClick = () => {
        // Navigate to comments page
        navigate(`/post/${post._id}/comments`);
    };

    const handleUsernameClick = (e) => {
        e.stopPropagation(); // Prevent event bubbling
        // Navigate to user's profile
        navigate(`/profile/${post.user_id}`);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    return (
        <div>
            <div>
                {/* i just added this style so its easier for me to test the functionality. can remove if you want */}
                <strong 
                    onClick={handleUsernameClick}
                    style={{ cursor: 'pointer' }}
                >
                    @{post.username}
                </strong>
                <span>
                    {formatDate(post.created_at)}
                </span>
            </div>
            
            <p>{post.content}</p>
            
            <div>
                <button 
                    onClick={handleLike}
                    disabled={loading}
                >
                    {/* you can change the icons to whatever you want. i just used these emojis as placeholders */}
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