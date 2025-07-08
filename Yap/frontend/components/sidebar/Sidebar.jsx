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
                <Link to="/home" className="flex items-center space-x-3">
                    <h1 className="text-white text-2xl font-bold">Yapp.</h1>
                </Link>
            </div>

            <ul className="space-y-4">
                <li>
                    <Link 
                        to="/home" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-colors ${
                            isActive('/home') ? 'bg-gray-700' : 'hover:bg-gray-700'
                        }`}
                    >
                        <Home className="w-5 h-5" />
                        <span>Home</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/create" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-colors ${
                            isActive('/create') ? 'bg-gray-700' : 'hover:bg-gray-700'
                        }`}
                    >
                        <Plus className="w-5 h-5" />
                        <span>Create</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/users" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-colors ${
                            isActive('/users') ? 'bg-gray-700' : 'hover:bg-gray-700'
                        }`}
                    >
                        <Users className="w-5 h-5" />
                        <span>Users</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/messages" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-colors ${
                            isActive('/messages') ? 'bg-gray-700' : 'hover:bg-gray-700'
                        }`}
                    >
                        <MessageCircle className="w-5 h-5" />
                        <span>Message</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/likes" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-colors ${
                            isActive('/likes') ? 'bg-gray-700' : 'hover:bg-gray-700'
                        }`}
                    >
                        <Heart className="w-5 h-5" />
                        <span>Likes</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/profile" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-colors ${
                            isActive('/profile') ? 'bg-gray-700' : 'hover:bg-gray-700'
                        }`}
                    >
                        <User className="w-5 h-5" />
                        <span>Profile</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/settings" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-colors ${
                            isActive('/settings') ? 'bg-gray-700' : 'hover:bg-gray-700'
                        }`}
                    >
                        <Settings className="w-5 h-5" />
                        <span>Settings</span>
                    </Link>
                </li>
                <li>
                    <Link 
                        to="/feedback" 
                        className={`flex items-center space-x-3 w-full px-4 py-3 text-white rounded-lg transition-colors ${
                            isActive('/feedback') ? 'bg-gray-700' : 'hover:bg-gray-700'
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