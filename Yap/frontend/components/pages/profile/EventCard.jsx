import { useState } from 'react';
import { Calendar, MapPin, Users, Clock, ExternalLink } from 'lucide-react';

const EventCard = ({ event, onEventClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getEventIcon = (index) => {
    const icons = ['🎉', '🎵', '🎨', '🏃', '🍕', '📚', '🎬', '🎪', '🎯', '🎮'];
    return icons[index % icons.length];
  };

  const getTimeStatus = (eventDateTime) => {
    const now = new Date();
    const eventDate = new Date(eventDateTime);
    const diffTime = eventDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'past', text: 'Past Event', color: 'text-gray-500' };
    } else if (diffDays === 0) {
      return { status: 'today', text: 'Today', color: 'text-green-400' };
    } else if (diffDays === 1) {
      return { status: 'tomorrow', text: 'Tomorrow', color: 'text-blue-400' };
    } else if (diffDays <= 7) {
      return { status: 'upcoming', text: `${diffDays} days`, color: 'text-yellow-400' };
    } else {
      return { status: 'future', text: `${diffDays} days`, color: 'text-gray-400' };
    }
  };

  const dateTime = formatDateTime(event.event_datetime);
  const timeStatus = getTimeStatus(event.event_datetime);

  return (
    <div
      className={`rounded-lg p-4 cursor-pointer transition-all duration-200 ${
        isHovered ? 'transform scale-105 shadow-lg' : 'shadow-md'
      }`}
      style={{ backgroundColor: '#1a1a1a' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onEventClick(event)}
    >
      <div className="flex items-start space-x-3">
        {/* Event Icon */}
        <div className="text-2xl flex-shrink-0">
          {getEventIcon(0)}
        </div>

        {/* Event Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h4 className="text-white font-semibold text-sm line-clamp-2">
              {event.title}
            </h4>
            <span className={`text-xs font-medium ${timeStatus.color} flex-shrink-0 ml-2`}>
              {timeStatus.text}
            </span>
          </div>

          {event.description && (
            <p className="text-gray-400 text-xs line-clamp-2 mb-3">
              {event.description}
            </p>
          )}

          {/* Event Details */}
          <div className="space-y-1">
            <div className="flex items-center text-gray-400 text-xs">
              <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
              <span>{dateTime.date}</span>
              <Clock className="w-3 h-3 ml-2 mr-1 flex-shrink-0" />
              <span>{dateTime.time}</span>
            </div>

            {event.location && (
              <div className="flex items-center text-gray-400 text-xs">
                <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            )}

            <div className="flex items-center text-gray-400 text-xs">
              <Users className="w-3 h-3 mr-1 flex-shrink-0" />
              <span>{event.attendees_count || 0} attending</span>
              {event.max_attendees && (
                <span className="text-gray-500 ml-1">/ {event.max_attendees}</span>
              )}
            </div>
          </div>
        </div>

        {/* External Link Icon */}
        <div className="flex-shrink-0">
          <ExternalLink className="w-4 h-4 text-gray-500" />
        </div>
      </div>
    </div>
  );
};

export default EventCard; 