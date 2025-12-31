import { useState } from 'react';
import type { UIMessage } from '@ai-sdk/react';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Markdown } from '@/shared/components/Markdown';

interface MessageBlockProps {
    message: UIMessage;
}

/**
 * Collapsible wrapper for tool calls and thinking blocks
 */
function AgentCollapsible({
    icon,
    title,
    children,
    defaultOpen = false,
}: {
    icon: string;
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="w-full px-3 py-2 flex items-center gap-2 bg-surface hover:bg-muted rounded-t-lg text-left text-sm cursor-pointer">
                <span className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
                    {icon}
                </span>
                <span className="text-muted-foreground">{title}</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 py-2 bg-surface rounded-b-lg border-t border-border">
                {children}
            </CollapsibleContent>
        </Collapsible>
    );
}

/**
 * Renders a message from the AI SDK UIMessage format.
 * Handles text, tool calls, and tool results via message parts.
 */
export function MessageBlock({ message }: MessageBlockProps) {
    if (message.role === 'user') {
        // User messages displayed on the right
        return (
            <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg max-w-md">
                    {message.parts?.map((part, idx) => {
                        if (part.type === 'text') {
                            return <span key={idx}>{part.text}</span>;
                        }
                        return null;
                    })}
                </div>
            </div>
        );
    }

    // Assistant messages with various part types
    return (
        <div className="space-y-3">
            {message.parts?.map((part, idx) => {
                // Handle text parts
                if (part.type === 'text') {
                    return (
                        <div key={idx} className="text-foreground leading-relaxed">
                            <Markdown>{part.text}</Markdown>
                        </div>
                    );
                }

                // Handle reasoning/thinking parts
                if (part.type === 'reasoning') {
                    return (
                        <AgentCollapsible key={idx} icon="💭" title="Thinking...">
                            <div className="text-xs text-muted-foreground">
                                <Markdown>{part.text}</Markdown>
                            </div>
                        </AgentCollapsible>
                    );
                }

                // Handle tool parts (dynamic-tool type from AI SDK)
                if (part.type === 'dynamic-tool') {
                    const toolName = 'toolName' in part ? String(part.toolName) : 'unknown';
                    const toolCallId = 'toolCallId' in part ? part.toolCallId : 'unknown';
                    const state = 'state' in part ? part.state : 'unknown';
                    const isComplete = state === 'output-available' || state === 'output-error';

                    if (isComplete) {
                        const success = state === 'output-available';
                        const output = 'output' in part ? part.output : undefined;
                        return (
                            <AgentCollapsible
                                key={idx}
                                icon="▶"
                                title={`${success ? '✅' : '❌'} Result: ${toolName}`}
                            >
                                <div className="text-xs">
                                    <Markdown>
                                        {typeof output === 'string'
                                            ? output
                                            : JSON.stringify(output, null, 2)}
                                    </Markdown>
                                </div>
                            </AgentCollapsible>
                        );
                    } else {
                        // Tool in progress
                        const input = 'input' in part ? part.input : undefined;
                        return (
                            <AgentCollapsible
                                key={idx}
                                icon="▶"
                                title={`🔧 Calling: ${toolName}`}
                            >
                                <div className="space-y-2">
                                    <div className="text-xs text-muted-foreground">
                                        Tool ID: {toolCallId} | State: {state}
                                    </div>
                                    <pre className="whitespace-pre-wrap font-mono text-xs bg-code-bg text-code-text p-2 rounded">
                                        {JSON.stringify(input, null, 2)}
                                    </pre>
                                </div>
                            </AgentCollapsible>
                        );
                    }
                }

                // Unknown part type - log for debugging
                console.log('Unknown message part type:', part);
                return null;
            })}
        </div>
    );
}
