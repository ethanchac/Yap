function EmojiPicker({ onEmojiClick }) {
    // Common emojis for the picker
    const emojis = [
        '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
        '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚',
        '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭',
        '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄',
        '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢',
        '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸',
        '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲',
        '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱',
        '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠',
        '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻',
        '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽',
        '🙀', '😿', '😾', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤',
        '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘',
        '💝', '💟', '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🤟',
        '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚',
        '🖐️', '✋', '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️'
    ];

    return (
        <div className="absolute bottom-full left-0 mb-2 bg-gray-700 border border-gray-600 rounded-lg shadow-lg p-3 w-80 h-64 overflow-y-auto z-50">
            <div className="grid grid-cols-8 gap-2">
                {emojis.map((emoji, index) => (
                    <button
                        key={index}
                        type="button"
                        onClick={() => onEmojiClick(emoji)}
                        className="text-xl hover:bg-gray-600 p-2 rounded transition-colors"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default EmojiPicker;