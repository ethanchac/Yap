
import { useState } from 'react';
import { FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUsers, FaRegEdit } from 'react-icons/fa';
import EventLocationMap from './EventLocationMap.jsx';

function CreateEvent() {
    // Event state
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [eventType, setEventType] = useState('in-person'); // 'in-person' or 'online'
    const [eventLocation, setEventLocation] = useState(null); // For in-person events (coordinates)
    const [onlinePlatform, setOnlinePlatform] = useState(''); // For online events
    const [maxAttendees, setMaxAttendees] = useState('');
    const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
    const [eventMessage, setEventMessage] = useState('');
    const [eventError, setEventError] = useState('');

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

    // Handle location selection from map
    const handleLocationSelect = (locationData) => {
        setEventLocation(locationData);
    };

    // Handle clearing location
    const handleLocationClear = () => {
        setEventLocation(null);
    };

    // Handle event type change
    const handleEventTypeChange = (type) => {
        setEventType(type);
        // Clear location data when switching types
        if (type === 'online') {
            setEventLocation(null);
        } else {
            setOnlinePlatform('');
        }
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
        
        // Validate location/platform based on event type
        if (eventType === 'in-person' && !eventLocation) {
            setEventError('Please select a location on the map for in-person events');
            return;
        }
        if (eventType === 'online' && !onlinePlatform.trim()) {
            setEventError('Please specify the online platform for virtual events');
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
                event_type: eventType,
                location: eventType === 'in-person' ? eventLocation?.address : onlinePlatform,
                latitude: eventType === 'in-person' ? eventLocation?.lat : null,
                longitude: eventType === 'in-person' ? eventLocation?.lng : null,
                max_attendees: maxAttendees ? parseInt(maxAttendees) : null
            };

            const response = await fetch('http://localhost:5000/events/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(eventData)
            });

            const data = await response.json();

            if (response.ok) {
                // If event has a location (in-person), also create a waypoint
                if (eventType === 'in-person' && eventLocation) {
                    try {
                        const waypointData = {
                            title: `📅 ${eventTitle}`,
                            description: `Event on ${eventDate} at ${eventTime}\n\n${eventDescription}`,
                            type: 'event',
                            latitude: eventLocation.lat,
                            longitude: eventLocation.lng,
                            expires_in_hours: calculateHoursUntilEvent(eventDate, eventTime)
                        };

                        await fetch('http://localhost:5000/waypoint/create', {
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
                    setEventMessage(`${eventType === 'online' ? 'Online event' : 'Event'} created successfully!`);
                }
                
                // Clear the form
                setEventTitle('');
                setEventDescription('');
                setEventDate('');
                setEventTime('');
                setEventType('in-person');
                setEventLocation(null);
                setOnlinePlatform('');
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
        <div className="flex flex-col md:flex-row gap-8">
            {/* Form Card */}
            <div className="w-full md:w-2/3 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-xl p-8 border border-gray-700">
                <h2 className="text-2xl font-bold text-blue-400 mb-6 flex items-center gap-2">
                    <FaRegEdit className="text-blue-300" /> Create a New Event
                </h2>
                <form onSubmit={handleEventSubmit} className="space-y-6">
                    {/* Event Title */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-2 flex items-center gap-2">
                            <FaRegEdit className="text-blue-400" /> Event Title <span className="text-pink-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={eventTitle}
                            onChange={(e) => setEventTitle(e.target.value)}
                            placeholder="Enter event title"
                            maxLength={100}
                            disabled={isSubmittingEvent}
                            className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 transition-all shadow-sm"
                        />
                        <div className="flex justify-between mt-1">
                            <span className="text-xs text-gray-500">* Required</span>
                            <span className={`text-xs ${eventTitle.length > 90 ? 'text-pink-400' : 'text-gray-400'}`}>
                                {eventTitle.length}/100
                            </span>
                        </div>
                    </div>

                    {/* Event Description */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-2 flex items-center gap-2">
                            <FaRegEdit className="text-blue-400" /> Event Description <span className="text-pink-400">*</span>
                        </label>
                        <textarea
                            value={eventDescription}
                            onChange={(e) => setEventDescription(e.target.value)}
                            placeholder="Describe your event..."
                            maxLength={500}
                            disabled={isSubmittingEvent}
                            className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 transition-all shadow-sm resize-none h-28"
                        />
                        <div className="flex justify-between mt-1">
                            <span className="text-xs text-gray-500">* Required</span>
                            <span className={`text-xs ${eventDescription.length > 450 ? 'text-pink-400' : 'text-gray-400'}`}>
                                {eventDescription.length}/500
                            </span>
                        </div>
                    </div>

                    {/* Date and Time Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-300 text-sm font-semibold mb-2 flex items-center gap-2">
                                <FaCalendarAlt className="text-blue-400" /> Date <span className="text-pink-400">*</span>
                            </label>
                            <input
                                type="date"
                                value={eventDate}
                                onChange={(e) => setEventDate(e.target.value)}
                                min={today}
                                disabled={isSubmittingEvent}
                                className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-400 transition-all shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-300 text-sm font-semibold mb-2 flex items-center gap-2">
                                <FaClock className="text-blue-400" /> Time <span className="text-pink-400">*</span>
                            </label>
                            <input
                                type="time"
                                value={eventTime}
                                onChange={(e) => setEventTime(e.target.value)}
                                disabled={isSubmittingEvent}
                                className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-400 transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Event Type Selection */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
                            <FaMapMarkerAlt className="text-blue-400" /> Event Type <span className="text-pink-400">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => handleEventTypeChange('in-person')}
                                disabled={isSubmittingEvent}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                    eventType === 'in-person'
                                        ? 'border-blue-400 bg-blue-900/50 text-blue-300'
                                        : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                                }`}
                            >
                                <FaMapMarkerAlt className="text-2xl" />
                                <span className="font-semibold">In-Person</span>
                                <span className="text-xs text-center">Select location on campus map</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => handleEventTypeChange('online')}
                                disabled={isSubmittingEvent}
                                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                                    eventType === 'online'
                                        ? 'border-blue-400 bg-blue-900/50 text-blue-300'
                                        : 'border-gray-600 bg-gray-800 text-gray-400 hover:border-gray-500'
                                }`}
                            >
                                <div className="text-2xl">💻</div>
                                <span className="font-semibold">Online</span>
                                <span className="text-xs text-center">Specify platform details</span>
                            </button>
                        </div>
                    </div>

                    {/* Conditional Location/Platform Field */}
                    {eventType === 'in-person' ? (
                        /* Location with Map Integration */
                        <div>
                            <label className="block text-gray-300 text-sm font-semibold mb-2 flex items-center gap-2">
                                <FaMapMarkerAlt className="text-blue-400" /> Event Location <span className="text-pink-400">*</span>
                            </label>
                            <EventLocationMap
                                selectedLocation={eventLocation}
                                onLocationSelect={handleLocationSelect}
                                onLocationClear={handleLocationClear}
                            />
                        </div>
                    ) : (
                        /* Online Platform Field */
                        <div>
                            <label className="block text-gray-300 text-sm font-semibold mb-2 flex items-center gap-2">
                                <div className="text-blue-400">💻</div> Online Platform <span className="text-pink-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={onlinePlatform}
                                onChange={(e) => setOnlinePlatform(e.target.value)}
                                placeholder="e.g., Zoom, Google Meet, Discord, Teams..."
                                maxLength={200}
                                disabled={isSubmittingEvent}
                                className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 transition-all shadow-sm"
                            />
                            <div className="flex justify-between mt-1">
                                <span className="text-xs text-gray-500">* Required - Include meeting link if available</span>
                                <span className={`text-xs ${onlinePlatform.length > 180 ? 'text-pink-400' : 'text-gray-400'}`}>
                                    {onlinePlatform.length}/200
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Max Attendees */}
                    <div>
                        <label className="block text-gray-300 text-sm font-semibold mb-2 flex items-center gap-2">
                            <FaUsers className="text-blue-400" /> Maximum Attendees
                        </label>
                        <input
                            type="number"
                            value={maxAttendees}
                            onChange={(e) => setMaxAttendees(e.target.value)}
                            placeholder="Leave blank for unlimited"
                            min="1"
                            disabled={isSubmittingEvent}
                            className="w-full p-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 transition-all shadow-sm"
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={
                                isSubmittingEvent || 
                                !eventTitle.trim() || 
                                !eventDescription.trim() || 
                                !eventDate || 
                                !eventTime ||
                                (eventType === 'in-person' && !eventLocation) ||
                                (eventType === 'online' && !onlinePlatform.trim())
                            }
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-pink-500 hover:from-blue-500 hover:to-pink-400 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-xl font-bold text-lg shadow-lg transition-all flex items-center gap-2"
                        >
                            {isSubmittingEvent ? (
                                <span className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></span>
                            ) : null}
                            {isSubmittingEvent ? 'Creating Event...' : 'Create Event'}
                        </button>
                    </div>
                </form>

                {/* Success/Error Messages */}
                {eventMessage && (
                    <div className="mt-6 p-4 bg-green-900 border border-green-700 text-green-300 rounded-xl shadow">
                        {eventMessage}
                    </div>
                )}

                {eventError && (
                    <div className="mt-6 p-4 bg-red-900 border border-red-700 text-red-300 rounded-xl shadow">
                        {eventError}
                    </div>
                )}
            </div>

            {/* Live Event Preview Card */}
            <div className="w-full md:w-1/3 flex flex-col items-center">
                <div className="w-full bg-gradient-to-br from-blue-900 to-gray-900 rounded-2xl shadow-xl p-6 border border-blue-700 mt-4 md:mt-0">
                    <h3 className="text-xl font-bold text-blue-300 mb-4 flex items-center gap-2">
                        <FaCalendarAlt className="text-blue-400" /> Event Preview
                    </h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-lg font-semibold text-white">
                            <FaRegEdit className="text-pink-400" /> {eventTitle || <span className="italic text-gray-400">Event Title</span>}
                        </div>
                        <div className="text-gray-300 text-sm min-h-[48px]">
                            {eventDescription || <span className="italic text-gray-500">Event description will appear here.</span>}
                        </div>
                        <div className="flex items-center gap-2 text-blue-200">
                            <FaCalendarAlt /> {eventDate || <span className="italic text-gray-500">Date</span>}
                        </div>
                        <div className="flex items-center gap-2 text-blue-200">
                            <FaClock /> {eventTime || <span className="italic text-gray-500">Time</span>}
                        </div>
                        <div className="flex items-center gap-2 text-blue-200">
                            <span className="text-sm font-medium">
                                {eventType === 'online' ? '💻 Online Event' : '📍 In-Person Event'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-blue-200">
                            {eventType === 'online' ? (
                                <>
                                    <span>�</span> 
                                    {onlinePlatform || <span className="italic text-gray-500">Platform not specified</span>}
                                </>
                            ) : (
                                <>
                                    <FaMapMarkerAlt /> 
                                    {eventLocation?.address || <span className="italic text-gray-500">No location selected</span>}
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-blue-200">
                            <FaUsers /> {maxAttendees ? maxAttendees : <span className="italic text-gray-500">Unlimited</span>} Attendees
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CreateEvent;