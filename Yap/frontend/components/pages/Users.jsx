import { useState, useEffect, useCallback } from 'react';
import { Search, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Add this import
import Sidebar from '../sidebar/Sidebar';
import Header from '../header/Header';
import { useTheme } from '../../contexts/ThemeContext';

function Users() {
    const navigate = useNavigate(); // Add this hook
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { isDarkMode } = useTheme();

    // search function using debouncing; used AI for all this
    const debouncedSearch = useCallback(
        debounce(async (query) => {
            if (query.length < 2) {
                setUsers([]);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const response = await fetch(`http://localhost:5000/users/search?q=${encodeURIComponent(query)}&limit=20`);
                const data = await response.json();

                if (response.ok) {
                    setUsers(data.users);
                } else {
                    setError(data.error || 'Failed to search users');
                    setUsers([]);
                }
            } catch (err) {
                setError('Network error. Please try again.');
                setUsers([]);
            } finally {
                setLoading(false);
            }
        }, 300), // 300ms delay
        []
    );

    // anytime the search changes the debounce gets called
    useEffect(() => {
        debouncedSearch(searchQuery);
    }, [searchQuery, debouncedSearch]);

    const handleInputChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const handleUserClick = (userId) => {
        // Actually navigate to the profile page
        navigate(`/profile/${userId}`);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    // function to get profile picture URL or default
    const getProfilePictureUrl = (user) => {
        if (user.profile_picture && user.profile_picture.trim() !== '') {
            if (user.profile_picture.startsWith('http')) {
                return user.profile_picture;
            }
            // Match the path from your Flask API routes
            return `http://localhost:5000/uploads/profile_pictures/${user._id}/${user.profile_picture}`;
        }
        // Default profile picture with user's initial
        const initial = user.username ? user.username[0].toUpperCase() : '?';
        return `data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='24' cy='24' r='24' fill='%23e0e0e0'/%3E%3Ccircle cx='24' cy='18' r='8' fill='%23bdbdbd'/%3E%3Cellipse cx='24' cy='42' rx='16' ry='12' fill='%23bdbdbd'/%3E%3C/svg%3E`;
    };

    return (
        <div className="min-h-screen font-bold" style={{
            backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
            fontFamily: 'Albert Sans'
        }}>
            <Header />
            <Sidebar />
            <div className="ml-64 p-6">
                <div className="max-w-6xl mx-auto">
                    <h1 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Search Users</h1>
                    
                    {/* Search bar */}
                    <div className="mb-6">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleInputChange}
                                placeholder="Search for users..."
                                autoComplete="off"
                                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none transition-colors ${
                                    isDarkMode 
                                        ? 'border-gray-600 text-white placeholder-gray-400 focus:border-gray-400' 
                                        : 'border-gray-300 text-gray-900 placeholder-gray-500 focus:border-gray-500'
                                }`}
                                style={{ 
                                    backgroundColor: isDarkMode ? '#171717' : '#ffffff' 
                                }}
                            />
                        </div>
                    </div>

                    {/* Loading state with skeleton cards */}
                    {loading && (
                        <div className="space-y-4">
                            <h3 className="text-white text-lg font-bold">Searching...</h3>
                            <div className="space-y-3">
                                {[...Array(3)].map((_, index) => (
                                    <div 
                                        key={index}
                                        className="rounded-lg p-4 animate-pulse"
                                        style={{backgroundColor: '#171717'}}
                                    >
                                        <div className="flex items-center space-x-4">
                                            <div className="w-12 h-12 bg-gray-600 rounded-full"></div>
                                            <div className="flex-1">
                                                <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
                                                <div className="h-3 bg-gray-700 rounded w-48 mb-1"></div>
                                                <div className="h-3 bg-gray-700 rounded w-24"></div>
                                            </div>
                                            <div className="w-24 h-8 bg-gray-600 rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error state */}
                    {error && (
                        <div className="rounded-lg p-4 mb-6" style={{backgroundColor: '#171717'}}>
                            <p className="text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Minimum character message */}
                    {searchQuery.length > 0 && searchQuery.length < 2 && (
                        <div className="rounded-lg p-4 mb-6" style={{backgroundColor: '#171717'}}>
                            <p className="text-gray-400">Type at least 2 characters to search</p>
                        </div>
                    )}

                    {/* No results */}
                    {users.length === 0 && searchQuery.length >= 2 && !loading && (
                        <div className="text-center py-8">
                            <div className="rounded-lg p-6" style={{backgroundColor: '#171717'}}>
                                <User className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                                <p className="text-gray-400">No users found for "{searchQuery}"</p>
                            </div>
                        </div>
                    )}

                    {/* Search results */}
                    {users.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-white text-lg font-bold">Search Results ({users.length})</h3>
                            <div className="space-y-3">
                                {users.map((user) => (
                                    <div 
                                        key={user._id}
                                        onClick={() => handleUserClick(user._id)}
                                        className="rounded-lg p-4 cursor-pointer hover:opacity-80 transition-opacity"
                                        style={{backgroundColor: '#171717'}}
                                    >
                                        <div className="flex items-center space-x-4">
                                            {/* Profile Picture */}
                                            <img 
                                                src={getProfilePictureUrl(user)}
                                                alt={`${user.username}'s profile`}
                                                onError={(e) => {
                                                    // Fallback to the same default as other components
                                                    e.target.src = "data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='24' cy='24' r='24' fill='%23e0e0e0'/%3E%3Ccircle cx='24' cy='18' r='8' fill='%23bdbdbd'/%3E%3Cellipse cx='24' cy='42' rx='16' ry='12' fill='%23bdbdbd'/%3E%3C/svg%3E";
                                                }}
                                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-600 hover:border-gray-500 transition-colors"
                                            />
                                            
                                            <div className="flex-1">
                                                <h4 className="text-white font-bold">@{user.username}</h4>
                                                {user.email && (
                                                    <p className="text-gray-400 text-sm">{user.email}</p>
                                                )}
                                                <p className="text-gray-500 text-xs">
                                                    Joined: {formatDate(user.created_at)}
                                                </p>
                                            </div>
                                            
                                            <div>
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleUserClick(user._id);
                                                    }}
                                                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm rounded-lg font-bold transition-colors"
                                                >
                                                    View Profile
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// stuff for debounce (used ai for all ts wtf even is this)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

export default Users;