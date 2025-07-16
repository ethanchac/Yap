import { useState } from 'react';

function CreateEvent() {
    // Event state
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [maxAttendees, setMaxAttendees] = useState('');
    const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
    const [eventMessage, setEventMessage] = useState('');
    const [eventError, setEventError] = useState('');

    // Get today's date for minimum date validation
    const today = new Date().toISOString().split('T')[0];

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
                location: eventLocation.trim() || null,
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
                setEventMessage('Event created successfully!');
                // Clear the form
                setEventTitle('');
                setEventDescription('');
                setEventDate('');
                setEventTime('');
                setEventLocation('');
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
        <div className="space-y-4">
            {/* Event Creation Form */}
            <form onSubmit={handleEventSubmit} className="space-y-4">
                {/* Event Title */}
                <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                        Event Title *
                    </label>
                    <input
                        type="text"
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="Enter event title"
                        maxLength={100}
                        disabled={isSubmittingEvent}
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
                    />
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">* Required</span>
                        <span className={`text-xs ${eventTitle.length > 90 ? 'text-red-400' : 'text-gray-400'}`}>
                            {eventTitle.length}/100
                        </span>
                    </div>
                </div>

                {/* Event Description */}
                <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                        Event Description *
                    </label>
                    <textarea
                        value={eventDescription}
                        onChange={(e) => setEventDescription(e.target.value)}
                        placeholder="Describe your event..."
                        maxLength={500}
                        disabled={isSubmittingEvent}
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none h-24"
                    />
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-500">* Required</span>
                        <span className={`text-xs ${eventDescription.length > 450 ? 'text-red-400' : 'text-gray-400'}`}>
                            {eventDescription.length}/500
                        </span>
                    </div>
                </div>

                {/* Date and Time Row */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Date *
                        </label>
                        <input
                            type="date"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            min={today}
                            disabled={isSubmittingEvent}
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gray-400"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-300 text-sm font-medium mb-2">
                            Time *
                        </label>
                        <input
                            type="time"
                            value={eventTime}
                            onChange={(e) => setEventTime(e.target.value)}
                            disabled={isSubmittingEvent}
                            className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-gray-400"
                        />
                    </div>
                </div>

                {/* Location */}
                <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                        Location (Optional)
                    </label>
                    <input
                        type="text"
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        placeholder="Enter event location"
                        disabled={isSubmittingEvent}
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
                    />
                </div>

                {/* Max Attendees */}
                <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                        Maximum Attendees (Optional)
                    </label>
                    <input
                        type="number"
                        value={maxAttendees}
                        onChange={(e) => setMaxAttendees(e.target.value)}
                        placeholder="Leave blank for unlimited"
                        min="1"
                        disabled={isSubmittingEvent}
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-400"
                    />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                    <button 
                        type="submit" 
                        disabled={isSubmittingEvent || !eventTitle.trim() || !eventDescription.trim() || !eventDate || !eventTime}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                    >
                        {isSubmittingEvent ? 'Creating Event...' : 'Create Event'}
                    </button>
                </div>
            </form>

            {/* Success/Error Messages */}
            {eventMessage && (
                <div className="mt-4 p-3 bg-green-900 border border-green-700 text-green-300 rounded-lg">
                    {eventMessage}
                </div>
            )}

            {eventError && (
                <div className="mt-4 p-3 bg-red-900 border border-red-700 text-red-300 rounded-lg">
                    {eventError}
                </div>
            )}
        </div>
    );
}

export default CreateEvent;