import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Trash2, MoreHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function PostItem({ post, onPostDeleted }) {
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(post.likes_count);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const navigate = useNavigate();

    // Get current user info on component mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            // Decode token to get current user info (you might have this logic elsewhere)
            // For now, we'll make a request to get current user
            fetchCurrentUser();
        }
    }, []);

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
            console.error('Network error:', error);
            alert('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        const token = localStorage.getItem('token');
        
        if (!token) {
            alert('Please login to delete posts');
            return;
        }

        setDeleting(true);

        try {
            const response = await fetch(`http://localhost:5000/posts/${post._id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok) {
                // Call the parent component's callback to remove this post from the list
                if (onPostDeleted) {
                    onPostDeleted(post._id);
                }
                alert('Post deleted successfully');
            } else {
                alert(data.error || 'Failed to delete post');
            }
        } catch (error) {
            console.error('Error deleting post:', error);
            alert('Network error. Please try again.');
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
            setShowMenu(false);
        }
    };

    const handleCommentClick = () => {
        navigate(`/post/${post._id}/comments`);
    };

    const handleUsernameClick = (e) => {
        e.stopPropagation();
        navigate(`/profile/${post.user_id}`);
    };

    const handleProfilePhotoClick = (e) => {
        e.stopPropagation();
        navigate(`/profile/${post.user_id}`);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const getProfilePictureUrl = () => {
        if (post.profile_picture) {
            if (post.profile_picture.startsWith('http')) {
                return post.profile_picture;
            }
            return `http://localhost:5000/uploads/profile_pictures/${post.profile_picture}`;
        }
        return `http://localhost:5000/static/default/default-avatar.png`;
    };

    const renderPostImages = () => {
        if (!post.images || post.images.length === 0) return null;

        const imageCount = post.images.length;

        if (imageCount === 1) {
            return (
                <div className="mt-3">
                    <img 
                        src={post.images[0]} 
                        alt="Post image"
                        className="max-w-full max-h-96 object-contain rounded-lg border border-gray-600"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                </div>
            );
        }

        if (imageCount === 2) {
            return (
                <div className="mt-3 grid grid-cols-2 gap-2">
                    {post.images.map((image, index) => (
                        <img 
                            key={index}
                            src={image} 
                            alt={`Post image ${index + 1}`}
                            className="max-w-full max-h-48 object-contain rounded-lg border border-gray-600"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    ))}
                </div>
            );
        }

        if (imageCount === 3) {
            return (
                <div className="mt-3 space-y-2">
                    <img 
                        src={post.images[0]} 
                        alt="Post image 1"
                        className="max-w-full max-h-48 object-contain rounded-lg border border-gray-600"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        {post.images.slice(1).map((image, index) => (
                            <img 
                                key={index + 1}
                                src={image} 
                                alt={`Post image ${index + 2}`}
                                className="max-w-full max-h-32 object-contain rounded-lg border border-gray-600"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        ))}
                    </div>
                </div>
            );
        }

        if (imageCount === 4) {
            return (
                <div className="mt-3 grid grid-cols-2 gap-2">
                    {post.images.map((image, index) => (
                        <img 
                            key={index}
                            src={image} 
                            alt={`Post image ${index + 1}`}
                            className="max-w-full max-h-32 object-contain rounded-lg border border-gray-600"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    ))}
                </div>
            );
        }

        return null;
    };

    // Check if current user owns this post
    const isOwnPost = currentUser && currentUser._id === post.user_id;

    return (
        <div className="rounded-lg p-6 font-bold mb-4 transition-all duration-200 hover:bg-zinc-800 hover:shadow-sm hover:scale-101 cursor-pointer relative" style={{fontFamily: 'Albert Sans', backgroundColor: '#171717'}}>
            <div className="flex items-start space-x-3">
                {/* Profile Picture */}
                <img 
                    src={getProfilePictureUrl()}
                    alt={`${post.username}'s profile`}
                    onClick={handleProfilePhotoClick}
                    onError={(e) => {
                        e.target.src = `http://localhost:5000/static/default/default-avatar.png`;
                    }}
                    className='w-12 h-12 rounded-full cursor-pointer hover:opacity-80 transition-opacity object-cover'
                />
                
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
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
                        
                        {/* More options menu (only for own posts) */}
                        {isOwnPost && (
                            <div className="relative">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMenu(!showMenu);
                                    }}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"
                                >
                                    <MoreHorizontal className="w-4 h-4" />
                                </button>
                                
                                {/* Dropdown menu */}
                                {showMenu && (
                                    <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10 min-w-[120px]">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDeleteConfirm(true);
                                                setShowMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 flex items-center space-x-2 rounded-lg"
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
                    {post.content && (
                        <p className="text-white mb-3 leading-relaxed">{post.content}</p>
                    )}
                    
                    {/* Post Images */}
                    {renderPostImages()}
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-6 mt-4">
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
            
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-sm mx-4">
                        <h3 className="text-white text-lg font-bold mb-4">Delete Post?</h3>
                        <p className="text-gray-300 mb-6">This action cannot be undone. Are you sure you want to delete this post?</p>
                        <div className="flex space-x-3">
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-700 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleting}
                                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Click outside to close menu */}
            {showMenu && (
                <div 
                    className="fixed inset-0 z-5"
                    onClick={() => setShowMenu(false)}
                />
            )}
        </div>
    );
}

export default PostItem;