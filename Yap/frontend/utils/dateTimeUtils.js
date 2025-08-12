/**
 * Utility functions for consistent datetime formatting across the application
 * Handles timezone issues when displaying event dates and times
 */

/**
 * Parse a datetime string and force it to be interpreted as local time
 * NO timezone conversion - displays exactly what was entered
 */
const parseAsLocalTime = (dateString) => {
  if (!dateString) return null;
  
  // Extract date and time components manually to avoid any timezone issues
  let year, month, day, hour, minute;
  
  if (typeof dateString === 'string') {
    // Handle ISO format: "2024-01-15T04:18:00.000Z" or "2024-01-15T04:18:00"
    const isoMatch = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (isoMatch) {
      [, year, month, day, hour, minute] = isoMatch;
      year = parseInt(year);
      month = parseInt(month) - 1; // JavaScript months are 0-indexed
      day = parseInt(day);
      hour = parseInt(hour);
      minute = parseInt(minute);
      
      // Force local interpretation - create date as if these numbers are local time
      return new Date(year, month, day, hour, minute);
    }
    
    // Handle other formats
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      // Extract components and recreate as local time
      const utcYear = date.getUTCFullYear();
      const utcMonth = date.getUTCMonth();
      const utcDay = date.getUTCDate();
      const utcHour = date.getUTCHours();
      const utcMinute = date.getUTCMinutes();
      
      // Create new date treating UTC components as local
      return new Date(utcYear, utcMonth, utcDay, utcHour, utcMinute);
    }
  }
  
  return new Date(dateString);
};

/**
 * Format a datetime string as a local date - NO timezone conversion
 */
export const formatEventDate = (dateString) => {
  try {
    const date = parseAsLocalTime(dateString);
    if (!date || isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (e) {
    console.error('Error formatting event date:', e);
    return 'Invalid Date';
  }
};

/**
 * Format a datetime string as a local time - NO timezone conversion
 */
export const formatEventTime = (dateString) => {
  try {
    const date = parseAsLocalTime(dateString);
    if (!date || isNaN(date.getTime())) {
      return 'Invalid Time';
    }
    
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } catch (e) {
    console.error('Error formatting event time:', e);
    return 'Invalid Time';
  }
};

/**
 * Format a datetime string as both date and time - NO timezone conversion
 */
export const formatEventDateTime = (dateString) => {
  try {
    const date = parseAsLocalTime(dateString);
    if (!date || isNaN(date.getTime())) {
      return {
        date: 'Invalid Date',
        time: 'Invalid Time'
      };
    }
    
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true
      })
    };
  } catch (e) {
    console.error('Error formatting event datetime:', e);
    return {
      date: 'Invalid Date',
      time: 'Invalid Time'
    };
  }
};

/**
 * Format a datetime string as a full date (with year) - NO timezone conversion
 */
export const formatEventDateLong = (dateString) => {
  try {
    const date = parseAsLocalTime(dateString);
    if (!date || isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    console.error('Error formatting event date long:', e);
    return 'Invalid Date';
  }
};