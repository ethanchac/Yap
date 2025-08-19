import React, { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, Heart, Share2, UserPlus, Map, MessageCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../../../services/config';
import { formatEventDateTime } from '../../../../utils/dateTimeUtils';

const EventModal = ({ event, isOpen, onClose, currentUser }) => {
  const [eventDetails, setEventDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAttending, setIsAttending] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [attendingFriends, setAttendingFriends] = useState([]);
  const [totalAttendees, setTotalAttendees] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [actionLoading, setActionLoading] = useState({ like: false, attend: false });
  const [isPastEvent, setIsPastEvent] = useState(false);
  
  const navigate = useNavigate();

  // Check if event is in the past
  const checkIfEventPast = (eventDateTime) => {
    if (!eventDateTime) return false;
    
    const eventDate = new Date(eventDateTime);
    const now = new Date();
    
    return eventDate <= now;
  };

  const fetchEventDetails = async () => {
    if (!event || !isOpen || !currentUser) return;
    
    setLoading(true);
    try {
      // Check if event is past
      const pastCheck = checkIfEventPast(event.event_datetime);
      setIsPastEvent(pastCheck);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/events/${event._id}/details`, {
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
      const response = await fetch(`${API_BASE_URL}/events/${event._id}/attend-status`, {
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
      const response = await fetch(`${API_BASE_URL}/events/${event._id}/like-status`, {
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
      const response = await fetch(`${API_BASE_URL}/events/${event._id}/details`, {
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
    if (actionLoading.attend || isPastEvent) return;
    
    setActionLoading(prev => ({ ...prev, attend: true }));
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/events/${event._id}/attend`, {
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
      const response = await fetch(`${API_BASE_URL}/events/${event._id}/like`, {
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

  const handleViewOnMap = () => {
      const coordinates = getEventCoordinates();
      
      if (!coordinates) {
          alert('Location coordinates not available for this event');
          return;
      }

      // Store event data in sessionStorage to pass to waypoint map
      const eventMapData = {
          eventId: event._id,
          title: event.title.trim(), // Make sure title is clean
          description: event.description,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          eventDate: event.event_date || event.event_datetime?.split('T')[0],
          eventTime: event.event_time || event.event_datetime?.split('T')[1]?.substring(0, 5),
          location: event.location,
          navigateToEvent: true,
          // Add some debug info
          debug: {
              originalTitle: event.title,
              cleanTitle: event.title.trim(),
              coordinates: coordinates
          }
      };
      
      console.log('Storing event map data:', eventMapData);
      sessionStorage.setItem('navigateToEvent', JSON.stringify(eventMapData));
      
      // Close modal and navigate to waypoint map
      onClose();
      navigate('/waypoint');
  };

  const getProfilePictureUrl = (profilePicture) => {
    if (profilePicture?.trim()) {
      return profilePicture.startsWith('http')
        ? profilePicture
        : `${API_BASE_URL}/uploads/profile_pictures/${profilePicture}`;
    }
    return "data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='50' r='50' fill='%23e0e0e0'/%3E%3Ccircle cx='50' cy='35' r='15' fill='%23bdbdbd'/%3E%3Cellipse cx='50' cy='85' rx='25' ry='20' fill='%23bdbdbd'/%3E%3C/svg%3E";
  };


  const getEventIcon = (index) => {
    const icons = ['🎉', '🎵', '🎨', '🏃', '🍕', '📚', '🎬', '🎪', '🎯', '🎮'];
    return icons[index % icons.length];
  };

  // Check if event has location coordinates - UPDATED FUNCTION
  const hasLocationCoordinates = () => {
    const currentEvent = eventDetails || event;
    
    console.log('Checking coordinates for event:', currentEvent);
    
    // Check for direct latitude/longitude properties (primary method now)
    if (currentEvent.latitude !== null && currentEvent.latitude !== undefined && 
        currentEvent.longitude !== null && currentEvent.longitude !== undefined) {
      console.log('Found direct lat/lng:', currentEvent.latitude, currentEvent.longitude);
      return true;
    }
    
    // Check for alternative lat/lng properties (fallback)
    if (currentEvent.lat && currentEvent.lng) {
      console.log('Found alt lat/lng:', currentEvent.lat, currentEvent.lng);
      return true;
    }
    
    // Check if location string contains coordinates (lat, lng format) - legacy fallback
    if (currentEvent.location && typeof currentEvent.location === 'string') {
      const coordMatch = currentEvent.location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
      if (coordMatch) {
        console.log('Found coordinates in location string:', coordMatch[1], coordMatch[2]);
        return true;
      }
    }
    
    console.log('No coordinates found');
    return false;
  };

  // Get coordinates from various possible formats - UPDATED FUNCTION
  const getEventCoordinates = () => {
    const currentEvent = eventDetails || event;
    
    console.log('Getting coordinates from event:', currentEvent);
    
    // Direct latitude/longitude properties (primary method now)
    if (currentEvent.latitude !== null && currentEvent.latitude !== undefined && 
        currentEvent.longitude !== null && currentEvent.longitude !== undefined) {
      const coords = { lat: parseFloat(currentEvent.latitude), lng: parseFloat(currentEvent.longitude) };
      console.log('Returning direct coordinates:', coords);
      return coords;
    }
    
    // Alternative lat/lng properties (fallback)
    if (currentEvent.lat && currentEvent.lng) {
      const coords = { lat: parseFloat(currentEvent.lat), lng: parseFloat(currentEvent.lng) };
      console.log('Returning alt coordinates:', coords);
      return coords;
    }
    
    // Parse from location string if it contains coordinates (legacy fallback)
    if (currentEvent.location && typeof currentEvent.location === 'string') {
      const coordMatch = currentEvent.location.match(/(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
      if (coordMatch) {
        const coords = { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
        console.log('Returning parsed coordinates:', coords);
        return coords;
      }
    }
    
    console.log('No coordinates could be extracted');
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
      setIsPastEvent(false);
      
      // Fetch new data
      fetchEventDetails();
    }
  }, [isOpen, event?._id]);

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

  const dateTime = formatEventDateTime(event.event_datetime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center space-x-3">
            <div className="text-4xl">{getEventIcon(0)}</div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
                {isPastEvent && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                    <Clock className="w-3 h-3 mr-1" />
                    Past Event
                  </span>
                )}
              </div>
              <p className="text-gray-600">Hosted by @{event.host_username || event.username || 'Unknown'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <p className={`font-semibold ${isPastEvent ? 'text-gray-500' : 'text-gray-900'}`}>
                      {dateTime.date}
                    </p>
                    <p className={`${isPastEvent ? 'text-gray-400' : 'text-gray-600'}`}>
                      {dateTime.time}
                    </p>
                  </div>
                </div>

                {event.location && (
                  <div className="flex items-start space-x-3">
                    <MapPin className="w-5 h-5 text-gray-500 mt-1" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Location</p>
                      <div className="flex items-center justify-between">
                        <p className="text-gray-600">{event.location}</p>
                        {hasLocationCoordinates() && (
                          <button
                            onClick={handleViewOnMap}
                            className="flex items-center space-x-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            <Map className="w-4 h-4" />
                            <span>View on Map</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start space-x-3">
                  <Users className="w-5 h-5 text-gray-500 mt-1" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      {totalAttendees} {totalAttendees === 1 ? 'person' : 'people'} {isPastEvent ? 'attended' : 'attending'}
                    </p>
                  </div>
                </div>
              </div>

              {event.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">About this event</h3>
                  <p className="text-gray-700 leading-relaxed">{event.description}</p>
                </div>
              )}

              {attendingFriends.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Friends {isPastEvent ? 'who attended' : 'attending'} ({attendingFriends.length})
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {attendingFriends.slice(0, 8).map((friend) => (
                      <div key={friend._id} className="flex items-center space-x-2 bg-gray-50 rounded-full pr-3 py-1">
                        <img
                          src={getProfilePictureUrl(friend.profile_picture)}
                          alt={friend.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {friend.full_name || friend.username}
                        </span>
                      </div>
                    ))}
                    {attendingFriends.length > 8 && (
                      <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded-full">
                        <span className="text-xs font-medium text-gray-600">
                          +{attendingFriends.length - 8}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons - only show if user is logged in */}
              {currentUser && (
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  {/* Main action button - Join/Attending (disabled for past events) */}
                  {!isPastEvent ? (
                    <button
                      onClick={toggleAttendance}
                      disabled={actionLoading.attend}
                      className={`w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                        isAttending
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {actionLoading.attend ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <UserPlus className="w-5 h-5" />
                      )}
                      <span>
                        {isAttending 
                          ? 'Attending' 
                          : 'Join Event'
                        }
                      </span>
                    </button>
                  ) : (
                    <div className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gray-100 text-gray-500 rounded-lg font-semibold">
                      <Clock className="w-5 h-5" />
                      <span>Event has ended</span>
                    </div>
                  )}

                  {/* If already attending, show thread access button */}
                  {isAttending && (
                    <button
                      onClick={handleViewThread}
                      className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-lg font-medium transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>View Event Discussion</span>
                    </button>
                  )}

                  {/* Secondary action buttons */}
                  <div className="flex space-x-3">
                    <button
                      onClick={toggleLike}
                      disabled={actionLoading.like}
                      className={`flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 ${
                        isLiked
                          ? 'bg-red-100 text-red-600 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {actionLoading.like ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                      )}
                      <span>{likesCount}</span>
                    </button>

                    <button className="flex items-center justify-center space-x-2 py-3 px-4 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-semibold transition-colors">
                      <Share2 className="w-5 h-5" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{totalAttendees}</p>
                    <p className="text-sm text-gray-600">{isPastEvent ? 'Attended' : 'Attending'}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{likesCount}</p>
                    <p className="text-sm text-gray-600">Likes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{attendingFriends.length}</p>
                    <p className="text-sm text-gray-600">Friends</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal;