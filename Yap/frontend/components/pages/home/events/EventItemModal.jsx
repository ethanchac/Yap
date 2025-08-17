import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, MapPin, Users, Heart, X, Search } from 'lucide-react';
import EventModal from './EventModal';
import { API_BASE_URL } from '../../../../services/config';
import { useTheme } from '../../../../contexts/ThemeContext';
import { formatEventDate, formatEventTime } from '../../../../utils/dateTimeUtils';
import { getProfilePictureUrl, getDefaultProfilePicture } from '../../../../utils/profileUtils';

function EventItemModal({ isOpen, onClose }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);
    const [deletingEvent, setDeletingEvent] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [displayedEvents, setDisplayedEvents] = useState([]);
    const [itemsToShow, setItemsToShow] = useState(6);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreToLoad, setHasMoreToLoad] = useState(true);
    const { isDarkMode } = useTheme();

    // Get current user ID from token
    useEffect(() => {
        const getCurrentUserId = () => {
            const token = localStorage.getItem('token');
            
            if (!token) {
                return null;
            }
            
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const userId = payload.sub || payload._id || payload.id || payload.user_id;
                return userId;
            } catch (e) {
                console.error('Error parsing token:', e);
                return null;
            }
        };

        const userId = getCurrentUserId();
        setCurrentUserId(userId);
    }, []);

    // Get auth headers
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        
        if (!token) {
            return {
                'Content-Type': 'application/json'
            };
        }
        
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    // Get current user object for EventModal
    const getCurrentUser = () => {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload;
        } catch (e) {
            console.error('Error getting current user:', e);
            return null;
        }
    };

    // Debounce search term
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset search when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setSearchTerm('');
            setDebouncedSearchTerm('');
            setItemsToShow(6);
            setIsLoadingMore(false);
            setHasMoreToLoad(true);
            fetchEvents();
        }
    }, [isOpen]);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await fetch(`${API_BASE_URL}/events/feed?limit=50&include_past=false`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.events && Array.isArray(data.events)) {
                setEvents(data.events);
            } else {
                console.error('Invalid data structure:', data);
                setError('Invalid response format from server');
            }
        } catch (err) {
            console.error('Error fetching events:', err);
            setError(`Failed to fetch events: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Memoized filtered events based on search term
    const filteredEvents = useMemo(() => {
        if (!debouncedSearchTerm.trim()) {
            return events;
        }
        
        const searchLower = debouncedSearchTerm.toLowerCase();
        return events.filter(event => 
            event.title?.toLowerCase().includes(searchLower) ||
            event.description?.toLowerCase().includes(searchLower) ||
            event.location?.toLowerCase().includes(searchLower) ||
            event.username?.toLowerCase().includes(searchLower)
        );
    }, [events, debouncedSearchTerm]);

    // Memoized visible events (infinite scroll)
    const visibleEvents = useMemo(() => {
        return filteredEvents.slice(0, itemsToShow);
    }, [filteredEvents, itemsToShow]);

    // Check if there are more items to load
    useEffect(() => {
        setHasMoreToLoad(filteredEvents.length > itemsToShow);
    }, [filteredEvents.length, itemsToShow]);

    // Reset items to show when search changes
    useEffect(() => {
        setItemsToShow(6);
        setIsLoadingMore(false);
    }, [debouncedSearchTerm]);

    const getEventImage = useCallback((event, index) => {
        if (event.image) {
            return event.image;
        }
        const seed = event._id ? event._id.slice(-6) : index.toString().padStart(6, '0');
        return `https://picsum.photos/seed/${seed}/400/300`;
    }, []);

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm('Are you sure you want to delete this event?')) {
            return;
        }

        if (!currentUserId) {
            alert('You must be logged in to delete events');
            return;
        }

        setDeletingEvent(eventId);
        try {
            const response = await fetch(`${API_BASE_URL}/events/${eventId}/cancel`, {
                method: 'POST',
                headers: getAuthHeaders(),
            });

            const data = await response.json();

            if (response.ok) {
                setEvents(prevEvents => prevEvents.filter(event => event._id !== eventId));
                if (selectedEvent && selectedEvent._id === eventId) {
                    setIsEventModalOpen(false);
                    setSelectedEvent(null);
                }
                alert('Event cancelled successfully');
            } else {
                alert(data.error || 'Failed to cancel event');
            }
        } catch (err) {
            console.error('Error cancelling event:', err);
            alert('Network error. Please try again.');
        } finally {
            setDeletingEvent(null);
        }
    };

    const handleEventClick = useCallback((event) => {
        setSelectedEvent(event);
        setIsEventModalOpen(true);
    }, []);

    const handleSearchChange = useCallback((e) => {
        setSearchTerm(e.target.value);
    }, []);

    // Debounced load more function
    const loadMoreEvents = useCallback(() => {
        if (isLoadingMore || !hasMoreToLoad) return;
        
        setIsLoadingMore(true);
        
        // Simulate loading delay for better UX
        setTimeout(() => {
            setItemsToShow(prev => prev + 6);
            setIsLoadingMore(false);
        }, 300);
    }, [isLoadingMore, hasMoreToLoad]);

    // Scroll handler for infinite scroll
    const handleScroll = useCallback((e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
        
        // Load more when user scrolls to 90% of the content
        if (scrollPercentage > 0.9 && hasMoreToLoad && !isLoadingMore) {
            loadMoreEvents();
        }
    }, [hasMoreToLoad, isLoadingMore, loadMoreEvents]);

    const closeEventModal = () => {
        setIsEventModalOpen(false);
        setSelectedEvent(null);
    };

    const canDeleteEvent = (event) => {
        if (!currentUserId || !event) {
            return false;
        }
        
        const eventUserId = String(event.user_id || '');
        const currentUserIdStr = String(currentUserId || '');
        
        return currentUserIdStr === eventUserId && currentUserIdStr !== '';
    };

    if (!isOpen) return null;

    // Create unique class name for this modal instance
    const scrollbarClass = `event-modal-scrollbar-${isDarkMode ? 'dark' : 'light'}`;

    return createPortal(
        <>
            <style>
                {`
                    .${scrollbarClass}::-webkit-scrollbar {
                        width: 8px;
                    }
                    
                    .${scrollbarClass}::-webkit-scrollbar-track {
                        background: ${isDarkMode ? '#2a2a2a' : '#f1f1f1'};
                        border-radius: 10px;
                    }
                    
                    .${scrollbarClass}::-webkit-scrollbar-thumb {
                        background: ${isDarkMode ? '#555' : '#c1c1c1'};
                        border-radius: 10px;
                        border: 2px solid ${isDarkMode ? '#2a2a2a' : '#f1f1f1'};
                    }
                    
                    .${scrollbarClass}::-webkit-scrollbar-thumb:hover {
                        background: ${isDarkMode ? '#777' : '#a8a8a8'};
                    }
                `}
            </style>
            <div 
            className="fixed inset-0 backdrop-blur-sm transition-all duration-300"
            style={{ 
                backgroundColor: 'rgba(18, 18, 18, 0.85)', 
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}
            onClick={onClose}
        >
            <div 
                className={`w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
                    isDarkMode ? 'bg-[#1c1c1c]' : 'bg-white'
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`p-6 border-b flex-shrink-0 ${
                    isDarkMode ? 'border-gray-700 bg-[#171717]' : 'border-gray-200 bg-gray-50'
                }`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={`text-2xl font-bold ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                            All Events
                        </h2>
                        <button
                            onClick={onClose}
                            className={`p-2 rounded-full transition-colors ${
                                isDarkMode 
                                    ? 'text-gray-400 hover:text-white hover:bg-gray-700' 
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                            }`}
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className={`w-full pl-10 pr-4 py-2 rounded-lg border transition-colors ${
                                isDarkMode 
                                    ? 'bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400 focus:border-orange-500' 
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-orange-500'
                            } focus:outline-none focus:ring-2 focus:ring-orange-500/20`}
                        />
                    </div>
                    
                    {/* Results Count */}
                    <div className={`mt-2 text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                        {loading ? 'Loading...' : `${filteredEvents.length} events found`}
                    </div>
                </div>

                {/* Content */}
                <div 
                    className={`flex-1 overflow-y-auto p-6 ${scrollbarClass}`}
                    style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: isDarkMode ? '#555 #2a2a2a' : '#c1c1c1 #f1f1f1'
                    }}
                    onScroll={handleScroll}
                >
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="flex flex-col items-center space-y-4">
                                <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                                    isDarkMode ? 'border-blue-400' : 'border-blue-600'
                                }`}></div>
                                <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading events...</div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="text-center">
                                <div className={`mb-2 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</div>
                                <button 
                                    onClick={fetchEvents}
                                    className={`px-4 py-2 rounded-lg transition-colors ${
                                        isDarkMode 
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    ) : filteredEvents.length === 0 ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="text-center">
                                <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                                    {searchTerm ? 'No events match your search' : 'No events found'}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {visibleEvents.map((event, index) => (
                                <div
                                    key={event._id}
                                    className={`rounded-xl p-4 transition-all duration-200 cursor-pointer hover:shadow-lg ${
                                        isDarkMode 
                                            ? 'bg-[#262626] hover:bg-[#2a2a2a] border border-gray-700' 
                                            : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                                    }`}
                                    onClick={() => handleEventClick(event)}
                                >
                                    <div className="flex gap-4">
                                        {/* Event Image */}
                                        <div className="relative w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                                            <img 
                                                src={getEventImage(event, index)}
                                                alt={event.title}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.src = `https://picsum.photos/100/100?random=${index}`;
                                                }}
                                            />
                                            
                                            {/* Delete Button for Event Owner */}
                                            {canDeleteEvent(event) && (
                                                <div className="absolute top-1 right-1 z-10">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteEvent(event._id);
                                                        }}
                                                        disabled={deletingEvent === event._id}
                                                        className="bg-black/50 hover:bg-red-500 disabled:bg-gray-500 text-white p-1 rounded-full transition-all duration-200 backdrop-blur-sm"
                                                        title="Delete Event"
                                                    >
                                                        {deletingEvent === event._id ? (
                                                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                                                        ) : (
                                                            <X className="w-3 h-3" />
                                                        )}
                                                    </button>
                                                </div>
                                            )}

                                            {/* Date Badge */}
                                            <div className="absolute bottom-1 left-1">
                                                <div className="bg-white/90 backdrop-blur-sm text-gray-900 px-2 py-1 rounded-md text-xs font-bold">
                                                    {formatEventDate(event.event_datetime)}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Event Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <h3 className={`text-lg font-bold truncate ${
                                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                                }`}>
                                                    {event.title}
                                                </h3>
                                                <div className="flex items-center space-x-4 ml-4">
                                                    {/* Attendees Count */}
                                                    <div className={`flex items-center space-x-1 text-sm ${
                                                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                                    }`}>
                                                        <Users className="w-4 h-4" />
                                                        <span>{event.attendees_count || 0}</span>
                                                    </div>
                                                    
                                                    {/* Like Button */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Add like functionality here
                                                        }}
                                                        className={`flex items-center space-x-1 px-2 py-1 rounded-full transition-all duration-200 ${
                                                            isDarkMode
                                                                ? 'text-gray-400 hover:text-red-400 hover:bg-red-400/10'
                                                                : 'text-gray-500 hover:text-red-500 hover:bg-red-50'
                                                        }`}
                                                    >
                                                        <Heart className="w-4 h-4" />
                                                        <span className="text-sm">{event.likes_count || 0}</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Event Description */}
                                            <p className={`text-sm mb-3 line-clamp-2 ${
                                                isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                            }`}>
                                                {event.description}
                                            </p>

                                            {/* Event Details */}
                                            <div className="space-y-1 mb-3">
                                                {/* Time */}
                                                <div className={`flex items-center text-sm ${
                                                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}>
                                                    <Clock className="w-4 h-4 mr-2" />
                                                    <span>{formatEventTime(event.event_datetime)}</span>
                                                </div>

                                                {/* Location */}
                                                {event.location && (
                                                    <div className={`flex items-center text-sm ${
                                                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                    }`}>
                                                        <MapPin className="w-4 h-4 mr-2" />
                                                        <span className="truncate">{event.location}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Event Footer */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-2">
                                                    <img
                                                        src={getProfilePictureUrl(event.profile_picture)}
                                                        alt={`${event.username}'s profile`}
                                                        onError={(e) => {
                                                            e.target.src = getDefaultProfilePicture();
                                                        }}
                                                        className="w-6 h-6 rounded-full object-cover border border-gray-300"
                                                    />
                                                    <span className={`text-sm font-medium ${
                                                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                    }`}>
                                                        {event.username || 'Unknown'}
                                                    </span>
                                                </div>

                                                <div className={`text-xs px-2 py-1 rounded-full ${
                                                    isDarkMode 
                                                        ? 'bg-gray-700 text-gray-300' 
                                                        : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                    Click to view details
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {/* Loading More Indicator */}
                            {isLoadingMore && (
                                <div className="flex justify-center items-center py-8">
                                    <div className="flex flex-col items-center space-y-2">
                                        <div className={`animate-spin rounded-full h-6 w-6 border-b-2 ${
                                            isDarkMode ? 'border-orange-400' : 'border-orange-600'
                                        }`}></div>
                                        <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                            Loading more events...
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Load More Button (fallback for users who prefer clicking) */}
                            {!isLoadingMore && hasMoreToLoad && (
                                <div className="flex justify-center mt-6">
                                    <button
                                        onClick={loadMoreEvents}
                                        className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                                            isDarkMode
                                                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                                : 'bg-orange-500 hover:bg-orange-600 text-white'
                                        }`}
                                    >
                                        Load More Events
                                    </button>
                                </div>
                            )}
                            
                            {/* End of Results */}
                            {!hasMoreToLoad && visibleEvents.length > 0 && (
                                <div className={`text-center py-6 text-sm ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                    You've reached the end of the events list
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Event Details Modal */}
            {isEventModalOpen && (
                <div 
                    className="fixed inset-0 backdrop-blur-sm transition-all duration-300"
                    style={{ 
                        backgroundColor: 'rgba(18, 18, 18, 0.85)', 
                        zIndex: 10000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '20px'
                    }}
                    onClick={closeEventModal}
                >
                    <EventModal
                        event={selectedEvent}
                        isOpen={isEventModalOpen}
                        onClose={closeEventModal}
                        currentUser={getCurrentUser()}
                    />
                </div>
            )}
            </div>
        </>,
        document.body
    );
}

export default EventItemModal;