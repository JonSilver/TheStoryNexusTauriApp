import { attemptPromise } from "@jfdi/attempt";

interface ChatCompletionChunk {
    choices: Array<{
        delta?: {
            content?: string;
        };
    }>;
}

/**
 * Wraps an OpenAI-compatible async streaming response into a Web API Response with ReadableStream.
 *
 * This utility consolidates the duplicated stream wrapping logic used by AI providers
 * to convert OpenAI SDK stream format into a standard Response object with ReadableStream.
 *
 * @param stream - The async iterable stream from OpenAI SDK
 * @returns A Response object with a ReadableStream body containing the text chunks
 */
export const wrapOpenAIStream = async (stream: AsyncIterable<ChatCompletionChunk>): Promise<Response> =>
    new Response(
        new ReadableStream({
            async start(controller) {
                const [error] = await attemptPromise(async () => {
                    for await (const chunk of stream) {
                        const content = chunk.choices[0]?.delta?.content;
                        if (content) {
                            controller.enqueue(new TextEncoder().encode(content));
                        }
                    }
                });

                if (error) {
                    controller.error(error);
                } else {
                    controller.close();
                }
            }
        })
    );
