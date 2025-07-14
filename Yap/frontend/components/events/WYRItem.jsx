import { useState } from 'react';

export default function WYRItem({ question, onVote, onDelete, userVote, canDelete }) {
  const [voting, setVoting] = useState(false);
  const [votingOption, setVotingOption] = useState(null);

  const totalVotes = question.votes_a + question.votes_b;
  const showResults = userVote;

  const getVotePercentage = (votes, total) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const percentageA = getVotePercentage(question.votes_a, totalVotes);
  const percentageB = getVotePercentage(question.votes_b, totalVotes);

  const handleVote = async (option) => {
    if (userVote || voting) return;

    setVoting(true);
    setVotingOption(option);
    
    try {
      await onVote(question._id, option);
    } catch (err) {
      console.error('Error voting:', err);
    } finally {
      setVoting(false);
      setVotingOption(null);
    }
  };

  return (
    <div className="rounded-lg p-4 border border-gray-700 mb-6" style={{ backgroundColor: '#171717' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-white text-lg font-bold">Would You Rather</h3>
        {canDelete && (
          <button
            onClick={() => onDelete(question._id)}
            className="text-gray-400 hover:text-red-400 transition-colors p-1"
            title="Delete this question"
          >
            🗑️
          </button>
        )}
      </div>
      
      {/* Question */}
      <p className="text-white mb-6 text-center font-medium">{question.question}</p>
      
      {!showResults ? (
        // Before voting - equal width side by side buttons
        <div className="flex gap-2 mb-4">
          {/* Option A - Green */}
          <button
            className={`flex-1 px-4 py-4 rounded-lg font-bold transition-all transform hover:scale-105 bg-green-600 text-white hover:bg-green-500 shadow-md relative ${
              voting && votingOption === 'A' ? 'opacity-75' : ''
            }`}
            disabled={voting}
            onClick={() => handleVote('A')}
          >
            <div className="text-center">
              <div className="text-base mb-1">{question.option_a}</div>
              {voting && votingOption === 'A' && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-700 bg-opacity-50 rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>
          </button>

          {/* Option B - Red */}
          <button
            className={`flex-1 px-4 py-4 rounded-lg font-bold transition-all transform hover:scale-105 bg-red-600 text-white hover:bg-red-500 shadow-md relative ${
              voting && votingOption === 'B' ? 'opacity-75' : ''
            }`}
            disabled={voting}
            onClick={() => handleVote('B')}
          >
            <div className="text-center">
              <div className="text-base mb-1">{question.option_b}</div>
              {voting && votingOption === 'B' && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-700 bg-opacity-50 rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                </div>
              )}
            </div>
          </button>
        </div>
      ) : (
        // After voting - dynamic width based on percentages
        <div className="mb-4">
          <div className="flex h-16 rounded-lg overflow-hidden shadow-lg">
            {/* Option A - Green with dynamic width */}
            <div 
              className={`bg-green-600 flex items-center justify-center text-white font-bold transition-all duration-700 ease-out ${
                userVote === 'A' ? 'ring-4 ring-green-400' : ''
              }`}
              style={{ width: `${Math.max(percentageA, 5)}%` }}
            >
              <div className="text-center px-2">
                <div className="text-xs mb-1 truncate">{question.option_a}</div>
                <div className="text-base font-bold">{percentageA}%</div>
                <div className="text-xs opacity-80">{question.votes_a} votes</div>
                {userVote === 'A' && (
                  <div className="text-xs mt-1">✓ Your choice</div>
                )}
              </div>
            </div>

            {/* Option B - Red with dynamic width */}
            <div 
              className={`bg-red-600 flex items-center justify-center text-white font-bold transition-all duration-700 ease-out ${
                userVote === 'B' ? 'ring-4 ring-red-400' : ''
              }`}
              style={{ width: `${Math.max(percentageB, 5)}%` }}
            >
              <div className="text-center px-2">
                <div className="text-xs mb-1 truncate">{question.option_b}</div>
                <div className="text-base font-bold">{percentageB}%</div>
                <div className="text-xs opacity-80">{question.votes_b} votes</div>
                {userVote === 'B' && (
                  <div className="text-xs mt-1">✓ Your choice</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Results Summary - only show after voting */}
      {showResults && (
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="text-center text-gray-300 text-sm">
            <p className="font-semibold">Total Votes: {totalVotes}</p>
            <p className="mt-1">You voted for: <span className="font-bold text-white">{userVote === 'A' ? question.option_a : question.option_b}</span></p>
          </div>
        </div>
      )}
    </div>
  );
}