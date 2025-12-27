/**
 * Formats data according to the Vercel AI SDK Data Stream Protocol (part 'd').
 * @see https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol#data-part
 */
export function formatDataStreamPart(data: unknown): string {
    return `d: ${JSON.stringify(data)}\n`;
}

/**
 * Prepends a data object to a stream using the Vercel AI SDK Data Stream Protocol.
 * Useful for sending metadata like threadIds at the start of a response.
 */
export function prependDataToStream(
    stream: ReadableStream,
    data: unknown
): ReadableStream {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
        try {
            await writer.write(encoder.encode(formatDataStreamPart(data)));
            writer.releaseLock();
            await stream.pipeTo(writable);
        } catch (error) {
            // Ensure error propagates if something fails before piping
            // pipeTo handles stream errors automatically, but write() might fail
            writer.abort(error).catch(() => { });
        }
    })();

    return readable;
}
