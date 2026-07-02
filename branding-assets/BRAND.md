# I-Venture @ ISB — Brand Extraction

Extracted 2026-07-02 from the **live official sites**:
- https://i-venture.org (I-Venture @ ISB — WordPress/Blocksy + Elementor)
- https://www.isb.edu (parent ISB brand — Next.js)

No fallback needed — both sites were reachable and CSS was pulled directly.

Key finding: **the ISB logo SVG is filled `#192890`, which is exactly I-Venture's
`--theme-palette-color-1`.** ISB's own CSS also defines
`--primary-color-tertiary-active:#192890` and `--primary-color-tertiary-hover:#245bff`,
matching I-Venture's palette 1:1. `#192890` is *the* brand blue for both.

---

## Palette

| Role | Hex | Source |
|---|---|---|
| **Primary** (brand deep indigo-blue) | `#192890` | `--theme-palette-color-1` on `:root` in `https://i-venture.org/wp-content/uploads/blocksy/css/global.css`; also the `fill` of `isb-logo-blue.svg` (`https://prodcd.isb.edu/media/sdddpvbt/logo_blue.svg`) and `--primary-color-tertiary-active` in isb.edu CSS |
| **Secondary** (bright blue — links, hovers, CTAs) | `#245bff` | `--theme-palette-color-2` (i-venture.org global.css); `--primary-color-tertiary-hover` (isb.edu `/_next/static/css/*.css`) |
| **Accent** (peach/apricot — warm highlight) | `#ffb172` | `--theme-palette-color-3` (i-venture.org global.css); used as `--theme-button-text-hover-color` |
| **Background** (page, light blue-grey) | `#f4f8fa` | `--theme-palette-color-5` (i-venture.org global.css) |
| **Surface** (cards/alt sections) | `#F3F5F7` / `#FBFBFC` | `--theme-palette-color-6` / `-7` (i-venture.org global.css) |
| **Text / headings** | `#000000` | `--theme-palette-color-4`; `--theme-headings-color: var(--theme-palette-color-4)` (i-venture.org global.css) |
| **Body text (softer, ISB)** | `#1d252a` | `--primary-body-text-color` (isb.edu CSS bundles) |
| **White** | `#ffffff` | `--theme-palette-color-8` |

### Supporting ISB tones (optional, from isb.edu CSS)
- `#1e2d8c` — ISB heading blue, the single most-used hex on isb.edu (25×; e.g. `.BlogsListingPage_heading__* { color:#1e2d8c }`). Slightly brighter sibling of `#192890`.
- `#131f70` — `--primary-dark-blue` (darkest navy, good for footers / dark sections).
- `#eef3f7` — isb.edu light section background.
- `#cfdbe2` — `--primary-border-color` (borders/dividers).
- `#e12433` — `--primary-red-400` (destructive/alert accent).

---

## Typography

**i-venture.org** loads from Google Fonts
(`fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@700&family=Inter+Tight:wght@500`):
- **Body:** `Inter, sans-serif` (400/500/600/700)
- **Headings/UI accents:** `Inter Tight` (500) and `Roboto` (700) in places

**isb.edu** uses (from `--f-body` / `--f-heading` in its Next.js CSS):
- **Body:** `interV` — Inter variable (self-hosted)
- **Headings:** `reckless` — Reckless, a proprietary serif (Displaay Type Foundry, not on Google Fonts). ISB's own fallback stack elsewhere: `Playfair Display, Lora, Georgia, Times New Roman, serif`.

### Recommended stacks for the web app
```css
/* Body + UI — free, exactly what both sites use */
font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;

/* Headings, option A (I-Venture-native, all-sans look): */
font-family: "Inter Tight", "Inter", sans-serif;   /* weights 500–700 */

/* Headings, option B (ISB-institutional serif feel; Reckless is proprietary → Google Fonts stand-in): */
font-family: "Lora", "Playfair Display", Georgia, serif;
```
Google Fonts to load: **Inter (400,500,600,700), Inter Tight (500,600,700)** — plus **Lora (500,600,700)** only if using option B.

---

## Downloaded logo assets (in this folder)

| File | What it is | Format / dimensions | Source URL |
|---|---|---|---|
| `iventure-logo.png` | I-Venture @ ISB full lockup, **color** (for light backgrounds — used as the sticky-header logo on i-venture.org) | PNG RGBA, 2000 × 402 | https://i-venture.org/wp-content/uploads/2025/03/I-Venture-Logo-website.png |
| `iventure-logo-white.png` | I-Venture @ ISB full lockup, **white** (for dark/hero backgrounds — default header logo on i-venture.org) | PNG RGBA, 1920 × 389 | https://i-venture.org/wp-content/uploads/2025/03/I-Venture-Logo-website-w.png |
| `isb-logo-blue.svg` | ISB logo, vector, fill `#192890` | SVG (4.1 KB) | https://prodcd.isb.edu/media/sdddpvbt/logo_blue.svg |
| `isb-mark-square.png` | Square ISB mark (i-venture.org's favicon/site icon — good for favicon/avatar) | PNG RGB, 512 × 512 | https://i-venture.org/wp-content/uploads/2025/05/Isb-fav.png |

All verified with `file` as real images (not HTML error pages).

---

## Tailwind theme tokens

```js
// tailwind.config — theme.extend.colors
colors: {
  brand: {
    DEFAULT: "#192890",   // primary — ISB/I-Venture deep indigo (logo fill)
    50:  "#f4f8fa",       // page background (palette-color-5)
    100: "#eef3f7",       // light section bg (isb.edu)
    200: "#cfdbe2",       // borders/dividers (isb.edu --primary-border-color)
    500: "#245bff",       // secondary bright blue — links, hovers, CTAs
    600: "#1e2d8c",       // ISB heading blue
    700: "#192890",       // primary
    900: "#131f70",       // darkest navy — footers, dark sections
  },
  accent: {
    DEFAULT: "#ffb172",   // peach accent (palette-color-3)
  },
  surface: {
    DEFAULT: "#FBFBFC",   // near-white card surface
    alt: "#F3F5F7",       // alt surface
  },
  ink: {
    DEFAULT: "#1d252a",   // body text (isb.edu --primary-body-text-color)
    heading: "#000000",   // headings (i-venture.org)
  },
  danger: "#e12433",      // ISB red-400
},
fontFamily: {
  sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
  heading: ["Inter Tight", "Inter", "sans-serif"],
  // serif: ["Lora", "Playfair Display", "Georgia", "serif"], // optional ISB-institutional variant
},
```

### Usage cues observed on the live sites
- Deep blue `#192890` = headers, buttons, headings-on-light; hover shifts to `#245bff`.
- Hero sections: dark blue background + white logo + white text; peach `#ffb172` appears on button-text hover states.
- Content areas: near-white (`#f4f8fa`/`#FBFBFC`) backgrounds, black/near-black text, generous whitespace, Inter throughout.
