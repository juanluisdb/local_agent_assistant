import { useState } from 'react'
import { useChat } from './hooks/useChat'
import AgentBlock from './components/chat/AgentBlock'

function App() {
  const { turns, isLoading, sendMessage } = useChat()
  const [inputValue, setInputValue] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleSend = () => {
    if (inputValue.trim() === '' || isLoading) return
    sendMessage(inputValue)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      <header className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold">Agent Chat</h1>
        <p className="text-sm text-gray-400">
          {turns.length} turn{turns.length !== 1 ? 's' : ''} in conversation
        </p>
      </header>

      <main className="flex-1 overflow-y-auto min-h-0 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {turns.length === 0 && (
            <div className="text-center text-gray-500 py-12">
              Send a message to start the conversation
            </div>
          )}

          {turns.map((turn) => (
            <div key={turn.id} className="space-y-4">
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-lg max-w-md">
                  {turn.userMessage.content}
                </div>
              </div>

              <div className="space-y-3">
                {turn.blocks.map((block, blockIndex) => (
                  <AgentBlock key={blockIndex} block={block} />
                ))}
              </div>

              {turn.isStreaming && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></div>
                  Agent is responding...
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      <footer className="flex-shrink-0 p-4 border-t border-gray-700">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 
                       text-white placeholder-gray-400 focus:outline-none focus:border-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium
                       transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </footer>
    </div>
  )
}

export default App
