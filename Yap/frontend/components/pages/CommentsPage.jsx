import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../header/Header'
import Sidebar from '../sidebar/Sidebar';

function CommentsPage() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        console.log('PostId from params:', postId); // Debug log
        fetchPostAndComments();
    }, [postId]);

    const fetchPostAndComments = async () => {
        try {
            setLoading(true);
            console.log('Fetching comments for postId:', postId); // Debug log
            
            // fetch the posts and comments
            const response = await fetch(`http://localhost:5000/comments/post/${postId}`);
            console.log('Response status:', response.status); // Debug log
            
            const data = await response.json();
            console.log('Response data:', data); // Debug log

            if (response.ok) {
                setPost(data.post);
                setComments(data.comments);
                setError(''); // Clear any previous errors
            } else {
                console.error('Error response:', data);
                setError(data.error || 'Failed to fetch post');
            }
        } catch (err) {
            console.error('Network error:', err);
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        
        if (!newComment.trim()) {
            setError('Comment cannot be empty');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            setError('Please login to comment');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const response = await fetch('http://localhost:5000/comments/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    post_id: postId,
                    content: newComment
                })
            });

            const data = await response.json();

            if (response.ok) {
                // add the new comment to list
                setComments(prev => [...prev, data.comment]);
                setNewComment('');
                
                // update post comment count
                setPost(prev => ({
                    ...prev,
                    comments_count: prev.comments_count + 1
                }));
            } else {
                setError(data.error || 'Failed to create comment');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const deleteComment = async (commentId) => {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`http://localhost:5000/comments/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // remove comment from list
                setComments(prev => prev.filter(comment => comment._id !== commentId));
                
                // update post comment count
                setPost(prev => ({
                    ...prev,
                    comments_count: prev.comments_count - 1
                }));
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to delete comment');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    };

    const getProfilePictureUrl = (profilePicture) => {
        if (profilePicture && profilePicture.trim() !== '') {
            if (profilePicture.startsWith('http')) {
                return profilePicture;
            }
            return `http://localhost:5000/uploads/profile_pictures/${profilePicture}`;
        }
        // Return a data URL for a simple default avatar
        return "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e0e0e0'/%3E%3Ccircle cx='20' cy='15' r='6' fill='%23bdbdbd'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='8' fill='%23bdbdbd'/%3E%3C/svg%3E";
    };

    if (loading) {
        return (
            <>
                <Header />
                <Sidebar />
                <div>
                    <p>Loading...</p>
                </div>
            </>
        );
    }

    if (error && !post) {
        return (
            <>  
                <Header />
                <Sidebar />
                <div>
                    <p>Error: {error}</p>
                    <p>Post ID: {postId}</p>
                    <button onClick={() => navigate(-1)}>Go Back</button>
                    <button onClick={fetchPostAndComments}>Try Again</button>
                </div>
            </>
        );
    }

    if (!post) {
        return (
            <>  
                <Header />
                <Sidebar />
                <div>
                    <p>Post not found</p>
                    <button onClick={() => navigate(-1)}>Go Back</button>
                </div>
            </>
        );
    }

    return (
        <>
            <Sidebar />
            <div>
                <button onClick={() => navigate(-1)}>
                    ← Back
                </button>

                <h1>Post</h1>

                {/* original post with profile picture */}
                <div>
                    <div>
                        <img 
                            src={getProfilePictureUrl(post.profile_picture)}
                            alt={`${post.username}'s profile`}
                            onClick={() => navigate(`/profile/${post.user_id}`)}
                            onError={(e) => {
                                e.target.src = "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='20' cy='20' r='20' fill='%23e0e0e0'/%3E%3Ccircle cx='20' cy='15' r='6' fill='%23bdbdbd'/%3E%3Cellipse cx='20' cy='35' rx='12' ry='8' fill='%23bdbdbd'/%3E%3C/svg%3E";
                            }}
                            className='w-15 h-15'
                        />
                        <div>
                            <strong onClick={() => navigate(`/profile/${post.user_id}`)}>
                                @{post.username}
                            </strong>
                            <span>
                                {formatDate(post.created_at)}
                            </span>
                        </div>
                    </div>
                    
                    <p>{post.content}</p>
                    
                    <div>
                        <span>❤️ {post.likes_count}</span>
                        <span>💬 {post.comments_count}</span>
                    </div>
                </div>

                {/* comment form */}
                <div>
                    <h3>Add a Comment</h3>
                    <form onSubmit={handleSubmitComment}>
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write your comment..."
                            maxLength={500}
                            disabled={submitting}
                        />
                        
                        <div>
                            <span>{newComment.length}/500</span>
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={submitting || !newComment.trim()}
                        >
                            {submitting ? 'Posting...' : 'Post Comment'}
                        </button>
                    </form>

                    {error && (
                        <div>
                            {error}
                        </div>
                    )}
                </div>

                {/* Comments List with profile pictures */}
                <div>
                    <h3>View comments ({comments.length})</h3>
                    
                    {comments.length === 0 ? (
                        <p>No comments yet. Be the first to comment!</p>
                    ) : (
                        <div>
                            {comments.map((comment) => (
                                <div key={comment._id}>
                                    <div>
                                        <img 
                                            src={getProfilePictureUrl(comment.profile_picture)}
                                            alt={`${comment.username}'s profile`}
                                            onClick={() => navigate(`/profile/${comment.user_id}`)}
                                            onError={(e) => {
                                                e.target.src = "data:image/svg+xml,%3Csvg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='16' cy='16' r='16' fill='%23e0e0e0'/%3E%3Ccircle cx='16' cy='12' r='5' fill='%23bdbdbd'/%3E%3Cellipse cx='16' cy='28' rx='10' ry='6' fill='%23bdbdbd'/%3E%3C/svg%3E";
                                            }}
                                            className='w-15 h-15'
                                        />
                                        <div>
                                            <strong onClick={() => navigate(`/profile/${comment.user_id}`)}>
                                                @{comment.username}
                                            </strong>
                                            <span>
                                                {formatDate(comment.created_at)}
                                            </span>
                                            
                                            {/* show delete button if user owns the comment */}
                                            {localStorage.getItem('token') && (
                                                <button 
                                                    onClick={() => deleteComment(comment._id)}
                                                >
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <p>{comment.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default CommentsPage;