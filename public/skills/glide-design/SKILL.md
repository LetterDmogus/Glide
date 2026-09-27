---
name: glide-design
description: Visual design and media manager for Glide projects. Audits document completeness, helps create diagrams (UML, DFD, flowcharts) via inline SVG or Kroki.io, and manages the images/ folder.
---

# Glide Design — Media & Visual Manager

This skill helps the user plan, create, and organize all visual assets for their Glide document. It covers diagrams, screenshots, charts, and any image-based content that should appear in the document.

---

## Step 0 — Load Project Context (Required)

Before doing anything, the agent MUST understand the Glide project structure.

**Read `glide-boost` first if not already loaded:**

> Located at `.agents/skills/glide-boost/SKILL.md`.  
> Explains the `images/` folder, `#glide-figure` macro, and how images are referenced in `.typ` files.

**Key things to know from `glide-boost`:**
- Images are stored in `images/` at the project root
- Images are inserted using `#glide-figure("images/path.png", "Caption")`
- SVG files are fully supported by Typst

---

## Step 1 — Check for plan.md

The first thing this skill does is check whether `plan.md` exists in the project root.

**If `plan.md` exists:**
- Read it to understand the document structure, chapters, and what visuals might be needed.
- Proceed to Step 2.

**If `plan.md` does NOT exist:**
- Inform the user:
  > "I couldn't find a `plan.md` in this project. A plan helps me understand what diagrams and visuals your document needs.
  > 
  > Would you like to:
  > 1. Run `/glide-plan` first to create a plan (recommended)
  > 2. Continue without a plan — I'll ask you directly what visuals you need"
- If the user chooses option 2, proceed to Step 2 by asking manually.

---

## Step 2 — Visual Audit

Based on `plan.md` (or user input), conduct a **visual completeness audit** — identify what visual assets the document needs and which ones are already present.

### Categories to Check

| Category | Examples | Stored as |
|---|---|---|
| UML Diagrams | Use Case, Class, Sequence, Activity | `.svg` in `images/diagrams/` |
| Data Flow Diagrams | DFD Level 0, DFD Level 1 | `.svg` in `images/diagrams/` |
| Flowcharts | System flow, algorithm flow | `.svg` in `images/diagrams/` |
| Screenshots | App UI, system output | `.png` / `.jpg` in `images/screenshots/` |
| Charts & Graphs | Bar chart, pie chart, line graph | `.svg` or `.png` in `images/charts/` |
| Architecture Diagrams | ERD, system architecture | `.svg` in `images/diagrams/` |
| Other Images | Photos, logos, icons | `.png` / `.svg` in `images/` |

### Audit Output Format

Present findings as a checklist:

```
Visual Asset Audit — {Document Title}

Diagrams:
  [ ] Use Case Diagram (Chapter 3)
  [ ] DFD Level 0 (Chapter 3)
  [ ] DFD Level 1 - Data Input Flow (Chapter 3)
  [ ] Entity Relationship Diagram (Chapter 4)

Screenshots:
  [ ] Main dashboard screenshot (Chapter 4)
  [ ] Login page screenshot (Chapter 4)
  [ ] More page screenshot (Chapter 4)
  [ ] Report output screenshot (Chapter 5)

Charts:
  [ ] Testing results table/chart (Chapter 5)

Already present in images/:
  (list files found)
```

Ask the user: **"Which of these do you want to create now?"**

---

## Step 3 — Asset Creation

For each asset the user wants to create, guide them through the appropriate method.

---

### 3A — Diagrams (UML, DFD, Flowchart, ERD, Architecture)

For diagrams, the agent recommends one of two approaches:

#### Option 1: Inline SVG Code (Recommended for simple diagrams)

Generate the diagram as raw SVG XML that the user saves directly as a `.svg` file.

**When to recommend:**
- Simple diagrams (use case, basic flowchart, simple DFD)
- User wants full control over appearance
- No internet dependency

**Agent behavior:**
1. Ask the user to describe the diagram content (entities, relationships, flows)
2. Generate a complete, valid SVG file with proper shapes, arrows, labels, and layout
3. Tell the user that you save it at `images/diagrams/{name}.svg`
4. Provide the Typst insertion code: `#glide-figure("images/diagrams/{name}.svg", "Caption")`
5. Burst generation allowed if the plan contain many diagram to create

**SVG Standards for Glide:**
- Use viewBox, not fixed width/height
- Font: use `font-family="system-ui, sans-serif"` for compatibility
- Colors: use Glide-consistent palette (dark bg: `#1e2030`, accent: `#7c6af7`, text: `#e2e8f0`)
- Shapes: rectangles with `rx="6"` for rounded corners, arrows using `<marker>` defs
- Keep SVG clean and readable — avoid nested transforms

---

#### Option 2: Kroki.io API (Recommended for complex diagrams)

Use the [Kroki.io](https://kroki.io) free diagram rendering API to generate diagrams from text-based diagram languages.

**When to recommend:**
- Complex UML with many classes/relationships
- Sequence diagrams with many actors
- ERD with many tables
- User is comfortable with PlantUML / Mermaid / Graphviz syntax

**Supported diagram languages via Kroki.io:**

| Language | Best for |
|---|---|
| PlantUML | UML (class, sequence, use case, activity) |
| Mermaid | Flowcharts, sequence, ER, Gantt |
| Graphviz (DOT) | Custom graph layouts |
| C4 (with PlantUML) | Architecture diagrams |
| D2 | Modern system diagrams |

**How to use Kroki.io:**

1. Write the diagram source code (e.g., PlantUML or Mermaid)
2. The agent provides the API URL to fetch the rendered SVG:

```
GET https://kroki.io/{diagram-type}/svg/{encoded-source}
```

Or use the POST endpoint for long diagrams:

```
POST https://kroki.io/{diagram-type}/svg
Content-Type: text/plain
Body: {diagram source}
```

3. Save the downloaded SVG to `images/diagrams/{name}.svg`
4. Insert into Typst: `#glide-figure("images/diagrams/{name}.svg", "Caption")`

**Agent behavior:**
1. Ask the user to describe what the diagram should contain
2. Write the diagram source code (PlantUML / Mermaid)
3. Provide the Kroki.io URL or curl command to download the SVG:
   ```bash
   curl -X POST https://kroki.io/plantuml/svg \
     -H "Content-Type: text/plain" \
     -d "@diagram.puml" \
     -o images/diagrams/use-case.svg
   ```
4. Provide the final `#glide-figure` insertion code

---

### 3B — Screenshots

The agent cannot take screenshots, but it guides the user:

1. Ask which screen/state needs to be captured
2. Suggest a filename and where to save it: `images/screenshots/{name}.png`
3. Provide the `#glide-figure` Typst code ready to paste
4. Remind the user about recommended screenshot specs:
   - Resolution: at least 1280×720
   - Format: PNG preferred over JPEG for UI screenshots
   - Crop to relevant area only — avoid showing OS chrome unless intentional

---

### 3C — Charts & Data Visualizations

For charts (bar, pie, line), recommend:

**Option 1: SVG chart** — Agent generates it inline as SVG with hardcoded data values.

**Option 2: Kroki.io with Vega-Lite** — For data-driven charts from JSON spec:
```bash
curl -X POST https://kroki.io/vegalite/svg \
  -H "Content-Type: application/json" \
  -d @chart-spec.json \
  -o images/charts/result-chart.svg
```

Ask the user for the data values, then generate the spec or SVG accordingly.

---

## Step 4 — Summary & Next Steps

After handling the requested assets, present a completion summary:

```
Design Session Summary

Created:
  [x] Use Case Diagram → images/diagrams/use-case.svg
  [x] DFD Level 0 → images/diagrams/dfd-level0.svg

Still missing:
  [ ] App screenshot (Chapter 4) — needs manual capture
  [ ] ERD (Chapter 4) — not yet created

Typst insertion codes:
  #glide-figure("images/diagrams/use-case.svg", "Use Case Diagram Sistem")
  #glide-figure("images/diagrams/dfd-level0.svg", "DFD Level 0")
```

Offer to continue: **"Want to work on the remaining assets, or are you done for now?"**

---

## Agent Behavior Constraints

- **Always check `plan.md` first** — never skip Step 1.
- **Never invent diagram content** — always ask the user what entities, flows, or relationships the diagram should contain before generating anything.
- **Prefer SVG over raster** — SVG scales perfectly in Typst PDF output; prefer it unless the user specifically needs a screenshot or photo.
- **Always provide the `#glide-figure` code** — after every created asset, immediately give the ready-to-paste Typst insertion code.
- **Keep file naming consistent** — use lowercase, hyphenated names (e.g., `use-case-diagram.svg`, `dfd-level-1.svg`).
- **Respect the images/ structure** — organize into `images/diagrams/`, `images/screenshots/`, `images/charts/` as appropriate.
- **For Kroki.io**, always verify the diagram source compiles correctly before sending — test with a simple version first if the diagram is complex.
