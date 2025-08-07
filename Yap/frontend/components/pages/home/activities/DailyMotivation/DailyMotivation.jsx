import { useState, useEffect } from 'react';
import { useTheme } from '../../../../../contexts/ThemeContext'; 

export default function DailyMotivation() {
    const { isDarkMode } = useTheme(); // Add this hook
    
    // Placeholder for daily motivation content
    const [motivation, setMotivation] = useState("Stay motivated every day with our daily dose of inspiration! Check back tomorrow for a new motivational quote.");
    const [author, setAuthor] = useState("Motivation Guru");
    
    useEffect(() => {
        setMotivation("Stay motivated every day with our daily dose of inspiration lol! Check back tomorrow for a new motivational quote.");
        setAuthor("Motivational Guru");
    }, []);

    return (
        <div 
            className={`rounded-lg p-4 mb-6 ${
                isDarkMode ? 'border border-gray-700' : 'border border-gray-200'
            }`} 
            style={{ 
                backgroundColor: isDarkMode ? '#171717' : '#ffffff' 
            }}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <h2 className={`text-lg font-bold mb-4 ${
                        isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                        Daily Motives.
                    </h2>
                </div>
            </div>

            {/* Options Display */}
            <div className="mb-6 space-y-3">
                <div className={`text-base ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                    <p>{motivation}</p>
                    <p className={`mt-2 text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                        - {author}
                    </p>
                </div>
            </div>
        </div>
    );
}