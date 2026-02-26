import { defineCollection, z } from "astro:content";

const assets = defineCollection({
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

const games = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string(),
    cardImage: z.string(),
    date: z.coerce.date(),
    status: z.enum(["released", "unreleased"]),
    platforms: z.array(z.string()).min(1),
    engine: z.string(),
    genre: z.string(),
    releaseNote: z.string().optional(),
    accessUrl: z.string().url().optional(),
    accessLabel: z.string().optional(),
    highlighted: z.boolean().default(false),
    supremapp: z.boolean().default(false)
  })
});

export const collections = { assets, games };
