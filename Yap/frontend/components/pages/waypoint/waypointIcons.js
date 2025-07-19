import L from 'leaflet';

// Custom icons for different waypoint types
export const createCustomIcon = (type) => {
    const getColor = (type) => {
        switch (type) {
            case 'food': return '#f59e0b';
            case 'study': return '#3b82f6';
            case 'group': return '#10b981';
            case 'social': return '#8b5cf6';
            case 'event': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getEmoji = (type) => {
        switch (type) {
            case 'food': return '🍕';
            case 'study': return '📚';
            case 'group': return '👥';
            case 'social': return '🎉';
            case 'event': return '📅';
            default: return '📍';
        }
    };

    return L.divIcon({
        className: 'custom-waypoint-marker',
        html: `
            <div style="
                background-color: ${getColor(type)};
                width: 30px;
                height: 30px;
                border-radius: 50% 50% 50% 0;
                border: 3px solid white;
                transform: rotate(-45deg);
                box-shadow: 0 3px 6px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
            ">
                <span style="
                    transform: rotate(45deg); 
                    font-size: 14px;
                    line-height: 1;
                ">${getEmoji(type)}</span>
            </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
        popupAnchor: [0, -30]
    });
};

// Enhanced campus marker icon with label
export const campusIcon = L.divIcon({
    className: 'campus-marker',
    html: `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        ">
            <div style="
                background-color: #dc2626;
                width: 45px;
                height: 45px;
                border-radius: 50%;
                border: 4px solid white;
                box-shadow: 0 4px 8px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 20px;
                margin-bottom: 2px;
            ">🏫</div>
            <div style="
                background-color: rgba(220, 38, 38, 0.95);
                color: white;
                padding: 4px 8px;
                border-radius: 12px;
                font-family: 'Albert Sans', sans-serif;
                font-size: 12px;
                font-weight: bold;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                border: 2px solid white;
            ">TMU Campus</div>
        </div>
    `,
    iconSize: [60, 70],
    iconAnchor: [30, 35],
    popupAnchor: [0, -35]
});

// Student Learning Centre (SLC) marker icon
export const slcIcon = L.divIcon({
    className: 'slc-marker',
    html: `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        ">
            <div style="
                background-color: #2563eb;
                width: 38px;
                height: 38px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 3px 6px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                margin-bottom: 2px;
            ">📚</div>
            <div style="
                background-color: rgba(37, 99, 235, 0.95);
                color: white;
                padding: 3px 6px;
                border-radius: 10px;
                font-family: 'Albert Sans', sans-serif;
                font-size: 11px;
                font-weight: bold;
                white-space: nowrap;
                box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                border: 2px solid white;
            ">SLC</div>
        </div>
    `,
    iconSize: [55, 60],
    iconAnchor: [27, 30],
    popupAnchor: [0, -30]
});