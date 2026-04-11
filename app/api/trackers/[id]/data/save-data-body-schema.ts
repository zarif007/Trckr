import { z } from "zod";

export const saveDataBodySchema = z
  .object({
    formStatus: z.string().nullable().optional(),
    data: z.unknown().optional(),
    branchName: z.string().optional(),
    label: z.string().optional(),
  })
  .passthrough();
