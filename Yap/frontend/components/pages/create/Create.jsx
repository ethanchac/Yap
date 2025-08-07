import { useState } from 'react';
import Sidebar from '../../sidebar/Sidebar';
import Header from '../../header/Header';
import CreatePost from './CreatePost';
import CreateEvent from './CreateEvent';
import { useTheme } from '../../../contexts/ThemeContext'; // Add this import

function Create() {
    // Toggle between post and event creation
    const [activeTab, setActiveTab] = useState('post'); // 'post' or 'event'
    const [slideDirection, setSlideDirection] = useState('right'); // 'left' or 'right'
    const { isDarkMode } = useTheme(); // Add this hook

    const handleTabChange = (tab) => {
        if (tab !== activeTab) {
            // Determine slide direction based on tab order
            const tabOrder = ['post', 'event'];
            const currentIndex = tabOrder.indexOf(activeTab);
            const newIndex = tabOrder.indexOf(tab);
            setSlideDirection(newIndex > currentIndex ? 'right' : 'left');
        }
        setActiveTab(tab);
    };

    return (
        <div className="h-screen flex" style={{
            backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
            fontFamily: 'Albert Sans'
        }}>
            {/* Fixed Header */}
            <Header />
            
            {/* Fixed Sidebar */}
            <Sidebar />
            
            {/* Main Content Area - Scrollable */}
            <div className="ml-64 flex-1 overflow-y-auto">
                <div className="p-8 font-bold">
                    <div className="max-w-4xl mx-auto">
                        {/* Enhanced Header */}
                        <div className="mb-8">
                            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
                                Create New {activeTab === 'post' ? 'Post' : 'Event'}
                            </h1>
                            <p className={`text-lg ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                                Share your thoughts, moments, and experiences with the community
                            </p>
                        </div>
                        
                        {/* Modern Tab Navigation */}
                        <div className={`flex mb-8 rounded-2xl overflow-hidden p-1 backdrop-blur-sm border ${
                            isDarkMode 
                                ? 'bg-gray-800/50 border-gray-700/50' 
                                : 'bg-gray-100/50 border-gray-300/50'
                        }`}>
                            <button
                                onClick={() => handleTabChange('post')}
                                className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-300 rounded-xl ${
                                    activeTab === 'post'
                                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25'
                                        : isDarkMode
                                            ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                }`}
                            >
                                <div className="flex items-center justify-center space-x-2">
                                    <span className="text-lg">📝</span>
                                    <span>Create Post</span>
                                </div>
                            </button>
                            <button
                                onClick={() => handleTabChange('event')}
                                className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-300 rounded-xl ${
                                    activeTab === 'event'
                                        ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg shadow-orange-500/25'
                                        : isDarkMode
                                            ? 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                                }`}
                            >
                                <div className="flex items-center justify-center space-x-2">
                                    <span className="text-lg">🎉</span>
                                    <span>Create Event</span>
                                </div>
                            </button>
                        </div>
                        
                        {/* Enhanced Content Container with Slide Animation */}
                        <div className={`rounded-2xl p-8 backdrop-blur-sm border shadow-2xl overflow-hidden relative ${
                            isDarkMode 
                                ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50' 
                                : 'bg-gradient-to-br from-white/80 to-gray-50/80 border-gray-200/50'
                        }`}>
                            <div 
                                className={`transition-all duration-500 ease-in-out transform ${
                                    slideDirection === 'right' 
                                        ? activeTab === 'post' 
                                            ? 'translate-x-0 opacity-100' 
                                            : 'translate-x-full opacity-0'
                                        : activeTab === 'post' 
                                            ? 'translate-x-0 opacity-100' 
                                            : '-translate-x-full opacity-0'
                                }`}
                                style={{
                                    position: activeTab === 'post' ? 'relative' : 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    zIndex: activeTab === 'post' ? 10 : 1
                                }}
                            >
                                <CreatePost />
                            </div>
                            
                            <div 
                                className={`transition-all duration-500 ease-in-out transform ${
                                    slideDirection === 'right' 
                                        ? activeTab === 'event' 
                                            ? 'translate-x-0 opacity-100' 
                                            : '-translate-x-full opacity-0'
                                        : activeTab === 'event' 
                                            ? 'translate-x-0 opacity-100' 
                                            : 'translate-x-full opacity-0'
                                }`}
                                style={{
                                    position: activeTab === 'event' ? 'relative' : 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    zIndex: activeTab === 'event' ? 10 : 1
                                }}
                            >
                                <CreateEvent />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Create;