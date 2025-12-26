import { HumanMessage } from "@langchain/core/messages";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { createAgentGraph } from "./graph";

/**
 * Executes the agent with the given message and returns a stream 
 * conforming to the Vercel AI SDK Data Stream Protocol.
 * 
 * @param message The human message to send.
 * @param options Optional configuration including threadId and modelName.
 */
export async function streamAgentResponse(
    message: string,
    options: {
        threadId?: string;
        modelName?: string;
    } = {}
) {
    const { threadId, modelName } = options;

    // Create the graph for this request
    const agentGraph = createAgentGraph(modelName);

    // Create human message
    const humanMessage = new HumanMessage(message);

    // Stream the graph
    const stream = await agentGraph.stream(
        { messages: [humanMessage] },
        {
            streamMode: ["messages", "custom"],
            configurable: { thread_id: threadId }
        }
    );

    // Convert to AI SDK UI Message Stream
    return toUIMessageStream(stream);
}
