import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface MarkdownProps {
  children: string
}

const components: Components = {
  // Table styling
  table: ({ children }) => (
    <table className="border-collapse border border-gray-600 my-2 w-full text-sm">{children}</table>
  ),
  thead: ({ children }) => <thead className="bg-gray-700">{children}</thead>,
  th: ({ children }) => (
    <th className="border border-gray-600 px-3 py-1 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="border border-gray-600 px-3 py-1">{children}</td>,
  // Code styling - inline only, blocks handled separately
  code: ({ children, ...props }) => {
    // Check if it's inline code (no parent pre tag)
    const isInline = !props.className
    return isInline ? (
      <code className="bg-gray-700 px-1 py-0.5 rounded text-sm">{children}</code>
    ) : (
      <code className="block bg-gray-800 p-2 rounded overflow-x-auto">{children}</code>
    )
  },
  // Link styling
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-blue-400 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  // Paragraph - remove default margins for cleaner look
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
}

export default function Markdown({ children }: MarkdownProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {children}
    </ReactMarkdown>
  )
}
