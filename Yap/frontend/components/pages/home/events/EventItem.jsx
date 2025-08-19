import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Clock, MapPin, Users, Heart, X } from 'lucide-react';
import EventModal from './EventModal';
import { API_BASE_URL } from '../../../../services/config';
import { useTheme } from '../../../../contexts/ThemeContext';
import { formatEventDate, formatEventTime } from '../../../../utils/dateTimeUtils';
import { getProfilePictureUrl, getDefaultProfilePicture } from '../../../../utils/profileUtils';

function EventItem() {
    const [events, setEvents] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);
    const [deletingEvent, setDeletingEvent] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    // Fetch events from API
    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            setError('');
            
            console.log('Fetching events from API...');
            const response = await fetch(`${API_BASE_URL}/events/feed?limit=10&include_past=false`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.events && Array.isArray(data.events)) {
                setEvents(data.events);
                
                if (data.debug_info) {
                    console.log('Database stats:', data.debug_info);
                }
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

    const nextSlide = () => {
        if (currentIndex < events.length - 3) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const prevSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };
    // Use centralized profile picture utility
    
    const getVisibleEvents = () => {
        const maxVisible = 7; // Show more events for better navigation
        const totalEvents = events.length;
        
        if (totalEvents <= maxVisible) {
            return events;
        }
        
        let startIndex = Math.max(0, currentIndex - 2);
        let endIndex = Math.min(totalEvents, startIndex + maxVisible);
        
        if (endIndex - startIndex < maxVisible) {
            startIndex = Math.max(0, endIndex - maxVisible);
        }
        
        return events.slice(startIndex, endIndex);
    };


    const getEventImage = (event, index) => {
        // Use event image if available, otherwise use random picsum photo
        if (event.image) {
            return event.image;
        }
        // Use a consistent seed based on event ID to get the same random image each time
        const seed = event._id ? event._id.slice(-6) : index.toString().padStart(6, '0');
        return `https://picsum.photos/seed/${seed}/400/300`;
    };

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
                if (currentIndex > 0 && currentIndex >= events.length - 4) {
                    setCurrentIndex(Math.max(0, currentIndex - 1));
                }
                if (selectedEvent && selectedEvent._id === eventId) {
                    setIsModalOpen(false);
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

    const handleEventClick = (event, isExpanded) => {
        if (isExpanded) {
            setSelectedEvent(event);
            setIsModalOpen(true);
        } else {
            const originalIndex = events.findIndex(e => e._id === event._id);
            const newIndex = Math.max(0, Math.min(originalIndex - 1, events.length - 3));
            setCurrentIndex(newIndex);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedEvent(null);
    };

    // Check if current user can delete the event
    const canDeleteEvent = (event) => {
        if (!currentUserId || !event) {
            return false;
        }
        
        const eventUserId = String(event.user_id || '');
        const currentUserIdStr = String(currentUserId || '');
        
        return currentUserIdStr === eventUserId && currentUserIdStr !== '';
    };

    // Show loading state
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center space-y-4">
                    <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                        isDarkMode ? 'border-blue-400' : 'border-blue-600'
                    }`}></div>
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Loading events...</div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
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
        );
    }

    // Show empty state
    if (events.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-center">
                    <div className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No events found</div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="relative w-full p-4">
                {/* Navigation Arrows */}
                {events.length > 3 && (
                    <>
                        <button
                            onClick={prevSlide}
                            disabled={currentIndex === 0}
                            className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all duration-200 ${
                                currentIndex === 0 
                                    ? isDarkMode 
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                        : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                                    : isDarkMode
                                        ? 'bg-[#1c1c1c] hover:bg-[#1f1f1f] text-white hover:scale-110'
                                        : 'bg-white hover:bg-gray-50 text-gray-800 hover:scale-110'
                            }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        
                        <button
                            onClick={nextSlide}
                            disabled={currentIndex >= events.length - 3}
                            className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all duration-200 ${
                                currentIndex >= events.length - 3 
                                    ? isDarkMode 
                                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                        : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                                    : isDarkMode
                                        ? 'bg-[#1c1c1c] hover:bg-[#1f1f1f] text-white hover:scale-110'
                                        : 'bg-white hover:bg-gray-50 text-gray-800 hover:scale-110'
                            }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </>
                )}

                {/* Events Container */}
                <div className="overflow-hidden mx-12">
                    <div className="flex gap-2 transition-all duration-500 ease-in-out w-full">
                        {getVisibleEvents().map((event, visibleIndex) => {
                            const originalIndex = events.findIndex(e => e._id === event._id);
                            const isExpanded = originalIndex >= currentIndex && originalIndex < currentIndex + 3;
                            
                            return (
                                <div
                                    key={event._id}
                                    className={`transition-all duration-500 ease-in-out cursor-pointer ${
                                        isExpanded 
                                            ? 'flex-1 min-w-0' 
                                            : 'w-20 flex-shrink-0'
                                    }`}
                                    onClick={() => handleEventClick(event, isExpanded)}
                                >
                                    <div 
                                        className={`rounded-2xl overflow-hidden h-80 flex flex-col transition-all duration-500 hover:shadow-xl relative ${
                                            isDarkMode 
                                                ? 'bg-[#1c1c1c] border border-gray-400' 
                                                : 'bg-white border border-gray-200'
                                        } ${isExpanded ? 'transform hover:scale-101 shadow-lg' : 'items-center justify-center'}`}
                                    >
                                        {isExpanded ? (
                                            // Full expanded view
                                            <>
                                                {/* Event Image */}
                                                <div className="relative h-40 overflow-hidden">
                                                    <img 
                                                        src={getEventImage(event, originalIndex)}
                                                        alt={event.title}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.src = `https://picsum.photos/400/300?random=${originalIndex}`;
                                                        }}
                                                    />
                                                    
                                                    {/* Gradient Overlay */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                                                    
                                                    {/* Delete Button for Event Owner */}
                                                    {canDeleteEvent(event) && (
                                                        <div className="absolute top-3 right-3 z-10">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteEvent(event._id);
                                                                }}
                                                                disabled={deletingEvent === event._id}
                                                                className="bg-black/50 hover:bg-red-500 disabled:bg-gray-500 text-white p-2 rounded-full transition-all duration-200 backdrop-blur-sm hover:scale-110"
                                                                title="Delete Event"
                                                            >
                                                                {deletingEvent === event._id ? (
                                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <X className="w-4 h-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {/* Date Badge */}
                                                    <div className="absolute top-3 left-3">
                                                        <div className="bg-white/90 backdrop-blur-sm text-gray-900 px-3 py-1 rounded-full text-sm font-bold">
                                                            {formatEventDate(event.event_datetime)}
                                                        </div>
                                                    </div>

                                                    {/* Attendees Count */}
                                                    <div className="absolute bottom-3 right-3">
                                                        <div className="bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-full text-sm flex items-center space-x-1">
                                                            <Users className="w-3 h-3" />
                                                            <span>{event.attendees_count || 0}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Event Content */}
                                                <div className={`p-4 flex-1 flex flex-col justify-between ${
                                                    isDarkMode ? 'bg-[#1c1c1c]' : 'bg-gray-100'
                                                }`}>
                                                    <div className="space-y-2">
                                                        {/* Event Title */}
                                                        <h3 className={`text-base font-bold line-clamp-1 ${
                                                            isDarkMode ? 'text-white' : 'text-gray-900'
                                                        }`}>
                                                            {event.title}
                                                        </h3>

                                                        {/* Event Description */}
                                                        <p className={`text-xs line-clamp-2 ${
                                                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                                        }`}>
                                                            {event.description}
                                                        </p>

                                                        {/* Event Details */}
                                                        <div className="space-y-1">
                                                            {/* Time */}
                                                            <div className={`flex items-center text-xs ${
                                                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                            }`}>
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                <span>{formatEventTime(event.event_datetime)}</span>
                                                            </div>

                                                            {/* Location */}
                                                            {event.location && (
                                                                <div className={`flex items-center text-xs ${
                                                                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                                }`}>
                                                                    <MapPin className="w-3 h-3 mr-1" />
                                                                    <span className="truncate">{event.location}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Event Footer */}
                                                    <div className={`flex items-center justify-between pt-2 border-t ${
                                                        isDarkMode ? 'border-gray-800' : 'border-gray-300'
                                                    }`}>
                                                        <div className="flex items-center space-x-1">
                                                            <img
                                                                src={getProfilePictureUrl(event.profile_picture)}
                                                                alt={`${event.username}'s profile`}
                                                                onError={(e) => {
                                                                    e.target.src = getDefaultProfilePicture();
                                                                }}
                                                                className="w-5 h-5 rounded-full object-cover border border-gray-300"
                                                            />
                                                            <span className={`text-xs font-medium ${
                                                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                                            }`}>
                                                                {event.username || 'Unknown'}
                                                            </span>
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
                                                            <Heart className="w-3 h-3" />
                                                            <span className="text-xs">{event.likes_count || 0}</span>
                                                        </button>
                                                    </div>

                                                    {/* Click to view more indicator */}
                                                    <div className="flex justify-center mt-1">
                                                        <div className={`px-2 py-1 rounded-full text-xs transition-all duration-200 ${
                                                            isDarkMode 
                                                                ? 'bg-[#1c1c1c]/50 hover:bg-[#1f1f1f] text-gray-400' 
                                                                : 'bg-gray-200/50 hover:bg-gray-200 text-gray-600'
                                                        }`}>
                                                            Click to view details
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            // Compressed view
                                            <div className="flex flex-col items-center justify-center h-full text-center relative p-2">
                                                {/* Delete Button for Event Owner (Compressed View) */}
                                                {canDeleteEvent(event) && (
                                                    <div className="absolute top-2 right-1 z-10">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteEvent(event._id);
                                                            }}
                                                            disabled={deletingEvent === event._id}
                                                            className={`p-1 rounded-full transition-colors duration-200 shadow-sm ${
                                                                isDarkMode
                                                                    ? 'bg-gray-700 hover:bg-red-600 text-gray-300 hover:text-white'
                                                                    : 'bg-gray-200 hover:bg-red-500 text-gray-600 hover:text-white'
                                                            }`}
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

                                                {/* Compressed Event Image */}
                                                <div className="w-12 h-12 rounded-full overflow-hidden mb-2 border-2 border-blue-500">
                                                    <img 
                                                        src={getEventImage(event, originalIndex)}
                                                        alt={event.title}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            e.target.src = `https://picsum.photos/50/50?random=${originalIndex}`;
                                                        }}
                                                    />
                                                </div>
                                                
                                                <div className="writing-mode-vertical-lr text-orientation-mixed">
                                                    <h4 className={`text-sm font-bold transform rotate-90 whitespace-nowrap ${
                                                        isDarkMode ? 'text-white' : 'text-gray-800'
                                                    }`}>
                                                        {event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title}
                                                    </h4>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Dots Indicator */}
                {events.length > 3 && (
                    <div className="flex justify-center mt-6 space-x-2">
                                                        {Array.from({ length: Math.max(0, events.length - 2) }).map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`h-2 rounded-full transition-all duration-200 ${
                                    currentIndex === index 
                                        ? isDarkMode
                                            ? 'bg-orange-500 w-4'
                                            : 'bg-orange-500 w-4'
                                        : isDarkMode
                                            ? 'bg-gray-600 hover:bg-gray-500 w-2'
                                            : 'bg-gray-400 hover:bg-gray-500 w-2'
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Event Modal */}
            {isModalOpen && createPortal(
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
                    onClick={closeModal}
                >
                    <EventModal
                        event={selectedEvent}
                        isOpen={isModalOpen}
                        onClose={closeModal}
                        currentUser={getCurrentUser()}
                    />
                </div>,
                document.body
            )}
        </>
    );
}

export default EventItem;