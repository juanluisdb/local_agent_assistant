import { ChatOpenAI } from "@langchain/openai";
import { env } from "../config/env";

let model: ChatOpenAI | null = null;

function getModel() {
    if (!model) {
        model = new ChatOpenAI({
            model: "openai/gpt-4.1-nano",
            streaming: true,
            apiKey: env.OPENROUTER_API_KEY,
            configuration: {
                baseURL: "https://openrouter.ai/api/v1",
            },
        });
    }
    return model;
}

export async function* streamChat(message: string) {
    const stream = await getModel().stream([{ role: "user", content: message }]);
    for await (const chunk of stream) {
        if (chunk.content) {
            yield chunk.content;
        }
    }
}
