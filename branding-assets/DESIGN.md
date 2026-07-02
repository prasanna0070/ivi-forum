# iVi Forum — ISB / I-Venture Design Language

Source of truth for restyling the app. Extracted 2026-07-02 from live CSS + rendered
screenshots of **isb.edu** (Next.js, `/_next/static/css/*.css`) and **i-venture.org**
(WordPress Blocksy, `blocksy/css/global.css`). All values below are measured or copied
verbatim from their stylesheets — implement literally.

Companion file: `BRAND.md` (palette provenance, logo assets). Screenshots studied:
`isb-home-desktop/mobile`, `isb-programmes-desktop/mobile`, `iventure-home-desktop/mobile`,
`iventure-programs-desktop`, footers, plus `before-landing-*.png` of the current app.

---

## 1. Verdict — what makes ISB look like ISB

1. **Serif display + sans body.** Every big heading on isb.edu is a chunky, warm serif
   ("Reckless", 600) in deep blue; ALL other text is Inter. This one pairing carries ~70%
   of the brand feel. The current app is 100% sans — biggest single gap.
2. **Sharp corners.** ISB buttons are `border-radius: 0`. I-Venture buttons are
   `--theme-button-border-radius: 0px`. Inputs are 2px, cards 0–6px max. Nothing is pill-shaped.
   The current app's 8–16px rounded cards/buttons/tabs read "generic SaaS", not ISB.
3. **Blue-on-light, never black headings.** Headings are `#1e2d8c`/`#192890` on white /
   `#f4f8fa` / `#e6ebee`. isb.edu even sets `body { color: #192890 }` and only drops body copy
   to `#1d252a`. Black (`#000`) appears only on i-venture.org nav/headings.
4. **Flat surfaces, hairline borders, almost no shadows.** Cards are solid blocks with
   1px `#cfdbe2` borders. The only recurring shadows: `0 1px 4px rgba(20,25,55,.06)` (cards)
   and `0 10px 20px rgba(43,61,80,.06)` (sticky header).
5. **Arrow language.** Every CTA carries a line arrow: `More Info →`, `Learn More ›`,
   `LEARN MORE ↗`, arrow-in-a-box tiles. On hover the arrow slides right 8px
   (`--arrow-transformx: 8px`). Links never just sit there.
6. **One loud accent per surface.** ISB uses aquamarine `#80edd9` as solid overlay blocks;
   I-Venture uses peach `#ffb172` as a thin underline under the logo, plus-badges, and
   button-text hover. Accents are small and rare — never backgrounds for whole sections.
7. **Generous, airy sections.** 8px-base spacing scale (`8/16/24/32/48/64/80`), sections
   padded ~80px vertical, alternating white / `#f4f8fa` bands.

**Top gaps in the current landing (`before-landing-*.png`):** sans-serif hero headline in
bright blue (should be serif in `#1e2d8c`); 12–16px rounded cards and 8px rounded buttons
(should be 0–6px); pill-shaped sign-in/sign-up tab switcher (should be squared underline
tabs); no kickers/eyebrows, no arrows on CTAs; hero floats in dead space with no navy or
photographic hero band; footer absent.

---

## 2. Typography

### Families (what they actually use)

| Site | Display / headings | Body / UI | Evidence |
|---|---|---|---|
| isb.edu | `reckless` (proprietary OTF, **only weight 600 shipped**) | `interV` (Inter variable) + static Inter 300–700 | `--f-heading:"reckless"`, `--f-body:"interV"` in `:root` |
| i-venture.org | Inter 700 (h1–h6) | Inter 400/500/600/700; nav `Roboto 700`; buttons `Inter Tight 500` | Blocksy `global.css` |

### Google-Fonts substitute for Reckless → **Fraunces**

Observed letterforms in the hero ("The future belongs to those who create it.") and
"Our Story"/"Post Graduate Programme" headings: **low stroke contrast, heavy chunky color,
soft bracketed wedge serifs, teardrop/ball terminals (r, c, g, y), very high x-height,
short descenders, warm 1970s-editorial feel.**

- **Fraunces (600, opsz ≈ 40–72) — CHOSEN.** Matches on every axis: soft bracketed serifs,
  teardrop terminals, high x-height, chunky low-contrast color at 600. Variable font,
  free, has `opsz` so it stays sturdy at card sizes and refined at hero sizes.
- Playfair Display — rejected: hairline high-contrast Didone; far too delicate. (ISB's blog
  CSS lists `Playfair Display, Lora, Georgia` as its own fallback stack, so keep them as
  fallbacks, but Playfair as primary looks wrong next to real Reckless.)
- Lora — acceptable fallback #1; calligraphic and lighter in color than Reckless.
- Source Serif 4 — rejected: cool/mechanical transitional; terminals too sharp.

```ts
// src/app/layout.tsx — add via next/font/google
import { Fraunces } from "next/font/google";
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  axes: ["opsz"],            // let the browser pick optical size
  variable: "--font-fraunces",
});
// add fraunces.variable to the <html> className
```

Full serif stack: `var(--font-fraunces), Lora, "Playfair Display", Georgia, "Times New Roman", serif`.
Body stays **Inter** (already loaded as `--font-inter`). `Inter Tight` may remain for
compact UI labels but is no longer the heading font.

### Type scale — DESKTOP (≥768px)

| Element | Family | Size | Weight | Line-height | Letter-spacing | Color |
|---|---|---|---|---|---|---|
| Display / hero H1 | Fraunces | 64px (4rem) | 600 | 1.1 | 0 | `#1e2d8c` on light, `#fff` on navy/photo |
| H1 (page title) | Fraunces | 48px (3rem) | 600 | 1.1 | 0 | `#1e2d8c` |
| H2 (section) | Fraunces | 40px (2.5rem) | 600 | 1.2 | 0 | `#1e2d8c` |
| H3 (card/subsection) | Fraunces | 32px (2rem) | 600 | 1.5 | 0 | `#1e2d8c` |
| H4 | Inter | 20px | 600 | 1.4 | 0 | `#192890` |
| Kicker / eyebrow | Inter | 13px | 600 | 1.3 | 0.08em, `uppercase` | `#525252` (or `#245bff` on white) |
| Body | Inter | 16px (1rem) | 400 | 1.6 | 0 | `#1d252a` |
| Body small / meta | Inter | 14px | 400 | 1.5 | 0 | `#1d252a` at 80% or `#525252` |
| Button label | Inter | 16px | 600 | 1.3 | 0 | — |
| Nav link | Inter | 16px | 600 | 1.3 | 0 | `#192890` |
| Stat number | Inter | 56px | 700 | 1.1 | -0.01em | `#192890` |
| Stat label | Inter | 16px | 600 | 1.3 | 0 | `#192890` |

(ISB element CSS verbatim: `h1{font-size:48px;line-height:1.1}` `h2{font-size:40px;line-height:1.2}`
`h3{font-size:32px;line-height:150%;font-weight:600}` — all `font-family:var(--f-heading)`.)

### Type scale — MOBILE (≤767px, ISB's own breakpoint)

| Element | Size | Line-height | Notes |
|---|---|---|---|
| Display / hero H1 | 40px | 1.15 | ISB: `@media(max-width:767px){h1{font-size:40px}}` |
| H1 | 40px | 1.15 | |
| H2 | 24px | 1.3 | ISB: `h2{font-size:24px}` |
| H3 | 22px | 1.4 | ISB: `h3{font-size:22px}` |
| H4 | 16px | 1.4 | |
| Body | 16px | 1.6 | never below 16px for inputs (iOS zoom) |
| Small | 13px | 1.5 | |
| Stat number | 40px | 1.1 | |
| Button | 16px | 1.3 | |

---

## 3. Color usage rules

Palette (verbatim from their CSS variables — do not invent shades):

| Token | Hex | Where the real sites use it |
|---|---|---|
| brand `#192890` | primary indigo | ISB logo fill; nav link text; default body/UI text color on isb.edu; I-Venture button background; icon stroke color; stat numbers; mobile-menu background (`Header_mobileSlideMenu` = `--primary-color-blue`); active-tab underline bar |
| brand-light `#245bff` | bright blue | **hover state of everything indigo** (links, outline-button borders, button text); isb.edu primary button background (`.button{background:#245bff;border:1px solid #245bff}`); tag/badge background (`--tag-background-colour:#245bff`) |
| heading `#1e2d8c` | heading blue | serif headings, filter/checkbox accents, focus rings (`outline:2px solid rgba(30,45,140,.3)`). Slightly brighter than brand; use for all Fraunces headings on light bg |
| brand-dark `#131f70` | darkest navy | `--primary-dark-blue`: dark hero bands, text on yellow/peach chips, darkest UI text on colored surfaces |
| accent `#ffb172` | peach | I-Venture ONLY, tiny doses: 2px underline beneath the logo wordmark, circular "+" badges, button-**text** hover color, illustration highlights. Never a section background, never body text |
| mint `#80edd9` | aquamarine | ISB ONLY: solid overlay cards on photos (title + copy sit on it), link-underline highlight on "Explore All …" CTAs, secondary-button hover borders on dark bg (`--primary-color-aquamarine`) |
| surface `#f4f8fa` | light blue-grey | card background on white (`--card-background-color`), alternating section bands, page bg (i-venture palette-5). isb.edu body bg is the sibling `#e6ebee` |
| surface-2 `#eef3f7` | lighter band | isb.edu light section/hover bg (`.rciOption:hover{background:#eef3f7}`) |
| border `#cfdbe2` | hairline | `--primary-border-color`: card borders, dividers, input borders (their inputs use `#c8d2dc` — treat as same token) |
| ink `#1d252a` | body text | `--primary-body-text-color`: paragraphs, card copy. NOT headings |
| footer slate `#2e3b42` | dark slate | i-venture.org footer middle band (`background-color:#2e3b42`; page-bottom strip `#5d6f7a`, base `#102136`) |
| danger `#e12433` | red | `--primary-red-400`: destructive/error only |

Rules of engagement:
- Headings → `#1e2d8c`. UI/nav/labels → `#192890`. Body → `#1d252a`. Never `#000` for text.
- Hover = shift indigo → `#245bff`. That is THE hover rule sitewide (text, borders, backgrounds).
- White text on `#192890`, `#131f70`, `#2e3b42`, photos. `#131f70` text on `#80edd9`/`#ffb172`.
- Section rhythm: white → `#f4f8fa` → white. Dark navy band (`#192890` gradient to `#131f70`)
  allowed once per page as hero.
- Focus ring everywhere: `outline: 2px solid rgba(30,45,140,.3); outline-offset: -2px;` with
  `border-color: #1e2d8c` (their exact focus recipe).

---

## 4. Components — exact recipes

### 4.1 Primary button
```css
display: inline-flex; align-items: center; gap: 8px;
background: #192890; color: #fff;
border: 1px solid #192890;
border-radius: 0;                      /* sharp — both sites */
padding: 12px 24px; min-height: 44px;  /* ISB: 16px 24px; I-Venture: 5px 20px/min-40 — 12px 24px splits it for app UI */
font: 600 16px/1.3 Inter; text-transform: none; letter-spacing: 0;
transition: all .2s ease;
/* hover */  background: #245bff; border-color: #245bff;
/* active */ background: #131f70;
/* disabled */ background: transparent; color: #c6c6c6; border: 1px solid #c6c6c6;
```
Compact variant (`small`, ISB `.button.small`): `padding: 8px 16px; min-height: 36px;`.
Marketing CTAs get a trailing `→` icon (20px, stroke 2) that translates `translateX(8px)` on hover.

### 4.2 Secondary / outline button (ISB `.button.secondaryBgGrey`, and the
"More Info →" / "Download brochure ⤓" boxes on the programmes page)
```css
background: transparent; color: #192890;
border: 1px solid #192890; border-radius: 0;
padding: 12px 24px; font: 600 16px/1.3 Inter;
/* hover */ color: #245bff; border-color: #245bff;   /* exact ISB hover */
```
On dark/navy surfaces: white text + `border: 1px solid #fff`; hover border/text `#80edd9`.

### 4.3 Text link
- Inline (body copy): `color: #245bff; font-weight: 600; text-decoration: underline;
  text-underline-offset: 3px;` (their `.viewAllButton` recipe). Hover: `color:#192890`.
- Standalone CTA link ("Learn More ›"): `color: #192890; font-weight: 600; font-size: 16px;
  no underline;` + chevron/arrow icon; hover `color: #245bff` and arrow `translateX(8px)`,
  `transition: transform .2s ease`. Optional ISB flourish: 8px-tall `#80edd9` underline
  highlight behind the text (used on "Explore All Programmes").

### 4.4 Card
```css
background: #fff;                     /* on #f4f8fa sections */
/* or */ background: #f4f8fa;         /* on white sections — ISB --card-background-color */
border: 1px solid #cfdbe2;
border-radius: 0px;                   /* marketing/landing */
border-radius: 6px;                   /* absolute max, app UI (ISB's most common radius) */
box-shadow: none;                     /* default */
box-shadow: 0 1px 4px rgba(20,25,55,.06);  /* only if elevation needed */
padding: 24px;                        /* 32px for feature cards */
```
Card title: Fraunces 600 20–24px `#1e2d8c`. Card body: Inter 400 15–16px `#1d252a`, lh 1.6.
Feature/photo card (ISB signature): photo block + solid `#80edd9` panel overlapping the
bottom-left (radius 0, padding 24px) containing serif title `#192890` + body + "Learn More ›".

### 4.5 Input field (ISB comment-form recipe, verbatim)
```css
width: 100%; background: #fff;
border: 1px solid #cfdbe2;            /* they use #c8d2dc */
border-radius: 2px;
padding: 10px 12px;
font: 400 15px/1.5 Inter; color: #1d252a;
/* placeholder */ color: #95a9b4;      /* ISB --checkbox-border */
/* focus */ border-color: #1e2d8c;
            outline: 2px solid rgba(30,45,140,.3); outline-offset: -2px;
```
Label above input: Inter 600 14px `#1d252a`, margin-bottom 6px.
Checkbox checked state: `background:#1e2d8c; border-color:#1e2d8c; box-shadow: inset 0 0 0 4px #eef3f7;`.

### 4.6 Nav header — desktop
```css
height: 72px;                          /* ISB main: 88px, shrinks to 52px on scroll; blogs nav: 72px; I-Venture: 70px */
background: #fff;
box-shadow: 0 10px 20px rgba(43,61,80,.06);   /* I-Venture exact; or border-bottom: 1px solid #cfdbe2 */
position: sticky; top: 0;
```
- Logo lockup left, image height 32–44px (I-Venture caps `--logo-max-height:30px`).
- Links: Inter 600 16px `#192890`, gap 32px, no underline; hover `#245bff`.
- Active link: 3px solid `#192890` bar flush at bottom edge (`.BlogsHeader_active:after{height:3px;background:#192890;bottom:-1px}`).
- Right side: icon buttons (search etc.) as 20px line icons, stroke 2, `#192890`.
- Container: max-width 1280px, padding-inline 40px.

### 4.7 Nav header — mobile (≤767px)
- Bar height 56px (ISB compacts to 52px), logo ≤28px tall, hamburger right: 3 equal
  horizontal lines, 24px box, 2px stroke, round caps, `#192890`.
- Menu = full-screen overlay, `background: #192890` (ISB `Header_mobileSlideMenu` =
  `--primary-color-blue`), slides in `left: 100% → 0`, `transition: left .5s`.
- Menu links: white, Inter 700 20px (I-Venture mobile-menu spec: `font-weight:700; font-size:20px; color:#fff`),
  stacked column, `padding: 24px 16px`, 16px gap, hairline dividers `rgba(198,198,198,.2)`.
- Chevron-right (2px stroke) on items with children.

### 4.8 Footer (I-Venture recipe)
```css
background: #2e3b42;                   /* their exact middle band */
color: #fff; padding: 64px 0 48px;
/* bottom strip */ background: #5d6f7a; height: 48px;
```
- 3–4 columns; column heading Inter 600 16px `#fff`; links Inter 400 15px
  `rgba(255,255,255,.85)`, line-height ~2.2, hover `#ffb172` or `#245bff`.
- White ISB + I-Venture lockup top-left (use `iventure-logo-white.png`), peach underline intact.
- Newsletter: input transparent bg, `border: 1px solid rgba(255,255,255,.35)`, radius 3px,
  white text; button below full-width `#192890`, white 15px, radius 0–3px.
- Social icons: 18px filled white glyphs (see Icons).

### 4.9 Section header pattern
```
[kicker  — Inter 600 13px uppercase .08em #525252]        margin-bottom: 8px
[H2      — Fraunces 600 40px #1e2d8c]                     margin-bottom: 16px
[sub     — Inter 400 16–18px #1d252a, max-width 720px]    margin-bottom: 24px
[CTA     — "Explore all → " tertiary link, optional]
```
Section vertical padding: 80px desktop / 48px mobile. Alternate white and `#f4f8fa`.

### 4.10 Badge / chip
- Solid: `background:#245bff; color:#fff;` (ISB `--tag-background-colour`), Inter 700 12px
  uppercase, letter-spacing .08em, `padding: 4px 10px; border-radius: 2px;`.
- Outline: `border:1px solid #cfdbe2; color:#192890; background:#fff;` same metrics.
- Warm highlight (cohort tags): `background:#ffb172; color:#131f70;` — sparingly.
- Status words ("Open"/"Closed", I-Venture): plain Inter 700 18px `#1d252a`, no pill at all.

---

## 5. Icons

**What the sites actually do (inspected at 2× zoom + CSS):**
- isb.edu icons are **line icons, 2px stroke, round caps and joins, no fill,
  currentColor** — their own CSS: `svg{width:20px;height:20px;stroke:currentColor;stroke-width:2;
  stroke-linecap:round;stroke-linejoin:round;fill:none}`. Search magnifier and hamburger in
  the nav at 20–24px in `#192890`; arrows (`→`, `›`, `⤓`) inside buttons and links.
- i-venture.org: same line-arrow language — 44px square tiles with **2px solid `#192890`
  border, radius 0, containing a 2px-stroke → arrow**; thin chevron-down carets in the nav;
  footer contact icons are glyphs inside 1px-stroked 40px circles; **only the social icons
  (LinkedIn/Instagram) are filled** solid-white glyphs ~18px.
- Nothing is duotone, nothing sits in colored rounded squircles, no gradients.

**Implementation rule for the app:** use **Lucide** (`lucide-react`) — its default
2px stroke + round caps/joins is an exact match.
- Size: 20px inline/nav, 24px feature bullets. `strokeWidth={2}`.
- Color: `currentColor`, i.e. `text-brand` (#192890) on light, `text-white` on dark. Never peach/mint icons.
- Feature icons: bare glyph above the title (current landing already does this — keep), or
  the I-Venture box: 44px square, `border: 2px solid #192890; border-radius: 0`, arrow inside.
- Social icons in footer: filled white glyphs (e.g. `simple-icons`), 18px.
- Arrows are the brand's kinetic element: every primary/tertiary CTA gets `ArrowRight` /
  `ChevronRight`, hover `translate-x-[8px] transition-transform duration-200`.

---

## 6. Mobile rules

1. Breakpoint: ISB switches at **767px**; keep Tailwind `md` (768) as the pivot.
2. Edge padding: **16px** (`--mobile-padding:16px` in ISB CSS). Section padding drops 80→48px.
3. Type: use the mobile scale table (§2) — hero/H1 40px, H2 24px, H3 22px, body stays 16px.
4. Buttons go **full-width, centered** on mobile (ISB: `.button{width:100%;justify-content:center}`
   in mobile queries). Stack CTA pairs vertically, 12px gap, primary on top.
5. Tap targets ≥ **44px** min-height (I-Venture button min-height 40px is the floor; 44 for app).
6. Nav: 56px sticky bar + full-screen indigo overlay menu (recipe §4.7). Logo ≤28px tall.
7. Cards: single column, full-bleed to the 16px gutter; horizontal card rows become
   swipe carousels with dot/dash pagination (I-Venture "Applications Open" uses a 24×4px
   peach dash + grey dash pager) — or just stack; never shrink cards side-by-side.
8. Stats grid: 2-up → 1-up, numbers 40px, centered (I-Venture mobile centers all stats).
9. Inputs stay ≥16px font-size (iOS zoom prevention) and full-width.
10. Sticky header keeps the `0 10px 20px rgba(43,61,80,.06)` shadow; no other sticky elements.

---

## 7. Tailwind v4 `@theme` tokens — paste into `src/app/globals.css`

Extends the existing block; every existing token name stays valid.

```css
@theme {
  /* ── existing (unchanged) ─────────────────────────────── */
  --color-brand: #192890;        /* primary indigo — UI text, buttons, icons, nav */
  --color-brand-light: #245bff;  /* hover state of everything indigo; badges */
  --color-accent: #ffb172;       /* peach — hairline underlines, chips; tiny doses */
  --color-surface: #f4f8fa;      /* page bg / alternating section band / card-on-white */
  --color-ink: #1d252a;          /* body copy */

  /* ── new ──────────────────────────────────────────────── */
  --color-brand-dark: #131f70;   /* darkest navy — hero bands, active button state */
  --color-heading: #1e2d8c;      /* ALL serif headings on light backgrounds */
  --color-border: #cfdbe2;       /* hairline card/input borders, dividers */
  --color-surface-2: #eef3f7;    /* hover fills, lighter band */
  --color-footer: #2e3b42;       /* footer slate (i-venture.org exact) */
  --color-mint: #80edd9;         /* ISB aquamarine — overlay panels, link highlight */
  --color-mint-light: #bdf4e9;   /* mint hover tint (ISB --primary-button-hover) */
  --color-muted: #525252;        /* kickers/eyebrows, secondary meta */
  --color-placeholder: #95a9b4;  /* input placeholders */
  --color-danger: #e12433;       /* ISB red — destructive/error only */

  --radius-brand: 0px;           /* buttons, chips, marketing cards */
  --radius-card: 6px;            /* max radius for app-UI cards */
  --radius-input: 2px;           /* form fields */

  --shadow-card: 0 1px 4px rgba(20, 25, 55, 0.06);
  --shadow-nav: 0 10px 20px rgba(43, 61, 80, 0.06);
  --shadow-pop: 0 6px 18px rgba(20, 25, 55, 0.15);   /* dropdowns/popovers only */

  --text-display: 4rem;          /* 64px hero;    40px mobile */
  --text-display--line-height: 1.1;
  --text-h1: 3rem;               /* 48px;         40px mobile */
  --text-h1--line-height: 1.1;
  --text-h2: 2.5rem;             /* 40px;         24px mobile */
  --text-h2--line-height: 1.2;
  --text-h3: 2rem;               /* 32px;         22px mobile */
  --text-h3--line-height: 1.5;
}

@theme inline {
  /* keep --font-sans and --font-display as-is, add: */
  --font-serif: var(--font-fraunces), Lora, "Playfair Display", Georgia,
    "Times New Roman", serif;    /* Fraunces via next/font, variable --font-fraunces */
}
```

Base-layer change to pair with it (replaces the current `h1–h4 → Inter Tight` rule):

```css
@layer base {
  h1, h2, h3 {
    font-family: var(--font-serif);
    font-weight: 600;
    color: var(--color-heading);
  }
  h4, h5, h6 { font-family: var(--font-sans); font-weight: 600; color: var(--color-brand); }
}
```

---

## 8. Do / Don't

1. **Do** set every h1–h3 in Fraunces 600 `#1e2d8c`. **Don't** ever render a serif heading
   in pure black or in `#245bff`.
2. **Do** keep buttons and chips at `border-radius: 0` (app-UI cards max 6px, inputs 2px).
   **Don't** use radii ≥8px or pill shapes anywhere — kill the current rounded tabs.
3. **Do** use hover = indigo→`#245bff` (text, border, or bg). **Don't** invent opacity/scale
   hovers.
4. **Do** put a 2px-stroke Lucide arrow on every CTA and slide it 8px right on hover.
   **Don't** ship a bare "Learn more" link.
5. **Do** use flat cards: 1px `#cfdbe2` border, shadow at most `0 1px 4px rgba(20,25,55,.06)`.
   **Don't** use shadows heavier than `0 6px 18px rgba(20,25,55,.15)`, and that only on
   floating menus.
6. **Do** keep body copy `#1d252a` Inter 400 16px/1.6 with measure ≤ 720px. **Don't** set
   body copy in brand blue (blue is for headings, links, UI chrome).
7. **Do** use peach `#ffb172` only as a thin underline, a small chip, or a text-hover color.
   **Don't** use peach or mint as a section background or icon color.
8. **Do** alternate white / `#f4f8fa` section bands with 80px (48px mobile) padding and one
   navy `#192890` hero band. **Don't** stack two grey bands or gradient anything except
   navy-hero (`#192890 → #131f70` is fine).
9. **Do** use line icons — 2px stroke, round caps/joins, 20–24px, `currentColor` indigo.
   **Don't** mix in filled, duotone, or multi-color icons (exception: filled white social
   glyphs in the footer).
10. **Do** use uppercase only for 12–13px kickers/eyebrows at .08em tracking. **Don't**
    uppercase buttons, headings, or nav links (ISB keeps them sentence-case).
