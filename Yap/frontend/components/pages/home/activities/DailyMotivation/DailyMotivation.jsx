import { useState, useEffect } from 'react';

export default function DailyMotivation() {

    // Placeholder for daily motivation content
    const [motivation, setMotivation] = useState("Stay motivated every day with our daily dose of inspiration! Check back tomorrow for a new motivational quote.");
    const [author, setAuthor] = useState("Motivation Guru");
    useEffect(() => {
        setMotivation("Stay motivated every day with our daily dose of inspiration lol! Check back tomorrow for a new motivational quote.");
        setAuthor("Motivational Guru");
    }, []);


  return (
    <div className="rounded-lg p-4 border border-gray-700 mb-6" style={{ backgroundColor: '#171717' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h2 className="text-white text-lg font-bold mb-4">Daily Motives.</h2>
        </div>
      </div>

      {/* Options Display */}
      <div className="mb-6 space-y-3">
        <div className="text-white text-base">
          <p>{motivation}</p>
            <p className="mt-2 text-gray-400 text-sm">- {author}</p>
        </div>
      </div>
    </div>
  );
}