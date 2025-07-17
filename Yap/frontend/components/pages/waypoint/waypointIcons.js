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

// Campus marker icon
export const campusIcon = L.divIcon({
    className: 'campus-marker',
    html: `
        <div style="
            background-color: #dc2626;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 4px solid white;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
        ">🏫</div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
});