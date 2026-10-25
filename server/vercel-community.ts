import { DEFAULT_COMMUNITY_MODEL } from '../src/shared/community-contract.ts'
import { createCommunityHandler } from './community-api.ts'

export const vercelCommunityHandler = createCommunityHandler(() => ({
  apiKey: process.env['OPENROUTER_API_KEY'] ?? '',
  model: process.env['OPENROUTER_MODEL'] || DEFAULT_COMMUNITY_MODEL,
}))
