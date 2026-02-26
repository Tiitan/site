import { defineCollection, z } from "astro:content";

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    cardImage: z.string().optional(),
    tags: z.array(z.string()).min(1),
    date: z.coerce.date(),
    featured: z.boolean().default(false),
    status: z.enum(["shipped", "in-progress", "planned"]),
    storeUrl: z.string().url().optional(),
    storeLabel: z.string().optional()
  })
});

export const collections = { projects };
