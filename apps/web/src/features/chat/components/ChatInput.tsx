import { useState } from 'react';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

/**
 * Chat input component with send button and enter key support.
 */
export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
    const [inputValue, setInputValue] = useState('');

    const handleSend = () => {
        if (inputValue.trim() === '' || disabled) return;
        onSend(inputValue);
        setInputValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex gap-2">
            <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                disabled={disabled}
                className="flex-1 bg-surface border border-border rounded-lg px-4 py-2 
                   text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring
                   disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
                onClick={handleSend}
                disabled={disabled}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg font-medium
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {disabled ? '...' : 'Send'}
            </button>
        </div>
    );
}
