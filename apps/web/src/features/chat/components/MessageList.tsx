import type { UIMessage } from '@ai-sdk/react';
import { MessageBlock } from './MessageBlock';

interface MessageListProps {
    messages: UIMessage[];
    isStreaming: boolean;
}

/**
 * Displays a list of chat messages with streaming indicator.
 */
export function MessageList({ messages, isStreaming }: MessageListProps) {
    if (messages.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-12">
                Send a message to start the conversation
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {messages.map((message) => (
                <MessageBlock key={message.id} message={message} />
            ))}

            {isStreaming && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                    Agent is responding...
                </div>
            )}
        </div>
    );
}
