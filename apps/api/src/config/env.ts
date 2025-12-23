import { z } from "zod";

const envSchema = z.object({
    OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
});

export const env = envSchema.parse(process.env);
