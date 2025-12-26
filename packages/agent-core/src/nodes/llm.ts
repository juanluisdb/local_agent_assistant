import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { StructuredTool } from "@langchain/core/tools";
import type { AgentState } from "../state";

export class LLMNode {
    private modelWithTools: any; // Type 'any' for simplicity with bound models, or Runnable

    constructor(model: BaseChatModel, tools: StructuredTool[]) {
        if (!model.bindTools) {
            throw new Error("Model does not support tool binding");
        }
        this.modelWithTools = model.bindTools(tools);
    }

    async invoke(state: AgentState) {
        const response = await this.modelWithTools.invoke(state.messages);
        return { messages: [response] };
    }
}
