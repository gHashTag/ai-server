/**
 * Separate Inngest client for Instagram functions
 * This client doesn't depend on the main config and bot tokens
 */

import { Inngest } from 'inngest'

// Create standalone Instagram Inngest client
export const instagramInngest = new Inngest({
  id: 'ai-server-instagram',
  name: 'AI Server Instagram Scraper',
  // Don't import main config to avoid BOT_TOKEN dependencies
})

export default instagramInngest
