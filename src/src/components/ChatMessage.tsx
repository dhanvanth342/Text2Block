import { User, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 mb-4 animate-fade-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar - Only show for assistant */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-electric-blue to-purple-600 flex items-center justify-center">
          <Bot size={16} className="text-white" />
        </div>
      )}

      {/* Message Content */}
      <div className={`max-w-[70%] ${isUser ? 'order-first' : ''}`}>
        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-br from-electric-blue to-blue-600 text-white'
              : 'glass-surface border border-white/10 text-gray-100'
          }`}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed">{content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  // Style markdown elements
                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                  code: ({ inline, children, ...props }: any) =>
                    inline ? (
                      <code className="bg-black/30 px-1.5 py-0.5 rounded text-electric-blue text-xs" {...props}>
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-black/30 p-3 rounded-lg text-xs overflow-x-auto" {...props}>
                        {children}
                      </code>
                    ),
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                  strong: ({ children }) => <strong className="text-white">{children}</strong>,
                  em: ({ children }) => <em className="text-purple-300">{children}</em>,
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <p className="text-xs text-gray-500 mt-1 px-2">
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* Avatar - Only show for user */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center">
          <User size={16} className="text-white" />
        </div>
      )}
    </div>
  );
}
