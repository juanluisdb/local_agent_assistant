import { greet } from '@shared/core';

const server = Bun.serve({
    port: 3000,
    fetch(req) {
        const url = new URL(req.url);

        if (url.pathname === '/api/greet') {
            const name = url.searchParams.get('name') || 'World';
            return Response.json({
                message: greet(name),
                timestamp: new Date().toISOString()
            });
        }

        if (url.pathname === '/api/users') {
            return Response.json({
                users: [
                    { id: '1', name: 'Alice', email: '[email protected]' },
                    { id: '2', name: 'Bob', email: '[email protected]' }
                ]
            });
        }

        return new Response('Not Found', { status: 404 });
    },
});

console.log(`🚀 Server running at http://localhost:${server.port}`);