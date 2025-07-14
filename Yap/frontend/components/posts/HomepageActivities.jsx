import { useState, useRef } from "react";
import WouldYouRather from "../events/WouldYouRather";

function PlaceholderActivity({ title }) {
    return (
        <div className="flex flex-col items-center justify-center h-80 rounded-lg bg-gray-800 text-gray-400 font-bold text-xl shadow-md w-full">
            <span>{title}</span>
            <span className="mt-2 text-sm">(Coming soon)</span>
        </div>
    );
}

const activities = [
    {
        key: "placeholder1",
        component: <PlaceholderActivity title="Activity 1" />,
    },
    {
        key: "wouldyourather",
        component: <WouldYouRather />,
    },
    {
        key: "placeholder2",
        component: <PlaceholderActivity title="Activity 2" />,
    },
];

function HomepageActivities() {
    const [current, setCurrent] = useState(1); // Start on WouldYouRather
    const [prev, setPrev] = useState(1);
    const [isAnimating, setIsAnimating] = useState(false);
    const timeoutRef = useRef(null);

    const handleDotClick = (idx) => {
        if (idx === current) return;
        setPrev(current);
        setCurrent(idx);
        setIsAnimating(true);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setIsAnimating(false), 400);
    };

    const direction = current > prev ? 1 : -1;

    return (
        <div className="relative w-full">
            <div className="flex items-center justify-center mb-2">
                <span className="text-white font-semibold text-lg">Activities</span>
            </div>
            <div className="overflow-hidden w-full h-80">
                <div
                    className={`flex w-full h-80`}
                    style={{
                        position: 'relative',
                        height: '100%',
                    }}
                >
                    {activities.map((activity, idx) => {
                        let translate = 0;
                        if (idx === current) {
                            translate = 0;
                        } else if (idx < current) {
                            translate = -100;
                        } else {
                            translate = 100;
                        }
                        // Animate only current and previous
                        const isActive = idx === current || idx === prev;
                        return isActive ? (
                            <div
                                key={activity.key}
                                className="absolute top-0 left-0 w-full h-full transition-transform duration-400 ease-in-out"
                                style={{
                                    transform: isAnimating
                                        ? `translateX(${(idx - current) * 100}%)`
                                        : `translateX(${translate}%)`,
                                    zIndex: idx === current ? 2 : 1,
                                }}
                            >
                                {activity.component}
                            </div>
                        ) : null;
                    })}
                </div>
            </div>
            <div className="flex justify-center mt-4 space-x-2">
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