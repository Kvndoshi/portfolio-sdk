/**
 * MANUAL RAG IMPLEMENTATION (PRESERVED)
 * 
 * This is the original manual RAG approach where you explicitly:
 * 1. Search Supermemory
 * 2. Extract context
 * 3. Build prompt
 * 4. Call LLM
 * 
 * Use this when you need:
 * - Full control over search parameters
 * - Custom context extraction logic
 * - Visibility into search results
 * - Fine-grained debugging
 */

import Supermemory from 'supermemory'
import Anthropic from '@anthropic-ai/sdk'
import type { PortfolioConfig, ChatRequest, ChatResponse, ChatMessage } from '../../utils/types'

// In-memory session store (cleared on server restart)
const sessionStore = new Map<string, ChatMessage[]>()

export function createManualRAGHandler(config: PortfolioConfig) {
  // Initialize clients
  const supermemory = new Supermemory({
    apiKey: config.memory.apiKey,
    baseURL: config.memory.baseUrl || 'https://api.supermemory.ai'
  })

  const anthropic = new Anthropic({
    apiKey: config.llm.apiKey
  })

  const model = config.llm.model || 'claude-sonnet-4-20250514'
  const temperature = config.llm.temperature ?? 0.7
  const maxTokens = config.llm.maxTokens || 1024

  async function POST(req: Request): Promise<Response> {
    try {
      const body: ChatRequest = await req.json()
      const { message, sessionId, history = [] } = body

      if (!message || !sessionId) {
        return Response.json(
          { error: 'Missing message or sessionId' },
          { status: 400 }
        )
      }

      // Retrieve or initialize session history
      let sessionHistory = sessionStore.get(sessionId) || []
      
      // If history is provided in request, use it (for client-managed history)
      if (history.length > 0) {
        sessionHistory = history
      }

      // Search Supermemory for relevant context
      const docResults = await supermemory.search.documents({
        q: message,
        containerTags: [config.memory.container],
        limit: 5,
        includeFullDocs: true,
        includeSummary: true,
        rerank: true
      })

      const documents = Array.isArray((docResults as any)?.results)
        ? (docResults as any).results
        : []

      const context = documents
        .flatMap((doc: any) => {
          const segments: string[] = []

          if (typeof doc.content === 'string') {
            segments.push(doc.content)
          }

          if (doc.summary) {
            segments.push(doc.summary)
          }

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

      // Build system prompt
      const systemPrompt = config.llm.systemPrompt || `You are a helpful AI assistant for a portfolio website.
Use the provided context from the person's resume and documents to answer questions accurately.
Be concise, professional, and friendly. If you don't have enough information, say so honestly.`

      const contextPrompt = context
        ? `Here is relevant information from the portfolio:\n\n${context}\n\nNow answer the user's question.`
        : 'No specific context found. Answer based on general knowledge if appropriate.'

      // Build conversation messages
      const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
        ...sessionHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user' as const,
          content: `${contextPrompt}\n\nQuestion: ${message}`
        }
      ]

      // Call Claude
      const response = await anthropic.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages
      })

      const answer = response.content[0]?.type === 'text'
        ? response.content[0].text
        : 'No response generated'

      // Update session history
      sessionHistory.push({ role: 'user', content: message, timestamp: Date.now() })
      sessionHistory.push({ role: 'assistant', content: answer, timestamp: Date.now() })
      
      // Keep only last 20 messages
      if (sessionHistory.length > 20) {
        sessionHistory = sessionHistory.slice(-20)
      }
      
      sessionStore.set(sessionId, sessionHistory)

      const chatResponse: ChatResponse = {
        answer,
        sources: documents.slice(0, 3),
        sessionId
      }

      return Response.json(chatResponse)
    } catch (error: any) {
      console.error('Chat handler error:', error)
      return Response.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      )
    }
  }

  async function GET(): Promise<Response> {
    return Response.json({
      status: 'ok',
      message: 'Portfolio chat API (Manual RAG) is running'
    })
  }

  return { POST, GET }
}

