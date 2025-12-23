import { Elysia } from "elysia";
import { chatRoutes } from "./routes/chat";

const app = new Elysia()
    .use(chatRoutes)
    .get("/health", () => ({ status: "ok" }))
    .listen(3000);

console.log(`🚀 Server running at http://localhost:${app.server?.port}`);