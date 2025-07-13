import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api/activities/wouldyourather';

export default function WouldYouRather() {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userVotes, setUserVotes] = useState({}); // Track votes for each question
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [voting, setVoting] = useState(false);
  
  // Create question state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    option_a: '',
    option_b: ''
  });
  const [creating, setCreating] = useState(false);
  const [forceRender, setForceRender] = useState(0); // Force re-render

  useEffect(() => {
    fetchQuestions();
  }, []);

  // Debug logging
  useEffect(() => {
    console.log('Component state changed:');
    console.log('- questions.length:', questions.length);
    console.log('- loading:', loading);
    console.log('- error:', error);
    console.log('- showCreateForm:', showCreateForm);
  }, [questions, loading, error, showCreateForm]);

  const fetchQuestions = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch questions');
      }
      
      const data = await response.json();
      
      if (Array.isArray(data) && data.length > 0) {
        setQuestions(data);
        setCurrentIdx(0);
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

  const handleVote = async (option) => {
    const question = questions[currentIdx];
    
    // Prevent multiple votes on the same question
    if (userVotes[question._id]) {
      return;
    }

    setVoting(true);
    
    try {
      const response = await fetch(`${API_URL}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option, question_id: question._id }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit vote');
      }

      const updatedQuestion = await response.json();
      
      // Update the question in the list with new vote counts
      setQuestions(prev => prev.map((q, i) => i === currentIdx ? updatedQuestion : q));
      
      // Track that user voted on this question
      setUserVotes(prev => ({ ...prev, [question._id]: option }));
      
    } catch (err) {
      console.error('Error submitting vote:', err);
      setError('Failed to submit vote. Please try again.');
    } finally {
      setVoting(false);
    }
  };

  const handleNext = () => {
    setCurrentIdx((idx) => (idx + 1) % questions.length);
  };

  const handlePrevious = () => {
    setCurrentIdx((idx) => (idx - 1 + questions.length) % questions.length);
  };

  const getVotePercentage = (votes, total) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
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
      
      // Add the new question to the list
      setQuestions(prev => [...prev, createdQuestion]);
      
      // Reset form
      setNewQuestion({ question: '', option_a: '', option_b: '' });
      setShowCreateForm(false);
      
      // Navigate to the new question
      setCurrentIdx(questions.length);
      
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

  // Debug: Let's see what conditions are being met
  console.log('=== RENDER CONDITIONS DEBUG ===');
  console.log('questions.length:', questions.length);
  console.log('showCreateForm:', showCreateForm);
  console.log('loading:', loading);
  console.log('error:', error);
  console.log('Should show create form?', showCreateForm);
  console.log('Should show empty state?', !questions.length && !showCreateForm && !loading);
  console.log('Should show error state?', error && questions.length === 0);

  // Debug: Let's see what conditions are being met
  console.log('=== RENDER CONDITIONS DEBUG ===');
  console.log('questions.length:', questions.length);
  console.log('showCreateForm:', showCreateForm);
  console.log('loading:', loading);
  console.log('error:', error);
  console.log('Should show create form?', showCreateForm);
  console.log('Should show empty state?', !questions.length && !showCreateForm && !loading);
  console.log('Should show error state?', error && questions.length === 0);

  // Show create form FIRST (highest priority)
  if (showCreateForm) {
    console.log('Rendering create form - showCreateForm is true');
    return (
      <div className="rounded-lg p-4 bg-gray-800 border border-gray-700">
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
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Question *
            </label>
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
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Option A *
              </label>
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
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Option B *
              </label>
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
      <div className="rounded-lg p-4 bg-gray-800">
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

  if (error && questions.length === 0) {
    return (
      <div className="rounded-lg p-4 bg-gray-800 border border-gray-700">
        <div className="text-center">
          <h3 className="text-white text-lg font-bold mb-4">Would You Rather</h3>
          <p className="text-red-400 mb-4">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={fetchQuestions}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => {
                console.log('Create Question button clicked');
                console.log('Current showCreateForm state:', showCreateForm);
                setShowCreateForm(true);
                setForceRender(prev => prev + 1); // Force re-render
                console.log('Setting showCreateForm to true');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Create Question
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!questions.length && !showCreateForm && !loading) {
    return (
      <div className="rounded-lg p-4 bg-gray-800 border border-gray-700">
        <div className="text-center">
          <h3 className="text-white text-lg font-bold mb-4">Would You Rather</h3>
          <p className="text-gray-400 mb-4">No questions found. Be the first to create one!</p>
          <button
            onClick={() => {
              console.log('Create First Question button clicked');
              console.log('Current showCreateForm state:', showCreateForm);
              setShowCreateForm(true);
              console.log('Setting showCreateForm to true');
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors"
          >
            Create First Question
          </button>
        </div>
      </div>
    );
  }

  const question = questions[currentIdx];
  const currentUserVote = userVotes[question?._id];
  const totalVotes = question ? question.votes_a + question.votes_b : 0;
  const showResults = currentUserVote;

  return (
    <div className="rounded-lg p-4 bg-gray-800 border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white text-lg font-bold">Would You Rather</h3>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">
            {currentIdx + 1} / {questions.length}
          </span>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg font-medium transition-colors"
          >
            + Create
          </button>
        </div>
      </div>
      
      <p className="text-white mb-6 text-center font-medium">{question.question}</p>
      
      <div className="space-y-4 mb-6">
        {/* Option A */}
        <div className="relative">
          <button
            className={`w-full px-4 py-3 rounded-lg font-bold transition-all transform hover:scale-105 ${
              showResults
                ? currentUserVote === 'A'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300'
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-md'
            } ${voting ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={showResults || voting}
            onClick={() => handleVote('A')}
          >
            {question.option_a}
            {currentUserVote === 'A' && (
              <span className="ml-2">✓</span>
            )}
          </button>
          
          {showResults && (
            <div className="mt-2 text-sm text-gray-300 text-center">
              {question.votes_a} votes ({getVotePercentage(question.votes_a, totalVotes)}%)
            </div>
          )}
        </div>

        {/* Option B */}
        <div className="relative">
          <button
            className={`w-full px-4 py-3 rounded-lg font-bold transition-all transform hover:scale-105 ${
              showResults
                ? currentUserVote === 'B'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300'
                : 'bg-purple-600 text-white hover:bg-purple-500 shadow-md'
            } ${voting ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={showResults || voting}
            onClick={() => handleVote('B')}
          >
            {question.option_b}
            {currentUserVote === 'B' && (
              <span className="ml-2">✓</span>
            )}
          </button>
          
          {showResults && (
            <div className="mt-2 text-sm text-gray-300 text-center">
              {question.votes_b} votes ({getVotePercentage(question.votes_b, totalVotes)}%)
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      {showResults && (
        <div className="bg-gray-700 rounded-lg p-3 mb-4">
          <div className="text-center text-gray-300 text-sm">
            <p className="font-semibold">Total Votes: {totalVotes}</p>
            <p className="mt-1">You voted for: <span className="font-bold text-white">{currentUserVote === 'A' ? question.option_a : question.option_b}</span></p>
          </div>
        </div>
      )}

      {/* Navigation */}
      {questions.length > 1 && (
        <div className="flex justify-between items-center">
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
            onClick={handlePrevious}
          >
            ← Previous
          </button>
          
          <button
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
            onClick={handleNext}
          >
            Next →
          </button>
        </div>
      )}
      
      {voting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
          <div className="text-white font-semibold">Submitting vote...</div>
        </div>
      )}
    </div>
  );
}