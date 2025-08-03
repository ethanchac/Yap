import { useState } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import Sidebar from '../sidebar/Sidebar';
import Header from '../header/Header';
import { API_BASE_URL } from '../../services/config';
import { useTheme } from '../../contexts/ThemeContext';

function Create() {
    // Toggle between post and event creation
    const [activeTab, setActiveTab] = useState('post'); // 'post' or 'event'
    const { isDarkMode } = useTheme();
    
    // Post state
    const [content, setContent] = useState('');
    const [isSubmittingPost, setIsSubmittingPost] = useState(false);
    const [postMessage, setPostMessage] = useState('');
    const [postError, setPostError] = useState('');
    
    // Image upload state
    const [selectedImages, setSelectedImages] = useState([]);
    const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
    const [uploadingImages, setUploadingImages] = useState(false);

    // Event state (unchanged)
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

    // Image handling functions
    const handleImageSelect = (e) => {
        const files = Array.from(e.target.files);
        const maxImages = 4; // Limit to 4 images per post
        const maxSize = 5 * 1024 * 1024; // 5MB per image
        
        if (selectedImages.length + files.length > maxImages) {
            setPostError(`You can only upload up to ${maxImages} images per post`);
            return;
        }

        const validFiles = [];
        const newPreviewUrls = [];

        files.forEach(file => {
            // Check file size
            if (file.size > maxSize) {
                setPostError(`Image "${file.name}" is too large. Maximum size is 5MB.`);
                return;
            }

            // Check file type
            if (!file.type.startsWith('image/')) {
                setPostError(`"${file.name}" is not a valid image file.`);
                return;
            }

            validFiles.push(file);
            newPreviewUrls.push(URL.createObjectURL(file));
        });

        setSelectedImages(prev => [...prev, ...validFiles]);
        setImagePreviewUrls(prev => [...prev, ...newPreviewUrls]);
        setPostError(''); // Clear any previous errors
    };

    const removeImage = (index) => {
        // Revoke the object URL to free memory
        URL.revokeObjectURL(imagePreviewUrls[index]);
        
        setSelectedImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    };

    const uploadImages = async () => {
        if (selectedImages.length === 0) return [];

        setUploadingImages(true);
        const uploadedImageUrls = [];

        try {
            const token = localStorage.getItem('token');
            
            for (const image of selectedImages) {
                const formData = new FormData();
                formData.append('image', image);

                const response = await fetch(`${API_BASE_URL}/posts/upload-image`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                const data = await response.json();
                
                if (response.ok) {
                    uploadedImageUrls.push(data.imageUrl);
                } else {
                    throw new Error(data.error || 'Failed to upload image');
                }
            }

            return uploadedImageUrls;
        } finally {
            setUploadingImages(false);
        }
    };

    const handlePostSubmit = async (e) => {
        e.preventDefault();
        
        if (!content.trim() && selectedImages.length === 0) {
            setPostError('Content or images are required');
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

            // Upload images first if any are selected
            let imageUrls = [];
            if (selectedImages.length > 0) {
                imageUrls = await uploadImages();
            }

            const response = await fetch(`${API_BASE_URL}/posts/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: content.trim(),
                    images: imageUrls // Send the uploaded image URLs
                })
            });

            const data = await response.json();

            if (response.ok) {
                setPostMessage('Post created successfully!');
                setContent(''); // clear the form
                
                // Clear images
                imagePreviewUrls.forEach(url => URL.revokeObjectURL(url));
                setSelectedImages([]);
                setImagePreviewUrls([]);
            } else {
                setPostError(data.error || 'Failed to create post');
            }
        } catch (err) {
            setPostError('Network error. Please try again.');
        } finally {
            setIsSubmittingPost(false);
        }
    };

    // Event submit function (unchanged)
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
        <div className="min-h-screen font-bold" style={{
            backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
            fontFamily: 'Albert Sans'
        }}>
            <Header />
            <Sidebar />
            <div className="ml-64 p-6">
                <div className="max-w-6xl mx-auto">
                    <h1 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        Create New {activeTab === 'post' ? 'Post' : 'Event'}
                    </h1>
                    
                    {/* Tab Navigation */}
                    <div className="flex mb-6 rounded-lg overflow-hidden" style={{
                        backgroundColor: isDarkMode ? '#171717' : '#f8f9fa',
                        border: isDarkMode ? 'none' : '1px solid #e5e7eb'
                    }}>
                        <button
                            onClick={() => handleTabChange('post')}
                            className={`flex-1 py-3 px-4 text-center font-semibold transition-colors ${
                                activeTab === 'post'
                                    ? 'bg-orange-500 text-white'
                                    : isDarkMode 
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Create Post
                        </button>
                        <button
                            onClick={() => handleTabChange('event')}
                            className={`flex-1 py-3 px-4 text-center font-semibold transition-colors ${
                                activeTab === 'event'
                                    ? 'bg-orange-500 text-white'
                                    : isDarkMode 
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                        >
                            Create Event
                        </button>
                    </div>
                    
                    <div className="rounded-lg p-6" style={{
                        backgroundColor: isDarkMode ? '#171717' : '#f8f9fa',
                        border: isDarkMode ? 'none' : '1px solid #e5e7eb'
                    }}>
                        {activeTab === 'post' ? (
                            /* Post Creation Form with Image Upload */
                            <form onSubmit={handlePostSubmit} className="space-y-4">
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="What's on your mind?"
                                    maxLength={280}
                                    disabled={isSubmittingPost}
                                    className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none h-32"
                                />
                                
                                {/* Image Upload Section */}
                                <div className="space-y-3">
                                    {/* Image Upload Button */}
                                    <div className="flex items-center space-x-3">
                                        <label 
                                            htmlFor="image-upload"
                                            className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg cursor-pointer transition-colors"
                                        >
                                            <ImageIcon className="w-5 h-5" />
                                            <span>Add Photos</span>
                                        </label>
                                        <input
                                            id="image-upload"
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleImageSelect}
                                            className="hidden"
                                            disabled={isSubmittingPost || uploadingImages}
                                        />
                                        <span className="text-gray-400 text-sm">
                                            {selectedImages.length}/4 images
                                        </span>
                                    </div>

                                    {/* Image Previews */}
                                    {imagePreviewUrls.length > 0 && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {imagePreviewUrls.map((url, index) => (
                                                <div key={index} className="relative group">
                                                    <img 
                                                        src={url} 
                                                        alt={`Preview ${index + 1}`}
                                                        className="w-full h-32 object-cover rounded-lg border border-gray-600"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index)}
                                                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm ${content.length > 260 ? 'text-red-400' : 'text-gray-400'}`}>
                                        {content.length}/280
                                    </span>
                                    
                                    <button 
                                        type="submit" 
                                        disabled={
                                            isSubmittingPost || 
                                            uploadingImages || 
                                            (!content.trim() && selectedImages.length === 0)
                                        }
                                        className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                                    >
                                        {isSubmittingPost ? 'Posting...' : 
                                         uploadingImages ? 'Uploading...' : 'Create Post'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            /* Event Creation Form (unchanged) */
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
                                        className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
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