import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../header/Header';
import Sidebar from '../sidebar/Sidebar';
import MessagesList from '../messages/MessagesList';
import MessageChat from '../messages/MessageChat';
import { messageService } from '../../services/messageService';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from '../../services/config';

function Messages() {
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const { isDarkMode } = useTheme();

    // Get current user identifier (same logic as in your components)
    const getCurrentUserIdentifier = () => {
        try {
            const userString = localStorage.getItem('user');
            const token = localStorage.getItem('token');

            if (userString) {
                const user = JSON.parse(userString);
                const userId = user._id || user.id || user.userId || user.user_id || user.username;
                if (userId) return String(userId);
            }

            if (token) {
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    const tokenIdentifier = payload.userId || payload.id || payload._id || payload.user_id || payload.sub || payload.username;
                    if (tokenIdentifier) return String(tokenIdentifier);
                } catch (e) {}
            }

            const altKeys = ['userId', 'user_id', 'currentUserId', 'authUserId', 'username'];
            for (const key of altKeys) {
                const altId = localStorage.getItem(key);
                if (altId) return String(altId);
            }

            return null;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    // Handle URL parameter for direct conversation access
    useEffect(() => {
        const conversationId = searchParams.get('conversation');
        console.log('Conversation ID from URL:', conversationId);
        
        if (conversationId && conversations.length > 0) {
            // Find the conversation in the current list
            const conversation = conversations.find(conv => conv._id === conversationId);
            if (conversation) {
                setSelectedConversation(conversation);
            } else {
                // If not found, try to fetch it specifically
                fetchSpecificConversation(conversationId);
            }
        }
    }, [searchParams, conversations]);

    const fetchConversations = async () => {
        try {
            console.log('Fetching conversations from MongoDB...');
            const token = localStorage.getItem('token');
            const currentUserId = getCurrentUserIdentifier();
            
            // Fetch from MongoDB like before
            const response = await fetch(`${API_BASE_URL}/messages/conversations`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Conversations response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('MongoDB conversations data:', data);
                const mongoConversations = data.conversations || [];
                
                // Sync each conversation to Supabase in the background
                if (currentUserId && mongoConversations.length > 0) {
                    console.log('Syncing conversations to Supabase...');
                    for (const conversation of mongoConversations) {
                        try {
                            await messageService.ensureConversationExists(conversation._id, currentUserId);
                        } catch (syncError) {
                            console.warn('Failed to sync conversation to Supabase:', conversation._id, syncError);
                        }
                    }
                }
                
                setConversations(mongoConversations);
            } else {
                console.error('Failed to fetch conversations:', response.status);
                const errorData = await response.json();
                console.error('Error data:', errorData);
                setConversations([]);
            }
        } catch (error) {
            console.error('Error fetching conversations:', error);
            setConversations([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSpecificConversation = async (conversationId) => {
        try {
            console.log('Fetching specific conversation:', conversationId);
            const token = localStorage.getItem('token');
            const currentUserId = getCurrentUserIdentifier();
            
            const response = await fetch(`${API_BASE_URL}/messages/conversations/${conversationId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Specific conversation response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Specific conversation data:', data);
                
                if (data.success && data.conversation) {
                    // Sync to Supabase
                    if (currentUserId) {
                        try {
                            await messageService.ensureConversationExists(conversationId, currentUserId);
                        } catch (syncError) {
                            console.warn('Failed to sync specific conversation to Supabase:', syncError);
                        }
                    }
                    
                    setSelectedConversation(data.conversation);
                    
                    // Also refresh conversations list to include this one if it's not there
                    fetchConversations();
                } else {
                    console.error('No conversation in response:', data);
                }
            } else {
                console.error('Failed to fetch specific conversation:', response.status);
                const errorData = await response.json();
                console.error('Error data:', errorData);
                
                // If specific conversation fails, still try to fetch all conversations
                fetchConversations();
            }
        } catch (error) {
            console.error('Error fetching specific conversation:', error);
            // Fallback to fetching all conversations
            fetchConversations();
        }
    };

    const handleConversationSelect = (conversation) => {
        console.log('Selecting conversation:', conversation);
        setSelectedConversation(conversation);
        // Update URL without causing a page reload
        const newSearchParams = new URLSearchParams(searchParams);
        newSearchParams.set('conversation', conversation._id);
        window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams}`);
    };

    const handleNewMessage = (conversationId, message) => {
        console.log('New message received:', message);
        // Update conversations list with new message
        setConversations(prev => 
            prev.map(conv => 
                conv._id === conversationId 
                ? { ...conv, last_message: message, last_message_at: message.created_at }
                : conv
            )
        );
    };

    // Set up real-time subscription for new messages across all conversations
    useEffect(() => {
        const currentUserId = getCurrentUserIdentifier();
        if (!currentUserId || conversations.length === 0) return;

        console.log('Setting up real-time subscriptions for all conversations...');
        const subscriptions = [];

        // Subscribe to each conversation for real-time updates
        conversations.forEach(conversation => {
            try {
                const subscription = messageService.subscribeToMessages(
                    conversation._id,
                    (newMessage) => {
                        console.log('Real-time message received:', newMessage);
                        handleNewMessage(conversation._id, newMessage);
                    }
                );
                subscriptions.push(subscription);
            } catch (error) {
                console.warn('Failed to subscribe to conversation:', conversation._id, error);
            }
        });

        return () => {
            console.log('Cleaning up message subscriptions');
            subscriptions.forEach(subscription => {
                try {
                    subscription.unsubscribe();
                } catch (error) {
                    console.warn('Error unsubscribing:', error);
                }
            });
        };
    }, [conversations]);

    // Debug logging
    useEffect(() => {
        console.log('Current state:');
        console.log('- Loading:', loading);
        console.log('- Conversations count:', conversations.length);
        console.log('- Selected conversation:', selectedConversation ? selectedConversation._id : 'none');
        console.log('- URL conversation param:', searchParams.get('conversation'));
    }, [loading, conversations, selectedConversation, searchParams]);

    return (
        <div className="min-h-screen font-bold" style={{
            backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
            fontFamily: 'Albert Sans'
        }}>
            <Header />
            <div className="flex h-screen">
                <Sidebar />
                <div className="flex flex-1 h-full ml-64">
                    {/* Left side - Conversations list */}
                    <div className={`w-80 border-r flex flex-col h-full ${
                        isDarkMode ? 'border-gray-600' : 'border-gray-300'
                    }`} style={{
                        backgroundColor: isDarkMode ? '#121212' : '#ffffff'
                    }}>
                        <MessagesList 
                            conversations={conversations}
                            selectedConversation={selectedConversation}
                            onConversationSelect={handleConversationSelect}
                            loading={loading}
                        />
                    </div>
                    
                    {/* Right side - Chat interface */}
                    <div className="flex-1 flex flex-col h-full" style={{
                        backgroundColor: isDarkMode ? '#121212' : '#ffffff'
                    }}>
                        {selectedConversation ? (
                            <MessageChat 
                                conversation={selectedConversation}
                                onNewMessage={handleNewMessage}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <div className="rounded-lg p-8 mb-6" style={{
                                    backgroundColor: isDarkMode ? '#171717' : '#f8f9fa',
                                    border: isDarkMode ? 'none' : '1px solid #e5e7eb'
                                }}>
                                    <div className="mb-6">
                                        <svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-500 mx-auto">
                                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                            <path d="M8 14s1.5 2 4 2 4-2 4-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            <path d="M9 9h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                            <path d="M15 9h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                    </div>
                                    <h2 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Your messages</h2>
                                    <p className={`mb-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Send a message to a user to start a chat.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Messages;