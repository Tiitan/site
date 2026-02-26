import { XMLParser } from "fast-xml-parser";

const DEFAULT_ARTSTATION_RSS_URL = "https://www.artstation.com/titan_8190.rss";
const REQUEST_TIMEOUT_MS = 8000;
const EXCERPT_MAX_LENGTH = 170;

export interface ArtItem {
  title: string;
  url: string;
  publishedAt: Date | null;
  excerpt: string;
  imageUrl: string | null;
  videoUrl: string | null;
}

interface ParsedRssItem {
  title?: unknown;
  link?: unknown;
  guid?: unknown;
  pubDate?: unknown;
  description?: unknown;
  "content:encoded"?: unknown;
}

type ParsedRssRoot = {
  rss?: {
    channel?: {
      item?: ParsedRssItem | ParsedRssItem[];
    };
  };
};

export async function getArtstationItems(limit = 12): Promise<ArtItem[]> {
  const rssUrl = process.env.ARTSTATION_RSS_URL?.trim() || DEFAULT_ARTSTATION_RSS_URL;
  const xml = await fetchFeedXml(rssUrl);

  const parser = new XMLParser({
    ignoreAttributes: false,
    cdataPropName: "__cdata",
    parseTagValue: false,
    trimValues: true
  });

  const parsed = parser.parse(xml) as ParsedRssRoot;
  const rawItems = toArray(parsed.rss?.channel?.item);

  const normalized = (
    await Promise.all(rawItems.map((item) => normalizeItem(item)))
  )
    .filter((item): item is ArtItem => item !== null)
    .sort((a, b) => toTimeValue(b.publishedAt) - toTimeValue(a.publishedAt));

  return normalized.slice(0, limit);
}

async function fetchFeedXml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new Error(`ArtStation RSS request failed with ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function normalizeItem(item: ParsedRssItem): Promise<ArtItem | null> {
  const rawTitle = normalizeWhitespace(stripHtml(toText(item.title)));
  const title = sanitizeArtstationTitle(rawTitle) || "Untitled artwork";
  const url = normalizeWhitespace(toText(item.link) || toText(item.guid));
  const publishedAt = parseDateOrNull(toText(item.pubDate));

  const descriptionHtml = toText(item.description);
  const contentHtml = toText(item["content:encoded"]);
  const sourceHtml = contentHtml || descriptionHtml;
  const excerptSourceHtml = descriptionHtml || contentHtml;

  if (!url) {
    return null;
  }

  const imageUrls = extractImageUrls(sourceHtml);
  const gifFromImages = imageUrls.find((imageUrl) => isGifUrl(imageUrl)) ?? null;
  const firstImage = imageUrls[0] ?? null;
  const fallbackThumbnail = extractVideoThumbnailUrl(sourceHtml);
  const clipMedia = await extractArtstationClipMedia(sourceHtml);

  const clipGifUrl = clipMedia?.gifUrl ?? null;
  const clipVideoUrl = clipMedia?.videoUrl ?? null;
  const clipThumbnailUrl = clipMedia?.thumbnailUrl ?? null;

  const finalImageUrl = gifFromImages ?? clipGifUrl ?? firstImage ?? clipThumbnailUrl ?? fallbackThumbnail ?? null;
  const finalVideoUrl = gifFromImages || clipGifUrl ? null : clipVideoUrl;

  return {
    title,
    url,
    publishedAt,
    excerpt: toExcerpt(excerptSourceHtml),
    imageUrl: finalImageUrl,
    videoUrl: finalVideoUrl
  };
}

function sanitizeArtstationTitle(title: string): string {
  if (!title) {
    return title;
  }

  return title
    .replace(/\s+by\s+Florian\s+Noirbent\s+\(Titan\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toExcerpt(input: string): string {
  const clean = normalizeWhitespace(stripHtml(input));
  const withoutBoilerplate = normalizeWhitespace(removeArtstationBoilerplate(clean));

  if (!withoutBoilerplate) {
    return "No description provided.";
  }

  if (withoutBoilerplate.length <= EXCERPT_MAX_LENGTH) {
    return withoutBoilerplate;
  }

  const slice = withoutBoilerplate.slice(0, EXCERPT_MAX_LENGTH);
  const spaceIndex = slice.lastIndexOf(" ");
  const trimmed = spaceIndex > 100 ? slice.slice(0, spaceIndex) : slice;

  return `${trimmed}...`;
}

function removeArtstationBoilerplate(text: string): string {
  return text
    .replace(/\s*View this on ArtStation\b/gi, " ")
    .replace(/\s*Florian\s+Noirbent\s*\(Titan\)\s+on\s+ArtStation\b/gi, " ")
    .replace(/\s+on\s+ArtStation\b/gi, " ");
}

function extractImageUrls(html: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  const urls: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = imgRegex.exec(html)) !== null) {
    const src = decodeHtmlEntities(match[1]).trim();
    if (src) {
      urls.push(src);
    }
  }

  return urls;
}

function isGifUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.toLowerCase().endsWith(".gif");
  } catch {
    return /\.gif($|\?)/i.test(url);
  }
}

function extractVideoThumbnailUrl(html: string): string | null {
  const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = iframeRegex.exec(html)) !== null) {
    const src = decodeHtmlEntities(match[1]);
    const youtubeThumbnail = youtubeThumbnailFromUrl(src);
    if (youtubeThumbnail) {
      return youtubeThumbnail;
    }
  }

  return null;
}

interface ArtstationClipMedia {
  gifUrl: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
}

interface ArtstationClipResponse {
  thumbnail?: {
    medium_url?: unknown;
  };
  video_sources?: Array<{
    video_url?: unknown;
    video_content_type?: unknown;
  }>;
  [key: string]: unknown;
}

async function extractArtstationClipMedia(html: string): Promise<ArtstationClipMedia | null> {
  const clipId = extractArtstationClipId(html);

  if (!clipId) {
    return null;
  }

  try {
    const data = await fetchJson<ArtstationClipResponse>(
      `https://www.artstation.com/api/v2/animation/video_clips/${clipId}.json`
    );

    const gifUrl = findFirstGifUrl(data);
    const thumbnailUrl = normalizeUrl(toText(data.thumbnail?.medium_url));
    const videoSources = Array.isArray(data.video_sources) ? data.video_sources : [];
    const preferredVideo =
      videoSources.find((source) => toText(source.video_content_type).includes("video/mp4")) ?? videoSources[0];
    const videoUrl = normalizeUrl(toText(preferredVideo?.video_url));

    return {
      gifUrl,
      videoUrl,
      thumbnailUrl
    };
  } catch {
    return null;
  }
}

function extractArtstationClipId(html: string): string | null {
  const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;

  while ((match = iframeRegex.exec(html)) !== null) {
    const src = decodeHtmlEntities(match[1]);
    const clipMatch = src.match(/\/api\/v2\/animation\/video_clips\/([0-9a-f-]{8,})\//i);
    if (clipMatch?.[1]) {
      return clipMatch[1];
    }
  }

  return null;
}

function findFirstGifUrl(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    const normalized = normalizeUrl(value);
    if (normalized && isGifUrl(normalized)) {
      return normalized;
    }
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstGifUrl(item);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (typeof value === "object") {
    for (const nested of Object.values(value)) {
      const found = findFirstGifUrl(nested);
      if (found) {
        return found;
      }
    }
  }

  return null;
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*"
      }
    });

    if (!response.ok) {
      throw new Error(`ArtStation JSON request failed with ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

function youtubeThumbnailFromUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();

  if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
    const embedMatch = url.pathname.match(/\/embed\/([^/?#]+)/i);
    if (embedMatch?.[1]) {
      return `https://i.ytimg.com/vi/${embedMatch[1]}/hqdefault.jpg`;
    }

    const watchId = url.searchParams.get("v");
    if (watchId) {
      return `https://i.ytimg.com/vi/${watchId}/hqdefault.jpg`;
    }
  }

  if (host === "youtu.be") {
    const shortId = url.pathname.replace("/", "").trim();
    if (shortId) {
      return `https://i.ytimg.com/vi/${shortId}/hqdefault.jpg`;
    }
  }

  return null;
}

function parseDateOrNull(value: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toTimeValue(date: Date | null): number {
  return date ? date.getTime() : 0;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function toText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object") {
    const maybeCData = (value as { __cdata?: unknown }).__cdata;
    if (typeof maybeCData === "string") {
      return maybeCData;
    }
  }

  return "";
}

function stripHtml(input: string): string {
  const noScripts = input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ");

  const htmlStripped = noScripts
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ");

  return decodeHtmlEntities(htmlStripped);
}

function decodeHtmlEntities(input: string): string {
  const named = input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  const numeric = named.replace(/&#(\d+);/g, (_, code: string) => {
    const value = Number.parseInt(code, 10);
    return Number.isFinite(value) ? String.fromCharCode(value) : "";
  });

  return numeric.replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
    const value = Number.parseInt(code, 16);
    return Number.isFinite(value) ? String.fromCharCode(value) : "";
  });
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeUrl(input: string): string | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  return value;
}
