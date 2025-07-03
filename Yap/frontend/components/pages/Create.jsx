import { useState } from 'react';
import Sidebar from '../sidebar/Sidebar';
import Header from '../header/Header'

function Create() {
    // Toggle between post and event creation
    const [activeTab, setActiveTab] = useState('post'); // 'post' or 'event'
    
    // Post state
    const [content, setContent] = useState('');
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);
    const [postMessage, setPostMessage] = useState('');
    const [postError, setPostError] = useState('');

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

    const handlePostSubmit = async (e) => {
        e.preventDefault();
        
        if (!content.trim()) {
            setPostError('Content is required');
            return;
        }

        setIsSubmittingPost(true);
        setPostError('');
        setPostMessage('');

        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                setPostError('You must be logged in to create a post');
                setIsSubmittingPost(false);
                return;
            }

            const response = await fetch('http://localhost:5000/posts/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: content
                })
            });

            const data = await response.json();

            if (response.ok) {
                setPostMessage('Post created successfully!');
                setContent(''); // clear the form
            } else {
                setPostError(data.error || 'Failed to create post');
            }
        } catch (err) {
            setPostError('Network error. Please try again.');
        } finally {
            setIsSubmittingPost(false);
        }
    };

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

    const clearMessages = () => {
        setPostMessage('');
        setPostError('');
        setEventMessage('');
        setEventError('');
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        clearMessages();
    };

    return (
        <div className="min-h-screen font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
            <Header />
            <Sidebar />
            <div className="ml-64 p-6">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-white text-2xl font-bold mb-6">
                        Create New {activeTab === 'post' ? 'Post' : 'Event'}
                    </h1>
                    
                    {/* Tab Navigation */}
                    <div className="flex mb-6 rounded-lg overflow-hidden" style={{backgroundColor: '#1f2937'}}>
                        <button
                            onClick={() => handleTabChange('post')}
                            className={`flex-1 py-3 px-4 text-center font-semibold transition-colors ${
                                activeTab === 'post'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            Create Post
                        </button>
                        <button
                            onClick={() => handleTabChange('event')}
                            className={`flex-1 py-3 px-4 text-center font-semibold transition-colors ${
                                activeTab === 'event'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            Create Event
                        </button>
                    </div>
                    
                    <div className="rounded-lg p-6" style={{backgroundColor: '#1f2937'}}>
                        {activeTab === 'post' ? (
                            /* Post Creation Form */
                            <form onSubmit={handlePostSubmit} className="space-y-4">
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="What's on your mind?"
                                    maxLength={280}
                                    disabled={isSubmittingPost}
                                    className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none h-32"
                                />
                                
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm ${content.length > 260 ? 'text-red-400' : 'text-gray-400'}`}>
                                        {content.length}/280
                                    </span>
                                    
                                    <button 
                                        type="submit" 
                                        disabled={isSubmittingPost || !content.trim()}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                                    >
                                        {isSubmittingPost ? 'Posting...' : 'Create Post'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            /* Event Creation Form */
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
                        )}

                        {/* Success/Error Messages */}
                        {postMessage && activeTab === 'post' && (
                            <div className="mt-4 p-3 bg-green-900 border border-green-700 text-green-300 rounded-lg">
                                {postMessage}
                            </div>
                        )}

                        {postError && activeTab === 'post' && (
                            <div className="mt-4 p-3 bg-red-900 border border-red-700 text-red-300 rounded-lg">
                                {postError}
                            </div>
                        )}

                        {eventMessage && activeTab === 'event' && (
                            <div className="mt-4 p-3 bg-green-900 border border-green-700 text-green-300 rounded-lg">
                                {eventMessage}
                            </div>
                        )}

                        {eventError && activeTab === 'event' && (
                            <div className="mt-4 p-3 bg-red-900 border border-red-700 text-red-300 rounded-lg">
                                {eventError}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Create;