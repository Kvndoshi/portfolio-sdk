'use client'

import React, { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../utils/types'

export interface AutoChatProps {
  // === API & Behavior ===
  apiPath?: string                      // Backend API endpoint (default: '/api/chat')
  placeholder?: string                  // Input placeholder text (default: 'Ask me anything...')
  className?: string                    // Additional CSS classes
  collapseOnOutsideClick?: boolean      // Auto-collapse when clicking outside (default: false)
  
  // === Layout & Sizing ===
  inputHeight?: string                  // Height of input field (default: '56px')
  maxChatHeight?: string                // Max height of messages area when expanded (default: 'min(60vh, 500px)')
  maxWidth?: string                     // Width of entire chat widget (default: '800px')
  
  // === Outer Container (Main Chat Box) ===
  chatContainerBackground?: string      // Background of entire chat box (default: 'white')
  chatContainerShadow?: string          // Shadow around chat box (default: '0 4px 24px rgba(0,0,0,0.08)')
  chatContainerShadowExpanded?: string  // Shadow when expanded (default: '0 20px 60px rgba(0,0,0,0.15)')
  
  // === Input Area (Bottom Section) ===
  inputAreaBackground?: string          // Background of input wrapper section (default: 'rgba(249,250,251,0.8)')
  inputAreaBorderTop?: string           // Border between messages and input (default: '1px solid rgba(229,231,235,0.8)')
  
  // === Input Field (Text Box) ===
  inputFieldBackground?: string         // Background of text input (default: 'rgba(255,255,255,0.95)')
  inputFieldBorderColor?: string        // Input border color (default: 'rgba(209,213,219,0.8)')
  inputFieldFocusBorderColor?: string   // Input border when focused (default: 'rgba(147,51,234,0.6)')
  inputFieldFocusShadow?: string        // Shadow when input is focused (default: '0 0 0 3px rgba(147,51,234,0.2)')
  inputTextColor?: string               // Color of text you type (default: '#1f2937')
  inputPlaceholderColor?: string        // Color of placeholder text (default: 'rgba(107,114,128,0.6)')
  
  // === Typography ===
  fontSize?: string                     // Text size throughout (default: '15px')
  fontFamily?: string                   // Font family (default: 'system-ui, -apple-system, sans-serif')
  
  // === Borders & Corners ===
  borderRadius?: string                 // Corner roundness (default: '16px')
  borderWidth?: string                  // Border thickness (default: '1px')
  
  // === Message Bubbles ===
  userMessageBackground?: string        // Your messages background (default: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)')
  userMessageTextColor?: string         // Your messages text color (default: '#ffffff')
  userMessageShadow?: string            // Shadow on your messages (default: '0 4px 16px rgba(139,92,246,0.3)')
  assistantMessageBackground?: string   // AI messages background (default: 'rgba(243,244,246,0.95)')
  assistantMessageTextColor?: string    // AI messages text color (default: '#1f2937')
  assistantMessageBorderColor?: string  // AI messages border (default: 'rgba(209,213,219,0.8)')
  messagePadding?: string               // Padding inside message bubbles (default: '12px 16px')
  messageGap?: string                   // Space between messages (default: '12px')
  
  // === Submit Button ===
  submitButtonSize?: string             // Width & height of submit button (default: '40px')
  submitButtonBackground?: string       // Button background (default: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)')
  submitButtonIconColor?: string        // Arrow icon color (default: '#ffffff')
  submitButtonHoverShadow?: string      // Shadow on hover (default: '0 8px 20px rgba(139,92,246,0.4)')
  
  // === Scrollbar ===
  scrollbarWidth?: string               // Width of scrollbar (default: '6px')
  scrollbarThumbColor?: string          // Scrollbar handle color (default: 'rgba(156,163,175,0.4)')
  scrollbarThumbHoverColor?: string     // Scrollbar handle on hover (default: 'rgba(107,114,128,0.6)')
  scrollbarTrackColor?: string          // Scrollbar track color (default: 'transparent')
  
  // === Animation ===
  expandAnimationDuration?: string      // Speed of expand/collapse (default: '0.4s')
  
  // === Thinking Indicator ===
  thinkingDotColor?: string            // Color of thinking dots (default: '#9ca3af')
}

const generateSessionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `session_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`
}

/**
 * AutoChat - Sleek, modern, universal chat component
 * 
 * Starts as a minimal input bar with submit arrow
 * Expands smoothly upward to show conversation
 * Collapses on outside click, preserves history on re-expand
 */
export const AutoChat: React.FC<AutoChatProps> = ({
  // API & Behavior
  apiPath = '/api/chat',
  placeholder = 'Ask me anything...',
  className = '',
  collapseOnOutsideClick = false,
  
  // Layout & Sizing
  inputHeight = '56px',
  maxChatHeight = 'min(60vh, 500px)',
  maxWidth = '800px',
  
  // Outer Container
  chatContainerBackground = 'white',
  chatContainerShadow = '0 4px 24px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
  chatContainerShadowExpanded = '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.08)',
  
  // Input Area
  inputAreaBackground = 'rgba(249, 250, 251, 0.8)',
  inputAreaBorderTop = '1px solid rgba(229, 231, 235, 0.8)',
  
  // Input Field
  inputFieldBackground = 'rgba(255, 255, 255, 0.95)',
  inputFieldBorderColor = 'rgba(209, 213, 219, 0.8)',
  inputFieldFocusBorderColor = 'rgba(147, 51, 234, 0.6)',
  inputFieldFocusShadow = '0 0 0 3px rgba(147, 51, 234, 0.2)',
  inputTextColor = '#1f2937',
  inputPlaceholderColor = 'rgba(107, 114, 128, 0.6)',
  
  // Typography
  fontSize = '15px',
  fontFamily = 'system-ui, -apple-system, sans-serif',
  
  // Borders & Corners
  borderRadius = '16px',
  borderWidth = '1px',
  
  // Message Bubbles
  userMessageBackground = 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  userMessageTextColor = '#ffffff',
  userMessageShadow = '0 4px 16px rgba(139, 92, 246, 0.3)',
  assistantMessageBackground = 'rgba(243, 244, 246, 0.95)',
  assistantMessageTextColor = '#1f2937',
  assistantMessageBorderColor = 'rgba(209, 213, 219, 0.8)',
  messagePadding = '12px 16px',
  messageGap = '12px',
  
  // Submit Button
  submitButtonSize = '40px',
  submitButtonBackground = 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
  submitButtonIconColor = '#ffffff',
  submitButtonHoverShadow = '0 8px 20px rgba(139, 92, 246, 0.4)',
  
  // Scrollbar
  scrollbarWidth = '6px',
  scrollbarThumbColor = 'rgba(156, 163, 175, 0.4)',
  scrollbarThumbHoverColor = 'rgba(107, 114, 128, 0.6)',
  scrollbarTrackColor = 'transparent',
  
  // Animation
  expandAnimationDuration = '0.4s',
  
  // Thinking Indicator
  thinkingDotColor = '#9ca3af'
}) => {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize session
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('portfolioSessionId') : null
    if (stored) {
      setSessionId(stored)
    } else {
      const newId = generateSessionId()
      if (typeof window !== 'undefined') {
        localStorage.setItem('portfolioSessionId', newId)
      }
      setSessionId(newId)
    }
  }, [])

  // Auto-scroll to bottom (only scroll the chat container, not the page)
  useEffect(() => {
    if (isExpanded && messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, isExpanded])

  // Collapse on outside click (optional)
  useEffect(() => {
    if (!collapseOnOutsideClick) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isExpanded, collapseOnOutsideClick])

  const sendMessage = async () => {
    if (!input.trim() || !sessionId || isSending) return

    const message = input.trim()
    console.log('[AutoChat] Sending message:', message)
    setInput('')
    setIsSending(true)
    setError(null)
    setIsExpanded(true)

    const userEntry: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: Date.now()
    }

    // Add thinking indicator immediately
    const thinkingEntry: ChatMessage = {
      role: 'assistant',
      content: '●●●',  // Thinking indicator
      timestamp: Date.now()
    }

    const history = [...messages, userEntry, thinkingEntry]
    setMessages(history)
    console.log('[AutoChat] Messages state updated, total:', history.length)

    try {
      console.log('[AutoChat] Fetching from:', apiPath)
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId, history: [...messages, userEntry] })
      })

      console.log('[AutoChat] Response status:', response.status)
      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`)
      }

      const contentType = response.headers.get('content-type')
      console.log('[AutoChat] Content-Type:', contentType)
      
      // Check if response is streaming (Server-Sent Events)
      if (contentType?.includes('text/event-stream') || contentType?.includes('text/plain')) {
        // STREAMING MODE - Progressive response
        console.log('[AutoChat] STREAMING MODE detected')
        
        const reader = response.body?.getReader()
        const decoder = new TextDecoder()
        
        if (reader) {
          let streamedContent = ''
          let chunkCount = 0
          
          console.log('[AutoChat] Starting to read stream...')
          
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                console.log('[AutoChat] Stream complete. Total chunks:', chunkCount, 'Content length:', streamedContent.length)
                break
              }
              
              chunkCount++
              const chunk = decoder.decode(value, { stream: true })
              console.log(`[AutoChat] Chunk ${chunkCount}:`, chunk)
              
              // Just append the raw chunk - toTextStreamResponse() sends plain text
              streamedContent += chunk
              
              // Update UI with accumulated content
              console.log('[AutoChat] Updating UI with content length:', streamedContent.length)
              setMessages(prev => {
                const newMessages = [...prev]
                newMessages[newMessages.length - 1] = {
                  role: 'assistant',
                  content: streamedContent,
                  timestamp: Date.now()
                }
                return newMessages
              })
            }
          } catch (streamError) {
            console.error('[AutoChat] Stream reading error:', streamError)
          }
          
          console.log('[AutoChat] Final content length:', streamedContent.length)
          console.log('[AutoChat] Final content preview:', streamedContent.substring(0, 200))
          
          // Final update with complete content
          if (streamedContent) {
            console.log('[AutoChat] ✅ Stream completed successfully')
            setMessages(prev => {
              const newMessages = [...prev]
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: streamedContent,
                timestamp: Date.now()
              }
              return newMessages
            })
          } else {
            console.error('[AutoChat] ⚠️ NO CONTENT RECEIVED!')
          }
        } else {
          console.error('[AutoChat] ❌ No reader available!')
        }
      } else {
        // NON-STREAMING MODE - Full response at once
        console.log('[AutoChat] Using non-streaming mode')
        const data = await response.json()
        console.log('[AutoChat] Response data:', data)

        const assistantEntry: ChatMessage = {
          role: 'assistant',
          content: data.answer ?? 'No response available.',
          timestamp: Date.now()
        }

        console.log('[AutoChat] Adding assistant message, length:', assistantEntry.content.length)
        setMessages(prev => {
          const newMessages = [...prev, assistantEntry]
          console.log('[AutoChat] New messages count:', newMessages.length)
          return newMessages
        })
      }
    } catch (err: any) {
      console.error('[AutoChat]', err)
      setError('Failed to get response. Please try again.')
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
          timestamp: Date.now()
        }
      ])
    } finally {
      setIsSending(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleInputClick = () => {
    if (messages.length > 0) {
      setIsExpanded(true)
    }
  }

  return (
    <div ref={containerRef} className={`autochat-root ${className}`}>
      <style>{`
        .autochat-root {
          position: relative;
          width: 100%;
          max-width: ${maxWidth};
          margin: 0 auto;
          font-family: ${fontFamily};
        }

        .autochat-container {
          position: relative;
          background: ${chatContainerBackground};
          backdrop-filter: blur(20px);
          border: ${borderWidth} solid ${inputFieldBorderColor};
          border-radius: ${borderRadius};
          overflow: hidden;
          transition: all ${expandAnimationDuration} cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: ${chatContainerShadow};
        }

        .autochat-container.expanded {
          border-radius: ${borderRadius};
          box-shadow: ${chatContainerShadowExpanded};
        }

        .autochat-messages {
          max-height: 0;
          opacity: 0;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 0 24px;
          transition: all ${expandAnimationDuration} cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          gap: ${messageGap};
        }

        .autochat-container.expanded .autochat-messages {
          max-height: ${maxChatHeight};
          opacity: 1;
          padding: 24px;
          margin-bottom: 16px;
        }

        .autochat-messages::-webkit-scrollbar {
          width: ${scrollbarWidth};
        }

        .autochat-messages::-webkit-scrollbar-track {
          background: ${scrollbarTrackColor};
        }

        .autochat-messages::-webkit-scrollbar-thumb {
          background: ${scrollbarThumbColor};
          border-radius: 3px;
        }

        .autochat-messages::-webkit-scrollbar-thumb:hover {
          background: ${scrollbarThumbHoverColor};
        }

        .autochat-message {
          display: flex;
          flex-direction: column;
          gap: 8px;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .autochat-message.user {
          align-items: flex-end;
        }

        .autochat-bubble {
          padding: ${messagePadding};
          border-radius: ${borderRadius};
          max-width: 80%;
          line-height: 1.6;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-size: ${fontSize};
        }

        .autochat-message.user .autochat-bubble {
          background: ${userMessageBackground};
          color: ${userMessageTextColor};
          border-bottom-right-radius: 4px;
          box-shadow: ${userMessageShadow};
        }

        .autochat-message.assistant .autochat-bubble {
          background: ${assistantMessageBackground};
          color: ${assistantMessageTextColor};
          border: ${borderWidth} solid ${assistantMessageBorderColor};
          border-bottom-left-radius: 4px;
        }

        .autochat-bubble.thinking {
          display: inline-flex;
          gap: 4px;
          padding: 16px 20px;
        }

        .autochat-bubble.thinking::before,
        .autochat-bubble.thinking::after {
          content: '';
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: ${thinkingDotColor};
          opacity: 0.6;
          animation: thinking 1.4s infinite;
        }

        .autochat-bubble.thinking::before {
          animation-delay: 0s;
        }

        .autochat-bubble.thinking::after {
          animation-delay: 0.2s;
        }

        @keyframes thinking {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.6;
          }
          30% {
            transform: translateY(-8px);
            opacity: 1;
          }
        }

        .autochat-input-wrapper {
          position: relative;
          padding: 16px 20px;
          background: ${inputAreaBackground};
          border-top: ${inputAreaBorderTop};
        }

        .autochat-input-form {
          display: flex;
          align-items: center;
          gap: 12px;
          background: ${inputFieldBackground};
          border: ${borderWidth} solid ${inputFieldBorderColor};
          border-radius: ${borderRadius};
          padding: 4px 4px 4px 18px;
          transition: all ${expandAnimationDuration} ease;
        }

        .autochat-input-form:focus-within {
          border-color: ${inputFieldFocusBorderColor};
          background: ${inputFieldBackground};
          box-shadow: ${inputFieldFocusShadow};
        }

        .autochat-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: ${inputTextColor};
          font-size: ${fontSize};
          font-family: inherit;
          padding: 12px 0;
          min-height: ${inputHeight};
        }

        .autochat-input::placeholder {
          color: ${inputPlaceholderColor};
        }

        .autochat-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .autochat-submit {
          display: flex;
          align-items: center;
          justify-content: center;
          width: ${submitButtonSize};
          height: ${submitButtonSize};
          background: ${submitButtonBackground};
          border: none;
          border-radius: calc(${borderRadius} * 0.75);
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .autochat-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .autochat-submit:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: ${submitButtonHoverShadow};
        }

        .autochat-submit:not(:disabled):active {
          transform: translateY(0);
        }

        .autochat-submit svg {
          width: calc(${submitButtonSize} * 0.5);
          height: calc(${submitButtonSize} * 0.5);
          color: ${submitButtonIconColor};
        }

        .autochat-error {
          padding: 12px 20px;
          background: rgba(248, 113, 113, 0.1);
          border-left: 3px solid #f87171;
          color: #fca5a5;
          font-size: 13px;
          margin: 0 20px 16px;
          border-radius: 8px;
        }

        @media (max-width: 640px) {
          .autochat-root {
            max-width: 100%;
          }

          .autochat-bubble {
            max-width: 90%;
            font-size: 14px;
          }

          .autochat-container.expanded .autochat-messages {
            max-height: 50vh;
          }
        }
      `}</style>

      <div className={`autochat-container ${isExpanded ? 'expanded' : ''}`}>
        {isExpanded && messages.length > 0 && (
          <div ref={messagesRef} className="autochat-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`autochat-message ${msg.role}`}>
                <div className={`autochat-bubble ${msg.content === '●●●' ? 'thinking' : ''}`}>
                  {msg.content === '●●●' ? '' : msg.content}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {error && isExpanded && <div className="autochat-error">{error}</div>}

        <div className="autochat-input-wrapper">
          <form className="autochat-input-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="autochat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={handleInputClick}
              placeholder={placeholder}
              disabled={isSending || !sessionId}
            />
            <button
              type="submit"
              className="autochat-submit"
              disabled={isSending || !input.trim() || !sessionId}
              aria-label="Send message"
            >
              {isSending ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" opacity="0.25" />
                  <path d="M12 2 A10 10 0 0 1 22 12" strokeLinecap="round">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      from="0 12 12"
                      to="360 12 12"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </path>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
