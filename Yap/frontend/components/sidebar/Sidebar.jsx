import { Link } from 'react-router-dom';
import { Home, Plus, Users, MessageCircle, Heart, User, Settings } from 'lucide-react';

function Sidebar() {
    return (
        <nav className="fixed left-0 top-0 h-screen w-64 p-6 font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
            <ul className="space-y-4">
                <li>
                    <Link to="/home" className="flex items-center space-x-3 w-full px-4 py-3 text-white bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                        <Home className="w-5 h-5" />
                        <span>Home</span>
                    </Link>
                </li>
                <li>
                    <Link to="/create" className="flex items-center space-x-3 w-full px-4 py-3 text-white hover:bg-gray-700 rounded-lg transition-colors">
                        <Plus className="w-5 h-5" />
                        <span>Create</span>
                    </Link>
                </li>
                <li>
                    <Link to="/users" className="flex items-center space-x-3 w-full px-4 py-3 text-white hover:bg-gray-700 rounded-lg transition-colors">
                        <Users className="w-5 h-5" />
                        <span>Users</span>
                    </Link>
                </li>
                <li>
                    <Link to="/messages" className="flex items-center space-x-3 w-full px-4 py-3 text-white hover:bg-gray-700 rounded-lg transition-colors">
                        <MessageCircle className="w-5 h-5" />
                        <span>Message</span>
                    </Link>
                </li>
                <li>
                    <Link to="/likes" className="flex items-center space-x-3 w-full px-4 py-3 text-white hover:bg-gray-700 rounded-lg transition-colors">
                        <Heart className="w-5 h-5" />
                        <span>Likes</span>
                    </Link>
                </li>
                <li>
                    <Link to="/profile" className="flex items-center space-x-3 w-full px-4 py-3 text-white hover:bg-gray-700 rounded-lg transition-colors">
                        <User className="w-5 h-5" />
                        <span>Profile</span>
                    </Link>
                </li>
                <li>
                    <Link to="/settings" className="flex items-center space-x-3 w-full px-4 py-3 text-white hover:bg-gray-700 rounded-lg transition-colors">
                        <Settings className="w-5 h-5" />
                        <span>Settings</span>
                    </Link>
                </li>
            </ul>
        </nav>
    );
}

export default Sidebar;