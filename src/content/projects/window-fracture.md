---
title: Window fracture - Unity
description: Runtime Unity package for pattern-driven glass shattering with deterministic fracture control and recursive shard breaking.
cardImage: /images/window-fracture-card.jpg
tags:
  - Destruction
  - Geometry
  - Runtime
  - Tooling
  - C#
date: 2023-04-03
featured: true
status: shipped
storeUrl: https://assetstore.unity.com/packages/slug/tools/window-fracture-placeholder-000000
storeLabel: View in Unity Asset store
---

## Overview

Window Fracture is a runtime package for realistic, pattern-driven shattering focused on flat glass panels. On impact, a 2D fracture pattern is projected and clipped on the panel, converted into shard polygons, and extruded into runtime shard meshes.

## Highlights

- Hand-authored fracture patterns with randomized rotation for high variation.
- Deterministic fracture API (`patternIndex`, `rotation`) for replay/network sync.
- Recursive shattering support: spawned shards can fracture again.
- Connectivity-aware shard fall behavior, including anchored frame-touching pieces.

## Media

<iframe
  src="https://www.youtube-nocookie.com/embed/d-GVbH1iRUU"
  title="Window fracture unity demo"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
</iframe>

## Technical Notes

- Supports convex-like flat panel geometry with arbitrary thickness and non-uniform XY scale.
- UV0 is propagated from the source panel to generated shards for material consistency.
- Runtime generation is designed to be lightweight versus full 3D volume fracture workflows.
- Current implementation target is Unity 6000.3+.

## Links

- [GitHub repository](https://github.com/Tiitan/WindowFracture) - Unity license required for commercial use and support.

## Changelog

- 2023-Q1: Public beta.
- 2026-Q1: 1.0: Recursive shattering. Asset store release.
