import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from '../sidebar/Sidebar';
import PostItem from '../posts/PostItem';
import Header from '../header/Header';
import EventItem from '../posts/EventItem';
import HomepageActivities from '../posts/HomepageActivities';

function Home() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const mainContentRef = useRef(null);

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
                
                // check if there are more posts to load
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

    // Updated scroll handler to use main content container instead of document
    const handleScroll = useCallback(() => {
        if (loadingMore || !hasMore || !mainContentRef.current) return;

        const container = mainContentRef.current;
        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;

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
        const container = mainContentRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
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
            <div className="h-screen overflow-hidden font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
                <Header />
                <Sidebar />
                <div className="ml-64 h-full overflow-y-auto p-6">
                    <p className="text-white">Loading posts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen overflow-hidden font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
            <Header />
            <Sidebar />
            <div 
                ref={mainContentRef}
                className="ml-64 h-full overflow-y-auto p-6 scrollbar-custom"
            >
                <h1 className="text-white text-2xl font-bold mb-6">Home Feed</h1>
                
                {/* Events Section */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-white text-xl font-bold">Events</h2>
                        <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
                            View All Events (not implemented yet)
                        </button>
                    </div>
                    <div className="rounded-lg p-4" style={{backgroundColor: '#171717'}}>
                        <EventItem />
                    </div>
                </div>

                {/* Main Content Section - Posts and Activities */}
                <div className="flex gap-6">
                    {/* Posts Section - 60% width */}
                    <div className="w-3/5">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-white text-xl font-bold">Posts</h2>
                            <button 
                                onClick={refreshPosts}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
                            >
                                Refresh
                            </button>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-900 border border-red-700 text-red-300 rounded-lg">
                                {error}
                            </div>
                        )}

                        {posts.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-400">No posts yet. Be the first to create one!</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {posts.map((post) => (
                                    <PostItem key={post._id} post={post} />
                                ))}
                            </div>
                        )}

                        {hasMore && !loadingMore && (
                            <div className="text-center mt-8">
                                <button 
                                    onClick={loadMorePosts}
                                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
                                >
                                    Load More Posts
                                </button>
                            </div>
                        )}

                        {loadingMore && (
                            <p className="text-center text-gray-400 mt-8">Loading more posts...</p>
                        )}
                    </div>

                    {/* Activities Section - 40% width */}
                    <div className="w-2/5">
                        <h2 className="text-white text-xl font-bold mb-6">Activities</h2>
                        <HomepageActivities />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Home;