import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../header/Header';
import Sidebar from '../sidebar/Sidebar';

function Likes() {
    const navigate = useNavigate();
    const [likedPosts, setLikedPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [totalLiked, setTotalLiked] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);

    // Get token from localStorage or your auth context
    const getToken = () => {
        return localStorage.getItem('token'); // Adjust based on how you store tokens
    };

    // Fetch liked posts
    const fetchLikedPosts = async (pageNum = 1, append = false) => {
        try {
            if (pageNum === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }

            const token = getToken();
            const response = await fetch(`http://localhost:5000/posts/liked?page=${pageNum}&limit=20`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch liked posts');
            }

            const data = await response.json();
            
            if (append) {
                setLikedPosts(prev => [...prev, ...data.posts]);
            } else {
                setLikedPosts(data.posts);
            }
            
            setHasMore(data.has_more);
            setTotalLiked(data.total_liked);
            setPage(pageNum);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Handle like/unlike
    const handleLike = async (postId) => {
        try {
            const token = getToken();
            const response = await fetch(`http://localhost:5000/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Failed to update like');
            }

            const result = await response.json();
            
            // If post was unliked, remove it from the list
            if (!result.liked) {
                setLikedPosts(prev => prev.filter(post => post._id !== postId));
                setTotalLiked(prev => prev - 1);
            } else {
                // Update the like status in the list
                setLikedPosts(prev => 
                    prev.map(post => 
                        post._id === postId 
                            ? { ...post, is_liked_by_current_user: result.liked }
                            : post
                    )
                );
            }

        } catch (err) {
            console.error('Error updating like:', err);
        }
    };

    // Navigate to comments page
    const goToComments = (postId) => {
        navigate(`/post/${postId}/comments`);
    };

    // Load more posts
    const loadMore = () => {
        if (hasMore && !loadingMore) {
            fetchLikedPosts(page + 1, true);
        }
    };

    // Format date
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Initial load
    useEffect(() => {
        fetchLikedPosts();
    }, []);

    return (
        <>
            <Header />
            <Sidebar />
            <div>
                <div>
                    <h1>Posts You've Liked</h1>
                    {totalLiked > 0 && (
                        <p>{totalLiked} liked posts</p>
                    )}
                </div>

                {loading && (
                    <div>
                        <p>Loading your liked posts...</p>
                    </div>
                )}

                {error && (
                    <div>
                        <p>Error: {error}</p>
                        <button onClick={() => fetchLikedPosts()}>Try Again</button>
                    </div>
                )}

                {!loading && !error && likedPosts.length === 0 && (
                    <div>
                        <h2>No liked posts yet</h2>
                        <p>Posts you like will appear here</p>
                    </div>
                )}

                {!loading && !error && likedPosts.length > 0 && (
                    <div>
                        {likedPosts.map((post) => (
                            <div key={post._id}>
                                <div>
                                    <div>
                                        <strong>@{post.username}</strong>
                                    </div>
                                    <div>
                                        <span>Posted: {formatDate(post.created_at)}</span>
                                        <span>Liked: {formatDate(post.liked_at)}</span>
                                    </div>
                                </div>

                                <div>
                                    <p>{post.content}</p>
                                </div>

                                <div>
                                    <button onClick={() => handleLike(post._id)}>
                                        <span>
                                            {post.is_liked_by_current_user ? '❤️' : '🤍'}
                                        </span>
                                        {post.likes_count}
                                    </button>

                                    <div onClick={() => goToComments(post._id)} style={{ cursor: 'pointer' }}>
                                        <span>💬 {post.comments_count}</span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {hasMore && (
                            <div>
                                <button onClick={loadMore} disabled={loadingMore}>
                                    {loadingMore ? 'Loading...' : 'Load More'}
                                </button>
                            </div>
                        )}

                        {!hasMore && likedPosts.length > 0 && (
                            <div>
                                <p>You've seen all your liked posts!</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

export default Likes;