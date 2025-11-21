/**
 * MEMORY ROUTER IMPLEMENTATION WITH STREAMING
 * 
 * This uses Supermemory's Memory Router proxy to automatically:
 * 1. Search relevant memories/documents
 * 2. Inject context into prompts
 * 3. Save conversation history
 * 
 * Supports multiple LLM providers with STREAMING:
 * - Anthropic (Claude)
 * - OpenAI (GPT-4, GPT-4o)
 * - Groq (Llama, Mixtral)
 * - OpenRouter (hundreds of models)
 * 
 * Usage:
 *   import { createPortfolioHandler } from 'portfoliosdk/server'
 * 
 *   export const { POST, GET } = createPortfolioHandler({
 *     llmProvider: 'anthropic',
 *     llmApiKey: process.env.ANTHROPIC_API_KEY,
 *     llmModel: 'claude-sonnet-4-20250514',
 *     supermemoryApiKey: process.env.SUPERMEMORY_API_KEY,
 *     supermemoryContainer: 'portfolio',
 *     streaming: true  // Enable streaming for better UX
 *   })
 */

import { streamText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { MemoryRouterConfig, ChatRequest, ChatResponse } from '../utils/types'

// Provider base URLs for Memory Router proxy
const MEMORY_ROUTER_URLS = {
  anthropic: 'https://api.supermemory.ai/v3/https://api.anthropic.com/v1',
  openai: 'https://api.supermemory.ai/v3/https://api.openai.com/v1',
  groq: 'https://api.supermemory.ai/v3/https://api.groq.com/openai/v1',
  openrouter: 'https://api.supermemory.ai/v3/https://openrouter.ai/api/v1',
  google: 'https://api.supermemory.ai/v3/https://generativelanguage.googleapis.com/v1beta'
} as const

export function createPortfolioHandler(config: MemoryRouterConfig) {
  // Validate config
  if (!config.llmApiKey) {
    throw new Error('LLM API key is required')
  }
  if (!config.supermemoryApiKey) {
    throw new Error('Supermemory API key is required')
  }
  if (!config.supermemoryContainer) {
    throw new Error('Supermemory container is required')
  }

  const baseURL = MEMORY_ROUTER_URLS[config.llmProvider as keyof typeof MEMORY_ROUTER_URLS]
  if (!baseURL) {
    throw new Error(`Unsupported LLM provider: ${config.llmProvider}. Supported: anthropic, openai, groq, openrouter, google`)
  }

  const model = config.llmModel || getDefaultModel(config.llmProvider)
  const temperature = config.temperature ?? 0.7
  const maxTokens = config.maxTokens || 1024
  const streaming = config.streaming ?? true  // Streaming enabled by default

  // Initialize provider-specific client with Memory Router
  // NOTE: x-sm-user-id should be the CONTAINER name (not session ID)
  function getProviderModel() {
    const headers = {
      'x-supermemory-api-key': config.supermemoryApiKey,
      'x-sm-user-id': 'config.supermemoryContainer'  // ← Container name as user ID!
    }

    console.log('[MemoryRouter] Creating model with headers:', {
      container: config.supermemoryContainer,
      userId: config.supermemoryContainer,
      provider: config.llmProvider
    })

    switch (config.llmProvider) {
      case 'anthropic':
        return createAnthropic({
          apiKey: config.llmApiKey,
          baseURL,
          headers
        })(model)
      
      case 'openai':
      case 'groq':
      case 'openrouter':
        return createOpenAI({
          apiKey: config.llmApiKey,
          baseURL,
          headers
        })(model)
      
      case 'google':
        // Note: Google may not work through Memory Router proxy
        // Use createBackendHandler for direct Google support
        return createGoogleGenerativeAI({
          apiKey: config.llmApiKey,
          baseURL,
          headers
        })(model)
      
      default:
        throw new Error(`Unsupported provider: ${config.llmProvider}`)
    }
  }

  async function POST(req: Request): Promise<Response> {
    try {
      console.log('[MemoryRouter] Received request')
      const body: ChatRequest = await req.json()
      const { message, sessionId, history = [] } = body
      console.log('[MemoryRouter] Message:', message)
      console.log('[MemoryRouter] SessionId:', sessionId)
      console.log('[MemoryRouter] History length:', history.length)

      if (!message || !sessionId) {
        console.error('[MemoryRouter] Missing message or sessionId')
        return Response.json(
          { error: 'Missing message or sessionId' },
          { status: 400 }
        )
      }

      // Validate message is not empty
      if (message.trim().length === 0) {
        console.error('[MemoryRouter] Empty message')
        return Response.json(
          { error: 'Message cannot be empty' },
          { status: 400 }
        )
      }

      // Build conversation messages (filter out empty messages)
      const messages = [
        ...history
          .filter(msg => msg.content && msg.content.trim().length > 0)
          .map(msg => ({
            role: msg.role,
            content: msg.content.trim()
          })),
        {
          role: 'user' as const,
          content: message.trim()
        }
      ]
      console.log('[MemoryRouter] Total messages:', messages.length)

      // Build system prompt
      const systemPrompt = config.systemPrompt || `You are a helpful AI assistant for a portfolio website.
Use the provided context from the person's resume and documents to answer questions accurately.
Be concise, professional, and friendly. If you don't have enough information, say so honestly.`

      // Get provider model with Memory Router
      console.log('[MemoryRouter] Getting provider model:', config.llmProvider)
      const providerModel = getProviderModel()

      if (streaming) {
        // STREAMING MODE - Progressive response
        console.log('[MemoryRouter] Using STREAMING mode')
        const result = await streamText({
          model: providerModel,
          system: systemPrompt,
          messages,
          temperature
          // NOTE: Headers are already set in model creation
        })

        console.log('[MemoryRouter] Streaming response created')
        // Return streaming response (Server-Sent Events)
        return result.toTextStreamResponse()
      } else {
        // NON-STREAMING MODE - Full response at once
        console.log('[MemoryRouter] Using NON-STREAMING mode')
        const result = await streamText({
          model: providerModel,
          system: systemPrompt,
          messages,
          temperature
          // NOTE: Headers are already set in model creation
        })

        console.log('[MemoryRouter] Waiting for full response...')
        // Wait for full response
        const fullText = await result.text
        console.log('[MemoryRouter] Response received, length:', fullText.length)
        console.log('[MemoryRouter] Response text:', fullText.substring(0, 200))

        // Handle empty response
        if (!fullText || fullText.trim().length === 0) {
          console.error('[MemoryRouter] ERROR: Empty response from LLM!')
          console.error('[MemoryRouter] This usually means:')
          console.error('[MemoryRouter] 1. Memory Router proxy issue')
          console.error('[MemoryRouter] 2. Supermemory container is empty')
          console.error('[MemoryRouter] 3. API key issue')
          
          return Response.json({
            answer: "I apologize, but I'm having trouble generating a response. This might be because:\n\n1. The memory container is empty (no documents uploaded)\n2. There's an issue with the Memory Router connection\n3. The API configuration needs to be checked\n\nPlease check the server logs for more details.",
            sessionId,
            error: 'Empty response from LLM'
          })
        }

        const chatResponse: ChatResponse = {
          answer: fullText,
          sessionId
        }

        console.log('[MemoryRouter] Returning JSON response')
        return Response.json(chatResponse)
      }
    } catch (error: any) {
      console.error('Chat handler error:', error)
      
      // Better error messages
      let errorMessage = error.message || 'Internal server error'
      
      if (error.status === 401) {
        errorMessage = 'Invalid API key. Please check your LLM or Supermemory API key.'
      } else if (error.status === 404) {
        errorMessage = 'Model not found. Please check your model name.'
      } else if (error.message?.includes('container')) {
        errorMessage = 'Supermemory container not found. Please check your container name.'
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
      message: 'Portfolio chat API with Memory Router',
      provider: config.llmProvider,
      model,
      container: config.supermemoryContainer,
      streaming
    })
  }

  return { POST, GET }
}

// Helper function to get default models for each provider
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
