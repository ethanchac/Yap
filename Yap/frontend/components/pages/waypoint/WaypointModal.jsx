import { useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

function WaypointModal({ isOpen, onClose, onSubmit, location }) {
    const { isDarkMode } = useTheme();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('food');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (title.trim() && description.trim() && !submitting) {
            setSubmitting(true);
            try {
                await onSubmit({ title, description, type });
                // Reset form
                setTitle('');
                setDescription('');
                setType('food');
            } finally {
                setSubmitting(false);
            }
        }
    };

    const handleClose = () => {
        if (!submitting) {
            setTitle('');
            setDescription('');
            setType('food');
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
            {/* Dimmed background overlay */}
            <div 
                className="absolute inset-0"
                style={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)'
                }}
                onClick={handleClose}
            />
            
            {/* Modal content */}
            <div className={`relative z-10 rounded-xl shadow-2xl p-6 w-96 max-w-[90vw] m-4 transform transition-all scale-100 ${
                isDarkMode ? 'bg-[#171717]' : 'bg-white'
            }`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                            <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                Create Waypoint
                            </h2>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                📍 {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={submitting}
                        className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
                            isDarkMode 
                                ? 'hover:bg-gray-700' 
                                : 'hover:bg-gray-100'
                        }`}
                    >
                        <X className={`w-5 h-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Type Selection */}
                    <div>
                        <label className={`block text-sm font-semibold mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                            Waypoint Type
                        </label>
                        <select 
                            value={type} 
                            onChange={(e) => setType(e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                                isDarkMode 
                                    ? 'border-gray-700 bg-[#1f1f1f] text-white'
                                    : 'border-gray-300 bg-white text-gray-900'
                            }`}
                            disabled={submitting}
                        >
                            <option value="food">🍕 Food & Events</option>
                            <option value="study">📚 Study Spot</option>
                            <option value="group">👥 Study Group</option>
                            <option value="social">🎉 Social</option>
                            <option value="event">📅 Event</option>
                            <option value="other">📍 Other</option>
                        </select>
                    </div>
                    
                    {/* Title Input */}
                    <div>
                        <label className={`block text-sm font-semibold mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                            Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Free coffee here!"
                            maxLength={100}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all ${
                                isDarkMode 
                                    ? 'border-gray-700 bg-[#1f1f1f] text-white placeholder-gray-400'
                                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            disabled={submitting}
                            required
                        />
                        <div className="flex justify-between mt-1">
                            <span className={`text-xs ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>Make it catchy and clear</span>
                            <span className={`text-xs ${
                                isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}>{title.length}/100</span>
                        </div>
                    </div>
                    
                    {/* Description Input */}
                    <div>
                        <label className={`block text-sm font-semibold mb-2 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Tell others what's happening here..."
                            maxLength={500}
                            rows={4}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none ${
                                isDarkMode 
                                    ? 'border-gray-700 bg-[#1f1f1f] text-white placeholder-gray-400'
                                    : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                            }`}
                            disabled={submitting}
                            required
                        />
                        <div className="flex justify-between mt-1">
                            <span className={`text-xs ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>Provide helpful details</span>
                            <span className={`text-xs ${
                                isDarkMode ? 'text-gray-500' : 'text-gray-400'
                            }`}>{description.length}/500</span>
                        </div>
                    </div>

                    {/* Duration Info */}
                    <div className={`border rounded-lg p-3 ${
                        isDarkMode 
                            ? 'bg-orange-900/20 border-orange-800/50'
                            : 'bg-orange-50 border-orange-200'
                    }`}>
                        <p className={`text-sm ${
                            isDarkMode ? 'text-orange-300' : 'text-orange-800'
                        }`}>
                            <span className="font-semibold">⏰ Duration:</span> This waypoint will automatically expire after 1 week
                        </p>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={submitting}
                            className={`flex-1 px-4 py-3 disabled:opacity-50 font-semibold rounded-lg transition-colors ${
                                isDarkMode 
                                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                            }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !title.trim() || !description.trim()}
                            className="flex-1 px-4 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-md"
                        >
                            {submitting ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Creating...</span>
                                </div>
                            ) : (
                                'Create Waypoint'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default WaypointModal;