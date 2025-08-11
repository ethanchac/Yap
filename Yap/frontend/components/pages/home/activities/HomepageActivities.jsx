// HomepageActivities.jsx - Updated to include What's on Your Mind
import { useState, useRef, useEffect } from "react";
import WouldYouRather from "./WYR/WouldYouRather";
import WhatsOnYourMind from "./WOYM/WhatsOnYourMind";
import DailyMotivation from "./DailyMotivation/DailyMotivation";
import { useTheme } from '../../../../contexts/ThemeContext';

function PlaceholderActivity({ title }) {
    const { isDarkMode } = useTheme();
    return (
        <div className={`flex flex-col items-center justify-center h-40 rounded-lg font-bold text-xl shadow-md w-full ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
        }`} style={{ 
            backgroundColor: isDarkMode ? '#171717' : '#f8f9fa',
            border: isDarkMode ? 'none' : '1px solid #e5e7eb'
        }}>
            <span>{title}</span>
            <span className="mt-2 text-sm">(Coming soon)</span>
        </div>
    );
}

const activities = [
    {
        key: "wouldyourather",
        component: <WouldYouRather />,
    },
    {
        key: "whatsonmind",
        component: <WhatsOnYourMind />,
    },
    {
        key: "DailyMotivation",
        component: <DailyMotivation />,
    },
];

function HomepageActivities() {
    const [current, setCurrent] = useState(0); // Start on WouldYouRather (index 0)
    const [prev, setPrev] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [containerHeight, setContainerHeight] = useState(240);
    const timeoutRef = useRef(null);
    const containerRef = useRef(null);
    const [isPaused, setIsPaused] = useState(false);

    // Update container height when current activity changes or content changes
    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current) {
                const currentActivity = containerRef.current.querySelector(`[data-activity="${current}"]`);
                if (currentActivity) {
                    const height = currentActivity.scrollHeight;
                    setContainerHeight(Math.max(height, 240)); // Minimum 240px
                }
            }
        };

        updateHeight();

        // Use ResizeObserver to detect content changes
        const resizeObserver = new ResizeObserver(() => {
            updateHeight();
        });

        if (containerRef.current) {
            const currentActivity = containerRef.current.querySelector(`[data-activity="${current}"]`);
            if (currentActivity) {
                resizeObserver.observe(currentActivity);
            }
        }

        return () => {
            resizeObserver.disconnect();
        };
    }, [current, isAnimating]);

    const handleDotClick = (idx) => {
        if (idx === current) return;
        setPrev(current);
        setCurrent(idx);
        setIsAnimating(true);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsAnimating(false), 400);
    };
    const handleNext = () => {
        const next = (current + 1) % activities.length;
        handleDotClick(next);
    };
    // Auto-cycle when not paused
    useEffect(() => {
        if (isPaused) return;
        const interval = setInterval(handleNext, 3000);
        return () => clearInterval(interval);
    }, [current, isPaused]);

    return (
        <div
            className="relative w-full"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div 
                ref={containerRef}
                className="overflow-hidden w-full transition-all duration-400 ease-in-out"
                style={{ height: `${containerHeight}px` }}
            >
                <div
                    className="flex w-full"
                    style={{
                        transform: `translateX(-${current * 100}%)`,
                        transition: isAnimating ? 'transform 400ms ease-in-out' : 'none',
                    }}
                >
                    {activities.map((activity, idx) => (
                        <div
                            key={activity.key}
                            data-activity={idx}
                            className="w-full flex-shrink-0"
                        >
                            {activity.component}
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex justify-center mt-1 space-x-2">
                {activities.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleDotClick(idx)}
                        className={`inline-block w-3 h-3 rounded-full focus:outline-none transition-colors ${idx === current ? 'bg-orange-400' : 'bg-gray-600'}`}
                        aria-label={`Go to activity ${idx + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}

export default HomepageActivities;