import { z } from 'zod'
import {
  POLO_PHASES,
  POLO_PROPOSALS,
  POLO_DEFAULT_AREA_HA,
  POLO_MIN_AREA_HA,
  POLO_MAX_AREA_HA,
  POLO_AREA_STEP_HA,
} from '../game/polo/model.ts'
import { poloPlacementValid } from '../game/polo/placement.ts'

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
export const communityReactionSchema = z.object({
  text: z.string().trim().min(1).max(90),
  mood: communityMoodSchema,
})
export type CommunityReaction = z.infer<typeof communityReactionSchema>
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
export const poloSceneStateSchema = z.object({
  areaHa: z
    .number()
    .min(POLO_MIN_AREA_HA)
    .max(POLO_MAX_AREA_HA)
    .multipleOf(POLO_AREA_STEP_HA)
    .default(POLO_DEFAULT_AREA_HA),
  center: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  bearing: z.number().min(0).max(360),
  confirmed: z.boolean(),
  phase: z.enum(POLO_PHASES),
  proposal: z.enum(POLO_PROPOSALS).nullable(),
  preview: z.boolean(),
  recipientAvailable: z.boolean(),
  rain: z.boolean(),
  learnings: z
    .object({
      soil: z.boolean().optional(),
      water: z.boolean().optional(),
      heat: z.boolean().optional(),
      roof: z.boolean().optional(),
    })
    .optional(),
  improvements: z
    .object({
      soil: z.boolean().optional(),
      foundation: z.boolean().optional(),
      grounds: z.boolean().optional(),
    })
    .optional(),
})
export const plannerStateSchema = z
  .object({
    scenarioId: z.enum([
      'golden-gate-park',
      'san-jose-dc04',
      'golden-gate-polo',
    ]),
    center: z.tuple([
      z.number().min(-180).max(180),
      z.number().min(-90).max(90),
    ]),
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
    polo: poloSceneStateSchema.optional(),
  })
  .superRefine((plan, context) => {
    if ((plan.scenarioId === 'golden-gate-polo') !== Boolean(plan.polo))
      context.addIssue({
        code: 'custom',
        message: 'Polo Fields requires its own scene state.',
      })
    if (plan.polo?.proposal && plan.polo.phase !== 'M6')
      context.addIssue({
        code: 'custom',
        message: 'Proposal previews belong to Operation.',
      })
    if (plan.polo && !poloPlacementValid(plan.polo.center))
      context.addIssue({
        code: 'custom',
        message: 'Choose valid Polo map coordinates.',
      })
    if (
      plan.polo &&
      !plan.polo.confirmed &&
      (plan.polo.phase !== 'M0' || plan.polo.proposal !== null)
    )
      context.addIssue({
        code: 'custom',
        message: 'Confirm the site before advancing the Polo story.',
      })
    if (
      plan.polo &&
      (plan.polo.center[0] !== plan.center[0] ||
        plan.polo.center[1] !== plan.center[1] ||
        plan.polo.bearing !== plan.bearing)
    )
      context.addIssue({
        code: 'custom',
        message: 'Polo plan and scene locations must match.',
      })
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
        reaction: communityReactionSchema.optional(),
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
