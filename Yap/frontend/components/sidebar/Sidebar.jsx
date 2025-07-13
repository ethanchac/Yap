import { Link, useLocation } from 'react-router-dom';
import { Home, Plus, Users, MessageCircle, Heart, User, Settings, MessageSquare } from 'lucide-react';

function Sidebar() {
    const location = useLocation();
    
    // Function to check if current path matches the link
    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <nav className="fixed left-0 top-0 h-screen w-64 p-6 font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
            {/* Yapp Logo Section */}
            <div className="mb-8 pb-6 border-b border-gray-700">
                <Link to="/home" className="flex items-center justify-center">
                    <h1 className="text-white text-4xl font-bold">Yapp.</h1>
                </Link>
            </div>

            <ul className="space-y-4">
                <li>
                    <Link 
                        to="/home" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/home') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : 'hover:bg-gray-700 hover:shadow-md'
                        }`}
                    >
                        <Home className="w-5 h-5" />
                        <span>Home</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/create" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/create') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : 'hover:bg-gray-700 hover:shadow-md'
                        }`}
                    >
                        <Plus className="w-5 h-5" />
                        <span>Create</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/users" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/users') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : 'hover:bg-gray-700 hover:shadow-md'
                        }`}
                    >
                        <Users className="w-5 h-5" />
                        <span>Users</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/messages" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/messages') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : 'hover:bg-gray-700 hover:shadow-md'
                        }`}
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span>Message</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/likes" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/likes') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : 'hover:bg-gray-700 hover:shadow-md'
                        }`}
                    >
                        <Heart className="w-5 h-5" />
                        <span>Likes</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/profile" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/profile') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : 'hover:bg-gray-700 hover:shadow-md'
                        }`}
                    >
                        <User className="w-5 h-5" />
                        <span>Profile</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/settings" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/settings') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : 'hover:bg-gray-700 hover:shadow-md'
                        }`}
                    >
                        <Settings className="w-5 h-5" />
                        <span>Settings</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/feedback" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                            isActive('/feedback') 
                                ? 'bg-orange-500/20 border border-orange-500/30 text-orange-400 shadow-lg shadow-orange-500/25' 
                                : 'hover:bg-gray-700 hover:shadow-md'
                        }`}
                    >
                        <MessageSquare className="w-5 h-5" />
                        <span>Feedback</span>
                    </Link>
                </li>
                
            </ul>
        </nav>
    );
}

export default Sidebar;