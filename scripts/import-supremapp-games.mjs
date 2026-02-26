#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const DEV_URL = "https://www.pgyer.com/ipa/developer/SupremApp";
const ROOT = process.cwd();
const GAMES_CONTENT_DIR = path.join(ROOT, "src", "content", "games");
const GAMES_IMAGES_DIR = path.join(ROOT, "public", "images", "games");

const MANIFEST = [
  {
    packageId: "fr.supremapp.arithmos",
    slug: "arithmos-nouveau-sudoku",
    title: "Arithmos - Nouveau Sudoku",
    description: "Number puzzle game blending Sudoku-style logic with flexible arithmetic rules."
  },
  {
    packageId: "fr.supremapp.balistaboom",
    slug: "balista-boom",
    title: "Balista Boom",
    description: "Colorful arcade shooter focused on quick aim and chain-reaction precision."
  },
  {
    packageId: "fr.supremapp.colorslide",
    slug: "slide-color",
    title: "Slide Color",
    description: "One-line color fill puzzle with tight paths and increasing difficulty."
  },
  {
    packageId: "fr.supremapp.domiwords",
    slug: "domi-words-words-puzzle",
    title: "Domi Words - Words puzzle",
    description: "Word puzzle built around domino-like chaining and compact grid challenges."
  },
  {
    packageId: "fr.supremapp.gravityskate",
    slug: "gravity-skate",
    title: "Gravity Skate",
    description: "Gravity-shifting skate runner with obstacle timing and momentum control."
  },
  {
    packageId: "fr.supremapp.infinityup",
    slug: "stair-up",
    title: "Stair Up",
    description: "Fast vertical climber where precise jumps and rhythm drive progression."
  },
  {
    packageId: "fr.supremapp.jumpyrace",
    slug: "jumpy-race",
    title: "Jumpy Race",
    description: "Endless reflex runner guiding a rolling ball through jump gates."
  },
  {
    packageId: "fr.supremapp.knightescape",
    slug: "knight-escape",
    title: "Knight Escape",
    description: "One-tap dungeon escape arcade game with trap timing and route planning."
  },
  {
    packageId: "fr.supremapp.pushpush",
    slug: "run-strike",
    title: "Run Strike!",
    description: "High-tempo action runner with punchy progression and survival pressure."
  },
  {
    packageId: "fr.supremapp.tapdribble",
    slug: "tap-dribble",
    title: "Tap Dribble",
    description: "Rhythm dribbling challenge combining timing, dodging, and score chaining."
  },
  {
    packageId: "fr.supremapp.taptapfly",
    slug: "tap-tap-fly",
    title: "Tap Tap Fly!",
    description: "One-touch flight arcade game centered on altitude control and obstacle flow."
  },
  {
    packageId: "fr.supremapp.tapturn",
    slug: "tapturn",
    title: "TapTurn",
    description: "High-speed one-tap turning arcade game with narrow timing windows."
  }
];

const MONTHS = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12"
};

const OVERWRITE = process.argv.includes("--overwrite");

function unique(values) {
  return [...new Set(values)];
}

function decodeHtml(input) {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function cleanText(html) {
  return decodeHtml(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.toLowerCase() !== "supremapp studio")
    .join("\n");
}

function parseAbout(html) {
  const match = html.match(/markdown-app-description[^>]*>([\s\S]*?)<\/div>/i);
  if (!match) return "";
  return cleanText(match[1]);
}

function parseLatestDate(html) {
  const match = html.match(
    /<span[^>]*>\s*([A-Za-z]{3}\s+\d{1,2},\s+\d{4})\s*<\/span>\s*<span[^>]*>\s*Latest update\s*<\/span>/i
  );
  if (!match) return "2016-01-01";
  const raw = match[1].trim();
  const normalized = raw.replace(/\s+/g, " ");
  const parsed = normalized.match(/^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})$/);
  if (!parsed) return "2016-01-01";
  const month = MONTHS[parsed[1].toLowerCase()];
  if (!month) return "2016-01-01";
  const day = parsed[2].padStart(2, "0");
  return `${parsed[3]}-${month}-${day}`;
}

function extractAssetUrls(html, packageId) {
  return unique(
    [...html.matchAll(/https:\/\/assets\.apk\.live\/[^"'\\\s<>]+/gi)]
      .map((match) => match[0].replace(/\\$/, ""))
      .filter((url) => url.toLowerCase().includes(packageId.toLowerCase()))
  );
}

function selectIconUrl(urls) {
  const iconUrls = urls.filter((url) => /-icon\.(webp|jpeg|jpg|png)/i.test(url));
  if (!iconUrls.length) return null;
  const w112 = iconUrls.find((url) => /resize,w_112/i.test(url));
  if (w112) return w112;
  const noQuery = iconUrls.find((url) => !url.includes("?"));
  return noQuery ?? iconUrls[0];
}

function selectIphoneScreenshotUrls(urls) {
  const raw = urls.filter((url) => /-screenshot\d+\.webp/i.test(url) && !/-ipadscreenshot/i.test(url));
  return unique(raw).sort((a, b) => {
    const aNum = Number((a.match(/-screenshot(\d+)\.webp/i) ?? [])[1] ?? "0");
    const bNum = Number((b.match(/-screenshot(\d+)\.webp/i) ?? [])[1] ?? "0");
    return aNum - bNum;
  });
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TitanImporter/1.0)"
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }
  return response.text();
}

async function downloadFile(url, outputPath) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; TitanImporter/1.0)"
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while downloading ${url}`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, bytes);
}

function yamlString(value) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function escapeHtmlAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderCarousel(slug, title, imageCount) {
  const safeTitle = escapeHtmlAttr(title);
  const slides = Array.from({ length: imageCount }, (_, idx) => idx + 1)
    .map(
      (n) => `      <div class="basis-full shrink-0 snap-start lg:basis-[calc((100%-0.5rem)/2)]">
        <img src="/images/games/${slug}/${n}.webp" alt="${safeTitle} screenshot ${n}" class="h-auto w-full object-contain" loading="lazy" />
      </div>`
    )
    .join("\n");

  const dots = Array.from({ length: imageCount }, (_, idx) => idx)
    .map((i) => {
      const active = i === 0;
      const classes = active ? "bg-cyan-600 dark:bg-cyan-400" : "bg-slate-300 dark:bg-slate-600";
      const current = active ? ' aria-current="true"' : "";
      return `      <button type="button" class="h-2.5 w-2.5 rounded-full ${classes}" data-carousel-dot data-index="${i}" aria-label="Go to slide ${i + 1}"${current}></button>`;
    })
    .join("\n");

  return `<div class="space-y-3" data-carousel role="region" aria-label="${safeTitle} screenshots">
  <div class="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700">
    <div class="flex gap-2 snap-x snap-mandatory overflow-x-auto scroll-smooth" data-carousel-track>
${slides}
    </div>
  </div>

  <div class="flex items-center justify-between gap-3">
    <button
      type="button"
      class="button-secondary min-w-24 px-3 py-2 text-sm"
      data-carousel-prev
      aria-label="Previous slide"
    >
      Previous
    </button>
    <div class="flex items-center gap-2" data-carousel-dots>
${dots}
    </div>
    <button
      type="button"
      class="button-secondary min-w-24 px-3 py-2 text-sm"
      data-carousel-next
      aria-label="Next slide"
    >
      Next
    </button>
  </div>
</div>`;
}

function renderGameMarkdown({ title, description, slug, date, about, accessUrl, imageCount }) {
  const overviewText = about || "Overview text unavailable from source page.";
  const mediaSection = renderCarousel(slug, title, imageCount);
  return `---
title: ${yamlString(title)}
description: ${yamlString(description)}
cardImage: /images/games/${slug}/card.webp
date: ${date}
status: released
platforms:
  - iOS
  - Android
engine: Unity
genre: Casual
releaseNote: iOS/Android release (PGYER archive).
accessUrl: ${accessUrl}
accessLabel: Access game archive
supremapp: true
---

## Overview

${overviewText}

## Media

${mediaSection}
`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function main() {
  const devHtml = await fetchText(DEV_URL);
  const discovered = unique(
    [...devHtml.matchAll(/\/ipa\/ipa\/fr\.supremapp\.[a-z0-9.-]+/gi)].map((m) => m[0].toLowerCase())
  );
  console.log(`Discovered ${discovered.length} SupremApp links on developer page.`);

  const errors = [];
  let importedCount = 0;

  for (const item of MANIFEST) {
    const appPath = `/ipa/ipa/${item.packageId}`;
    if (!discovered.includes(appPath.toLowerCase())) {
      errors.push(`Missing from developer page: ${appPath}`);
      continue;
    }

    const contentFile = path.join(GAMES_CONTENT_DIR, `${item.slug}.md`);
    try {
      await fs.access(contentFile);
      if (!OVERWRITE) {
        console.log(`Skipping existing file: ${item.slug}.md`);
        continue;
      }
    } catch {
      // File does not exist -> import.
    }

    const appUrl = `https://www.pgyer.com${appPath}`;

    try {
      const appHtml = await fetchText(appUrl);
      const about = parseAbout(appHtml);
      const date = parseLatestDate(appHtml);
      const assets = extractAssetUrls(appHtml, item.packageId);
      const iconUrl = selectIconUrl(assets);
      const screenshots = selectIphoneScreenshotUrls(assets);

      if (!iconUrl) {
        throw new Error(`Could not find icon URL for ${item.packageId}`);
      }

      const imageDir = path.join(GAMES_IMAGES_DIR, item.slug);
      await ensureDir(imageDir);

      await downloadFile(iconUrl, path.join(imageDir, "card.webp"));

      let imageCount = 0;
      if (item.packageId === "fr.supremapp.tapturn") {
        imageCount = 4;
      } else {
        if (!screenshots.length) {
          throw new Error(`No iPhone screenshots found for ${item.packageId}`);
        }
        let index = 1;
        for (const shotUrl of screenshots) {
          await downloadFile(shotUrl, path.join(imageDir, `${index}.webp`));
          index += 1;
        }
        imageCount = screenshots.length;
      }

      const markdown = renderGameMarkdown({
        title: item.title,
        description: item.description,
        slug: item.slug,
        date,
        about,
        accessUrl: appUrl,
        imageCount
      });

      await fs.writeFile(contentFile, markdown, "utf8");
      importedCount += 1;
      console.log(`Imported ${item.slug} (${imageCount} screenshots).`);
    } catch (error) {
      errors.push(`${item.packageId}: ${error.message}`);
    }
  }

  console.log(`Done. Imported ${importedCount} game entries.`);
  if (errors.length) {
    console.error("Errors:");
    for (const err of errors) console.error(`- ${err}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
