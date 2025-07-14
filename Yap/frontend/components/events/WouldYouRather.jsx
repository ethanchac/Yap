import { useState, useEffect } from 'react';
import WYRItem from './WYRItem';

const API_URL = 'http://localhost:5000/api/activities/wouldyourather';

export default function WouldYouRather() {
  const [questions, setQuestions] = useState([]);
  const [userVotes, setUserVotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  
  // Create question state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    option_a: '',
    option_b: ''
  });
  const [creating, setCreating] = useState(false);
  const [userCreatedQuestions, setUserCreatedQuestions] = useState(new Set());

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setQuestions(data);
      } else {
        setError('No questions found.');
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load activity.');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (questionId, option) => {
    // Prevent multiple votes on the same question
    if (userVotes[questionId]) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option, question_id: questionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit vote');
      }

      const updatedQuestion = await response.json();
      
      // Update the question in the list with new vote counts
      setQuestions(prev => prev.map(q => q._id === questionId ? updatedQuestion : q));
      
      // Track that user voted on this question
      setUserVotes(prev => ({ ...prev, [questionId]: option }));
      
    } catch (err) {
      console.error('Error submitting vote:', err);
      setError('Failed to submit vote. Please try again.');
      throw err;
    }
  };

  const handleCreateQuestion = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!newQuestion.question.trim() || !newQuestion.option_a.trim() || !newQuestion.option_b.trim()) {
      setError('All fields are required to create a question.');
      return;
    }

    if (newQuestion.question.length < 10) {
      setError('Question must be at least 10 characters long.');
      return;
    }

    if (newQuestion.option_a.length < 2 || newQuestion.option_b.length < 2) {
      setError('Options must be at least 2 characters long.');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion.question.trim(),
          option_a: newQuestion.option_a.trim(),
          option_b: newQuestion.option_b.trim()
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create question');
      }

      const createdQuestion = await response.json();
      
      // Add the new question to the beginning of the list (like posts)
      setQuestions(prev => [createdQuestion, ...prev]);
      
      // Track that this user created this question
      setUserCreatedQuestions(prev => new Set([...prev, createdQuestion._id]));
      
      // Reset form
      setNewQuestion({ question: '', option_a: '', option_b: '' });
      setShowCreateForm(false);
      
    } catch (err) {
      console.error('Error creating question:', err);
      setError('Failed to create question. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewQuestion({ question: '', option_a: '', option_b: '' });
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
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to delete question');
      }

      // Remove the question from the list
      setQuestions(prev => prev.filter(q => q._id !== questionId));
      
      // Remove user vote for this question
      setUserVotes(prev => {
        const newVotes = { ...prev };
        delete newVotes[questionId];
        return newVotes;
      });

    } catch (err) {
      console.error('Error deleting question:', err);
      setError('Failed to delete question. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  // Show create form
  if (showCreateForm) {
    return (
      <div className="rounded-lg p-4 border border-gray-700" style={{ backgroundColor: '#171717' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-lg font-bold">Create Would You Rather Question</h3>
          <button
            onClick={resetCreateForm}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreateQuestion} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Question *</label>
            <input
              type="text"
              value={newQuestion.question}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Would you rather..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              maxLength={200}
              disabled={creating}
            />
            <div className="text-xs text-gray-400 mt-1">
              {newQuestion.question.length}/200 characters
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Option A *</label>
              <input
                type="text"
                value={newQuestion.option_a}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, option_a: e.target.value }))}
                placeholder="First option"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                maxLength={100}
                disabled={creating}
              />
              <div className="text-xs text-gray-400 mt-1">
                {newQuestion.option_a.length}/100 characters
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Option B *</label>
              <input
                type="text"
                value={newQuestion.option_b}
                onChange={(e) => setNewQuestion(prev => ({ ...prev, option_b: e.target.value }))}
                placeholder="Second option"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
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
              disabled={creating || !newQuestion.question.trim() || !newQuestion.option_a.trim() || !newQuestion.option_b.trim()}
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
    <div>
      {/* Header with Create Button */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-white text-xl font-bold">Would You Rather</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition-colors"
        >
          + Create Question
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900 border border-red-700 text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {questions.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-gray-700" style={{ backgroundColor: '#171717' }}>
          <p className="text-gray-400 mb-4">No questions found. Be the first to create one!</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
          >
            Create First Question
          </button>
        </div>
      ) : (
        // Render all questions in a vertical stack (like posts)
        <div className="space-y-0">
          {questions.map((question) => (
            <WYRItem
              key={question._id}
              question={question}
              onVote={handleVote}
              onDelete={handleDeleteQuestion}
              userVote={userVotes[question._id]}
              canDelete={userCreatedQuestions.has(question._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}