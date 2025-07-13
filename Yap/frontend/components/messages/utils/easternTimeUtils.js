// utils/easternTimeUtils.js - Clean version without debug logs

/**
 * Format timestamp to Eastern Time
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} - Formatted time string in Eastern Time
 */
export const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            return '';
        }
        
        // Force format in Eastern Time
        const easternTime = date.toLocaleTimeString('en-US', {
            timeZone: 'America/New_York',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        
        return easternTime;
    } catch (error) {
        return '';
    }
};

/**
 * Format date separator in Eastern Time
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} - Formatted date string
 */
export const formatDateSeparator = (timestamp) => {
    if (!timestamp) return '';
    
    try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        
        // Get today's date in Eastern Time
        const today = new Date();
        const todayEastern = today.toLocaleDateString('en-US', {
            timeZone: 'America/New_York'
        });
        
        // Get message date in Eastern Time
        const messageDateEastern = date.toLocaleDateString('en-US', {
            timeZone: 'America/New_York'
        });
        
        // Get yesterday in Eastern Time
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayEastern = yesterday.toLocaleDateString('en-US', {
            timeZone: 'America/New_York'
        });

        if (messageDateEastern === todayEastern) {
            return 'Today';
        } else if (messageDateEastern === yesterdayEastern) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', {
                timeZone: 'America/New_York',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
    } catch (error) {
        return '';
    }
};

/**
 * Check if date separator should be shown
 * @param {Object} currentMessage - Current message object
 * @param {Object} previousMessage - Previous message object
 * @returns {boolean} - Whether to show date separator
 */
export const shouldShowDateSeparator = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    
    try {
        const currentDate = new Date(currentMessage.created_at);
        const previousDate = new Date(previousMessage.created_at);
        
        // Compare dates in Eastern timezone
        const currentEastern = currentDate.toLocaleDateString('en-US', {
            timeZone: 'America/New_York'
        });
        const previousEastern = previousDate.toLocaleDateString('en-US', {
            timeZone: 'America/New_York'
        });
        
        return currentEastern !== previousEastern;
    } catch (error) {
        return false;
    }
};

/**
 * Sort messages by timestamp
 * @param {Array} messages - Array of message objects
 * @returns {Array} - Sorted messages (oldest first for chat display)
 */
export const sortMessagesByTime = (messages) => {
    if (!messages || !Array.isArray(messages)) return [];
    
    return [...messages].sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
        
        // Sort in ascending order (oldest first for chat)
        return dateA - dateB;
    });
};

/**
 * Format conversation time (for conversation list)
 * @param {string|Date} timestamp - Timestamp to format
 * @returns {string} - Formatted time string
 */
export const formatConversationTime = (timestamp) => {
    if (!timestamp) return 'Invalid date';
    
    try {
        const messageDate = new Date(timestamp);
        if (isNaN(messageDate.getTime())) return 'Invalid date';
        
        // Get current time and message time both in Eastern timezone
        const now = new Date();
        const nowEastern = new Date(now.toLocaleString('en-US', {timeZone: 'America/New_York'}));
        const messageEastern = new Date(messageDate.toLocaleString('en-US', {timeZone: 'America/New_York'}));
        
        // Calculate difference using Eastern times
        const diff = nowEastern - messageEastern;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        
        return messageDate.toLocaleDateString('en-US', {
            timeZone: 'America/New_York',
            month: 'short',
            day: 'numeric'
        });
    } catch (error) {
        return 'Invalid date';
    }
};

/**
 * Sort conversations by timestamp
 * @param {Array} conversations - Array of conversation objects
 * @returns {Array} - Sorted conversations (newest first)
 */
export const sortConversationsByTime = (conversations) => {
    if (!conversations || !Array.isArray(conversations)) return [];
    
    return [...conversations].sort((a, b) => {
        const timeA = a.last_message_at || a.created_at;
        const timeB = b.last_message_at || b.created_at;
        
        const dateA = new Date(timeA);
        const dateB = new Date(timeB);
        
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
        
        // Sort in descending order (newest first)
        return dateB - dateA;
    });
};