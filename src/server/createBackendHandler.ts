/**
 * BACKEND HANDLER (Recommended)
 * 
 * The main backend handler for PortfolioSDK.
 * Combines the best of both worlds:
 * - Manual RAG: Only FETCHES from Supermemory (no auto-saving)
 * - Memory Router: Multi-provider support + streaming
 * 
 * Use this when you want:
 * - Read-only access to your documents
 * - No automatic conversation saving
 * - Multi-provider flexibility
 * - Streaming responses
 */

import { streamText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import Supermemory from 'supermemory'
import type { MemoryRouterConfig, ChatRequest, ChatResponse } from '../utils/types'

export function createBackendHandler(config: MemoryRouterConfig) {
  // Validate config
  if (!config.llmApiKey) throw new Error('LLM API key is required')
  if (!config.supermemoryApiKey) throw new Error('Supermemory API key is required')
  if (!config.supermemoryContainer) throw new Error('Supermemory container is required')

  const model = config.llmModel || getDefaultModel(config.llmProvider)
  const temperature = config.temperature ?? 0.7
  const streaming = config.streaming ?? true

  // Initialize Supermemory client (for search only)
  const supermemory = new Supermemory({
    apiKey: config.supermemoryApiKey,
    baseURL: 'https://api.supermemory.ai'
  })

  // Initialize LLM provider (direct, no proxy)
  function getProviderModel() {
    switch (config.llmProvider) {
      case 'anthropic':
        return createAnthropic({
          apiKey: config.llmApiKey
        })(model)
      
      case 'openai':
      case 'groq':
        return createOpenAI({
          apiKey: config.llmApiKey,
          baseURL: getBaseURL(config.llmProvider)
        })(model)
      
      case 'openrouter':
        // OpenRouter needs special headers
        return createOpenAI({
          apiKey: config.llmApiKey,
          baseURL: 'https://openrouter.ai/api/v1',
          headers: {
            'HTTP-Referer': config.openRouterReferer || 'https://portfolio-sdk.com',
            'X-Title': config.openRouterTitle || 'Portfolio Chat'
          }
        })(model)
      
      case 'google':
        return createGoogleGenerativeAI({
          apiKey: config.llmApiKey
        })(model)
      
      default:
        throw new Error(`Unsupported provider: ${config.llmProvider}`)
    }
  }

  async function POST(req: Request): Promise<Response> {
    try {
      console.log('[FlexibleRAG] Received request')
      const body: ChatRequest = await req.json()
      const { message, sessionId, history = [] } = body

      if (!message || !sessionId) {
        return Response.json(
          { error: 'Missing message or sessionId' },
          { status: 400 }
        )
      }

      if (message.trim().length === 0) {
        return Response.json(
          { error: 'Message cannot be empty' },
          { status: 400 }
        )
      }

      // 1. SEARCH Supermemory (READ-ONLY - no saving)
      console.log('[FlexibleRAG] Searching documents...')
      const docResults = await supermemory.search.documents({
        q: message,
        containerTags: [config.supermemoryContainer],
        limit: 5,
        includeFullDocs: true,
        includeSummary: true,
        rerank: true
      })

      const documents = Array.isArray((docResults as any)?.results)
        ? (docResults as any).results
        : []

      console.log('[FlexibleRAG] Found', documents.length, 'documents')

      // 2. EXTRACT context from search results
      const context = documents
        .flatMap((doc: any) => {
          const segments: string[] = []
          if (typeof doc.content === 'string') segments.push(doc.content)
          if (doc.summary) segments.push(doc.summary)
          if (doc.metadata?.summary || doc.metadata?.description) {
            segments.push(doc.metadata.summary ?? doc.metadata.description)
          }
          if (Array.isArray(doc.chunks)) {
            for (const chunk of doc.chunks) {
              if (typeof chunk?.content === 'string') {
                segments.push(chunk.content)
              }
            }
          }
          return segments.filter(Boolean)
        })
        .filter(Boolean)
        .join('\n\n---\n\n')

      console.log('[FlexibleRAG] Context length:', context.length)

      // 3. BUILD system prompt
      const systemPrompt = config.systemPrompt || `You are a helpful AI assistant for a portfolio website.
Use the provided context from the person's resume and documents to answer questions accurately.
Be concise, professional, and friendly. If you don't have enough information, say so honestly.`

      const contextPrompt = context
        ? `Here is relevant information from the portfolio:\n\n${context}\n\nNow answer the user's question.`
        : 'No specific context found. Answer based on general knowledge if appropriate.'

      // 4. BUILD conversation messages
      // Ensure content is always a string (not array) for OpenRouter compatibility
      const processedHistory = history
        .filter(msg => {
          // Filter out empty messages, null, undefined, or invalid roles
          if (!msg || !msg.content) return false
          if (msg.role !== 'user' && msg.role !== 'assistant' && msg.role !== 'system') return false
          
          // Handle both string and array content
          const contentStr = Array.isArray(msg.content) 
            ? msg.content.map(c => typeof c === 'string' ? c : (c?.text || '')).join(' ')
            : String(msg.content)
          return contentStr.trim().length > 0
        })
        .map(msg => {
          // Convert content to string if it's an array
          const contentStr = Array.isArray(msg.content)
            ? msg.content.map(c => typeof c === 'string' ? c : (c?.text || '')).join(' ')
            : String(msg.content)
          
          return {
            role: msg.role as 'user' | 'assistant' | 'system',
            content: contentStr.trim()
          }
        })

      const messages = [
        ...processedHistory,
        {
          role: 'user' as const,
          content: `${contextPrompt}\n\nQuestion: ${message}`
        }
      ]

      console.log('[FlexibleRAG] Total messages:', messages.length)
      console.log('[FlexibleRAG] History messages:', processedHistory.length)
      console.log('[FlexibleRAG] Messages format:', JSON.stringify(messages.map(m => ({ 
        role: m.role, 
        contentLength: typeof m.content === 'string' ? m.content.length : 'NOT_STRING',
        contentPreview: typeof m.content === 'string' ? m.content.substring(0, 50) : 'N/A'
      })), null, 2))

      // Validate messages format for OpenRouter (strict validation)
      if (config.llmProvider === 'openrouter') {
        // OpenRouter has strict format requirements that conflict with conversation history
        // Solution: Only send system prompt + current user message (no history)
        // This ensures compatibility while still providing context via the system prompt
        
        console.log('[FlexibleRAG] OpenRouter: Using stateless mode (no conversation history)')
        console.log('[FlexibleRAG] Original messages count:', messages.length)
        
        // Extract system message and current user message only
        const systemMsg = messages.find(m => m.role === 'system')
        const currentUserMsg = messages.filter(m => m.role === 'user').slice(-1)[0]
        
        // Build simplified messages array
        const simplifiedMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = []
        
        // Add system message if present
        if (systemMsg && typeof systemMsg.content === 'string' && systemMsg.content.trim().length > 0) {
          simplifiedMessages.push({
            role: 'system',
            content: systemMsg.content.trim()
          })
        }
        
        // Add current user message
        if (currentUserMsg) {
          let contentStr: string
          const msgContent = currentUserMsg.content as any
          if (typeof msgContent === 'string') {
            contentStr = msgContent.trim()
          } else if (Array.isArray(msgContent)) {
            contentStr = msgContent
              .map((c: any) => typeof c === 'string' ? c : (c?.text || String(c)))
              .join(' ')
              .trim()
          } else {
            contentStr = String(msgContent).trim()
          }
          
          if (contentStr && contentStr.length > 0) {
            simplifiedMessages.push({
              role: 'user',
              content: contentStr
            })
          }
        }
        
        // Replace messages with simplified version (no history)
        messages.splice(0, messages.length, ...simplifiedMessages)
        
        console.log('[FlexibleRAG] Simplified to', messages.length, 'messages for OpenRouter (stateless)')
      }

      // 5. CALL LLM (with streaming support)
      const providerModel = getProviderModel()

      if (streaming) {
        // STREAMING MODE
        console.log('[FlexibleRAG] Using STREAMING mode')
        const result = await streamText({
          model: providerModel,
          system: systemPrompt,
          messages,
          temperature
        })

        console.log('[FlexibleRAG] Streaming response created')
        return result.toTextStreamResponse()
      } else {
        // NON-STREAMING MODE
        console.log('[FlexibleRAG] Using NON-STREAMING mode')
        const result = await streamText({
          model: providerModel,
          system: systemPrompt,
          messages,
          temperature
        })

        const fullText = await result.text
        console.log('[FlexibleRAG] Response received, length:', fullText.length)

        const chatResponse: ChatResponse = {
          answer: fullText,
          sessionId
        }

        return Response.json(chatResponse)
      }
    } catch (error: any) {
      console.error('[FlexibleRAG] Error:', error)
      
      let errorMessage = error.message || 'Internal server error'
      if (error.status === 401) {
        errorMessage = 'Invalid API key. Please check your LLM or Supermemory API key.'
      }
      
      return Response.json(
        { error: errorMessage },
        { status: error.status || 500 }
      )
    }
  }

  async function GET(): Promise<Response> {
    return Response.json({
      status: 'ok',
      message: 'Flexible RAG API (Read-Only)',
      provider: config.llmProvider,
      model,
      container: config.supermemoryContainer,
      streaming,
      mode: 'read-only'
    })
  }

  return { POST, GET }
}

// Helper: Get base URL for different providers
function getBaseURL(provider: string): string | undefined {
  switch (provider) {
    case 'groq':
      return 'https://api.groq.com/openai/v1'
    case 'openrouter':
      return 'https://openrouter.ai/api/v1'
    default:
      return undefined // Use default
  }
}

// Helper: Get default models
function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'anthropic':
      return 'claude-sonnet-4-20250514'
    case 'openai':
      return 'gpt-4o'
    case 'groq':
      return 'llama-3.3-70b-versatile'
    case 'openrouter':
      return 'anthropic/claude-3.5-sonnet'
    case 'google':
      return 'gemini-1.5-flash'
    default:
      return 'claude-sonnet-4-20250514'
  }
}

