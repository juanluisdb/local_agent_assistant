import { z } from "zod";

const configSchema = z.object({
    OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
    LLM_MODEL: z.string().default("openai/gpt-4.1-nano"),
    LLM_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
});

export const config = configSchema.parse(process.env);

export type Config = z.infer<typeof configSchema>;
