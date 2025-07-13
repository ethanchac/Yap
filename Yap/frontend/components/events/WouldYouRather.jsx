import { useState, useEffect } from 'react';

const API_URL = 'http://localhost:5000/api/activities/wouldyourather';

export default function WouldYouRather() {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userVote, setUserVote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setQuestions(data);
          setCurrentIdx(0);
        } else {
          setError('No questions found.');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load activity.');
        setLoading(false);
      });
  }, []);

  const handleVote = (option) => {
    const question = questions[currentIdx];
    fetch(`${API_URL}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ option, question_id: question._id }),
    })
      .then(res => res.json())
      .then(data => {
        // Update the question in the list with new vote counts
        setQuestions(prev => prev.map((q, i) => i === currentIdx ? data : q));
        setUserVote(option);
      });
  };

  const handleNext = () => {
    setUserVote(null);
    setCurrentIdx((idx) => (idx + 1) % questions.length);
  };

  if (loading) return <div className="text-gray-400">Loading activity...</div>;
  if (error) return <div className="text-red-400">{error}</div>;
  if (!questions.length) return null;

  const question = questions[currentIdx];

  return (
    <div className="rounded-lg p-4" style={{ backgroundColor: '#171717' }}>
      <h3 className="text-white text-lg font-bold mb-2">Would You Rather</h3>
      <p className="text-white mb-4">{question.question}</p>
      <div className="flex gap-4 mb-4">
        <button
          className={`flex-1 px-4 py-2 rounded-lg font-bold transition-colors ${userVote ? 'bg-gray-700 text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
          disabled={!!userVote}
          onClick={() => handleVote('A')}
        >
          {question.option_a}
        </button>
        <button
          className={`flex-1 px-4 py-2 rounded-lg font-bold transition-colors ${userVote ? 'bg-gray-700 text-gray-400' : 'bg-purple-600 text-white hover:bg-purple-500'}`}
          disabled={!!userVote}
          onClick={() => handleVote('B')}
        >
          {question.option_b}
        </button>
      </div>
      {userVote && (
        <div className="mt-2 text-white">
          <div>{question.option_a}: <span className="font-bold">{question.votes_a}</span> votes</div>
          <div>{question.option_b}: <span className="font-bold">{question.votes_b}</span> votes</div>
        </div>
      )}
      {questions.length > 1 && (
        <button
          className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors"
          onClick={handleNext}
        >
          Next Question
        </button>
      )}
    </div>
  );
} 