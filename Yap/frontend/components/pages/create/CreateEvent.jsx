import { useState } from 'react';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import EventLocationMap from './EventLocationMap.jsx';
import { API_BASE_URL } from '../../../services/config.js';
import { useTheme } from '../../../contexts/ThemeContext';

function CreateEvent() {
    // Event state
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [eventLocation, setEventLocation] = useState(null);
    const [maxAttendees, setMaxAttendees] = useState('');
    const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
    const [eventMessage, setEventMessage] = useState('');
    const [eventError, setEventError] = useState('');
    const { isDarkMode } = useTheme();

    // Get today's date for minimum date validation
    const today = new Date().toISOString().split('T')[0];

    // Calculate hours until event (for waypoint expiration)
    const calculateHoursUntilEvent = (eventDate, eventTime) => {
        const eventDateTime = new Date(`${eventDate}T${eventTime}`);
        const now = new Date();
        const diffInHours = Math.ceil((eventDateTime - now) / (1000 * 60 * 60));
        
        // Set waypoint to expire 2 hours after event time, with minimum of 1 hour and max of 168 hours (7 days)
        return Math.min(Math.max(diffInHours + 2, 1), 168);
    };

    // Format date display
    const formatDateDisplay = (dateString) => {
        if (!dateString) return 'Select date';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Format time display
    const formatTimeDisplay = (timeString) => {
        if (!timeString) return 'Select time';
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Handle location selection from map
    const handleLocationSelect = (locationData) => {
        setEventLocation(locationData);
    };

    // Handle clearing location
    const handleLocationClear = () => {
        setEventLocation(null);
    };

    // Event submit function
    const handleEventSubmit = async (e) => {
        e.preventDefault();
        
        // Validate required fields
        if (!eventTitle.trim()) {
            setEventError('Event title is required');
            return;
        }
        if (!eventDescription.trim()) {
            setEventError('Event description is required');
            return;
        }
        if (!eventDate) {
            setEventError('Event date is required');
            return;
        }
        if (!eventTime) {
            setEventError('Event time is required');
            return;
        }

        setIsSubmittingEvent(true);
        setEventError('');
        setEventMessage('');

        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                setEventError('You must be logged in to create an event');
                setIsSubmittingEvent(false);
                return;
            }

            const eventData = {
                title: eventTitle,
                description: eventDescription,
                event_date: eventDate,
                event_time: eventTime,
                location: eventLocation ? eventLocation.address : null,
                latitude: eventLocation ? eventLocation.lat : null,
                longitude: eventLocation ? eventLocation.lng : null,
                max_attendees: maxAttendees ? parseInt(maxAttendees) : null
            };

            const response = await fetch(`${API_BASE_URL}/events/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(eventData)
            });

            const data = await response.json();

            if (response.ok) {
                // If event has a location, also create a waypoint
                if (eventLocation) {
                    try {
                        const waypointData = {
                            title: `📅 ${eventTitle}`,
                            description: `Event on ${eventDate} at ${eventTime}\n\n${eventDescription}`,
                            type: 'event',
                            latitude: eventLocation.lat,
                            longitude: eventLocation.lng,
                            expires_in_hours: calculateHoursUntilEvent(eventDate, eventTime)
                        };

                        await fetch(`${API_BASE_URL}/waypoint/create`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify(waypointData)
                        });

                        setEventMessage('Event created successfully and added to the campus map! 🗺️');
                    } catch (waypointError) {
                        console.error('Failed to create waypoint:', waypointError);
                        setEventMessage('Event created successfully! (Note: Could not add to campus map)');
                    }
                } else {
                    setEventMessage('Event created successfully!');
                }
                
                // Clear the form
                setEventTitle('');
                setEventDescription('');
                setEventDate('');
                setEventTime('');
                setEventLocation(null);
                setMaxAttendees('');
            } else {
                setEventError(data.error || 'Failed to create event');
            }
        } catch (err) {
            setEventError('Network error. Please try again.');
        } finally {
            setIsSubmittingEvent(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Event Creation Form */}
            <form onSubmit={handleEventSubmit} className="space-y-6">
                {/* Event Title */}
                <div className="space-y-2">
                    <label className={`block text-sm font-semibold ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                        Event Title *
                    </label>
                    <input
                        type="text"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="What's your event called?"
                        maxLength={100}
                        disabled={isSubmittingEvent}
                        className={`w-full p-4 border-2 rounded-xl transition-all duration-200 focus:outline-none ${
                            isDarkMode
                                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-750'
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-gray-50'
                        }`}
                    />
                    <div className="flex justify-between">
                        <span className={`text-xs ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-600'
                        }`}>
                            Required field
                        </span>
                        <span className={`text-xs font-medium ${
                            eventTitle.length > 90 
                                ? 'text-red-400' 
                                : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                            {eventTitle.length}/100
                        </span>
                    </div>
                </div>

                {/* Event Description */}
                <div className="space-y-2">
                    <label className={`block text-sm font-semibold ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                        Event Description *
                    </label>
                    <textarea
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        placeholder="Tell people what to expect at your event..."
                        maxLength={500}
                        disabled={isSubmittingEvent}
                        className={`w-full p-4 border-2 rounded-xl transition-all duration-200 resize-none h-28 focus:outline-none ${
                            isDarkMode
                                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-750'
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-gray-50'
                        }`}
                    />
                    <div className="flex justify-between">
                        <span className={`text-xs ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-600'
                        }`}>
                            Required field
                        </span>
                        <span className={`text-xs font-medium ${
                            eventDescription.length > 450 
                                ? 'text-red-400' 
                                : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                            {eventDescription.length}/500
                        </span>
                    </div>
                </div>

                {/* Enhanced Date and Time Section */}
                <div className="space-y-4">
                    <h3 className={`text-sm font-semibold flex items-center ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                        <Calendar className="w-4 h-4 mr-2" />
                        When is your event? *
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date Picker */}
                        <div className="relative">
                            <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Date
                            </label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    min={today}
                                    disabled={isSubmittingEvent}
                                    className={`w-full p-4 border-2 rounded-xl appearance-none cursor-pointer transition-all duration-200 focus:outline-none ${
                                        isDarkMode
                                            ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500 focus:bg-gray-750'
                                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:bg-gray-50'
                                    }`}
                                />
                                <Calendar className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`} />
                            </div>
                            <div className={`mt-2 text-sm font-medium ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                {formatDateDisplay(eventDate)}
                            </div>
                        </div>

                        {/* Time Picker */}
                        <div className="relative">
                            <label className={`block text-xs font-medium mb-2 uppercase tracking-wide ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Time
                            </label>
                            <div className="relative">
                                <input
                                    type="time"
                                    value={eventTime}
                                    onChange={(e) => setEventTime(e.target.value)}
                                    disabled={isSubmittingEvent}
                                    className={`w-full p-4 border-2 rounded-xl appearance-none cursor-pointer transition-all duration-200 focus:outline-none ${
                                        isDarkMode
                                            ? 'bg-gray-800 border-gray-700 text-white focus:border-blue-500 focus:bg-gray-750'
                                            : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:bg-gray-50'
                                    }`}
                                />
                                <Clock className={`absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`} />
                            </div>
                            <div className={`mt-2 text-sm font-medium ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                {formatTimeDisplay(eventTime)}
                            </div>
                        </div>
                    </div>

                    {/* Date/Time Preview Card */}
                    {eventDate && eventTime && (
                        <div className={`border rounded-xl p-4 ${
                            isDarkMode
                                ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-700/50'
                                : 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200'
                        }`}>
                            <div className="flex items-center space-x-3">
                                <div className="bg-blue-600 rounded-lg p-2">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className={`font-semibold ${
                                        isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                        {formatDateDisplay(eventDate)}
                                    </div>
                                    <div className={`text-sm ${
                                        isDarkMode ? 'text-blue-300' : 'text-blue-600'
                                    }`}>
                                        at {formatTimeDisplay(eventTime)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Location with Map Integration */}
                <div className="space-y-2">
                    <label className={`block text-sm font-semibold flex items-center ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                        <MapPin className="w-4 h-4 mr-2" />
                        Event Location
                    </label>
                    <EventLocationMap
                        selectedLocation={eventLocation}
                        onLocationSelect={handleLocationSelect}
                        onLocationClear={handleLocationClear}
                    />
                </div>

                {/* Max Attendees */}
                <div className="space-y-2">
                    <label className={`block text-sm font-semibold flex items-center ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                        <Users className="w-4 h-4 mr-2" />
                        Maximum Attendees
                    </label>
                    <input
                        type="number"
                        value={maxAttendees}
                        onChange={(e) => setMaxAttendees(e.target.value)}
                        placeholder="Leave blank for unlimited capacity"
                        min="1"
                        disabled={isSubmittingEvent}
                        className={`w-full p-4 border-2 rounded-xl transition-all duration-200 focus:outline-none ${
                            isDarkMode
                                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-750'
                                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-gray-50'
                        }`}
                    />
                    <div className={`text-xs ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-600'
                    }`}>
                        Optional - Set a limit on how many people can attend
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-6">
                    <button 
                        type="submit" 
                        disabled={isSubmittingEvent || !eventTitle.trim() || !eventDescription.trim() || !eventDate || !eventTime}
                        className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-blue-500/25"
                    >
                        {isSubmittingEvent ? (
                            <div className="flex items-center space-x-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Creating Event...</span>
                            </div>
                        ) : (
                            'Create Event'
                        )}
                    </button>
                </div>
            </form>

            {/* Success/Error Messages */}
            {eventMessage && (
                <div className={`p-4 border rounded-xl backdrop-blur-sm ${
                    isDarkMode
                        ? 'bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-700/50 text-green-300'
                        : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-700'
                }`}>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="font-medium">{eventMessage}</span>
                    </div>
                </div>
            )}

            {eventError && (
                <div className={`p-4 border rounded-xl backdrop-blur-sm ${
                    isDarkMode
                        ? 'bg-gradient-to-r from-red-900/50 to-pink-900/50 border-red-700/50 text-red-300'
                        : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-200 text-red-700'
                }`}>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="font-medium">{eventError}</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CreateEvent;