/**
 * Core types for PortfolioSDK
 */

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

export interface SupermemoryConfig {
  apiKey: string
  container: string
  baseUrl?: string
}

export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'custom'
  apiKey: string
  model?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  baseURL?: string  // For custom providers or Memory Router
}

// Legacy config for Manual RAG
export interface PortfolioConfig {
  memory: SupermemoryConfig
  llm: LLMConfig
}

// New config for Memory Router
export interface MemoryRouterConfig {
  llmProvider: 'anthropic' | 'openai' | 'groq' | 'openrouter' | 'google'
  llmApiKey: string
  llmModel?: string
  supermemoryApiKey: string
  supermemoryContainer: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  streaming?: boolean  // Enable streaming responses (default: true)
  // OpenRouter specific options
  openRouterReferer?: string  // Your site URL for OpenRouter
  openRouterTitle?: string    // Your app name for OpenRouter
}

export interface ChatRequest {
  message: string
  sessionId: string
  history?: ChatMessage[]
}

export interface ChatResponse {
  answer: string
  sources?: any[]
  sessionId: string
}

export interface UploadOptions {
  file?: File | Buffer
  text?: string
  title: string
  type?: string
  container?: string
}
