import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import EventModal from './EventModal'; // Import your EventModal component

function EventItem() {
    const [events, setEvents] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [deletingEvent, setDeletingEvent] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Get current user info
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setCurrentUser(payload);
            } catch (e) {
                console.error('Error decoding token:', e);
            }
        }
    }, []);

    // Fetch events from API
    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await fetch('http://localhost:5000/events/feed?limit=10');
            const data = await response.json();
            
            if (response.ok) {
                setEvents(data.events);
            } else {
                setError(data.error || 'Failed to fetch events');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const nextSlide = () => {
        if (currentIndex < events.length - 2) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const prevSlide = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    // Get the visible events (maximum 5)
    const getVisibleEvents = () => {
        const maxVisible = 5;
        const totalEvents = events.length;
        
        if (totalEvents <= maxVisible) {
            return events;
        }
        
        let startIndex = Math.max(0, currentIndex - 1);
        let endIndex = Math.min(totalEvents, startIndex + maxVisible);
        
        if (endIndex - startIndex < maxVisible) {
            startIndex = Math.max(0, endIndex - maxVisible);
        }
        
        return events.slice(startIndex, endIndex);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
    };

    const getEventIcon = (index) => {
        const icons = ['🎉', '🎵', '🎨', '🏃', '🍕', '📚', '🎬', '🎪', '🎯', '🎮'];
        return icons[index % icons.length];
    };

    const handleDeleteEvent = async (eventId) => {
        if (!window.confirm('Are you sure you want to delete this event?')) {
            return;
        }

        setDeletingEvent(eventId);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:5000/events/${eventId}/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setEvents(prevEvents => prevEvents.filter(event => event._id !== eventId));
                if (currentIndex > 0 && currentIndex >= events.length - 3) {
                    setCurrentIndex(Math.max(0, currentIndex - 1));
                }
                // Close modal if the deleted event was selected
                if (selectedEvent && selectedEvent._id === eventId) {
                    setIsModalOpen(false);
                    setSelectedEvent(null);
                }
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to delete event');
            }
        } catch (err) {
            alert('Network error. Please try again.');
        } finally {
            setDeletingEvent(null);
        }
    };

    const handleEventClick = (event, isExpanded) => {
        if (isExpanded) {
            // Open modal for expanded events
            setSelectedEvent(event);
            setIsModalOpen(true);
        } else {
            // Center the event for compressed events
            const originalIndex = events.findIndex(e => e._id === event._id);
            const newIndex = Math.max(0, Math.min(originalIndex - 1, events.length - 2));
            setCurrentIndex(newIndex);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedEvent(null);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-400">Loading events...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-red-400">{error}</div>
            </div>
        );
    }

    if (events.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="text-gray-400">No events found</div>
            </div>
        );
    }

    return (
        <>
            <div className="relative w-full p-4">
                {/* Navigation Arrows */}
                {events.length > 2 && (
                    <>
                        <button
                            onClick={prevSlide}
                            disabled={currentIndex === 0}
                            className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all duration-200 ${
                                currentIndex === 0 
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                    : 'bg-gray-800 hover:bg-gray-700 text-white hover:scale-110'
                            }`}
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        
                        <button
                            onClick={nextSlide}
                            disabled={currentIndex >= events.length - 2}
                            className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 p-2 rounded-full shadow-lg transition-all duration-200 ${
                                currentIndex >= events.length - 2 
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                    : 'bg-gray-800 hover:bg-gray-700 text-white hover:scale-110'
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
                            const isExpanded = originalIndex >= currentIndex && originalIndex < currentIndex + 2;
                            
                            return (
                                <div
                                    key={event._id}
                                    className={`transition-all duration-500 ease-in-out cursor-pointer ${
                                        isExpanded 
                                            ? 'flex-1 min-w-0' 
                                            : 'w-16 flex-shrink-0'
                                    }`}
                                    onClick={() => handleEventClick(event, isExpanded)}
                                >
                                    <div 
                                        className={`rounded-2xl p-4 h-80 flex flex-col justify-between transition-all duration-500 hover:shadow-lg relative ${
                                            isExpanded ? 'transform hover:scale-101' : 'items-center justify-center'
                                        }`}
                                        style={{ 
                                            backgroundColor: '#e8e2f0',
                                            background: `linear-gradient(135deg, ${
                                                originalIndex % 4 === 0 ? '#e8e2f0' : 
                                                originalIndex % 4 === 1 ? '#f0e8e2' : 
                                                originalIndex % 4 === 2 ? '#e2f0e8' : 
                                                '#e2e8f0'
                                            }, ${
                                                originalIndex % 4 === 0 ? '#d1c4e0' : 
                                                originalIndex % 4 === 1 ? '#e0d1c4' : 
                                                originalIndex % 4 === 2 ? '#c4e0d1' : 
                                                '#c4d1e0'
                                            })`
                                        }}
                                    >
                                        {isExpanded ? (
                                            // Full expanded view
                                            <>
                                                {/* Delete Button for Event Owner */}
                                                {currentUser && (
                                                    <div className="absolute top-2 right-2 z-10">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteEvent(event._id);
                                                            }}
                                                            disabled={deletingEvent === event._id}
                                                            className="bg-gray-200 hover:bg-red-500 disabled:bg-gray-100 text-gray-700 hover:text-white p-2 rounded-full transition-colors duration-200 shadow-lg"
                                                            title="Delete Event"
                                                        >
                                                            {deletingEvent === event._id ? (
                                                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Event Icon */}
                                                <div className="flex justify-center mb-4">
                                                    <div className="text-6xl">
                                                        {getEventIcon(originalIndex)}
                                                    </div>
                                                </div>

                                                {/* Event Content */}
                                                <div className="flex-1 flex flex-col justify-center text-center">
                                                    <h3 className="text-xl font-bold text-gray-800 mb-2 line-clamp-2">
                                                        {event.title}
                                                    </h3>
                                                    <p className="text-gray-600 mb-4 line-clamp-3 text-sm">
                                                        {event.description}
                                                    </p>
                                                </div>

                                                {/* Event Details */}
                                                <div className="space-y-2">
                                                    <div className="flex justify-center items-center text-gray-700">
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="text-sm font-medium">
                                                            {formatDate(event.event_datetime)}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex justify-center items-center text-gray-700">
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span className="text-sm font-medium">
                                                            {formatTime(event.event_datetime)}
                                                        </span>
                                                    </div>

                                                    {event.location && (
                                                        <div className="flex justify-center items-center text-gray-700">
                                                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            </svg>
                                                            <span className="text-sm font-medium truncate">
                                                                {event.location}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex justify-center items-center text-gray-700">
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                                                        </svg>
                                                        <span className="text-sm font-medium">
                                                            {event.attendees_count} attending
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Click to view more indicator */}
                                                <div className="flex justify-center mt-4">
                                                    <div className="bg-white bg-opacity-50 hover:bg-opacity-70 px-3 py-1 rounded-full text-sm transition-all duration-200">
                                                        Click to view details
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            // Compressed view - only show icon and title vertically
                                            <div className="flex flex-col items-center justify-center h-full text-center relative">
                                                {/* Delete Button for Event Owner (Compressed View) */}
                                                {currentUser && (
                                                    <div className="absolute top-1 right-1 z-10">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteEvent(event._id);
                                                            }}
                                                            disabled={deletingEvent === event._id}
                                                            className="bg-gray-200 hover:bg-red-500 disabled:bg-gray-100 text-gray-700 hover:text-white p-1 rounded-full transition-colors duration-200 shadow-sm"
                                                            title="Delete Event"
                                                        >
                                                            {deletingEvent === event._id ? (
                                                                <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                </svg>
                                                            ) : (
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                                </svg>
                                                            )}
                                                        </button>
                                                    </div>
                                                )}

                                                <div className="text-3xl mb-2">
                                                    {getEventIcon(originalIndex)}
                                                </div>
                                                <div className="writing-mode-vertical-lr text-orientation-mixed">
                                                    <h4 className="text-sm font-bold text-gray-800 transform rotate-90 whitespace-nowrap">
                                                        {event.title}
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
                {events.length > 2 && (
                    <div className="flex justify-center mt-6 space-x-2">
                        {Array.from({ length: events.length - 1 }).map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                    currentIndex === index 
                                        ? 'bg-gray-600 w-4' 
                                        : 'bg-gray-400 hover:bg-gray-500'
                                }`}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Event Modal with React Portal - renders at document.body level */}
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
                        currentUser={currentUser}
                    />
                </div>,
                document.body
            )}
        </>
    );
}

export default EventItem;