import { useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';

/**
 * Custom hook wrapping AI SDK's useChat with our API format.
 * Transforms the UIMessage format to work with our backend.
 */
export function useAgentChat() {
    const [threadId] = useState(() => crypto.randomUUID());

    const chat = useChat({
        transport: new DefaultChatTransport({
            api: '/api/chat',
            // Transform to our custom API format
            prepareSendMessagesRequest: ({ messages }) => {
                // Extract the latest user message text
                const lastMessage = messages[messages.length - 1];
                const messageText =
                    lastMessage?.parts?.find((p) => p.type === 'text')?.text ?? '';

                return {
                    body: {
                        message: messageText,
                        threadId,
                    },
                };
            },
        }),
    });

    return {
        ...chat,
        threadId,
    };
}
