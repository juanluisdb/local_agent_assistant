import { ChatOpenAI } from "@langchain/openai";
import { config } from "./config";

/**
 * Creates a base chat model instance.
 * currently only supports OpenAI-compatible endpoints via specific config.
 */
export function createBaseModel(modelName: string) {
    return new ChatOpenAI({
        model: modelName,
        streaming: true,
        apiKey: config.OPENROUTER_API_KEY,
        configuration: {
            baseURL: config.LLM_BASE_URL,
        },
    });
}
