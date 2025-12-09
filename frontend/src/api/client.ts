import { fetchEventSource } from '@microsoft/fetch-event-source'
import type { AgentEvent } from '../types'

export async function* sendMessage(userMessage: string): AsyncGenerator<AgentEvent> {
  const eventQueue: AgentEvent[] = []
  let done = false
  let error: Error | null = null

  let resolveNext: (() => void) | null = null

  const waitForNext = () =>
    new Promise<void>((resolve) => {
      resolveNext = resolve
    })

  const fetchPromise = fetchEventSource('/api/chat/interaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_message: userMessage }),

    onmessage(event) {
      try {
        const data = JSON.parse(event.data) as AgentEvent
        eventQueue.push(data)
        // Notify the generator that a new event is available
        resolveNext?.()
      } catch (e) {
        console.error('Failed to parse event:', event.data, e)
      }
    },

    onclose() {
      done = true
      resolveNext?.()
    },

    onerror(err) {
      error = err instanceof Error ? err : new Error(String(err))
      done = true
      resolveNext?.()
      throw err // Rethrow to stop retrying
    },

    // Don't retry on error for this use case
    openWhenHidden: true,
  })

  try {
    while (!done || eventQueue.length > 0) {
      if (eventQueue.length > 0) {
        yield eventQueue.shift()!
      } else if (!done) {
        await waitForNext()
      }
    }

    if (error) {
      throw error
    }
  } finally {
    await fetchPromise.catch(() => {})
  }
}
