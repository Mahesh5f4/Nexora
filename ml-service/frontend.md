---
name: thinkaction-ui
description: >
  ThinkAction AI frontend UI enforcement skill. Use this skill whenever the user
  uploads FRONTEND_UI_GUIDELINES.md alongside a build request, asks to build any
  UI component for the ThinkAction AI project (Chat, Analyze, Research, Plan, or
  Code Researcher agents), mentions FeatureCard, agent panels, glow borders,
  gradient borders, or streaming UI for ThinkAction. Also trigger when the user
  asks to "follow the UI rules", "match the design system", or "check against the
  guidelines" for this project. Always load the uploaded guidelines file and
  enforce every rule before writing a single line of JSX or CSS.
sources: [chat]
---

# ThinkAction UI Enforcement Skill

You are building UI for the ThinkAction AI platform. This skill ensures every
component you produce is 100% compliant with the project's design system.

---

## Step 0 — Load the guidelines first (mandatory)

Before writing any code, read the uploaded `FRONTEND_UI_GUIDELINES.md`.

```
The file will be at /mnt/user-data/uploads/FRONTEND_UI_GUIDELINES.md
Use the `view` tool to read it fully.
```

If the file is not uploaded yet, tell the user:

> "Please upload `FRONTEND_UI_GUIDELINES.md` alongside your request so I can
> enforce the full design system. You can find it in the project output folder."

Do not proceed without the file.

---

## Step 1 — Identify what is being built

From the user's request, determine:

| Question | Why it matters |
|---|---|
| Which agent mode? (Chat / Analyze / Research / Plan / Code) | Determines output panel schema (§7 of guidelines) |
| Is it a card, panel, input, tab, or page? | Determines which token + pattern section applies |
| Does it need a glow + gradient border? | Applies background-clip technique (§8) |
| Does it need streaming / loading state? | Applies §9 rules |
| Does it need animation? | Applies §6 rules |

State your answers briefly before writing code.

---

## Step 2 — Add the VideoBackground component (mandatory on every page)

Every page must include `<VideoBackground />` as the **first child** of the page root.
If the component does not already exist in the project, create it now before anything else.

**Canonical implementation:**

```jsx
// src/components/VideoBackground.jsx
import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_133255_956f653f-5d80-4b06-abd5-0f46c98b60fa.mp4";

export function VideoBackground() {
  const videoRef = useRef(null);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (!videoRef.current) return;
    if (shouldReduce) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }, [shouldReduce]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-[#0A0A0B]">
      <video
        ref={videoRef}
        src={VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40"
      />
      {/* Dark overlay — required for text contrast */}
      <div className="absolute inset-0 bg-[#0A0A0B]/60" />
    </div>
  );
}
```

**Page root pattern (every page):**

```jsx
import { VideoBackground } from "../components/VideoBackground";

export default function SomePage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-6 md:p-12 font-sans">
      <VideoBackground />
      {/* rest of content */}
    </div>
  );
}
```

**Non-negotiable rules:**
- `fixed inset-0 -z-10` on the wrapper — never `absolute`, never a different z-index
- All four video attributes: `autoPlay loop muted playsInline`
- Video opacity: exactly `opacity-40` — do not raise it
- Overlay: exactly `bg-[#0A0A0B]/60` — do not remove it
- `bg-[#0A0A0B]` on the wrapper div (fallback), not on the page root div
- Page root must be `relative` for stacking context
- `useReducedMotion()` must pause the video when true
- The CDN URL is the single source of truth — store it in `src/constants/agents.js` as `VIDEO_BG_URL` and import from there

---

## Step 3 — Run the compliance checklist

After drafting but before finalising, run through every item in §15 of the
guidelines (Quick-Reference Checklist). List each item and mark ✅ or flag ❌
with a fix. Only emit final code after all items are ✅.

Required checks:

- [ ] `<VideoBackground />` is first child of every page root
- [ ] Video wrapper: `fixed inset-0 -z-10 overflow-hidden bg-[#0A0A0B]`
- [ ] All four video attributes present: `autoPlay loop muted playsInline`
- [ ] Video: `opacity-40`, object-cover, fills viewport
- [ ] Dark overlay div: `bg-[#0A0A0B]/60` — present and not removed
- [ ] Page root is `relative` (not the video wrapper)
- [ ] `useReducedMotion()` pauses video when true
- [ ] CDN URL imported from `constants/agents.js` as `VIDEO_BG_URL`
- [ ] Background `#0A0A0B`, surface `#1A1A1C` — no other base colors
- [ ] Gradient borders use `background-clip: padding-box / border-box` inline style — never `border-color` with a gradient
- [ ] Glow layer: `absolute`, `pointer-events-none`, `opacity-60`, `filter: blur(45px)` — behind content, same gradient as border
- [ ] Entrance animation: `opacity 0→1, y 30→0, duration 0.8s easeOut` with stagger delay
- [ ] `useReducedMotion()` applied wherever `motion.*` is used
- [ ] Body copy no lighter than `text-gray-400` (#9CA3AF) — never `text-white/20` for readable text
- [ ] Icon-only buttons have `aria-label`
- [ ] Streaming state uses blinking cursor span, not a spinner overlaid on text
- [ ] `aria-live="polite"` on streaming text regions
- [ ] Agent output panel matches the correct section schema from §7
- [ ] No UI library added (`shadcn`, `radix`, `MUI`, etc.)
- [ ] No inline `style={{ color: "#xyz" }}` for token-covered values
- [ ] No `border-gradient` via CSS `border-color`
- [ ] No numbered markers (01/02/03) on non-sequential content
- [ ] No typewriter / character-stagger animation

---

## Step 3 — Apply the correct agent output schema

Read §7 of the guidelines and apply the matching panel schema:

### Chat
Plain conversational layout. No section headings inside the assistant response.
User messages right-aligned in `bg-[#1A1A1C] rounded-2xl px-4 py-3`.

### Analyze
Sectioned report panel with: Conclusion → Key Findings → Evidence → Risks → Recommendations.
Section labels: `text-xs text-white/30 uppercase tracking-widest mb-2`
Dividers: `border-t border-white/10 my-4`

### Research
Sources chip row + Key Findings + Timeline (if applicable) + Citations.
Source chips: `rounded-full bg-white/5 border border-white/10 px-3 py-1 text-xs`

### Plan
Goal → Phases (numbered) → Tasks → Dependencies → Timeline → Risks.
Phase numbers: `text-white/20 font-mono text-sm mr-3`

### Code Researcher
Repository/File → Symbol/Call Path → Findings → Suggested Changes.
Code blocks: `font-mono text-sm bg-white/5 rounded-2xl p-4 overflow-x-auto`
File path chips: same as Research source chips.

---

## Step 4 — Apply the FeatureCard pattern when building cards

Any card-type UI must follow this exact structure (see §4 of guidelines):

```jsx
<motion.div
  initial={{ opacity: 0, y: 30 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8, ease: "easeOut", delay }}
  className="relative flex flex-col justify-start items-start w-full max-w-[260px] md:max-w-[300px] group mx-auto"
>
  {/* Glow layer */}
  <div
    className="absolute inset-0 w-full h-[260px] md:h-[300px] opacity-60 rounded-[40px] pointer-events-none"
    style={{ background: gradient, filter: "blur(45px)" }}
  />

  {/* Gradient-border foreground */}
  <div
    className="relative self-stretch h-[260px] md:h-[300px] rounded-[40px] z-10 overflow-hidden"
    style={{
      border: "8px solid transparent",
      background: `linear-gradient(#1A1A1C, #1A1A1C) padding-box, ${gradient} border-box`,
    }}
  >
    <div className="w-full h-full p-7 flex flex-col justify-between">
      <div className="text-white/90">{icon}</div>
      <div>
        <h3 className="text-white font-medium text-xl mb-3 tracking-tight">{title}</h3>
        <p className="text-gray-400 text-[14px] leading-[1.6] font-normal selection:bg-white/20">{description}</p>
      </div>
    </div>
  </div>
</motion.div>
```

Icons: always `size={32} strokeWidth={2.5}`.

---

## Step 5 — Agent accent gradients (use for glow + border only)

Never use these as fill colors. Only for `glow` and `border-box`:

```
Chat     linear-gradient(137deg, #FFFFFF 0%, #7DD3FC 45%, #06B6D4 100%)
Analyze  linear-gradient(137deg, #FF3D77 0%, #FFB1CE 45%, #FF9D3C 100%)
Research linear-gradient(137deg, #4361EE 0%, #E0AEFF 45%, #F72585 100%)
Plan     linear-gradient(137deg, #22C55E 0%, #86EFAC 45%, #15803D 100%)
Code     linear-gradient(137deg, #F59E0B 0%, #FDE68A 45%, #D97706 100%)
```

---

## Step 6 — Input & interaction components

Follow §10 of the guidelines exactly:

**Textarea (chat input)**
```jsx
<textarea className="w-full bg-[#1A1A1C] border border-white/10 rounded-2xl px-4 py-3
  text-white text-[14px] leading-[1.6] resize-none
  placeholder:text-white/30 focus:outline-none focus:border-white/20
  transition-colors duration-150" rows={1} />
```
No glow on inputs. Focus border: `border-white/20` only.

**Send button**
```jsx
<button className="flex items-center justify-center w-9 h-9 rounded-xl
  bg-white/10 hover:bg-white/15 active:bg-white/5
  text-white/70 hover:text-white transition-all duration-150"
  aria-label="Send message">
  <ArrowUp size={18} strokeWidth={2} />
</button>
```

**Agent mode tabs**
```jsx
<div className="flex gap-1 p-1 bg-white/5 rounded-xl">
  {MODES.map((mode) => (
    <button key={mode}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
        ${active === mode ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"}`}>
      {mode}
    </button>
  ))}
</div>
```
Active tab: `bg-white/10` — never the agent gradient as background.

---

## Step 7 — Streaming & loading states

**Streaming cursor** (append while tokens are arriving):
```jsx
<span className="inline-block w-[2px] h-[1em] bg-white/60 animate-pulse ml-[1px] align-middle" />
```

**Source retrieval status bar** (show above response, remove on first token):
```jsx
<div className="flex items-center gap-2 text-xs text-white/40 mb-3">
  <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse" />
  {statusLabel}
</div>
```

**Skeleton lines** (async panel data):
```jsx
<div className="animate-pulse rounded-2xl bg-white/5 h-4 w-3/4 mb-2" />
<div className="animate-pulse rounded-2xl bg-white/5 h-4 w-1/2" />
```

---

## Step 8 — File & component naming

```
src/
  components/
    FeatureCard.jsx
    AgentTabs.jsx
    ChatBubble.jsx
    AnalyzePanel.jsx
    ResearchPanel.jsx
    PlanPanel.jsx
    CodePanel.jsx
    StreamingCursor.jsx
    SourceChip.jsx
    SkeletonLine.jsx
  pages/
    Home.jsx
  constants/
    agents.js
  hooks/
    useStream.js
    useReducedMotion.js
```

One component per file. No barrel `index.js` unless the directory has more than
five components.

---

## What to say if a rule is violated

If the user's own draft code violates a guideline rule, call it out directly:

> "This uses `border-color` with a gradient — CSS doesn't support that. Replace
> with the `background-clip` inline style from §8 of the guidelines."

Never silently accept non-compliant code. Always cite the guideline section.

---

## Quick prohibition reference

| Never do | Reason |
|---|---|
| Solid page background without video | Video is mandatory; solid is fallback only |
| Omit `muted` on the video element | Browsers block autoplay without it |
| Omit the dark overlay div | Text contrast fails without it |
| Video opacity above `opacity-40` | Washes out card/panel content |
| Overlay below `bg-[#0A0A0B]/60` | Text becomes unreadable |
| Hardcode the CDN URL in the component | Import from `VIDEO_BG_URL` constant |
| Five different bg colors per agent | Breaks visual unity |
| Spinner over streaming text | Use blinking cursor instead |
| Gradient fill on inputs | Inputs must be quiet |
| `border-color` with gradient | CSS doesn't support it |
| Add shadcn / Radix / MUI | Stack bloat |
| Numbered markers on non-sequential content | Misleading structure |
| Typewriter animation | Distracting; AI-generated feel |
| Multiple glow layers per card | Muddy visuals |
| `style={{ color: "#xyz" }}` for token values | Use design tokens |
| Hardcoded breakpoints outside Tailwind's sm/md/lg | Maintainability |

---

## Final output format

For every build request, structure your response as:

1. **What I'm building** — one line naming the component and agent mode
2. **Compliance check** — the §15 checklist ticked off
3. **Code** — the full compliant component
4. **Usage example** — minimal snippet showing how to instantiate it