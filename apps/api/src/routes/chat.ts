import { Elysia, t } from "elysia";
import { streamAgentResponse } from "@agent/core";
import { createUIMessageStreamResponse } from "ai";

export const chatRoutes = new Elysia({ prefix: "/chat" }).post(
    "/",
    async function ({ body }) {
        const { message, model } = body;
        const threadId = body.threadId ?? crypto.randomUUID();

        // Delegate entirely to the core runner
        const stream = await streamAgentResponse(message, {
            modelName: model,
            threadId,
        });

        return createUIMessageStreamResponse({
            stream,
        });
    },
    {
        body: t.Object({
            message: t.String(),
            model: t.Optional(t.String()),
            threadId: t.Optional(t.String()),
        }),
    }
);
