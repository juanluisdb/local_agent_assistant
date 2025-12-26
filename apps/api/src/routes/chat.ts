import { Elysia, t } from "elysia";
import { streamAgentResponse } from "@agent/core";
import { createUIMessageStreamResponse } from "ai";

export const chatRoutes = new Elysia({ prefix: "/chat" }).post(
    "/",
    async function ({ body }) {
        const { message, model } = body;

        // Delegate entirely to the core runner
        const stream = await streamAgentResponse(message, { modelName: model });

        return createUIMessageStreamResponse({ stream });
    },
    {
        body: t.Object({
            message: t.String(),
            model: t.Optional(t.String()),
        }),
    }
);
