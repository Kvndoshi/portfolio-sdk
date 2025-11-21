/**
 * ChatInput Component
 * A polished, professional chat interface with history display
 */

import React, { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '../utils/types'

export interface ChatInputProps {
  onSend: (message: string) => Promise<void>
  messages?: ChatMessage[]
  placeholder?: string
  sessionId?: string
  disabled?: boolean
  className?: string
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  messages = [],
  placeholder = 'Ask me anything...',
  disabled = false,
  className = '',
}) => {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || disabled) return

    const message = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      await onSend(message)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={`portfolio-chat-container ${className}`}>
      <style>{`
        .portfolio-chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          max-width: 800px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .portfolio-chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%);
          border-radius: 12px 12px 0 0;
          min-height: 300px;
          max-height: 500px;
        }

        .portfolio-chat-message {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          animation: fadeIn 0.3s ease-in;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .portfolio-chat-message.user {
          flex-direction: row-reverse;
        }

        .portfolio-chat-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .portfolio-chat-avatar.user {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .portfolio-chat-avatar.assistant {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }

        .portfolio-chat-bubble {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 18px;
          line-height: 1.5;
          word-wrap: break-word;
        }

        .portfolio-chat-message.user .portfolio-chat-bubble {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .portfolio-chat-message.assistant .portfolio-chat-bubble {
          background: white;
          color: #1f2937;
          border: 1px solid #e5e7eb;
          border-bottom-left-radius: 4px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .portfolio-chat-form {
          display: flex;
          gap: 12px;
          padding: 16px;
          background: white;
          border-radius: 0 0 12px 12px;
          border-top: 1px solid #e5e7eb;
        }

        .portfolio-chat-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e5e7eb;
          border-radius: 24px;
          font-size: 15px;
          outline: none;
          transition: all 0.2s ease;
          background: #f9fafb;
        }

        .portfolio-chat-input:focus {
          border-color: #667eea;
          background: white;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .portfolio-chat-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .portfolio-chat-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 24px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .portfolio-chat-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .portfolio-chat-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .portfolio-chat-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .portfolio-chat-empty {
          text-align: center;
          color: #9ca3af;
          padding: 60px 20px;
          font-size: 15px;
        }

        .portfolio-chat-empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.5;
        }

        /* Scrollbar styling */
        .portfolio-chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        .portfolio-chat-messages::-webkit-scrollbar-track {
          background: transparent;
        }

        .portfolio-chat-messages::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        .portfolio-chat-messages::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>

      <div className="portfolio-chat-messages">
        {messages.length === 0 ? (
          <div className="portfolio-chat-empty">
            <div className="portfolio-chat-empty-icon">💬</div>
            <div>Start a conversation by asking a question</div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`portfolio-chat-message ${msg.role}`}>
              <div className={`portfolio-chat-avatar ${msg.role}`}>
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="portfolio-chat-bubble">{msg.content}</div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="portfolio-chat-message assistant">
            <div className="portfolio-chat-avatar assistant">🤖</div>
            <div className="portfolio-chat-bubble">Thinking...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="portfolio-chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="portfolio-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading || disabled}
        />
        <button
          type="submit"
          className="portfolio-chat-button"
          disabled={!input.trim() || isLoading || disabled}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

