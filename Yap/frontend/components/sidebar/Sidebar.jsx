import { Link, useLocation } from 'react-router-dom';
import { Home, Plus, Users, MessageCircle, MapPin, User, Settings, MessageSquare } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext'; // Add this import
import YappLogoDark from '../../assets/Yapp White logo.png'; // Import the dark mode logo
import YappLogoLight from '../../assets/yapp_light_mode.png'; // Import the light mode logo (colored version)

function Sidebar() {
    const location = useLocation();
    const { isDarkMode } = useTheme(); // Add this hook

    // Function to check if current path matches the link
    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <nav 
            className="fixed left-0 top-0 h-screen w-64 p-3 sm:p-4 md:p-6 font-bold z-50 flex flex-col" 
            style={{
                backgroundColor: isDarkMode ? '#121212' : '#ffffff', // Dynamic background
                fontFamily: 'Albert Sans',
                borderRight: isDarkMode ? 'none' : '1px solid #e5e7eb' // Add border in light mode
            }}
        >
            {/* Yapp Logo Section */}
            <div className={`mb-4 sm:mb-6 md:mb-8 pb-3 sm:pb-4 md:pb-6 flex-shrink-0 ${
                isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-200'
            }`}>
                <Link to="/home" className="flex items-center justify-center">
                    <img 
                                src={isDarkMode ? YappLogoDark : YappLogoLight} 
                                alt="Yapp Logo" 
                                className="w-auto max-w-full object-contain"
                                style={{ height: isDarkMode ? '5rem' : '4rem' }}
                              />
                </Link>
            </div>

            {/* Main Navigation - grows to fill available space */}
            <ul className="flex-1 flex flex-col justify-evenly min-h-0">
                <li>
                    <Link 
                        to="/home" 
                        className={`flex items-center space-x-2 sm:space-x-3 md:space-x-4 w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/home') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-orange-500/10 hover:text-orange-300 hover:shadow-md'
                                    : 'text-gray-700 hover:bg-orange-500/10 hover:text-orange-600 hover:shadow-md'
                        }`}
                    >
                        <Home className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
                        <span className="truncate">Home</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/users" 
                        className={`flex items-center space-x-2 sm:space-x-3 md:space-x-4 w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/users') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-orange-500/10 hover:text-orange-300 hover:shadow-md'
                                    : 'text-gray-700 hover:bg-orange-500/10 hover:text-orange-600 hover:shadow-md'
                        }`}
                    >
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
                        <span className="truncate">Users</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/messages" 
                        className={`flex items-center space-x-2 sm:space-x-3 md:space-x-4 w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/messages') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-orange-500/10 hover:text-orange-300 hover:shadow-md'
                                    : 'text-gray-700 hover:bg-orange-500/10 hover:text-orange-600 hover:shadow-md'
                        }`}
                    >
                        <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
                        <span className="truncate">Message</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/waypoint" 
                        className={`flex items-center space-x-2 sm:space-x-3 md:space-x-4 w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/waypoint') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-orange-500/10 hover:text-orange-300 hover:shadow-md'
                                    : 'text-gray-700 hover:bg-orange-500/10 hover:text-orange-600 hover:shadow-md'
                        }`}
                    >
                        <MapPin className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
                        <span className="truncate">Waypoint</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/profile" 
                        className={`flex items-center space-x-2 sm:space-x-3 md:space-x-4 w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/profile') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-orange-500/10 hover:text-orange-300 hover:shadow-md'
                                    : 'text-gray-700 hover:bg-orange-500/10 hover:text-orange-600 hover:shadow-md'
                        }`}
                    >
                        <User className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
                        <span className="truncate">Profile</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/settings" 
                        className={`flex items-center space-x-2 sm:space-x-3 md:space-x-4 w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/settings') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-orange-500/10 hover:text-orange-300 hover:shadow-md'
                                    : 'text-gray-700 hover:bg-orange-500/10 hover:text-orange-600 hover:shadow-md'
                        }`}
                    >
                        <Settings className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
                        <span className="truncate">Settings</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/feedback" 
                        className={`flex items-center space-x-2 sm:space-x-3 md:space-x-4 w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-sm sm:text-base md:text-lg rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/feedback') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : isDarkMode 
                                    ? 'text-white hover:bg-orange-500/10 hover:text-orange-300 hover:shadow-md'
                                    : 'text-gray-700 hover:bg-orange-500/10 hover:text-orange-600 hover:shadow-md'
                        }`}
                    >
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
                        <span className="truncate">Feedback</span>
                    </Link>
                </li>
            </ul>

            {/* Create Button - positioned at bottom */}
            <div className={`mt-3 sm:mt-4 md:mt-6 pt-3 sm:pt-4 md:pt-6 flex-shrink-0 ${
                isDarkMode ? 'border-t border-gray-700' : 'border-t border-gray-200'
            }`}>
                <Link 
                    to="/create" 
                    className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 w-full px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 bg-orange-500 hover:bg-orange-600 text-white text-sm sm:text-base md:text-lg rounded-full font-bold transition-all duration-300 ease-in-out transform hover:scale-105 shadow-lg"
                >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 flex-shrink-0" />
                    <span className="truncate">Create</span>
                </Link>
            </div>
        </nav>
    );
}

export default Sidebar;