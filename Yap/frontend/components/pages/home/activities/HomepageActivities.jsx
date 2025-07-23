import { useState, useRef, useEffect } from "react";
import WouldYouRather from "../activities/WouldYouRather";

function PlaceholderActivity({ title }) {
    return (
        <div className="flex flex-col items-center justify-center h-40 rounded-lg text-gray-400 font-bold text-xl shadow-md w-full" style={{ backgroundColor: '#171717' }}>
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
        key: "placeholder1",
        component: <PlaceholderActivity title="Activity 2" />,
    },
    {
        key: "placeholder2",
        component: <PlaceholderActivity title="Activity 3" />,
    },
];

function HomepageActivities() {
    const [current, setCurrent] = useState(0); // Start on WouldYouRather (now index 0)
    const [prev, setPrev] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [containerHeight, setContainerHeight] = useState(240);
    const timeoutRef = useRef(null);
    const containerRef = useRef(null);

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

    return (
        <div className="relative w-full">
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