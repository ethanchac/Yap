import { useState } from 'react';
import { Calendar, Clock, MapPin, Users, ImageIcon, X } from 'lucide-react';
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
    const [locationTitle, setLocationTitle] = useState('');
    const [maxAttendees, setMaxAttendees] = useState('');
    const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);
    const [eventMessage, setEventMessage] = useState('');
    const [eventError, setEventError] = useState('');
    
    // Image upload state
    const [selectedImage, setSelectedImage] = useState(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState('');
    const [uploadingImage, setUploadingImage] = useState(false);
    
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
        // Auto-populate location title with the address if no title is set
        if (!locationTitle && locationData.address) {
            setLocationTitle(locationData.address);
        }
    };

    // Handle clearing location
    const handleLocationClear = () => {
        setEventLocation(null);
        setLocationTitle('');
    };

    // Get display location (title or coordinates)
    const getLocationDisplay = () => {
        if (!eventLocation) return null;
        if (locationTitle.trim()) return locationTitle.trim();
        return `${eventLocation.lat.toFixed(6)}, ${eventLocation.lng.toFixed(6)}`;
    };

    // Image handling functions
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        const maxSize = 5 * 1024 * 1024; // 5MB
        
        if (!file) return;

        if (file.size > maxSize) {
            setEventError('Image is too large. Maximum size is 5MB.');
            return;
        }

        if (!file.type.startsWith('image/')) {
            setEventError('Please select a valid image file.');
            return;
        }

        setSelectedImage(file);
        setImagePreviewUrl(URL.createObjectURL(file));
        setEventError('');
    };

    const removeImage = () => {
        if (imagePreviewUrl) {
            URL.revokeObjectURL(imagePreviewUrl);
        }
        setSelectedImage(null);
        setImagePreviewUrl('');
    };

    const uploadImage = async () => {
        if (!selectedImage) return null;

        setUploadingImage(true);
        try {
            const token = localStorage.getItem('token');
            
            const formData = new FormData();
            formData.append('image', selectedImage);

            const response = await fetch(`${API_BASE_URL}/events/upload-image`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();
            
            if (response.ok) {
                return data.imageUrl;
            } else {
                throw new Error(data.error || 'Failed to upload image');
            }
        } finally {
            setUploadingImage(false);
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

            // Upload image if selected
            let imageUrl = null;
            if (selectedImage) {
                imageUrl = await uploadImage();
            }

            const eventData = {
                title: eventTitle,
                description: eventDescription,
                event_date: eventDate,
                event_time: eventTime,
                location: getLocationDisplay(),
                location_title: locationTitle.trim() || null,
                latitude: eventLocation ? eventLocation.lat : null,
                longitude: eventLocation ? eventLocation.lng : null,
                max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
                image: imageUrl
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
                setLocationTitle('');
                setMaxAttendees('');
                removeImage();
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
                {/* Event Image Upload */}
                <div className="space-y-4">
                    <label className="block text-white text-sm font-semibold mb-2 flex items-center">
                        <ImageIcon className="w-4 h-4 mr-2 text-orange-400" />
                        Event Cover Image (Optional)
                    </label>
                            
                    {imagePreviewUrl ? (
                        <div className="relative group">
                            <img 
                                src={imagePreviewUrl} 
                                alt="Event preview"
                                className="w-full h-48 object-cover rounded-xl border border-gray-600"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={removeImage}
                                    className="bg-red-500 hover:bg-red-600 text-white rounded-full p-3 transition-colors duration-200"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <label 
                            htmlFor="event-image-upload"
                            className="group relative flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 rounded-xl cursor-pointer transition-all duration-300 hover:border-orange-500 bg-white/10 hover:bg-white/15"
                        >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <ImageIcon className="w-10 h-10 mb-3 text-gray-400" />
                                <p className="mb-2 text-sm font-semibold text-gray-300">
                                    Click to upload event image
                                </p>
                                <p className="text-xs text-gray-500">
                                    PNG, JPG, JPEG up to 5MB
                                </p>
                            </div>
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                        </label>
                    )}
                            
                            <input
                                id="event-image-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                className="hidden"
                                disabled={isSubmittingEvent || uploadingImage}
                            />
                            
                            <div className="text-xs text-gray-500">
                                Optional - If no image is provided, a random placeholder will be used
                            </div>
                        </div>

                {/* Event Title */}
                <div className="space-y-2">
                    <label className="block text-white text-sm font-semibold mb-2">
                        Event Title *
                    </label>
                    <div className="relative group">
                        <input
                            type="text"
                            value={eventTitle}
                            onChange={(e) => setEventTitle(e.target.value)}
                            placeholder="What's your event called?"
                            maxLength={100}
                            disabled={isSubmittingEvent}
                            className="w-full px-4 py-4 bg-white/10 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white/15 transition-all duration-300"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-xs text-gray-500">
                            Required field
                        </span>
                        <span className={`text-xs font-medium ${
                            eventTitle.length > 90 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                            {eventTitle.length}/100
                        </span>
                    </div>
                </div>

                {/* Event Description */}
                <div className="space-y-2">
                    <label className="block text-white text-sm font-semibold mb-2">
                        Event Description *
                    </label>
                    <div className="relative group">
                        <textarea
                            value={eventDescription}
                            onChange={(e) => setEventDescription(e.target.value)}
                            placeholder="Tell people what to expect at your event..."
                            maxLength={500}
                            disabled={isSubmittingEvent}
                            className="w-full px-4 py-4 bg-white/10 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white/15 transition-all duration-300 resize-none h-28"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-xs text-gray-500">
                            Required field
                        </span>
                        <span className={`text-xs font-medium ${
                            eventDescription.length > 450 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                            {eventDescription.length}/500
                        </span>
                    </div>
                </div>

                {/* Enhanced Date and Time Section */}
                <div className="space-y-4">
                    <h3 className="text-white text-sm font-semibold flex items-center mb-2">
                        <Calendar className="w-4 h-4 mr-2 text-orange-400" />
                        When is your event? *
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Date Picker */}
                        <div className="relative">
                            <label className="block text-xs font-medium mb-2 uppercase tracking-wide text-gray-400">
                                Date
                            </label>
                            <div className="relative group">
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    min={today}
                                    disabled={isSubmittingEvent}
                                    className="w-full px-4 py-4 bg-white/10 border-2 border-gray-600 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:bg-white/15 transition-all duration-300 appearance-none cursor-pointer"
                                />
                                <Calendar className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none text-gray-400" />
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                            </div>
                            <div className="mt-2 text-sm font-medium text-gray-400">
                                {formatDateDisplay(eventDate)}
                            </div>
                        </div>

                        {/* Time Picker */}
                        <div className="relative">
                            <label className="block text-xs font-medium mb-2 uppercase tracking-wide text-gray-400">
                                Time
                            </label>
                            <div className="relative group">
                                <input
                                    type="time"
                                    value={eventTime}
                                    onChange={(e) => setEventTime(e.target.value)}
                                    disabled={isSubmittingEvent}
                                    className="w-full px-4 py-4 bg-white/10 border-2 border-gray-600 rounded-xl text-white focus:outline-none focus:border-orange-500 focus:bg-white/15 transition-all duration-300 appearance-none cursor-pointer"
                                />
                                <Clock className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 pointer-events-none text-gray-400" />
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                            </div>
                            <div className="mt-2 text-sm font-medium text-gray-400">
                                {formatTimeDisplay(eventTime)}
                            </div>
                        </div>
                    </div>

                    {/* Date/Time Preview Card */}
                    {eventDate && eventTime && (
                        <div className="border border-gray-600 rounded-xl p-4 bg-white/10 backdrop-blur-sm">
                            <div className="flex items-center space-x-3">
                                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-2">
                                    <Calendar className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <div className="font-semibold text-white">
                                        {formatDateDisplay(eventDate)}
                                    </div>
                                    <div className="text-sm text-orange-300">
                                        at {formatTimeDisplay(eventTime)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Location with Map Integration and Title Input */}
                <div className="space-y-4">
                    <label className="block text-white text-sm font-semibold flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-orange-400" />
                        Event Location (Optional)
                    </label>
                    
                    {/* Map Component */}
                    <EventLocationMap
                        selectedLocation={eventLocation}
                        onLocationSelect={handleLocationSelect}
                        onLocationClear={handleLocationClear}
                    />
                    
                    {/* Location Title Input - only show when location is selected */}
                    {eventLocation && (
                        <div className="space-y-2">
                            <label className="block text-white text-sm font-medium">
                                Location Name (Optional)
                            </label>
                            <div className="relative group">
                                <input
                                    type="text"
                                    value={locationTitle}
                                    onChange={(e) => setLocationTitle(e.target.value)}
                                    placeholder="Give this location a custom name (e.g., 'Main Library', 'Student Center')"
                                    maxLength={100}
                                    disabled={isSubmittingEvent}
                                    className="w-full px-4 py-3 bg-white/10 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white/15 transition-all duration-300"
                                />
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-xs text-gray-500">
                                    This will be displayed instead of coordinates
                                </span>
                                <span className={`text-xs font-medium ${
                                    locationTitle.length > 90 ? 'text-red-400' : 'text-gray-400'
                                }`}>
                                    {locationTitle.length}/100
                                </span>
                            </div>
                            
                            {/* Location Preview */}
                            <div className={`border rounded-lg p-3 ${
                                isDarkMode
                                    ? 'bg-[#1c1c1c]/50 border-gray-700'
                                    : 'bg-gray-50 border-gray-200'
                            }`}>
                                <div className={`text-sm font-medium ${
                                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                                }`}>
                                    Location will display as:
                                </div>
                                <div className={`text-sm ${
                                    isDarkMode ? 'text-blue-300' : 'text-blue-600'
                                }`}>
                                    {getLocationDisplay()}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Max Attendees */}
                <div className="space-y-2">
                    <label className="block text-white text-sm font-semibold flex items-center mb-2">
                        <Users className="w-4 h-4 mr-2 text-orange-400" />
                        Maximum Attendees (Optional)
                    </label>
                    <div className="relative group">
                        <input
                            type="number"
                            value={maxAttendees}
                            onChange={(e) => setMaxAttendees(e.target.value)}
                            placeholder="Leave blank for unlimited capacity"
                            min="1"
                            disabled={isSubmittingEvent}
                            className="w-full px-4 py-4 bg-white/10 border-2 border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:bg-white/15 transition-all duration-300"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/20 to-orange-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                    </div>
                    <div className="text-xs text-gray-500">
                        Optional - Set a limit on how many people can attend
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-6">
                    <button 
                        type="submit" 
                        disabled={isSubmittingEvent || uploadingImage || !eventTitle.trim() || !eventDescription.trim() || !eventDate || !eventTime}
                        className="flex items-center space-x-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
                    >
                        {isSubmittingEvent ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Creating Event...</span>
                            </>
                        ) : uploadingImage ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Uploading Image...</span>
                            </>
                        ) : (
                            <>
                                <Calendar className="w-5 h-5" />
                                <span>Create Event</span>
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Success/Error Messages */}
            {eventMessage && (
                <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-300 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="font-medium">{eventMessage}</span>
                    </div>
                </div>
            )}

            {eventError && (
                <div className="p-4 bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 text-red-300 rounded-xl backdrop-blur-sm">
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