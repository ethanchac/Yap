import { Link, useLocation } from 'react-router-dom';
import { Home, Plus, Users, MessageCircle, MapPin, User, Settings, MessageSquare } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

function Sidebar() {
    const location = useLocation();
    const { isDarkMode } = useTheme();

    // Function to check if current path matches the link
    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <nav 
            className="fixed left-0 top-0 h-screen w-64 p-6 font-bold z-50 overflow-y-auto flex flex-col" 
            style={{
                backgroundColor: isDarkMode ? '#121212' : '#ffffff', 
                fontFamily: 'Albert Sans',
                borderRight: isDarkMode ? 'none' : '1px solid #e5e7eb'
            }}
        >
            {/* Yapp Logo Section */}
            <div className={`mb-8 pb-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <Link to="/home" className="flex items-center justify-center">
                    <h1 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Yapp.</h1>
                </Link>
            </div>

            {/* Main Navigation - grows to fill space */}
            <ul className="space-y-6 flex-1">
                <li>
                    <Link 
                        to="/home" 
                        className={`flex items-center space-x-4 w-full px-6 py-4 text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/home') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-gray-700 hover:shadow-md' 
                                    : 'text-gray-900 hover:bg-gray-100 hover:shadow-md'
                        }`}
                    >
                        <Home className="w-6 h-6" />
                        <span>Home</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/users" 
                        className={`flex items-center space-x-4 w-full px-6 py-4 text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/users') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-gray-700 hover:shadow-md' 
                                    : 'text-gray-900 hover:bg-gray-100 hover:shadow-md'
                        }`}
                    >
                        <Users className="w-6 h-6" />
                        <span>Users</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/messages" 
                        className={`flex items-center space-x-4 w-full px-6 py-4 text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/messages') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-gray-700 hover:shadow-md' 
                                    : 'text-gray-900 hover:bg-gray-100 hover:shadow-md'
                        }`}
                    >
                        <MessageCircle className="w-6 h-6" />
                        <span>Message</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/waypoint" 
                        className={`flex items-center space-x-4 w-full px-6 py-4 text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/waypoint') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-gray-700 hover:shadow-md' 
                                    : 'text-gray-900 hover:bg-gray-100 hover:shadow-md'
                        }`}
                    >
                        <MapPin className="w-6 h-6" />
                        <span>Waypoint</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/profile" 
                        className={`flex items-center space-x-4 w-full px-6 py-4 text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/profile') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-gray-700 hover:shadow-md' 
                                    : 'text-gray-900 hover:bg-gray-100 hover:shadow-md'
                        }`}
                    >
                        <User className="w-6 h-6" />
                        <span>Profile</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/settings" 
                        className={`flex items-center space-x-4 w-full px-6 py-4 text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/settings') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-gray-700 hover:shadow-md' 
                                    : 'text-gray-900 hover:bg-gray-100 hover:shadow-md'
                        }`}
                    >
                        <Settings className="w-6 h-6" />
                        <span>Settings</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/feedback" 
                        className={`flex items-center space-x-4 w-full px-6 py-4 text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/feedback') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-gray-700 hover:shadow-md' 
                                    : 'text-gray-900 hover:bg-gray-100 hover:shadow-md'
                        }`}
                    >
                        <MessageSquare className="w-6 h-6" />
                        <span>Feedback</span>
                    </Link>
                </li>
            </ul>

            {/* Create Button - positioned at bottom like Twitter */}
            <div className={`mt-6 pt-6 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <Link 
                    to="/create" 
                    className="flex items-center space-x-4 w-full px-6 py-4 bg-orange-500 hover:bg-orange-600 text-white text-lg rounded-full font-bold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                    <Plus className="w-6 h-6" />
                    <span>Create</span>
                </Link>
            </div>
        </nav>
    );
}

export default Sidebar;