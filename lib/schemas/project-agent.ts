import { z } from 'zod'

export const projectQuestionSchema = z
  .object({
    id: z.string().describe('Stable id for the question (snake_case)'),
    label: z.string().describe('Question label'),
    help: z.string().optional().describe('Short helper text'),
    placeholder: z.string().optional(),
    required: z.boolean().optional(),
    type: z
      .enum(['text', 'textarea', 'select', 'multiselect', 'boolean', 'number'])
      .optional(),
    options: z.array(z.string()).optional(),
  })
  .passthrough()

export const projectQuestionnaireSchema = z
  .object({
    summary: z.string().optional(),
    questions: z.array(projectQuestionSchema).max(6),
  })
  .passthrough()

export const projectSingleQuestionSchema = z
  .object({
    question: projectQuestionSchema.optional(),
    done: z.literal(true).optional(),
  })
  .passthrough()
  .refine((data) => data.done === true || (data.question != null), {
    message: 'Must have either question or done',
  })

export const projectPlanSchema = z
  .object({
    project: z
      .object({
        name: z.string(),
        description: z.string().optional(),
        industry: z.string().optional(),
        goals: z.array(z.string()).optional(),
      })
      .passthrough(),
    modules: z
      .array(
        z
          .object({
            name: z.string(),
            description: z.string().optional(),
            trackerNames: z.array(z.string()).optional(),
          })
          .passthrough(),
      )
      .optional(),
    trackers: z.array(
      z
        .object({
          name: z.string(),
          description: z.string().optional(),
          module: z.string().nullable().optional(),
          prompt: z.string(),
          instance: z.enum(['SINGLE', 'MULTI']),
          versionControl: z.boolean(),
          autoSave: z.boolean(),
        })
        .passthrough(),
    ).min(1),
  })
  .passthrough()

export type ProjectQuestionnaire = z.infer<typeof projectQuestionnaireSchema>
export type ProjectSingleQuestion = z.infer<typeof projectSingleQuestionSchema>
export type ProjectPlan = z.infer<typeof projectPlanSchema>
