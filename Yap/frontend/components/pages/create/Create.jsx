import { useState } from 'react';
import Sidebar from '../../sidebar/Sidebar';
import Header from '../../header/Header';
import CreatePost from './CreatePost';
import CreateEvent from './CreateEvent';

function Create() {
    // Toggle between post and event creation
    const [activeTab, setActiveTab] = useState('post'); // 'post' or 'event'

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    return (
        <div className="min-h-screen font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
            <Header />
            <Sidebar />
            <div className="ml-64 p-6">
                <div className="max-w-6xl mx-auto">
                    <h1 className="text-white text-2xl font-bold mb-6">
                        Create New {activeTab === 'post' ? 'Post' : 'Event'}
                    </h1>
                    
                    {/* Tab Navigation */}
                    <div className="flex mb-6 rounded-lg overflow-hidden" style={{backgroundColor: '#171717'}}>
                        <button
                            onClick={() => handleTabChange('post')}
                            className={`flex-1 py-3 px-4 text-center font-semibold transition-colors ${
                                activeTab === 'post'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            Create Post
                        </button>
                        <button
                            onClick={() => handleTabChange('event')}
                            className={`flex-1 py-3 px-4 text-center font-semibold transition-colors ${
                                activeTab === 'event'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            Create Event
                        </button>
                    </div>
                    
                    <div className="rounded-lg p-6" style={{backgroundColor: '#171717'}}>
                        {activeTab === 'post' ? (
                            <CreatePost />
                        ) : (
                            <CreateEvent />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Create;