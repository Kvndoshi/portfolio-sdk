/**
 * uploadToSupermemory
 * Helper to upload files or text to Supermemory
 */

import Supermemory from 'supermemory'
import type { UploadOptions } from '../utils/types'

export async function uploadToSupermemory(
  apiKey: string,
  options: UploadOptions
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    const client = new Supermemory({ apiKey })

    const container = options.container || 'portfolio'

    // If uploading a file
    if (options.file) {
      // For file uploads, use the memories.uploadFile method
      const response = await client.memories.uploadFile({
        file: options.file as any, // SDK handles File/Buffer types
        containerTags: container
      })

      return {
        success: true,
        documentId: response?.id || (response as any)?.document?.id
      }
    }

    // If uploading text via raw API
    if (options.text) {
      // Use direct API call for text content
      const apiUrl = 'https://api.supermemory.ai/v1/add'
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          content: {
            type: 'text',
            data: options.text
          },
          metadata: {
            title: options.title,
            type: options.type || 'document'
          },
          tags: [container]
        })
      })

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }

      const data = await res.json()

      return {
        success: true,
        documentId: data?.memoryId || data?.id
      }
    }

    return {
      success: false,
      error: 'Either file or text must be provided'
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Upload failed'
    }
  }
}
