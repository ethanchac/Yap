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
                setContent(''); // Clear the form
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
        <>
            <Header />
            <Sidebar />
            <div>
                <h1>Create New Post</h1>
                
                <form onSubmit={handleSubmit}>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What's on your mind?"
                        maxLength={280}
                        disabled={isSubmitting}
                    />
                    
                    <div>
                        <span>{content.length}/280</span>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isSubmitting || !content.trim()}
                    >
                        {isSubmitting ? 'Posting...' : 'Create Post'}
                    </button>
                </form>

                {message && (
                    <div>
                        {message}
                    </div>
                )}

                {error && (
                    <div>
                        {error}
                    </div>
                )}
            </div>
        </>
    );
}

export default Create;