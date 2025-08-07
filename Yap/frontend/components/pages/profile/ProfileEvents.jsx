import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import EventCard from './EventCard';
import EventModal from '../home/events/EventModal';
import { Calendar, Users, Loader2 } from 'lucide-react';
import { API_BASE_URL } from '../../../services/config';
import { useTheme } from '../../../contexts/ThemeContext'; // Add this import

const ProfileEvents = ({ userId, isOwnProfile }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const { isDarkMode } = useTheme(); // Add this hook

  // Get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

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

  // Fetch user's attending events
  const fetchUserEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      let url;
      if (isOwnProfile) {
        // For own profile, use the authenticated endpoint
        url = `${API_BASE_URL}/events/attending?limit=10&include_past=true`;
      } else {
        // For other users, use the public endpoint
        url = `${API_BASE_URL}/events/user/${userId}/attending?limit=10&include_past=true`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching user events:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch events on component mount
  useEffect(() => {
    if (userId || isOwnProfile) {
      fetchUserEvents();
    }
  }, [userId, isOwnProfile]);

  // Handle event card click
  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  // Refresh events (for when user attends/unattends events)
  const refreshEvents = () => {
    fetchUserEvents();
  };

  const cardBgColor = isDarkMode ? '#171717' : '#ffffff';

  if (loading) {
    return (
      <>
        {/* Header outside the container */}
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold flex items-center ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <Calendar className="w-5 h-5 mr-2" />
            Events
          </h3>
        </div>
        
        {/* Content container */}
        <div 
          className={`rounded-lg p-6 mb-6 ${isDarkMode ? '' : 'border border-gray-200'}`}
          style={{ backgroundColor: cardBgColor }}
        >
          <div className="flex justify-center items-center py-8">
            <div className={`flex items-center space-x-2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading events...</span>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        {/* Header outside the container */}
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-xl font-bold flex items-center ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <Calendar className="w-5 h-5 mr-2" />
            Events
          </h3>
        </div>
        
        {/* Content container */}
        <div 
          className={`rounded-lg p-6 mb-6 ${isDarkMode ? '' : 'border border-gray-200'}`}
          style={{ backgroundColor: cardBgColor }}
        >
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">Error: {error}</p>
            <button 
              onClick={fetchUserEvents}
              className={`px-4 py-2 rounded-lg font-bold transition-colors ${
                isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header outside the container */}
      <div className="flex items-center justify-between mb-6">
        <h3 className={`text-xl font-bold flex items-center ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          <Calendar className="w-5 h-5 mr-2" />
          Events {events.length > 0 && `(${events.length})`}
        </h3>
        {events.length > 0 && (
          <button 
            onClick={refreshEvents}
            className={`text-sm font-medium transition-colors ${
              isDarkMode 
                ? 'text-blue-400 hover:text-blue-300' 
                : 'text-blue-600 hover:text-blue-500'
            }`}
          >
            Refresh
          </button>
        )}
      </div>

      {/* Content container */}
      <div 
        className={`rounded-lg p-6 mb-6 ${isDarkMode ? '' : 'border border-gray-200'}`}
        style={{ backgroundColor: cardBgColor }}
      >
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <EventCard 
                key={event._id} 
                event={event} 
                onEventClick={handleEventClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className={`mb-2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            </div>
            <p className={`${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {isOwnProfile 
                ? "You haven't signed up for any events yet." 
                : `${userId ? 'This user' : 'They'} haven't signed up for any events yet.`
              }
            </p>
            {isOwnProfile && (
              <p className={`text-sm mt-2 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Check out the Events section on the home page to discover events!
              </p>
            )}
          </div>
        )}
      </div>

      {/* Event Modal */}
      {isModalOpen && selectedEvent && createPortal(
        <div 
          className="fixed inset-0 backdrop-blur-sm transition-all duration-300"
          style={{ 
            backgroundColor: isDarkMode 
              ? 'rgba(18, 18, 18, 0.85)' 
              : 'rgba(0, 0, 0, 0.5)', 
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
};

export default ProfileEvents;