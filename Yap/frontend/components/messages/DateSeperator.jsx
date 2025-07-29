import { formatDateSeparator } from './utils/easternTimeUtils';

function DateSeparator({ createdAt }) {
    return (
        <div className="flex items-center justify-center my-4">
            <div className="bg-gray-600 text-gray-300 px-3 py-1 rounded-full text-xs">
                {formatDateSeparator(createdAt)}
            </div>
        </div>
    );
}

export default DateSeparator;