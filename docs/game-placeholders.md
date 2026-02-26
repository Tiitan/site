# Game Placeholder Generation

This project uses SVG placeholder covers for game cards so new entries can be added quickly while keeping a consistent visual style.

## Where placeholders live

- Images: `public/images/games/<slug>-placeholder.svg`
- Content references: `cardImage` in `src/content/games/<slug>.md`

Example:

```yaml
cardImage: /images/games/hopboy-placeholder.svg
```

## Visual recipe

Each placeholder uses:

- Canvas: `1200x675` (16:9)
- Base: diagonal `linearGradient`
- Accent: soft `radialGradient` glow overlay
- Framing: rounded border + subtle accent circles
- Text:
  - Main title (large, bold)
  - Subtitle: `Game placeholder cover`

## Title sizing rule

Font size is chosen from title length to avoid overflow:

- `>= 18` chars: `48`
- `>= 12` chars: `54`
- otherwise: `62`

## Color variation rule

Colors are selected from a palette array and applied per game (cycled by index):

- `From` / `To` for background gradient
- `Accent` for border and glow
- `Text` / `Sub` for main and secondary labels

This keeps card covers visually varied while preserving a unified style.

## Regeneration workflow (PowerShell)

Use the committed script to regenerate placeholders from existing game content titles:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\regenerate-game-placeholders.ps1
```

Manual workflow (what the script does):

1. Read all `src/content/games/*.md`
2. Extract `title` and `slug` (filename)
3. Pick a palette by index
4. Compute title font size from length
5. Write SVG to `public/images/games/<slug>-placeholder.svg`

High-level pattern:

```powershell
$games = Get-ChildItem -Path 'src/content/games' -Filter '*.md' | Sort-Object Name
foreach ($game in $games) {
  # extract title + slug
  # choose palette
  # compute font size
  # write SVG file under public/images/games/
}
```

## Adding a new game card

1. Add content file: `src/content/games/<slug>.md`
2. Set `cardImage: /images/games/<slug>-placeholder.svg`
3. Generate or copy a placeholder SVG using the recipe above
4. Build and verify:

```sh
npm run build
```
