import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

interface MarkdownProps {
    children: string;
}

const components: Components = {
    // Table styling
    table: ({ children }) => (
        <table className="border-collapse border border-border my-2 w-full text-sm">{children}</table>
    ),
    thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
    th: ({ children }) => (
        <th className="border border-border px-3 py-1 text-left font-medium">{children}</th>
    ),
    td: ({ children }) => <td className="border border-border px-3 py-1">{children}</td>,
    // Code styling
    code: ({ children, ...props }) => {
        const isInline = !props.className;
        return isInline ? (
            <code className="bg-code-bg text-code-text px-1.5 py-0.5 rounded text-sm">{children}</code>
        ) : (
            <code className="block bg-code-bg text-code-text p-3 rounded-lg overflow-x-auto">
                {children}
            </code>
        );
    },
    // Link styling
    a: ({ children, href }) => (
        <a
            href={href}
            className="text-primary hover:text-primary/80 underline underline-offset-2"
            target="_blank"
            rel="noopener noreferrer"
        >
            {children}
        </a>
    ),
    // Paragraph
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    // Lists
    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
    // Headings
    h1: ({ children }) => <h1 className="text-2xl font-bold mb-3 mt-4 first:mt-0">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-semibold mb-2 mt-3 first:mt-0">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-medium mb-2 mt-2 first:mt-0">{children}</h3>,
    // Blockquote
    blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-2">
            {children}
        </blockquote>
    ),
};

export function Markdown({ children }: MarkdownProps) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {children}
        </ReactMarkdown>
    );
}
