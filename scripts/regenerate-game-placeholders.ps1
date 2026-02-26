Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$palette = @(
  @{ From = "#0f172a"; To = "#155e75"; Accent = "#67e8f9"; Text = "#e2e8f0"; Sub = "#a5f3fc" },
  @{ From = "#1f2937"; To = "#7c2d12"; Accent = "#fdba74"; Text = "#f8fafc"; Sub = "#fed7aa" },
  @{ From = "#111827"; To = "#4338ca"; Accent = "#a5b4fc"; Text = "#eef2ff"; Sub = "#c7d2fe" },
  @{ From = "#052e16"; To = "#166534"; Accent = "#86efac"; Text = "#ecfdf5"; Sub = "#bbf7d0" },
  @{ From = "#3f1d2e"; To = "#9d174d"; Accent = "#f9a8d4"; Text = "#fdf2f8"; Sub = "#fbcfe8" },
  @{ From = "#1f2937"; To = "#0c4a6e"; Accent = "#7dd3fc"; Text = "#f0f9ff"; Sub = "#bae6fd" },
  @{ From = "#172554"; To = "#312e81"; Accent = "#93c5fd"; Text = "#eff6ff"; Sub = "#bfdbfe" },
  @{ From = "#431407"; To = "#9a3412"; Accent = "#fdba74"; Text = "#fff7ed"; Sub = "#fed7aa" },
  @{ From = "#082f49"; To = "#0f766e"; Accent = "#5eead4"; Text = "#ecfeff"; Sub = "#99f6e4" },
  @{ From = "#022c22"; To = "#115e59"; Accent = "#2dd4bf"; Text = "#f0fdfa"; Sub = "#99f6e4" },
  @{ From = "#111827"; To = "#374151"; Accent = "#d1d5db"; Text = "#f9fafb"; Sub = "#e5e7eb" },
  @{ From = "#0b132b"; To = "#1c2541"; Accent = "#5bc0be"; Text = "#e0fbfc"; Sub = "#98c1d9" },
  @{ From = "#3b0764"; To = "#6d28d9"; Accent = "#c4b5fd"; Text = "#f5f3ff"; Sub = "#ddd6fe" }
)

New-Item -ItemType Directory -Path "public/images/games" -Force | Out-Null
$games = Get-ChildItem -Path "src/content/games" -Filter "*.md" | Sort-Object Name

for ($i = 0; $i -lt $games.Count; $i++) {
  $file = $games[$i]
  $content = Get-Content -Path $file.FullName
  $titleLine = $content | Where-Object { $_ -match "^title:\s*" } | Select-Object -First 1
  if (-not $titleLine) { continue }

  $title = ($titleLine -replace "^title:\s*", "").Trim().Trim('"')
  $slug = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
  $p = $palette[$i % $palette.Count]

  $titleSize = if ($title.Length -ge 18) { 48 } elseif ($title.Length -ge 12) { 54 } else { 62 }

  $svg = @"
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-labelledby="title desc">
  <title id="title">$title placeholder cover</title>
  <desc id="desc">Placeholder image for $title game card.</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="$($p.From)" />
      <stop offset="100%" stop-color="$($p.To)" />
    </linearGradient>
    <radialGradient id="glow" cx="0.2" cy="0.2" r="0.9">
      <stop offset="0%" stop-color="$($p.Accent)" stop-opacity="0.28" />
      <stop offset="100%" stop-color="$($p.Accent)" stop-opacity="0" />
    </radialGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)" />
  <rect width="1200" height="675" fill="url(#glow)" />
  <rect x="36" y="36" width="1128" height="603" rx="24" fill="none" stroke="$($p.Accent)" stroke-opacity="0.5" stroke-width="2" />
  <circle cx="1020" cy="130" r="94" fill="$($p.Accent)" fill-opacity="0.12" />
  <circle cx="1080" cy="180" r="34" fill="$($p.Accent)" fill-opacity="0.2" />
  <text x="80" y="292" fill="$($p.Text)" font-family="Manrope, Segoe UI, sans-serif" font-size="$titleSize" font-weight="800">$title</text>
  <text x="80" y="360" fill="$($p.Sub)" font-family="Manrope, Segoe UI, sans-serif" font-size="24" font-weight="600">Game placeholder cover</text>
</svg>
"@

  Set-Content -Path "public/images/games/$slug-placeholder.svg" -Value $svg
}

Write-Host "Regenerated $($games.Count) game placeholder images."
