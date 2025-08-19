import React, { useState, useEffect } from 'react';
import { messageService } from '../../services/messageService';

// Debug component to test real-time messaging
function RealtimeDebugger({ conversationId, currentUserId }) {
    const [messages, setMessages] = useState([]);
    const [testMessage, setTestMessage] = useState('');
    const [subscriptionStatus, setSubscriptionStatus] = useState('Not connected');
    const [logs, setLogs] = useState([]);
    const [subscription, setSubscription] = useState(null);

    const addLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, { message, type, timestamp }].slice(-20)); // Keep last 20 logs
    };

    useEffect(() => {
        if (!conversationId || !currentUserId) {
            addLog('Missing conversationId or currentUserId', 'error');
            return;
        }

        addLog(`Setting up debug for conversation: ${conversationId}`, 'info');
        
        // Test initial message fetch
        const testFetch = async () => {
            try {
                const fetchedMessages = await messageService.getMessages(conversationId);
                setMessages(fetchedMessages);
                addLog(`Fetched ${fetchedMessages.length} initial messages`, 'success');
            } catch (error) {
                addLog(`Failed to fetch messages: ${error.message}`, 'error');
            }
        };

        testFetch();

        // Set up subscription
        const sub = messageService.subscribeToMessages(conversationId, (newMessage) => {
            addLog(`📨 Received real-time message: ${JSON.stringify(newMessage)}`, 'success');
            setMessages(prev => {
                const exists = prev.some(msg => msg._id === newMessage._id);
                if (exists) {
                    addLog('Message already exists, skipping', 'warning');
                    return prev;
                }
                return [...prev, newMessage];
            });
        });

        if (sub) {
            setSubscription(sub);
            setSubscriptionStatus('Connected');
            addLog('Subscription created successfully', 'success');
        } else {
            setSubscriptionStatus('Failed');
            addLog('Failed to create subscription', 'error');
        }

        return () => {
            if (sub && sub.unsubscribe) {
                sub.unsubscribe();
                addLog('Subscription cleaned up', 'info');
            }
        };
    }, [conversationId, currentUserId]);

    const sendTestMessage = async () => {
        if (!testMessage.trim()) return;

        try {
            addLog(`Sending test message: "${testMessage}"`, 'info');
            const sentMessage = await messageService.sendMessage(
                conversationId,
                currentUserId,
                testMessage
            );
            addLog(`Message sent successfully: ${sentMessage._id}`, 'success');
            setTestMessage('');
        } catch (error) {
            addLog(`Failed to send message: ${error.message}`, 'error');
        }
    };

    const testConnection = async () => {
        addLog('Testing Supabase connection...', 'info');
        try {
            // Test basic query
            const messages = await messageService.getMessages(conversationId);
            addLog(`Connection test passed - found ${messages.length} messages`, 'success');
        } catch (error) {
            addLog(`Connection test failed: ${error.message}`, 'error');
        }
    };

    const clearLogs = () => {
        setLogs([]);
    };

    return (
        <div className="bg-gray-900 text-white p-4 rounded-lg space-y-4">
            <h3 className="text-lg font-bold text-orange-500">Real-time Debug Panel</h3>
            
            {/* Status */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <strong>Conversation ID:</strong> {conversationId || 'Not set'}
                </div>
                <div>
                    <strong>User ID:</strong> {currentUserId || 'Not set'}
                </div>
                <div>
                    <strong>Subscription Status:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded text-xs ${
                        subscriptionStatus === 'Connected' ? 'bg-green-600' :
                        subscriptionStatus === 'Failed' ? 'bg-red-600' : 'bg-yellow-600'
                    }`}>
                        {subscriptionStatus}
                    </span>
                </div>
                <div>
                    <strong>Messages Count:</strong> {messages.length}
                </div>
            </div>

            {/* Test Message Sender */}
            <div className="flex space-x-2">
                <input
                    type="text"
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter test message..."
                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded"
                    onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
                />
                <button
                    onClick={sendTestMessage}
                    className="bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded"
                    disabled={!testMessage.trim()}
                >
                    Send Test
                </button>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
                <button
                    onClick={testConnection}
                    className="bg-blue-500 hover:bg-blue-600 px-3 py-1 rounded text-sm"
                >
                    Test Connection
                </button>
                <button
                    onClick={() => addLog('Active subscriptions: ' + messageService.getActiveSubscriptions().join(', '), 'info')}
                    className="bg-purple-500 hover:bg-purple-600 px-3 py-1 rounded text-sm"
                >
                    Check Subscriptions
                </button>
                <button
                    onClick={clearLogs}
                    className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
                >
                    Clear Logs
                </button>
            </div>

            {/* Recent Messages */}
            <div>
                <h4 className="font-semibold mb-2">Recent Messages ({messages.length})</h4>
                <div className="bg-[#1c1c1c] rounded p-2 max-h-32 overflow-y-auto">
                    {messages.slice(-5).map((msg, index) => (
                        <div key={msg._id || index} className="text-xs mb-1">
                            <span className="text-gray-400">{new Date(msg.created_at).toLocaleTimeString()}</span>
                            {' '}
                            <span className={msg.sender_id === currentUserId ? 'text-orange-400' : 'text-blue-400'}>
                                {msg.sender_id === currentUserId ? 'You' : msg.sender_id}:
                            </span>
                            {' '}
                            <span>{msg.content}</span>
                        </div>
                    ))}
                    {messages.length === 0 && (
                        <div className="text-gray-500 text-xs">No messages yet</div>
                    )}
                </div>
            </div>

            {/* Debug Logs */}
            <div>
                <h4 className="font-semibold mb-2">Debug Logs</h4>
                <div className="bg-[#1c1c1c] rounded p-2 max-h-40 overflow-y-auto font-mono text-xs">
                    {logs.map((log, index) => (
                        <div key={index} className={`mb-1 ${
                            log.type === 'error' ? 'text-red-400' :
                            log.type === 'success' ? 'text-green-400' :
                            log.type === 'warning' ? 'text-yellow-400' : 'text-gray-300'
                        }`}>
                            <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="text-gray-500">No logs yet</div>
                    )}
                </div>
            </div>

            {/* Instructions */}
            <div className="text-xs text-gray-400 border-t border-gray-700 pt-2">
                <strong>Instructions:</strong> Open this page in two different browsers/tabs with different users. 
                Send a test message from one tab and check if it appears in the other tab in real-time.
            </div>
        </div>
    );
}

export default RealtimeDebugger;