// WouldYouRather.jsx - Updated to use server-side vote tracking
import { useState, useEffect } from 'react';
import WYRItem from './WYRItem';
import { API_BASE_URL } from '../../../../../services/config';

const API_URL = `${API_BASE_URL}/api/activities/wouldyourather`;

export default function WouldYouRather() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  
  // Create question state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    option_a: '',
    option_b: ''
  });
  const [creating, setCreating] = useState(false);

  // Load questions on component mount
  useEffect(() => {
    fetchQuestions();
  }, []);

  const getAuthHeaders = () => {
    // Get the JWT token from localStorage
    const token = localStorage.getItem('token');
    
    console.log('🔍 Frontend: Token from localStorage:', token ? 'Token exists' : 'No token found');
    
    if (!token) {
      console.log('🔍 Frontend: No token, sending basic headers');
      return {
        'Content-Type': 'application/json'
      };
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    console.log('🔍 Frontend: Sending headers:', headers);
    return headers;
  };

  const fetchQuestions = async () => {
    console.log('🔍 Frontend: Starting fetchQuestions...');
    console.log('🔍 Frontend: API_URL:', API_URL);
    
    try {
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: getAuthHeaders(),
        mode: 'cors',
        credentials: 'include'
      });
      
      console.log('🔍 Frontend: Response received:', response);
      console.log('🔍 Frontend: Response status:', response.status);
      console.log('🔍 Frontend: Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔍 Frontend: Error response body:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('🔍 Frontend: Data received:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        setQuestions(data);
      } else {
        setQuestions([]);
      }
    } catch (err) {
      console.error('🔍 Frontend: Fetch error:', err);
      console.error('🔍 Frontend: Error message:', err.message);
      setError(err.message || 'Failed to load activity.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (questionId, option) => {
    console.log('🔍 Frontend: handleVote called', { questionId, option });
    
    try {
      console.log('🔍 Frontend: Sending vote request...');
      const response = await fetch(`${API_URL}/vote`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ option, question_id: questionId }),
      });

      console.log('🔍 Frontend: Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('🔍 Frontend: Vote failed:', errorData);
        throw new Error(errorData.error || 'Failed to submit vote');
      }

      const updatedQuestion = await response.json();
      console.log('🔍 Frontend: Updated question received:', updatedQuestion);
      
      // Update the question in the list with new vote counts and user vote
      setQuestions(prev => prev.map(q => {
        if (q._id === questionId) {
          console.log('🔍 Frontend: Updating question in state:', updatedQuestion);
          console.log('🔍 Frontend: Question user_vote field:', updatedQuestion.user_vote);
          return updatedQuestion;
        }
        return q;
      }));
      
    } catch (err) {
      console.error('Error submitting vote:', err);
      setError(err.message || 'Failed to submit vote. Please try again.');
      throw err;
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!newQuestion.option_a.trim() || !newQuestion.option_b.trim()) {
      setError('Both options are required.');
      return;
    }

    if (newQuestion.option_a.length < 2 || newQuestion.option_b.length < 2) {
      setError('Options must be at least 2 characters long.');
      return;
    }

    if (newQuestion.option_a.length > 100 || newQuestion.option_b.length > 100) {
      setError('Options cannot exceed 100 characters.');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/create`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          option_a: newQuestion.option_a.trim(),
          option_b: newQuestion.option_b.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create question');
      }

      const createdQuestion = await response.json();
      
      // Add the new question to the beginning of the list
      setQuestions(prev => [createdQuestion, ...prev]);
      
      // Reset form
      setNewQuestion({ option_a: '', option_b: '' });
      setShowCreateForm(false);
      
    } catch (err) {
      console.error('Error creating question:', err);
      setError(err.message || 'Failed to create question. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewQuestion({ option_a: '', option_b: '' });
    setShowCreateForm(false);
    setError('');
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!window.confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }

    setDeleting(questionId);

    try {
      const response = await fetch(`${API_URL}/${questionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete question');
      }

      // Remove the question from the list
      setQuestions(prev => prev.filter(q => q._id !== questionId));

    } catch (err) {
      console.error('Error deleting question:', err);
      setError(err.message || 'Failed to delete question. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  // Show create form
  if (showCreateForm) {
    return (
      <div className="rounded-lg p-4 border border-gray-700" style={{ backgroundColor: '#171717' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-lg font-bold">Create Would You Rather</h3>
          <button
            onClick={resetCreateForm}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreateQuestion} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Option A *
              </label>
              <input
                type="text"
                value={newQuestion.option_a}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, option_a: e.target.value }))}
                placeholder="First option"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                maxLength={100}
                disabled={creating}
              />
              <div className="text-xs text-gray-400 mt-1">
                {newQuestion.option_a.length}/100 characters
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Option B *
              </label>
              <input
                type="text"
                value={newQuestion.option_b}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, option_b: e.target.value }))}
                placeholder="Second option"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                maxLength={100}
                disabled={creating}
              />
              <div className="text-xs text-gray-400 mt-1">
                {newQuestion.option_b.length}/100 characters
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={creating || !newQuestion.option_a.trim() || !newQuestion.option_b.trim()}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors"
            >
              {creating ? 'Creating...' : 'Create Question'}
            </button>
            <button
              type="button"
              onClick={resetCreateForm}
              disabled={creating}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white rounded-lg font-bold transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg p-4" style={{ backgroundColor: '#171717' }}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
          <div className="h-8 bg-gray-700 rounded mb-4"></div>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 h-10 bg-gray-700 rounded"></div>
            <div className="flex-1 h-10 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-4 bg-[#171717] flex flex-col h-full">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <h2 className="text-white text-xl font-bold">Would You Rather</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-bold transition-colors whitespace-nowrap"
        >
          + Create
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900 border border-red-700 text-red-300 rounded-lg flex-shrink-0">
          {error}
        </div>
      )}

      {questions.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-gray-700 flex-1 flex flex-col justify-center" style={{ backgroundColor: '#171717' }}>
          <p className="text-gray-400 mb-4">No questions found. Be the first to create one!</p>
        </div>
      ) : (
        <div className="space-y-0 flex-1 overflow-y-auto">
          {questions.map((question) => {
            // For testing without JWT, allow deletion for all questions
            const canDelete = true;
            
            // Uncomment this when you have JWT working:
            // const token = localStorage.getItem('access_token');
            // let currentUserId = null;
            // if (token) {
            //   try {
            //     const payload = JSON.parse(atob(token.split('.')[1]));
            //     currentUserId = payload.sub;
            //   } catch (e) {
            //     console.error('Error parsing token:', e);
            //   }
            // }
            // const canDelete = question.created_by === currentUserId;
            
            return (
              <WYRItem
                key={question._id}
                question={question}
                onVote={handleVote}
                onDelete={handleDeleteQuestion}
                userVote={question.user_vote} // Now comes from server
                canDelete={canDelete} // Check if user created this question
              />
            );
          })}
        </div>
      )}
    </div>
  );
}