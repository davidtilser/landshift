import { z } from 'zod'

export const DEFAULT_COMMUNITY_MODEL = 'google/gemini-2.5-flash-lite'
export const communityIdSchema = z.enum([
  'neighbor',
  'nature',
  'student',
  'operator',
])
export type CommunityId = z.infer<typeof communityIdSchema>
export const communityMoodSchema = z.enum([
  'angry',
  'concerned',
  'neutral',
  'hopeful',
])
export type CommunityMood = z.infer<typeof communityMoodSchema>
export interface CommunityMoodState {
  mood: CommunityMood
  reason: string
}
export const communityMoodBreakdownShape = z.object({
  angry: z.number().int().min(0).max(100),
  concerned: z.number().int().min(0).max(100),
  neutral: z.number().int().min(0).max(100),
  hopeful: z.number().int().min(0).max(100),
  reason: z.string().trim().min(1).max(110),
})
export const communityMoodBreakdownSchema = communityMoodBreakdownShape.refine(
  (value) =>
    value.angry + value.concerned + value.neutral + value.hopeful === 100,
  'Simulated mood percentages must total 100.',
)
export type CommunityMoodBreakdown = z.infer<
  typeof communityMoodBreakdownSchema
>
export const plannerStateSchema = z.object({
  scenarioId: z.enum(['golden-gate-park', 'san-jose-dc04']),
  center: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  bearing: z.number().min(0).max(360),
  choices: z.object({
    cooling: z.enum(['evaporative', 'hybrid', 'dry']),
    trees: z.union([z.literal(0), z.literal(24), z.literal(60)]),
    restoration: z.enum(['none', 'meadow', 'rain-garden']),
    training: z.boolean(),
    access: z.boolean(),
  }),
  year: z.union([z.literal(0), z.literal(5), z.literal(10)]),
  weather: z.enum(['drought', 'heatwave', 'storm']),
})
export type PlannerState = z.infer<typeof plannerStateSchema>
export const conversationLineSchema = z.object({
  speaker: z.union([communityIdSchema, z.literal('planner')]),
  text: z.string().trim().min(1).max(600),
})
export type ConversationLine = z.infer<typeof conversationLineSchema>
export const communityRequestSchema = z
  .object({
    mode: z.enum(['private', 'discussion']),
    target: communityIdSchema,
    plan: plannerStateSchema,
    history: z.array(conversationLineSchema).max(18),
    message: z.string().trim().max(600),
    replyTo: conversationLineSchema.optional(),
    previousMood: communityMoodBreakdownSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.mode === 'private' && !value.message)
      context.addIssue({ code: 'custom', message: 'Write a message first.' })
  })
export type CommunityRequest = z.infer<typeof communityRequestSchema>
export const communityReplySchema = z.object({
  messages: z
    .array(
      z.object({
        speaker: communityIdSchema,
        text: z.string().trim().min(1).max(360),
        communityMood: communityMoodBreakdownSchema.optional(),
      }),
    )
    .min(1)
    .max(3),
})
export type CommunityReply = z.infer<typeof communityReplySchema>
export const communityResponseSchema = communityReplySchema.extend({
  source: z.enum(['live', 'demo']),
  model: z.string().max(100),
})
export type CommunityResponse = z.infer<typeof communityResponseSchema>
export const communityStatusSchema = z.object({
  configured: z.boolean(),
  model: z.string(),
})
