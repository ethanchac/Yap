import { useState, useEffect } from 'react';
import { useTheme } from '../../../../../contexts/ThemeContext'; 

export default function DailyMotivation() {
    const { isDarkMode } = useTheme(); // Add this hook
    
    // Array of 3 daily motivational quotes
    const [motives, setMotives] = useState([
        {
            text: "The only way to do great work is to love what you do.",
            author: "Steve Jobs"
        },
        {
            text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
            author: "Winston Churchill"
        },
        {
            text: "The future belongs to those who believe in the beauty of their dreams.",
            author: "Eleanor Roosevelt"
        }
    ]);
    
    useEffect(() => {
        // You can add logic here to fetch different quotes daily
        setMotives([
            {
                text: "The only way to do great work is to love what you do.",
                author: "Steve Jobs"
            },
            {
                text: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
                author: "Winston Churchill"
            },
            {
                text: "The future belongs to those who believe in the beauty of their dreams.",
                author: "Eleanor Roosevelt"
            }
        ]);
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

            {/* Motives Display */}
            <div className="mb-6 space-y-4">
                {motives.map((motive, index) => (
                    <div key={index} className={`text-base p-3 rounded-md ${
                        isDarkMode ? 'bg-gray-800 text-white border border-gray-700' : 'bg-gray-50 text-gray-900 border border-gray-200'
                    }`}>
                        <p className="italic">"{motive.text}"</p>
                        <p className={`mt-2 text-sm text-right ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                            - {motive.author}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}