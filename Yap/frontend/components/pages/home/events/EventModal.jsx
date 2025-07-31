import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, Heart, Share2, UserPlus, Map, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Assuming you're using React Router

const EventModal = ({ event, isOpen, onClose, currentUser }) => {
  const [eventDetails, setEventDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAttending, setIsAttending] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [attendingFriends, setAttendingFriends] = useState([]);
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [actionLoading, setActionLoading] = useState({ like: false, attend: false });
  const [shareMessage, setShareMessage] = useState('');
  
  const navigate = useNavigate(); // For navigation to waypoint map and thread

  const handleShareEvent = () => {
    const eventLink = `${window.location.origin}/events/${event._id}`;
    navigator.clipboard.writeText(eventLink)
      .then(() => {
        setShareMessage('Event link copied to clipboard!');
        setTimeout(() => setShareMessage(''), 3000);
      })
      .catch(() => {
        setShareMessage('Failed to copy event link.');
        setTimeout(() => setShareMessage(''), 3000);
      });
  };

  const fetchEventDetails = async () => {
    if (!event || !isOpen || !currentUser) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/events/${event._id}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setEventDetails(data.event);
        setIsAttending(data.is_attending || false);
        setIsLiked(data.is_liked || false);
        setAttendingFriends(data.attending_friends || []);
        setTotalAttendees(data.total_attendees || event.attendees_count || 0);
        setLikesCount(data.event?.likes_count || event.likes_count || 0);
      } else {
        // Fallback to basic event data if details endpoint fails
        setEventDetails(event);
        setTotalAttendees(event.attendees_count || 0);
        setLikesCount(event.likes_count || 0);
        
        // Fetch attendance and like status separately
        await Promise.all([
          fetchAttendanceStatus(),
          fetchLikeStatus()
        ]);
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      // Fallback to basic event data
      setEventDetails(event);
      setTotalAttendees(event.attendees_count || 0);
      setLikesCount(event.likes_count || 0);
      
      // Try to fetch attendance and like status separately
      await Promise.all([
        fetchAttendanceStatus(),
        fetchLikeStatus()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/events/${event._id}/attend-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIsAttending(data.attending || false);
      }
    } catch (error) {
      console.error('Error fetching attendance status:', error);
    }
  };

  const fetchLikeStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/events/${event._id}/like-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.liked || false);
      }
    } catch (error) {
      console.error('Error fetching like status:', error);
    }
  };

  const refreshFriendsAttending = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/events/${event._id}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAttendingFriends(data.attending_friends || []);
      }
    } catch (error) {
      console.error('Error refreshing friends attending:', error);
    }
  };

  const toggleAttendance = async () => {
    if (actionLoading.attend) return;
    
    setActionLoading(prev => ({ ...prev, attend: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/events/${event._id}/attend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsAttending(data.attending);
        setTotalAttendees(prev => data.attending ? prev + 1 : Math.max(0, prev - 1));
        
        // Refresh friends attending list since attendance changed
        await refreshFriendsAttending();

        // If user just joined the event, navigate to the thread
        if (data.attending) {
          // Close modal first
          onClose();
          // Navigate to the event thread
          navigate(`/events/${event._id}/thread`);
        }
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update attendance');
      }
    } catch (error) {
      console.error('Error toggling attendance:', error);
      alert('Network error. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, attend: false }));
    }
  };

  const toggleLike = async () => {
    if (actionLoading.like) return;
    
    setActionLoading(prev => ({ ...prev, like: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/events/${event._id}/like`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setIsLiked(data.liked);
        setLikesCount(prev => data.liked ? prev + 1 : Math.max(0, prev - 1));
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to update like');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Network error. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, like: false }));
    }
  };

  // Handle viewing event thread (for users already attending)
  const handleViewThread = () => {
    onClose();
    navigate(`/events/${event._id}/thread`);
  };

  // Handle viewing event on waypoint map
  const handleViewOnMap = () => {
    const coordinates = getEventCoordinates();
    
    if (!coordinates) {
      alert('Location coordinates not available for this event');
      return;
    }

    // Store event data in sessionStorage to pass to waypoint map
    const eventMapData = {
      eventId: event._id,
      title: event.title,
      description: event.description,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      eventDate: event.event_date || event.event_datetime?.split('T')[0],
      eventTime: event.event_time || event.event_datetime?.split('T')[1]?.substring(0, 5),
      location: event.location,
      navigateToEvent: true
    };
    
    sessionStorage.setItem('navigateToEvent', JSON.stringify(eventMapData));
    
    // Close modal and navigate to waypoint map
    onClose();
    navigate('/waypoint'); // Adjust the route as needed for your app
  };

  const getProfilePictureUrl = (profilePicture) => {
    if (profilePicture?.trim()) {
      return profilePicture.startsWith('http')
        ? profilePicture
        : `http://localhost:5000/uploads/profile_pictures/${profilePicture}`;
    }
    return "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ccircle cx='50' cy='35' r='15' fill='%23bdbdbd'/%3E%3Cellipse cx='50' cy='85' rx='25' ry='20' fill='%23bdbdbd'/%3E%3C/svg%3E";
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true
      })
    };
  };

  const getEventIcon = (index) => {
    const icons = ['🎉', '🎵', '🎨', '🏃', '🍕', '📚', '🎬', '🎪', '🎯', '🎮'];
    return icons[index % icons.length];
  };

  // Check if event has location coordinates
  const hasLocationCoordinates = () => {
    // Check both the event object and eventDetails for coordinates
    const currentEvent = eventDetails || event;
    return (currentEvent.latitude && currentEvent.longitude) || 
           (currentEvent.lat && currentEvent.lng) ||
           (currentEvent.location && currentEvent.location.includes(',') && currentEvent.location.includes('.'));
  };

  // Get coordinates from various possible formats
  const getEventCoordinates = () => {
    const currentEvent = eventDetails || event;
    
    // Direct latitude/longitude properties
    if (currentEvent.latitude && currentEvent.longitude) {
      return { lat: currentEvent.latitude, lng: currentEvent.longitude };
    }
    
    // Alternative lat/lng properties
    if (currentEvent.lat && currentEvent.lng) {
      return { lat: currentEvent.lat, lng: currentEvent.lng };
    }
    
    // Parse from location string if it contains coordinates
    if (currentEvent.location && typeof currentEvent.location === 'string') {
      const coordMatch = currentEvent.location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
      if (coordMatch) {
        return { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
      }
    }
    
    return null;
  };

  // Reset state when modal opens with a new event
  useEffect(() => {
    if (isOpen && event) {
      // Reset state for new event
      setEventDetails(null);
      setIsAttending(false);
      setIsLiked(false);
      setAttendingFriends([]);
      setTotalAttendees(0);
      setLikesCount(0);
      setActionLoading({ like: false, attend: false });
      
      // Fetch new data
      fetchEventDetails();
    }
  }, [isOpen, event?._id]); // Include event._id as dependency

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const dateTime = formatDateTime(event.event_datetime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl relative border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative z-10 bg-white border-b border-gray-100 p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="text-5xl">{getEventIcon(0)}</div>
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-1">
                  {event.title}
                </h2>
                <p className="text-gray-600 font-medium flex items-center gap-2">
                  <span className="inline-block w-2 h-2 bg-orange-500 rounded-full"></span>
                  Hosted by @{event.host_username || event.username || 'Unknown'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 hover:bg-gray-50 rounded-full transition-all duration-200 hover:scale-105 group"
            >
              <X className="w-6 h-6 text-gray-500 group-hover:text-gray-700 transition-colors" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-orange-500"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Event Details Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group bg-white rounded-xl p-6 border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-lg">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-orange-500 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">When</p>
                      <p className="font-bold text-gray-900 text-lg">{dateTime.date}</p>
                      <p className="text-orange-600 font-semibold">{dateTime.time}</p>
                    </div>
                  </div>
                </div>

                {event.location && (
                  <div className="group bg-white rounded-xl p-6 border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-lg">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-orange-600 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-500 mb-1">Where</p>
                        <p className="font-bold text-gray-900 mb-2">{event.location}</p>
                        {hasLocationCoordinates() && (
                          <button
                            onClick={handleViewOnMap}
                            className="inline-flex items-center space-x-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-sm"
                          >
                            <Map className="w-4 h-4" />
                            <span>View on Map</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="group bg-white rounded-xl p-6 border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-lg">
                  <div className="flex items-start space-x-4">
                    <div className="p-3 bg-orange-400 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 mb-1">Attendees</p>
                      <p className="font-bold text-gray-900 text-lg">
                        {totalAttendees} {totalAttendees === 1 ? 'person' : 'people'}
                      </p>
                      <p className="text-orange-600 font-semibold">joining</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Description */}
              {event.description && (
                <div className="bg-white rounded-xl p-8 border border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    About this event
                  </h3>
                  <p className="text-gray-700 leading-relaxed text-lg">{event.description}</p>
                </div>
              )}

              {/* Friends Attending */}
              {attendingFriends.length > 0 && (
                <div className="bg-white rounded-xl p-8 border border-gray-100">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                    <div className="p-2 bg-orange-600 rounded-lg">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    Friends attending ({attendingFriends.length})
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    {attendingFriends.slice(0, 8).map((friend) => (
                      <div key={friend._id} className="group flex items-center space-x-3 bg-gray-50 rounded-xl pr-4 py-2 border border-gray-100 hover:border-gray-200 transition-all duration-200 hover:shadow-sm">
                        <img
                          src={getProfilePictureUrl(friend.profile_picture)}
                          alt={friend.username}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 shadow-sm group-hover:scale-105 transition-transform duration-200"
                        />
                        <span className="font-semibold text-gray-900">
                          {friend.full_name || friend.username}
                        </span>
                      </div>
                    ))}
                    {attendingFriends.length > 8 && (
                      <div className="flex items-center justify-center w-12 h-12 bg-orange-500 rounded-full shadow-sm">
                        <span className="text-sm font-bold text-white">
                          +{attendingFriends.length - 8}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons - only show if user is logged in */}
              {currentUser && (
                <div className="space-y-4">
                  {/* Main action button - Join/Attending */}
                  <button
                    onClick={toggleAttendance}
                    disabled={actionLoading.attend}
                    className={`w-full flex items-center justify-center space-x-3 py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 ${
                      isAttending
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-orange-600 hover:bg-orange-700 text-white'
                    }`}
                  >
                    {actionLoading.attend ? (
                      <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UserPlus className="w-6 h-6" />
                    )}
                    <span>
                      {isAttending 
                        ? '✓ You\'re Attending!' 
                        : 'Join This Event'
                      }
                    </span>
                  </button>

                  {/* If already attending, show thread access button */}
                  {isAttending && (
                    <button
                      onClick={handleViewThread}
                      className="w-full flex items-center justify-center space-x-3 py-3 px-6 bg-orange-400 hover:bg-orange-500 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>Join Event Discussion</span>
                    </button>
                  )}

                  {/* Secondary action buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={toggleLike}
                      disabled={actionLoading.like}
                      className={`flex items-center justify-center space-x-3 py-4 px-6 rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 disabled:opacity-50 ${
                        isLiked
                          ? 'bg-red-500 hover:bg-red-600 text-white'
                          : 'bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200'
                      }`}
                    >
                      {actionLoading.like ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : 'text-orange-500'}`} />
                      )}
                      <span>{likesCount} Likes</span>
                    </button>

                    <button 
                      onClick={handleShareEvent}
                      className="flex items-center justify-center space-x-3 py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                    >
                      <Share2 className="w-5 h-5" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Share Message */}
              {shareMessage && (
                <div className="text-center p-4 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl shadow-sm animate-fade-in">
                  {shareMessage}
                </div>
              )}

              {/* Stats Section */}
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div className="group">
                    <div className="p-4 bg-orange-500 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200 mx-auto w-fit mb-3">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{totalAttendees}</p>
                    <p className="text-sm font-medium text-gray-600">Attending</p>
                  </div>
                  <div className="group">
                    <div className="p-4 bg-red-500 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200 mx-auto w-fit mb-3">
                      <Heart className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{likesCount}</p>
                    <p className="text-sm font-medium text-gray-600">Likes</p>
                  </div>
                  <div className="group">
                    <div className="p-4 bg-orange-400 rounded-xl shadow-sm group-hover:scale-105 transition-transform duration-200 mx-auto w-fit mb-3">
                      <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-1">{attendingFriends.length}</p>
                    <p className="text-sm font-medium text-gray-600">Friends</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal;