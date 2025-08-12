import { useState } from 'react';
import Sidebar from '../../sidebar/Sidebar';
import Header from '../../header/Header';
import CreatePost from './CreatePost';
import CreateEvent from './CreateEvent';
import { useTheme } from '../../../contexts/ThemeContext';

function Create() {
    const [activeTab, setActiveTab] = useState('post');
    const [isFormFocused, setIsFormFocused] = useState(false);
    const { isDarkMode } = useTheme();

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    return (
        <div className="h-screen flex" style={{
            backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
            fontFamily: 'Albert Sans'
        }}>
            <Header />
            <Sidebar />
            
            <div className="ml-64 flex-1 overflow-y-auto relative">
                
                {/* Animated Background Elements - Fixed positioning */}
                <div className="fixed inset-0 ml-64 overflow-hidden pointer-events-none">
                    <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-orange-500/20 to-orange-400/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-orange-600/20 to-orange-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                </div>

                <div className="min-h-screen flex items-center justify-center px-6 py-12">
                    <div className={`w-full max-w-2xl relative z-10 transform transition-all duration-700 ease-out ${isFormFocused ? 'scale-105' : ''}`}>
                    
                    {/* Header with Animation */}
                    <div className="text-center mb-10">
                        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                            Create {activeTab === 'post' ? 'Post' : 'Event'}
                        </h1>
                        <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {activeTab === 'post' 
                                ? 'Share your thoughts with the community' 
                                : 'Plan something amazing for everyone'
                            }
                        </p>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex mb-8 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-2 shadow-2xl">
                        <button
                            onClick={() => handleTabChange('post')}
                            className={`flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center space-x-2 ${
                                activeTab === 'post'
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 transform scale-105'
                                    : 'text-white hover:bg-white/10 hover:scale-105'
                            }`}
                        >
                            <span>📝</span>
                            <span>Post</span>
                        </button>
                        <button
                            onClick={() => handleTabChange('event')}
                            className={`flex-1 py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-300 flex items-center justify-center space-x-2 ${
                                activeTab === 'event'
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 transform scale-105'
                                    : 'text-white hover:bg-white/10 hover:scale-105'
                            }`}
                        >
                            <span>🎉</span>
                            <span>Event</span>
                        </button>
                    </div>

                    {/* Form Container with Glass Effect */}
                    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl"
                         onFocus={() => setIsFormFocused(true)}
                         onBlur={() => setIsFormFocused(false)}>
                        
                        {/* Content with smooth transition */}
                        <div className="transition-all duration-500 ease-in-out">
                            {activeTab === 'post' ? <CreatePost /> : <CreateEvent />}
                        </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Create;