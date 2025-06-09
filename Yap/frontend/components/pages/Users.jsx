import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../sidebar/Sidebar';
import Header from '../header/Header'

function Users() {
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    // search function using debouncing
    const debouncedSearch = useCallback(
        debounce(async (query) => {
            if (query.length < 2) {
                setUsers([]);
                return;
            }

            setLoading(true);
            setError('');

            try {
                const response = await fetch(`http://localhost:5000/profile/search?q=${encodeURIComponent(query)}&limit=20`);
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
        // goes to the profile page
        navigate(`/profile/${userId}`);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    return (
        <>
            <Header />
            <Sidebar />
            <div>
                <h1>Search Users</h1>
                
                <div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={handleInputChange}
                        placeholder="Search for users..."
                        autoComplete="off"
                    />
                </div>

                {loading && (
                    <div>
                        <p>Searching...</p>
                    </div>
                )}

                {error && (
                    <div>
                        <p>{error}</p>
                    </div>
                )}

                {searchQuery.length > 0 && searchQuery.length < 2 && (
                    <div>
                        <p>Type at least 2 characters to search</p>
                    </div>
                )}

                {users.length === 0 && searchQuery.length >= 2 && !loading && (
                    <div>
                        <p>No users found for "{searchQuery}"</p>
                    </div>
                )}

                {users.length > 0 && (
                    <div>
                        <h3>Search Results ({users.length})</h3>
                        <div>
                            {users.map((user) => (
                                <div 
                                    key={user._id}
                                    onClick={() => handleUserClick(user._id)}
                                >
                                    <div>
                                        <h4>@{user.username}</h4>
                                        {user.email && (
                                            <p>{user.email}</p>
                                        )}
                                        <p>Joined: {formatDate(user.created_at)}</p>
                                    </div>
                                    
                                    <div>
                                        <button onClick={(e) => {
                                            e.stopPropagation();
                                            handleUserClick(user._id);
                                        }}>
                                            View Profile
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
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