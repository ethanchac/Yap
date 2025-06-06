import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
        fetchPostAndComments();
    }, [postId]);

    const fetchPostAndComments = async () => {
        try {
            setLoading(true);
            
            // Fetch post and comments
            const response = await fetch(`http://localhost:5000/comments/post/${postId}`);
            const data = await response.json();

            if (response.ok) {
                setPost(data.post);
                setComments(data.comments);
            } else {
                setError(data.error || 'Failed to fetch post');
            }
        } catch (err) {
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
                // Add new comment to the list
                setComments(prev => [...prev, data.comment]);
                setNewComment('');
                
                // Update post comment count
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
                // Remove comment from list
                setComments(prev => prev.filter(comment => comment._id !== commentId));
                
                // Update post comment count
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

    if (loading) {
        return (
            <>
                <Sidebar />
                <div>
                    <p>Loading...</p>
                </div>
            </>
        );
    }

    if (!post) {
        return (
            <>
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

                {/* Original Post */}
                <div>
                    <div>
                        <strong>@{post.username}</strong>
                        <span>
                            {formatDate(post.created_at)}
                        </span>
                    </div>
                    
                    <p>{post.content}</p>
                    
                    <div>
                        {/* Change these icons to however you want */}
                        <span>❤️ {post.likes_count}</span>
                        <span>💬 {post.comments_count}</span>
                    </div>
                </div>

                {/* Comment Form */}
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

                {/* Comments List */}
                <div>
                    <h3>View comments ({comments.length})</h3>
                    
                    {comments.length === 0 ? (
                        <p>No comments yet. Be the first to comment!</p>
                    ) : (
                        <div>
                            {comments.map((comment) => (
                                <div key={comment._id}>
                                    <div>
                                        <strong>@{comment.username}</strong>
                                        <span>
                                            {formatDate(comment.created_at)}
                                        </span>
                                        
                                        {/* Show delete button if user owns the comment */}
                                        {localStorage.getItem('token') && (
                                            <button 
                                                onClick={() => deleteComment(comment._id)}
                                            >
                                                Delete
                                            </button>
                                        )}
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