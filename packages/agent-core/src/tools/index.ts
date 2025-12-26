import { writeFileTool } from "./writeFile";

/**
 * All available tools for the agent.
 * Add new tools here to make them available to the LLM.
 */
export const tools = [writeFileTool];
