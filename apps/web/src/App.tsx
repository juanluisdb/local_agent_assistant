import './index.css';
import { MessageList, ChatInput, useAgentChat } from '@/features/chat';

function App() {
  const { messages, sendMessage, status } = useAgentChat();
  const isStreaming = status === 'streaming' || status === 'submitted';

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <header className="p-4 border-b border-border">
        <h1 className="text-xl font-bold">Agent Chat</h1>
        <p className="text-sm text-muted-foreground">
          {messages.length} message{messages.length !== 1 ? 's' : ''} in conversation
        </p>
      </header>

      <main className="flex-1 overflow-y-auto min-h-0 p-4">
        <div className="max-w-2xl mx-auto">
          <MessageList messages={messages} isStreaming={isStreaming} />
        </div>
      </main>

      <footer className="flex-shrink-0 p-4 border-t border-border">
        <div className="max-w-2xl mx-auto">
          <ChatInput
            onSend={(text) => sendMessage({ text })}
            disabled={isStreaming}
          />
        </div>
      </footer>
    </div>
  );
}

export default App;