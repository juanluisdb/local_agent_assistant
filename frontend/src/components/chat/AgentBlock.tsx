import { useState } from 'react'
import { DisplayBlockType, type DisplayBlock } from '../../types'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import Markdown from '../common/Markdown'

interface AgentBlockProps {
  block: DisplayBlock
}

function AgentCollapsible({
  icon,
  title,
  children,
  defaultOpen = false,
}: {
  icon: string
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full px-3 py-2 flex items-center gap-2 bg-surface hover:bg-muted rounded-t-lg text-left text-sm cursor-pointer">
        <span className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
          {icon}
        </span>
        <span className="text-muted-foreground">{title}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 py-2 bg-surface rounded-b-lg border-t border-border">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

/**
 * Renders a single display block based on its type.
 */
function AgentBlock({ block }: AgentBlockProps) {
  switch (block.type) {
    case DisplayBlockType.Thinking:
      return (
        <AgentCollapsible icon="💭" title="Thinking...">
          <div className="text-xs text-muted-foreground">
            <Markdown>{block.content}</Markdown>
          </div>
        </AgentCollapsible>
      )

    case DisplayBlockType.AnswerBlock:
      return (
        <div className="text-foreground leading-relaxed">
          <Markdown>{block.content}</Markdown>
        </div>
      )

    case DisplayBlockType.ToolCall:
      return (
        <AgentCollapsible icon="▶" title={`🔧 Calling: ${block.tool_name}`}>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Tool ID: {block.id}</div>
            <pre className="whitespace-pre-wrap font-mono text-xs bg-code-bg text-code-text p-2 rounded">
              {block.tool_input}
            </pre>
          </div>
        </AgentCollapsible>
      )

    case DisplayBlockType.ToolResult:
      return (
        <AgentCollapsible
          icon="▶"
          title={`${block.success ? '✅' : '❌'} Result: ${block.tool_name}`}
        >
          <div className="text-xs">
            <Markdown>{block.tool_output}</Markdown>
          </div>
        </AgentCollapsible>
      )

    default:
      return null
  }
}

export default AgentBlock
