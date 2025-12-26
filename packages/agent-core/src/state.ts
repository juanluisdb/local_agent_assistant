import type { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";

/**
 * AgentState holds the conversation messages.
 * Using LangGraph's Annotation pattern for reducer-based state updates.
 */
export const AgentStateAnnotation = Annotation.Root({
    messages: Annotation<BaseMessage[]>({
        reducer: messagesStateReducer,
        default: () => [],
    }),
});

export type AgentState = typeof AgentStateAnnotation.State;
