import { useState, useEffect } from 'react';
import { useTheme } from '../../../../../contexts/ThemeContext'; // Add this import

export default function WYRItem({ question, onVote, onDelete, userVote, canDelete }) {
  const [voting, setVoting] = useState(false);
  const [votingOption, setVotingOption] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clickedButton, setClickedButton] = useState(null);
  const { isDarkMode } = useTheme(); // Add this hook

  // Start from 50% to avoid both bars growing from the left
  const [animatedPercentageA, setAnimatedPercentageA] = useState(50);
  const [animatedPercentageB, setAnimatedPercentageB] = useState(50);

  const totalVotes = question.votes_a + question.votes_b;
  const showResults = userVote; // userVote is now A, B, or null/undefined

  console.log('🔍 WYRItem: Props received:', { 
    questionId: question._id, 
    userVote, 
    showResults, 
    totalVotes,
    votesA: question.votes_a,
    votesB: question.votes_b,
    fullQuestion: question // Let's see the full question object
  });

  const getVotePercentage = (votes, total) => {
    if (total === 0) return 0;
    return Math.round((votes / total) * 100);
  };

  const percentageA = getVotePercentage(question.votes_a, totalVotes);
  const percentageB = getVotePercentage(question.votes_b, totalVotes);

  // Format the creation date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return '';
    }
  };

  // Get creator display name
  const getCreatorName = () => {
    // Backend now provides creator_name, so we can use it directly
    return question.creator_name || 'Anonymous';
  };

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
    console.log('🔍 WYRItem: handleVote called', { option, userVote, voting });
    
    if (userVote || voting) {
      console.log('🔍 WYRItem: Vote blocked - already voted or voting in progress');
      return; // userVote is now truthy if user has voted
    }

    setClickedButton(option);
    setTimeout(() => {
      setClickedButton(null);
    }, 400);

    setVoting(true);
    setVotingOption(option);

    try {
      console.log('🔍 WYRItem: Calling onVote...');
      await onVote(question._id, option);
      console.log('🔍 WYRItem: onVote completed successfully');
    } catch (err) {
      console.error('🔍 WYRItem: Error voting:', err);
    } finally {
      console.log('🔍 WYRItem: Resetting voting state');
      setVoting(false);
      setVotingOption(null);
    }
  };

  return (
    <div 
      className={`rounded-lg p-4 mb-6 ${
        isDarkMode ? 'border border-gray-700' : 'border border-gray-200'
      }`} 
      style={{ backgroundColor: isDarkMode ? '#171717' : '#ffffff' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className={`text-lg font-bold mb-1 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Would You Rather
          </h3>
          <div className={`flex items-center gap-2 text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <span>by {getCreatorName()}</span>
            {question.created_at && (
              <>
                <span>•</span>
                <span>{formatDate(question.created_at)}</span>
              </>
            )}
          </div>
        </div>
        {canDelete && (
          <>
            <button
              onClick={() => setShowDeleteConfirm(true)}
            className={`transition-colors p-1 ml-2 ${
              isDarkMode
                ? 'text-gray-400 hover:text-red-400'
                : 'text-gray-500 hover:text-red-500'
            }`}
            title="Delete this question"
          >
            🗑️
          </button>
            {showDeleteConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className={`rounded-lg p-6 max-w-sm mx-4 ${isDarkMode ? 'bg-[#1c1c1c]' : 'bg-white border border-gray-200'}`}>
                  <h3 className={`text-lg font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Delete Question</h3>
                  <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Are you sure you want to delete this question? This action cannot be undone.</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { onDelete(question._id); setShowDeleteConfirm(false); }}
                      className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold"
                    >Delete</button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className={`flex-1 px-4 py-2 rounded-lg font-bold transition-colors ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'}`}
                    >Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Options Display */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            isDarkMode
              ? 'bg-black border-white'
              : 'bg-gray-900 border-gray-900'
          }`}>
            <span className="text-white text-lg font-bold">1</span>
          </div>
          <span className={`text-base break-words ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {question.option_a}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            isDarkMode
              ? 'bg-black border-white'
              : 'bg-gray-900 border-gray-900'
          }`}>
            <span className="text-white text-lg font-bold">2</span>
          </div>
          <span className={`text-base break-words ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {question.option_b}
          </span>
        </div>
      </div>

      {!showResults ? (
        <div className="flex gap-3 mb-4">
          {/* Vote A Button */}
          <button
            className={`flex-1 min-w-0 px-4 py-3 rounded-lg font-bold transition-all duration-300 ease-out transform hover:scale-105 shadow-md relative ${
              isDarkMode
                ? 'bg-green-700 border-2 border-green-900 text-green-100 hover:bg-green-600 hover:border-green-800'
                : 'bg-green-600 border-2 border-green-700 text-white hover:bg-green-500 hover:border-green-600'
            } ${
              voting && votingOption === 'A' ? 'opacity-75' : ''
            } ${clickedButton === 'A' ? 'scale-95' : ''}`}
            disabled={voting}
            onClick={() => handleVote('A')}
          >
            <div className="text-center">
              <div className="text-xl font-bold">1</div>
              {voting && votingOption === 'A' && (
                <div className={`absolute inset-0 flex items-center justify-center bg-opacity-50 rounded-lg ${
                  isDarkMode ? 'bg-green-800' : 'bg-green-700'
                }`}>
                  <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${
                    isDarkMode ? 'border-green-100' : 'border-white'
                  }`}></div>
                </div>
              )}
            </div>
          </button>

          {/* Vote B Button */}
          <button
            className={`flex-1 min-w-0 px-4 py-3 rounded-lg font-bold transition-all duration-300 ease-out transform hover:scale-105 shadow-md relative ${
              isDarkMode
                ? 'bg-red-700 border-2 border-red-900 text-red-100 hover:bg-red-600 hover:border-red-800'
                : 'bg-red-600 border-2 border-red-700 text-white hover:bg-red-500 hover:border-red-600'
            } ${
              voting && votingOption === 'B' ? 'opacity-75' : ''
            } ${clickedButton === 'B' ? 'scale-95' : ''}`}
            disabled={voting}
            onClick={() => handleVote('B')}
          >
            <div className="text-center">
              <div className="text-xl font-bold">2</div>
              {voting && votingOption === 'B' && (
                <div className={`absolute inset-0 flex items-center justify-center bg-opacity-50 rounded-lg ${
                  isDarkMode ? 'bg-red-800' : 'bg-red-700'
                }`}>
                  <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${
                    isDarkMode ? 'border-red-100' : 'border-white'
                  }`}></div>
                </div>
              )}
            </div>
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <div className="flex h-16 rounded-lg overflow-hidden shadow-lg">
            {/* Result A */}
            {animatedPercentageA > 0 && (
              <div
                className={`flex items-center justify-center text-white font-bold will-change-[width] transition-[width] duration-700 ease-in-out min-w-0 ${
                  isDarkMode ? 'bg-green-700' : 'bg-green-600'
                } ${
                  userVote === 'A' 
                    ? (isDarkMode ? 'ring-4 ring-green-400' : 'ring-4 ring-green-300')
                    : ''
                }`}
                style={{
                  width: `${Math.max(animatedPercentageA, 5)}%`,
                }}
              >
                <div className="text-center px-2 min-w-0">
                  <div className="text-base font-bold truncate">{animatedPercentageA}%</div>
                  <div className="text-xs opacity-80 truncate">{question.votes_a}</div>
                  {userVote === 'A' && <div className="text-xs mt-1 truncate">✓ Your choice</div>}
                </div>
              </div>
            )}

            {/* Result B */}
            {animatedPercentageB > 0 && (
              <div
                className={`flex items-center justify-center text-white font-bold will-change-[width] transition-[width] duration-700 ease-in-out min-w-0 ${
                  isDarkMode ? 'bg-red-700' : 'bg-red-600'
                } ${
                  userVote === 'B' 
                    ? (isDarkMode ? 'ring-4 ring-red-400' : 'ring-4 ring-red-300')
                    : ''
                }`}
                style={{
                  width: `${Math.max(animatedPercentageB, 5)}%`,
                }}
              >
                <div className="text-center px-2 min-w-0">
                  <div className="text-base font-bold truncate">{animatedPercentageB}%</div>
                  <div className="text-xs opacity-80 truncate">{question.votes_b}</div>
                  {userVote === 'B' && <div className="text-xs mt-1 truncate">✓ Your choice</div>}
                </div>
              </div>
            )}

            {/* Show message when both options have 0 votes */}
            {animatedPercentageA === 0 && animatedPercentageB === 0 && (
              <div className={`w-full flex items-center justify-center font-medium ${
                isDarkMode 
                  ? 'bg-gray-700 text-gray-400' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                No votes yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}