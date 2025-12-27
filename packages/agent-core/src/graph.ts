import { StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";
import { AgentStateAnnotation, type AgentState } from "./state";
import { tools } from "./tools";
import { createBaseModel } from "./model";
import { LLMNode } from "./nodes/llm";
import { config } from "./config";

/**
 * Constants for graph node names to avoid magic strings.
 */
export const NODE = {
    AGENT: "agent",
    TOOLS: "tools",
    START: "__start__",
    END: "__end__",
} as const;

export type NodeName = (typeof NODE)[keyof typeof NODE];

/**
 * In-memory checkpointer for persistence.
 */
const checkpointer = new MemorySaver();

/**
 * Build and compile the agent graph for a specific request.
 */
export function createAgentGraph(modelName: string = config.LLM_MODEL) {
    const model = createBaseModel(modelName);

    const llmNode = new LLMNode(model, tools);
    const toolNode = new ToolNode(tools);

    const graph = new StateGraph(AgentStateAnnotation)
        .addNode(NODE.AGENT, (state) => llmNode.invoke(state))
        .addNode(NODE.TOOLS, toolNode)
        .addEdge(NODE.START, NODE.AGENT)
        .addConditionalEdges(NODE.AGENT, shouldContinue, {
            [NODE.TOOLS]: NODE.TOOLS,
            [NODE.END]: NODE.END,
        })
        .addEdge(NODE.TOOLS, NODE.AGENT);

    return graph.compile({ checkpointer });
}

/**
 * Determines the next step based on whether the LLM wants to call tools.
 */
function shouldContinue(state: AgentState): typeof NODE.TOOLS | typeof NODE.END {
    const lastMessage = state.messages[state.messages.length - 1];

    if (
        lastMessage &&
        "tool_calls" in lastMessage &&
        Array.isArray(lastMessage.tool_calls) &&
        lastMessage.tool_calls.length > 0
    ) {
        return NODE.TOOLS;
    }

    return NODE.END;
}

export type { AgentState };
