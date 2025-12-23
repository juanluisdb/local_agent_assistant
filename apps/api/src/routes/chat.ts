import { Elysia, sse, t } from "elysia";
import { streamChat } from "../services/llm";

export const chatRoutes = new Elysia({ prefix: "/chat" }).post(
    "/",
    async function* ({ body }) {
        for await (const chunk of streamChat(body.message)) {
            yield sse({ data: chunk });
        }
    },
    {
        body: t.Object({
            message: t.String(),
        }),
    }
);
