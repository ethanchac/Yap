import { useState } from 'react';
import Sidebar from '../sidebar/Sidebar';
import Header from '../header/Header'

function Create() {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!content.trim()) {
            setError('Content is required');
            return;
        }

        setIsSubmitting(true);
        setError('');
        setMessage('');

        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                setError('You must be logged in to create a post');
                setIsSubmitting(false);
                return;
            }

            const response = await fetch('http://localhost:5000/posts/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: content
                })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Post created successfully!');
                setContent(''); // clear the form
            } else {
                setError(data.error || 'Failed to create post');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen font-bold" style={{backgroundColor: '#121212', fontFamily: 'Albert Sans'}}>
            <Header />
            <Sidebar />
            <div className="ml-64 p-6">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-white text-2xl font-bold mb-6">Create New Post</h1>
                    
                    <div className="rounded-lg p-6" style={{backgroundColor: '#1f2937'}}>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                placeholder="What's on your mind?"
                                maxLength={280}
                                disabled={isSubmitting}
                                className="w-full p-4 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-400 resize-none h-32"
                            />
                            
                            <div className="flex items-center justify-between">
                                <span className={`text-sm ${content.length > 260 ? 'text-red-400' : 'text-gray-400'}`}>
                                    {content.length}/280
                                </span>
                                
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting || !content.trim()}
                                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg font-bold transition-colors"
                                >
                                    {isSubmitting ? 'Posting...' : 'Create Post'}
                                </button>
                            </div>
                        </form>

                        {message && (
                            <div className="mt-4 p-3 bg-green-900 border border-green-700 text-green-300 rounded-lg">
                                {message}
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 p-3 bg-red-900 border border-red-700 text-red-300 rounded-lg">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Create;