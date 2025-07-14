import { useState, useEffect } from 'react';

export default function WYRItem({ question, onVote, onDelete, userVote, canDelete }) {
  const [voting, setVoting] = useState(false);
  const [votingOption, setVotingOption] = useState(null);
  const [clickedButton, setClickedButton] = useState(null);

  // Start from 50% to avoid both bars growing from the left
  const [animatedPercentageA, setAnimatedPercentageA] = useState(50);
  const [animatedPercentageB, setAnimatedPercentageB] = useState(50);

  const totalVotes = question.votes_a + question.votes_b;
  const showResults = userVote;

  const getVotePercentage = (votes, total) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const percentageA = getVotePercentage(question.votes_a, totalVotes);
  const percentageB = getVotePercentage(question.votes_b, totalVotes);

  useEffect(() => {
    if (!showResults) return;

    // Animate from 50/50 to real percentages
    const timeout = setTimeout(() => {
      setAnimatedPercentageA(percentageA);
      setAnimatedPercentageB(percentageB);
    }, 50); // short delay to let the 50/50 render first

    return () => clearTimeout(timeout);
  }, [showResults, percentageA, percentageB]);

  const handleVote = async (option) => {
    if (userVote || voting) return;

    setClickedButton(option);
    setTimeout(() => {
      setClickedButton(null);
    }, 400);

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
      <div className="flex justify-between items-start mb-6">
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

      {/* Options Display */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-black border-2 border-white flex items-center justify-center">
            <span className="text-white text-lg font-bold">1</span>
          </div>
          <span className="text-white text-base">{question.option_a}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-black border-2 border-white flex items-center justify-center">
            <span className="text-white text-lg font-bold">2</span>
          </div>
          <span className="text-white text-base">{question.option_b}</span>
        </div>
      </div>

      {!showResults ? (
        <div className="flex gap-2 mb-4">
          {/* Vote A Button */}
          <button
            className={`flex-1 px-3 py-3 rounded-lg font-bold transition-all duration-300 ease-out transform hover:scale-105 bg-green-700 border-2 border-green-900 text-green-100 hover:bg-green-600 hover:border-green-800 shadow-md relative ${
              voting && votingOption === 'A' ? 'opacity-75' : ''
            } ${clickedButton === 'A' ? 'scale-95' : ''}`}
            disabled={voting}
            onClick={() => handleVote('A')}
          >
            <div className="text-center">
              <div className="text-xl font-bold">1</div>
              {voting && votingOption === 'A' && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-800 bg-opacity-50 rounded-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-100"></div>
                </div>
              )}
            </div>
          </button>

          {/* Vote B Button */}
          <button
            className={`flex-1 px-3 py-3 rounded-lg font-bold transition-all duration-300 ease-out transform hover:scale-105 bg-red-700 border-2 border-red-900 text-red-100 hover:bg-red-600 hover:border-red-800 shadow-md relative ${
              voting && votingOption === 'B' ? 'opacity-75' : ''
            } ${clickedButton === 'B' ? 'scale-95' : ''}`}
            disabled={voting}
            onClick={() => handleVote('B')}
          >
            <div className="text-center">
              <div className="text-xl font-bold">2</div>
              {voting && votingOption === 'B' && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-800 bg-opacity-50 rounded-lg">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-100"></div>
                </div>
              )}
            </div>
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex h-16 rounded-lg overflow-hidden shadow-lg">
            {/* Result A */}
            <div
              className={`bg-green-700 flex items-center justify-center text-white font-bold will-change-[width] transition-[width] duration-700 ease-in-out ${
                userVote === 'A' ? 'ring-4 ring-green-400' : ''
              }`}
              style={{
                width: `${Math.max(animatedPercentageA, 5)}%`,
              }}
            >
              <div className="text-center px-2">
                <div className="text-base font-bold">{animatedPercentageA}%</div>
                <div className="text-xs opacity-80">{question.votes_a}</div>
                {userVote === 'A' && <div className="text-xs mt-1">✓ Your choice</div>}
              </div>
            </div>

            {/* Result B */}
            <div
              className={`bg-red-700 flex items-center justify-center text-white font-bold will-change-[width] transition-[width] duration-700 ease-in-out ${
                userVote === 'B' ? 'ring-4 ring-red-400' : ''
              }`}
              style={{
                width: `${Math.max(animatedPercentageB, 5)}%`,
              }}
            >
              <div className="text-center px-2">
                <div className="text-base font-bold">{animatedPercentageB}%</div>
                <div className="text-xs opacity-80">{question.votes_b}</div>
                {userVote === 'B' && <div className="text-xs mt-1">✓ Your choice</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
