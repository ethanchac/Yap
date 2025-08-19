import { useState, useEffect } from 'react';
import { Send, Star, MessageSquare, CheckCircle, ArrowLeft } from 'lucide-react';
import Sidebar from '../sidebar/Sidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { API_BASE_URL } from '../../services/config';

function Feedback() {
    const [feedback, setFeedback] = useState({
        type: 'general',
        rating: 0,
        subject: '',
        message: '',
        email: ''
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const { isDarkMode } = useTheme();

    const handleRatingClick = (rating) => {
        setFeedback(prev => ({ ...prev, rating }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/feedback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(feedback)
            });
            
            if (response.ok) {
                setSubmitSuccess(true);
                setTimeout(() => {
                    setSubmitted(true);
                    setFeedback({
                        type: 'general',
                        rating: 0,
                        subject: '',
                        message: '',
                        email: ''
                    });
                }, 1500); // Show success animation for 1.5 seconds
            } else {
                console.error('Failed to submit feedback');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmitAnother = () => {
        setSubmitted(false);
        setSubmitSuccess(false);
    };

    // Show success animation first
    if (submitSuccess && !submitted) {
        return (
            <div className="min-h-screen bg-black text-white flex">
                <Sidebar />
                <div className="flex-1 p-8 flex justify-center items-center">
                    <div className="text-center">
                        <div className="animate-bounce">
                            <CheckCircle className="w-24 h-24 text-green-500 mx-auto mb-4" />
                        </div>
                        <h2 className="text-3xl font-bold text-green-500 mb-2">Success!</h2>
                        <p className="text-gray-300 text-lg">Your feedback is being processed...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-black text-white flex">
                <Sidebar />
                <div className="flex-1 p-8 flex justify-center">
                    <div className="max-w-2xl w-full text-center">
                        <div className="bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-green-500 rounded-xl p-10 shadow-2xl">
                            <div className="mb-6">
                                <MessageSquare className="w-20 h-20 text-green-500 mx-auto mb-4 animate-pulse" />
                                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                                    Thank You!
                                </h2>
                            </div>
                            
                            <div className="mb-8">
                                <p className="text-gray-300 text-lg mb-4">
                                    🎉 Your feedback has been submitted successfully!
                                </p>
                                <p className="text-gray-400 mb-6">
                                    We appreciate you taking the time to help us improve Yapp. Your input helps us build a better experience for everyone.
                                </p>
                                
                                <div className="bg-[#1c1c1c]/50 rounded-lg p-4 mb-6">
                                    <p className="text-sm text-gray-300">
                                        <strong>What happens next?</strong>
                                    </p>
                                    <p className="text-sm text-gray-400 mt-2">
                                        Our team will review your feedback and work on improvements. If you provided an email, we may reach out for follow-up questions.
                                    </p>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <button
                                    onClick={handleSubmitAnother}
                                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center mx-auto space-x-2 shadow-lg"
                                >
                                    <Send className="w-4 h-4" />
                                    <span>Submit Another Feedback</span>
                                </button>
                                
                                <button
                                    onClick={() => window.history.back()}
                                    className="text-gray-400 hover:text-white transition-colors flex items-center justify-center mx-auto space-x-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Go Back</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex" style={{
            backgroundColor: isDarkMode ? '#000000' : '#ffffff',
            color: isDarkMode ? '#ffffff' : '#000000'
        }}>
            <Sidebar />
            <div className="flex-1 p-8 flex justify-center">
                <div className="max-w-2xl w-full">
                    <div className="mb-8 text-center">
                        <h1 className={`text-3xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Feedback</h1>
                        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                            Help us improve Yapp by sharing your thoughts, suggestions, or reporting issues.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Feedback Type */}
                        <div>
                            <label className="block text-sm font-semibold mb-3">Feedback Type</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {[
                                    { value: 'general', label: 'General Feedback', desc: 'Share your thoughts' },
                                    { value: 'bug', label: 'Bug Report', desc: 'Report an issue' },
                                    { value: 'feature', label: 'Feature Request', desc: 'Suggest new features' }
                                ].map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setFeedback(prev => ({ ...prev, type: type.value }))}
                                        className={`p-4 border rounded-lg text-left transition-colors ${
                                            feedback.type === type.value
                                                ? 'border-orange-500 bg-orange-500/20'
                                                : isDarkMode ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                        style={{
                                            backgroundColor: feedback.type !== type.value && isDarkMode ? '#1c1c1c' : undefined
                                        }}
                                        onMouseEnter={(e) => {
                                            if (feedback.type !== type.value && isDarkMode) {
                                                e.target.style.backgroundColor = '#1f1f1f';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (feedback.type !== type.value && isDarkMode) {
                                                e.target.style.backgroundColor = '#1c1c1c';
                                            }
                                        }}
                                    >
                                        <div className="font-semibold">{type.label}</div>
                                        <div className="text-sm text-gray-400">{type.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Rating */}
                        <div>
                            <label className="block text-sm font-semibold mb-3">
                                How would you rate your experience?
                            </label>
                            <div className="flex space-x-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => handleRatingClick(star)}
                                        className="transition-colors"
                                    >
                                        <Star
                                            className={`w-8 h-8 ${
                                                star <= feedback.rating
                                                    ? 'text-yellow-400 fill-current'
                                                    : 'text-gray-400 hover:text-yellow-300'
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Subject */}
                        <div>
                            <label htmlFor="subject" className="block text-sm font-semibold mb-2">
                                Subject
                            </label>
                            <input
                                type="text"
                                id="subject"
                                value={feedback.subject}
                                onChange={(e) => setFeedback(prev => ({ ...prev, subject: e.target.value }))}
                                className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${
                                    isDarkMode 
                                        ? 'border-gray-600 text-white placeholder-gray-400 focus:border-orange-500' 
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-orange-500'
                                }`}
                                style={{
                                    backgroundColor: isDarkMode ? '#1c1c1c' : undefined
                                }}
                                placeholder="Brief summary of your feedback"
                                required
                            />
                        </div>

                        {/* Message */}
                        <div>
                            <label htmlFor="message" className="block text-sm font-semibold mb-2">
                                Message
                            </label>
                            <textarea
                                id="message"
                                value={feedback.message}
                                onChange={(e) => setFeedback(prev => ({ ...prev, message: e.target.value }))}
                                rows={6}
                                className={`w-full px-4 py-3 border rounded-lg focus:outline-none resize-none ${
                                    isDarkMode 
                                        ? 'border-gray-600 text-white placeholder-gray-400 focus:border-orange-500' 
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-orange-500'
                                }`}
                                style={{
                                    backgroundColor: isDarkMode ? '#1c1c1c' : undefined
                                }}
                                placeholder="Please provide detailed feedback..."
                                required
                            />
                        </div>

                        {/* Email (optional) */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-semibold mb-2">
                                Email (Optional)
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={feedback.email}
                                onChange={(e) => setFeedback(prev => ({ ...prev, email: e.target.value }))}
                                className={`w-full px-4 py-3 border rounded-lg focus:outline-none ${
                                    isDarkMode 
                                        ? 'border-gray-600 text-white placeholder-gray-400 focus:border-orange-500' 
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-orange-500'
                                }`}
                                style={{
                                    backgroundColor: isDarkMode ? '#1c1c1c' : undefined
                                }}
                                placeholder="your.email@example.com"
                            />
                            <p className="text-sm text-gray-400 mt-1">
                                Leave your email if you'd like us to follow up with you.
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white px-8 py-3 rounded-lg transition-colors flex items-center space-x-2"
                            >
                                <Send className="w-4 h-4" />
                                <span>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Feedback;