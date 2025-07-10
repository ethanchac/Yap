import { useState, useEffect, useRef } from 'react';
import Header from '../header/Header';
import Sidebar from '../sidebar/Sidebar';
import PostItem from '../posts/PostItem';

function Likes() {
    const [likedPosts, setLikedPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [totalLiked, setTotalLiked] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const mainContentRef = useRef(null);

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

    // Load more posts
    const loadMore = () => {
        if (hasMore && !loadingMore) {
            fetchLikedPosts(page + 1, true);
        }
    };

    // Initial load
    useEffect(() => {
        fetchLikedPosts();
    }, []);

    return (
        <div className="h-screen overflow-hidden font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
            <Header />
            <Sidebar />
            <div 
                ref={mainContentRef}
                className="ml-64 h-full overflow-y-auto p-6"
            >
                <div className="max-w-2xl mx-auto">
                    <div className="mb-6">
                        <h1 className="text-white text-2xl font-bold mb-2">Posts You've Liked</h1>
                        {totalLiked > 0 && (
                            <p className="text-gray-400">{totalLiked} liked posts</p>
                        )}
                    </div>

                    {loading && (
                        <div className="text-center py-12">
                            <p className="text-white">Loading your liked posts...</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-center py-12">
                            <div className="rounded-lg p-6 mb-6" style={{backgroundColor: '#171717'}}>
                                <p className="text-red-400 mb-4">Error: {error}</p>
                                <button 
                                    onClick={() => fetchLikedPosts()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        </div>
                    )}

                    {!loading && !error && likedPosts.length === 0 && (
                        <div className="text-center py-12">
                            <div className="rounded-lg p-8" style={{backgroundColor: '#171717'}}>
                                <h2 className="text-white text-xl font-bold mb-2">No liked posts yet</h2>
                                <p className="text-gray-400">Posts you like will appear here</p>
                            </div>
                        </div>
                    )}

                    {!loading && !error && likedPosts.length > 0 && (
                        <div className="space-y-6">
                            {likedPosts.map((post) => (
                                <PostItem key={post._id} post={post} />
                            ))}

                            {hasMore && (
                                <div className="text-center mt-8">
                                    <button 
                                        onClick={loadMore} 
                                        disabled={loadingMore}
                                        className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                                    >
                                        {loadingMore ? 'Loading...' : 'Load More'}
                                    </button>
                                </div>
                            )}

                            {!hasMore && likedPosts.length > 0 && (
                                <div className="text-center mt-8">
                                    <p className="text-gray-400">You've seen all your liked posts!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Likes;