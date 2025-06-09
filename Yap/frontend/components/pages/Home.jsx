import { useState, useEffect, useCallback } from 'react';
import Sidebar from '../sidebar/Sidebar';
import PostItem from '../posts/PostItem';
import Header from '../header/Header'

function Home() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchPosts = async (pageNum = 1, reset = false) => {
        try {
            if (pageNum === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            
            const response = await fetch(`http://localhost:5000/posts/feed?page=${pageNum}&limit=20`);
            const data = await response.json();

            if (response.ok) {
                if (reset) {
                    setPosts(data.posts);
                } else {
                    setPosts(prevPosts => [...prevPosts, ...data.posts]);
                }
                
                // chheck if there are more posts to load
                setHasMore(data.posts.length === 20);
            } else {
                setError(data.error || 'Failed to fetch posts');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // infinite scroll handler (completely AI ts no clue how it works)
    const handleScroll = useCallback(() => {
        if (loadingMore || !hasMore) return;

        const scrollTop = document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;

        if (scrollTop + clientHeight >= scrollHeight - 1000) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchPosts(nextPage, false);
        }
    }, [loadingMore, hasMore, page]);

    useEffect(() => {
        fetchPosts(1, true);
    }, []);

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [handleScroll]);

    const loadMorePosts = () => {
        if (loadingMore || !hasMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPosts(nextPage, false);
    };

    const refreshPosts = () => {
        setPage(1);
        fetchPosts(1, true);
    };

    if (loading && posts.length === 0) {
        return (
            <>
                <Sidebar />
                <div>
                    <p>Loading posts...</p>
                </div>
            </>
        );
    }

    return (
        <>
            <Header />
            <Sidebar />
            <div>
                <h1>Home Feed</h1>
                
                <button onClick={refreshPosts}>
                    Refresh
                </button>

                {error && (
                    <div>
                        {error}
                    </div>
                )}

                {posts.length === 0 ? (
                    <div>
                        <p>No posts yet. Be the first to create one!</p>
                    </div>
                ) : (
                    <div>
                        {posts.map((post) => (
                            <PostItem key={post._id} post={post} />
                        ))}
                    </div>
                )}

                {hasMore && !loadingMore && (
                    <button onClick={loadMorePosts}>
                        Load More Posts
                    </button>
                )}

                {loadingMore && (
                    <p>Loading more posts...</p>
                )}
            </div>
        </>
    );
}

export default Home;