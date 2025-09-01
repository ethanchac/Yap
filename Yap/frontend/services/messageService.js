// services/messageService.js
import { io } from 'socket.io-client';

// Import the shared config instead of duplicating logic
import { API_BASE_URL, SOCKET_URL } from './config.js';

const API_URL = API_BASE_URL;
const SOCKET_URL_VAR = SOCKET_URL;

class MessageService {
    constructor() {
        this.socket = null;
        this.connectionListeners = new Set();
        this.messageListeners = new Map();
        this.typingListeners = new Map();
        this.connectionStatus = 'disconnected';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.currentConversation = null;
        this.token = null;
        this.connectionPromise = null;
    }

    // Initialize connection
    async connect() {
        // Prevent multiple simultaneous connection attempts
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        this.connectionPromise = this._doConnect();
        
        try {
            const result = await this.connectionPromise;
            return result;
        } finally {
            this.connectionPromise = null;
        }
    }

    async _doConnect() {
        try {
            this.token = localStorage.getItem('token');
            if (!this.token) {
                throw new Error('No authentication token found');
            }

            console.log('🔌 Connecting to WebSocket server...');
            
            // Disconnect existing socket if any
            if (this.socket) {
                this.socket.disconnect();
                this.socket = null;
            }
            
            // Create socket connection with auth
            this.socket = io(SOCKET_URL_VAR, {
                transports: ['websocket', 'polling'],
                auth: {
                    token: this.token
                },
                autoConnect: false, // We'll connect manually
                reconnection: false, // Handle reconnection manually
                timeout: 20000,
                forceNew: true
            });

            this.setupEventListeners();
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Connection timeout'));
                }, 15000);

                // Listen for successful connection
                this.socket.once('connect', () => {
                    console.log('✅ Socket connected, waiting for auth confirmation...');
                });

                this.socket.once('connection_status', (data) => {
                    clearTimeout(timeout);
                    console.log('📡 Received connection status:', data);
                    
                    if (data.status === 'connected') {
                        console.log('✅ Authenticated successfully');
                        this.connectionStatus = 'connected';
                        this.reconnectAttempts = 0;
                        this.notifyConnectionListeners('connected');
                        resolve(true);
                    } else {
                        reject(new Error('Authentication failed'));
                    }
                });

                this.socket.once('error', (error) => {
                    clearTimeout(timeout);
                    console.error('❌ Socket error during connection:', error);
                    reject(error);
                });

                this.socket.once('connect_error', (error) => {
                    clearTimeout(timeout);
                    console.error('❌ Connection error:', error);
                    reject(error);
                });

                // Start the connection
                this.socket.connect();
            });

        } catch (error) {
            console.error('❌ Failed to connect:', error);
            this.connectionStatus = 'failed';
            this.notifyConnectionListeners('failed');
            throw error;
        }
    }

    setupEventListeners() {
        if (!this.socket) return;

        // Connection events
        this.socket.on('connect', () => {
            console.log('✅ Socket connected (waiting for auth)');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('🔌 Socket disconnected:', reason);
            this.connectionStatus = 'disconnected';
            this.notifyConnectionListeners('disconnected');
            
            // Auto-reconnect unless it was intentional
            if (reason !== 'io client disconnect') {
                this.handleReconnection();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Connection error:', error);
            this.connectionStatus = 'failed';
            this.notifyConnectionListeners('failed');
            this.handleReconnection();
        });

        // Authentication events
        this.socket.on('connection_status', (data) => {
            console.log('📡 Connection status update:', data);
            if (data.status === 'connected') {
                this.connectionStatus = 'connected';
                this.reconnectAttempts = 0;
                this.notifyConnectionListeners('connected');
            }
        });

        // Message events
        this.socket.on('new_message', (message) => {
            console.log('📨 Received new message:', message);
            this.handleIncomingMessage(message);
        });

        this.socket.on('new_message_notification', (data) => {
            console.log('🔔 Received message notification:', data);
            this.handleIncomingMessage(data.message);
        });

        this.socket.on('message_sent', (data) => {
            console.log('✅ Message sent confirmation:', data);
        });

        this.socket.on('message_edited', (data) => {
            console.log('✏️ Message edited:', data);
        });

        // Typing events
        this.socket.on('user_typing', (data) => {
            console.log('⌨️ User typing:', data);
            this.handleTypingEvent(data);
        });

        // User status events
        this.socket.on('user_status_change', (data) => {
            console.log('👤 User status change:', data);
        });

        // Error events
        this.socket.on('error', (error) => {
            console.error('❌ Socket error:', error);
            if (error.message === 'Authentication required' || 
                error.message === 'Invalid token' ||
                error.message === 'Session not found. Please reconnect.') {
                console.log('🔄 Authentication failed, will try to reconnect...');
                this.handleReconnection();
            }
        });

        // Conversation events
        this.socket.on('joined_conversation', (data) => {
            console.log('✅ Joined conversation:', data);
        });

        this.socket.on('left_conversation', (data) => {
            console.log('👋 Left conversation:', data);
        });
    }

    handleIncomingMessage(message) {
        const conversationId = message.conversation_id;
        const listeners = this.messageListeners.get(conversationId);
        
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(message);
                } catch (error) {
                    console.error('❌ Error in message listener:', error);
                }
            });
        }
    }

    handleTypingEvent(data) {
        const conversationId = data.conversation_id;
        const listeners = this.typingListeners.get(conversationId);
        
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error('❌ Error in typing listener:', error);
                }
            });
        }
    }

    handleReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('❌ Max reconnection attempts reached');
            this.connectionStatus = 'failed';
            this.notifyConnectionListeners('failed');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
        
        console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            this.connect().catch(error => {
                console.error('❌ Reconnection failed:', error);
            });
        }, delay);
    }

    // Join a conversation room
    async joinConversation(conversationId) {
        if (!this.socket || !this.socket.connected) {
            console.warn('⚠️ Socket not connected, cannot join conversation');
            return false;
        }

        this.currentConversation = conversationId;
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.warn('⚠️ Join conversation timeout');
                resolve(false);
            }, 10000);

            this.socket.once('joined_conversation', (data) => {
                clearTimeout(timeout);
                if (data.conversation_id === conversationId) {
                    console.log('✅ Successfully joined conversation:', conversationId);
                    resolve(true);
                } else {
                    resolve(false);
                }
            });

            this.socket.once('error', (error) => {
                clearTimeout(timeout);
                console.error('❌ Error joining conversation:', error);
                resolve(false);
            });

            this.socket.emit('join_conversation', { conversation_id: conversationId });
        });
    }

    // Leave a conversation room
    leaveConversation(conversationId) {
        if (!this.socket || !this.socket.connected) {
            return;
        }

        if (conversationId) {
            this.socket.emit('leave_conversation', { conversation_id: conversationId });
        }
        
        this.currentConversation = null;
    }

    // Subscribe to messages for a conversation
    subscribeToMessages(conversationId, callback) {
        if (!this.messageListeners.has(conversationId)) {
            this.messageListeners.set(conversationId, new Set());
        }
        
        this.messageListeners.get(conversationId).add(callback);
        
        // Auto-join the conversation room
        this.joinConversation(conversationId);
        
        // Return unsubscribe function
        return () => {
            const listeners = this.messageListeners.get(conversationId);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.messageListeners.delete(conversationId);
                    this.leaveConversation(conversationId);
                }
            }
        };
    }

    // Subscribe to typing indicators
    subscribeToTyping(conversationId, callback) {
        if (!this.typingListeners.has(conversationId)) {
            this.typingListeners.set(conversationId, new Set());
        }
        
        this.typingListeners.get(conversationId).add(callback);
        
        return () => {
            const listeners = this.typingListeners.get(conversationId);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this.typingListeners.delete(conversationId);
                }
            }
        };
    }

    // Send a message
    async sendMessage(conversationId, senderId, content, attachedImage = null) {
        if (!this.socket || !this.socket.connected) {
            throw new Error('Not connected to server');
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Message send timeout'));
            }, 15000);

            // Listen for confirmation
            const handleSuccess = (data) => {
                clearTimeout(timeout);
                if (data.success) {
                    resolve({
                        _id: data.message_id,
                        conversation_id: conversationId,
                        sender_id: senderId,
                        content: content,
                        created_at: data.timestamp || new Date().toISOString()
                    });
                } else {
                    reject(new Error('Failed to send message'));
                }
                cleanup();
            };

            const handleError = (error) => {
                clearTimeout(timeout);
                console.error('❌ WebSocket send error:', error);
                // Don't redirect on message send errors - just reject
                reject(new Error(error.message || 'Failed to send message'));
                cleanup();
            };

            const cleanup = () => {
                this.socket.off('message_sent', handleSuccess);
                this.socket.off('error', handleError);
            };

            this.socket.once('message_sent', handleSuccess);
            this.socket.once('error', handleError);

            // Send the message
            const messageData = {
                conversation_id: conversationId,
                content: content
            };
            
            // Debug: Log sender info for debugging account switching issues
            console.log('📤 Sending message:', {
                conversationId,
                senderId_frontend: senderId,
                token_present: !!this.token,
                messageData
            });

            // Add attachment data if present
            if (attachedImage) {
                messageData.attachment_url = attachedImage.url;
                messageData.attachment_s3_key = attachedImage.s3_key;
            }

            this.socket.emit('send_message', messageData);
        });
    }

    // Get messages via HTTP API (for initial load)
    async getMessages(conversationId, page = 1, limit = 50) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.messages || [];
        } catch (error) {
            console.error('❌ Error fetching messages:', error);
            throw error;
        }
    }

    // Get conversations via HTTP API
    async getConversations(page = 1, limit = 20) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/messages/conversations?page=${page}&limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.conversations || [];
        } catch (error) {
            console.error('❌ Error fetching conversations:', error);
            throw error;
        }
    }

    // Start conversation with user
    async startConversation(userId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/messages/conversations`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.conversation || null;
        } catch (error) {
            console.error('❌ Error starting conversation:', error);
            throw error;
        }
    }

    // Start typing indicator
    startTyping(conversationId) {
        if (!this.socket || !this.socket.connected) return;
        
        this.socket.emit('typing_start', {
            conversation_id: conversationId
        });
    }

    // Stop typing indicator
    stopTyping(conversationId) {
        if (!this.socket || !this.socket.connected) return;
        
        this.socket.emit('typing_stop', {
            conversation_id: conversationId
        });
    }

    // Connection status management
    addConnectionListener(callback) {
        this.connectionListeners.add(callback);
    }

    removeConnectionListener(callback) {
        this.connectionListeners.delete(callback);
    }

    notifyConnectionListeners(status) {
        this.connectionListeners.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                console.error('❌ Error in connection listener:', error);
            }
        });
    }

    // Get connection status
    getConnectionStatus() {
        return this.connectionStatus;
    }

    // Manual reconnect
    async reconnect() {
        if (this.socket) {
            this.socket.disconnect();
        }
        
        this.reconnectAttempts = 0;
        
        try {
            await this.connect();
            
            // Rejoin current conversation if any
            if (this.currentConversation) {
                await this.joinConversation(this.currentConversation);
            }
        } catch (error) {
            console.error('❌ Manual reconnect failed:', error);
            throw error;
        }
    }

    // Disconnect
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        
        this.connectionStatus = 'disconnected';
        this.currentConversation = null;
        this.messageListeners.clear();
        this.typingListeners.clear();
        this.connectionListeners.clear();
    }

    // Check if connected
    isConnected() {
        return this.socket && this.socket.connected;
    }

    // Force reconnection with new token (useful when user switches accounts)
    async forceReconnect() {
        console.log('🔄 Forcing reconnection with fresh token...');
        this.disconnect();
        this.reconnectAttempts = 0; // Reset reconnection attempts
        return await this.connect();
    }

    // Get user's unread message count
    async getUnreadCount() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/messages/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.unread_count || 0;
        } catch (error) {
            console.error('❌ Error fetching unread count:', error);
            return 0;
        }
    }

    // Mark conversation as read
    async markConversationAsRead(conversationId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/messages/conversations/${conversationId}/mark-read`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.marked_read || 0;
        } catch (error) {
            console.error('❌ Error marking conversation as read:', error);
            return 0;
        }
    }

    // Search messages
    async searchMessages(query, limit = 20) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/messages/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.results || [];
        } catch (error) {
            console.error('❌ Error searching messages:', error);
            throw error;
        }
    }
}

// Create and export singleton instance
export const messageService = new MessageService();

// Auto-connect when token is available
const initializeConnection = () => {
    const token = localStorage.getItem('token');
    if (token && !messageService.isConnected()) {
        messageService.connect().catch(error => {
            console.error('❌ Auto-connection failed:', error);
        });
    }
};

// Initialize on load
initializeConnection();

// Re-initialize when token changes
window.addEventListener('storage', (e) => {
    if (e.key === 'token') {
        if (e.newValue) {
            initializeConnection();
        } else {
            messageService.disconnect();
        }
    }
});

export default messageService;