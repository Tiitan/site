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
    engines: z.object({
      unity: z.string(),
      unreal: z.string()
    }),
    links: z.object({
      github: z.string().url(),
      docs: z.string().url(),
      assetStore: z.string().url().optional()
    })
  })
});

export const collections = { projects };
