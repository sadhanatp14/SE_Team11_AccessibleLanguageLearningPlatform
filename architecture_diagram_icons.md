# Architecture Diagram — Reference Sheet

## Icons to Download (SVG)

All icons are freely available from [SimpleIcons](https://simpleicons.org/) unless otherwise noted.

| Icon | SimpleIcons Slug | Brand Color | Notes |
|------|-----------------|-------------|-------|
| React | `react` | `#61DAFB` | Use in Column 2 box header |
| Node.js | `nodedotjs` | `#339933` | Use in Column 3 box header |
| Express | `express` | `#000000` | Small badge next to Node box |
| MongoDB | `mongodb` | `#47A248` | Use as leaf-icon in Column 4 |
| Vercel | `vercel` | `#000000` | Badge top-right of Column 2 |
| Railway | `railway` | `#7000FF` | Badge beside Column 3 |
| Google Gemini / Google AI | `google` (or `googlegemini` if available) | `#4285F4` | Column 5 AI sub-box |
| Python | `python` | `#3776AB` | Column 5 TTS sub-box |
| JWT | `jsonwebtokens` | `#000000` | Small key/lock icon in Column 3 |
| GitHub | `github` | `#181717` | CI/CD strip |
| Microphone (generic) | Use [Heroicons](https://heroicons.com/) `microphone` | `#16A34A` | Column 1, In-Browser Speech sub-box |
| Speaker / Volume (generic) | Use [Heroicons](https://heroicons.com/) `speaker-wave` | `#16A34A` | Column 1, SpeechSynthesis |
| Web browser (generic) | Use [Heroicons](https://heroicons.com/) `globe-alt` | `#4285F4` | Column 1 box header |
| Database / storage (generic) | Use [Heroicons](https://heroicons.com/) `circle-stack` | `#CA8A04` | Column 1, Local Storage sub-box |
| Google Translate (TTS fallback) | `googletranslate` | `#4285F4` | Column 5 TTS sub-box badge |

> **Tip**: Download from SimpleIcons: `https://cdn.simpleicons.org/<slug>/<hexcolor>`  
> Example: `https://cdn.simpleicons.org/react/61DAFB`

---

## Legend

### Arrow Styles

| Style | Color | Meaning |
|-------|-------|---------|
| Solid orthogonal → | `#2563EB` Blue | HTTPS / REST request (Client→Frontend, Frontend→Backend) |
| Solid orthogonal → | `#47A248` Green | Database connection (Mongoose / MongoDB Atlas) |
| Dashed orthogonal → | `#7C3AED` Purple | External HTTPS to Google Gemini AI API |
| Dashed orthogonal → | `#EA580C` Orange | Spawn Python subprocess OR fallback Google Translate TTS URL |
| Dashed orthogonal → | `#555555` Gray | JSON response + MP3 audio return path |
| Dashed ↔ (internal) | `#999999` Light gray | On-device communication (no server round-trip); within Client box only |

### Boundary Styles

| Style | Meaning |
|-------|---------|
| Dashed rounded rectangle (light gray) | Logical column group / deployment zone |
| Solid rounded rectangle (black 2px) + drop shadow | Major service box (main column container) |
| Solid rounded rectangle (colored 1.5px) | Sub-service box within a major column |
| Dashed rounded rectangle (blue-gray 1px, lighter) | Placeholder / future feature |

### Typography

| Usage | Weight | Size |
|-------|--------|------|
| Column group label | Bold | 13px |
| Box / sub-box title | Bold | 12–13px |
| Body / bullet text | Regular | 10px |
| Caption / note | Regular | 9px |

### Spacing

- Major column gutter: **40px**
- Inner box padding: **16px**
- Sub-box padding: **12px**
- Arrow label background: white semi-transparent fill to prevent overlap

---

## Files Produced

| File | Description |
|------|-------------|
| `architecture_diagram.svg` | Editable SVG (1920×1080, 16:9) — open in Inkscape, Figma, or browser |
| `architecture_diagram.drawio` | draw.io XML — open at [app.diagrams.net](https://app.diagrams.net) |
| `architecture_diagram_icons.md` | This reference sheet |
