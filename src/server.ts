/**
 * PortfolioSDK server-side exports
 * These utilities are intended for Next.js Route Handlers / API routes.
 */

// Main export - Backend Handler (READ-ONLY, recommended)
export { createBackendHandler } from './server/createBackendHandler'
// Backwards compatibility alias
export { createBackendHandler as createFlexibleRAGHandler } from './server/createBackendHandler'

// Memory Router (auto-saves conversations)
export { createPortfolioHandler } from './server/createPortfolioHandler'

// Manual RAG (Anthropic only, no streaming)
export { createManualRAGHandler } from './server/manual-rag/createManualRAGHandler'

// Upload utility
export { uploadToSupermemory } from './server/uploadToSupermemory'

// Types
export type {
  SupermemoryConfig,
  LLMConfig,
  PortfolioConfig,      // For Manual RAG
  MemoryRouterConfig,   // For Memory Router
  ChatRequest,
  ChatResponse,
  UploadOptions
} from './utils/types'
