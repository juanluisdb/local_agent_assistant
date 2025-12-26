import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * A simple tool that writes content to a file.
 * For safety, this writes to a sandboxed directory.
 */
export const writeFileTool = tool(
    async ({ path, content }) => {
        // Sandbox: prefix all paths with ./agent-output/
        const safePath = `./agent-output/${path}`;

        // Ensure directory exists
        mkdirSync(dirname(safePath), { recursive: true });

        // Write the file
        writeFileSync(safePath, content, "utf-8");

        return `Successfully wrote ${content.length} bytes to ${safePath}`;
    },
    {
        name: "writeFile",
        description: "Write content to a file. The path is relative to the agent-output directory.",
        schema: z.object({
            path: z.string().describe("The file path (relative, e.g. 'test.txt' or 'folder/file.md')"),
            content: z.string().describe("The content to write to the file"),
        }),
    }
);
