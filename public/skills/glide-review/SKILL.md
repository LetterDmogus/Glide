---
name: glide-review
description: Revision and quality review agent for Glide documents. Audits written .typ files for language quality, structural compliance, citation integrity, and content completeness against plan.md. Suggests and applies targeted fixes.
---

# Glide Review — Document Revision Agent

This skill is activated when the user wants to **review, audit, or revise** an existing Glide document. It reads the written `.typ` files, checks them against `plan.md` and Glide's writing standards, then guides the user through targeted revisions.

---

## Step 0 — Load Project Context (Required)

Load the following skills before starting any review:

1. **`glide-boost`** — Understand project structure, Typst macros, and file layout
2. **`glide-writing-skills`** — Load all Indonesian formal writing standards (the authoritative reference for what "correct" looks like in a Glide document)

Both are at `.agents/skills/{skill-name}/SKILL.md`.

---

## Step 1 — Check Prerequisites

### 1A — Check for plan.md

**If `plan.md` exists:**
- Read it to understand what chapters were planned, what each should contain, and the overall document goals.
- Use it as the **source of truth** for content completeness review.

**If `plan.md` does NOT exist:**
- Inform the user:
  > "`plan.md` was not found. I can still review the document for language, formatting, and Typst syntax — but I won't be able to check if the content matches the original plan.
  >
  > Continue with a partial review (language & formatting only)?"
- If user agrees, skip content completeness checks in Step 3.

### 1B — Scan Written Files

List all `.typ` files in `sections/` and report what has been written:

```
Files found in sections/:
  cover.typ
  sections/00a-kata-pengantar.typ
  sections/01-pendahuluan.typ
  sections/02-tinjauan-pustaka.typ
  sections/03-metodologi.typ
  ...
```

Ask the user: **"Which file(s) do you want to review?"**

Options:
- A specific chapter: `"Review chapter 3"`
- All files: `"Review everything"`
- A specific type of review: `"Just check citations"` / `"Only check language"` / `"Check formatting only"`

---

## Step 2 — Review Modes

The agent supports four review modes. The user can request one or multiple at once.

---

### Mode A — Content Completeness Review

Compare what was written against `plan.md`.

For each chapter, check:
- Were all **key points** from `plan.md` covered?
- Is any section **too thin** (missing explanation, examples, or supporting data)?
- Are there **missing subsections** that were planned but not written?
- Does the chapter **flow logically** from intro to conclusion?

Report format:

```
Chapter 1 — Pendahuluan
  Key Points Coverage:
    [x] Latar belakang masalah → Present and adequate
    [x] Rumusan masalah → Present
    [~] Tujuan penelitian → Present but brief (only 2 points, plan expected 4)
    [ ] Manfaat penelitian → MISSING

  Recommendation:
    - Expand "Tujuan penelitian" with 2 more points
    - Add "Manfaat penelitian" subsection (== 1.4 Manfaat Penelitian)
```

---

### Mode B — Language & Style Review

Check the written prose against Indonesian formal academic standards from `glide-writing-skills`.

**Things to flag:**

| Issue | Example (Wrong) | Correction |
|---|---|---|
| First-person pronoun | `saya membuat sistem ini` | `penulis membuat sistem ini` / `sistem ini dibuat` |
| Informal word | `download`, `upload`, `online`, `website` | `unduh`, `unggah`, `daring`, `laman` |
| Foreign term not italicized | `framework Laravel` | `_framework_ Laravel` |
| Too-short paragraph | Single sentence paragraph | Expand to min. 3 sentences |
| Too-long sentence | >3 clauses in one sentence | Break into 2 sentences |
| Passive voice missing | `kami menggunakan metode...` | `metode yang digunakan adalah...` |
| Inconsistent terminology | Uses both `basis data` and `database` | Standardize throughout |

Report format:

```
Language Issues — sections/01-pendahuluan.typ

  Line ~12: First-person pronoun found
    Found:   "Penulis membuat aplikasi ini untuk..."
    OK — "penulis" is acceptable, but prefer passive: "Aplikasi ini dibuat untuk..."

  Line ~28: Informal word
    Found:   "...diakses secara online..."
    Fix:     "...diakses secara daring..."

  Line ~45: Foreign term not italicized
    Found:   "menggunakan framework Vue.js"
    Fix:     "menggunakan _framework_ Vue.js"

  Line ~67: Paragraph too short (1 sentence)
    Found:   "Sistem ini berbasis web."
    Fix:     Expand — add at least 2 more supporting sentences
```

---

### Mode C — Typst & Formatting Review

Check that all Typst syntax follows Glide standards.

**Things to check:**

| Check | Issue |
|---|---|
| Chapter heading | Uses `= BAB I` instead of `#glide-bab(...)` |
| Sub-heading format | Uses `= 1.1 Judul` instead of `== 1.1 Judul` |
| Image insertion | Uses `#image()` directly instead of `#glide-figure()` |
| Table wrapping | Uses bare `#table()` instead of `#glide-table(caption: "...")[...]` |
| Frontmatter | Front matter files missing `layout: "front"` |
| Cover frontmatter | `cover.typ` missing `layout: "cover"` |
| Heading depth | Found `==== level 4` heading — not recommended |
| Line break in heading | Missing `\\` for multi-line chapter title |

Report format:

```
Formatting Issues — sections/02-tinjauan-pustaka.typ

  Line ~3: Wrong chapter heading syntax
    Found:   "= BAB II TINJAUAN PUSTAKA"
    Fix:     "#glide-bab(toc: [BAB II - TINJAUAN PUSTAKA])[BAB II \\ TINJAUAN PUSTAKA]"

  Line ~41: Image not using glide-figure
    Found:   '#image("images/diagram.png", width: 80%)'
    Fix:     '#glide-figure("images/diagram.png", "Keterangan diagram")'

  Line ~78: Table not wrapped in glide-table
    Found:   "#table(columns: (auto, 1fr), ...)"
    Fix:     Wrap with: "#glide-table(caption: \"Judul Tabel\")[#table(...)]"
```

---

### Mode D — Citation & Bibliography Integrity Review

Verify that all citations and bibliography entries are consistent and complete.

**Checks to run:**

1. **Citation key scan** — Find all `@key` references used in `.typ` files
2. **Bibliography key scan** — List all keys defined in `bibliography.yaml`
3. **Cross-check** — Flag any citation used but not defined, or defined but never cited

Report format:

```
Citation Integrity Report

  Citations used in .typ files:
    @jones_2022       → Found in bibliography.yaml ✓
    @laravel_docs     → Found in bibliography.yaml ✓
    @pressman_2015    → NOT FOUND in bibliography.yaml ✗
    @sommerville      → NOT FOUND in bibliography.yaml ✗

  Entries in bibliography.yaml never cited:
    @mdn_html         → Defined but never used (safe to remove or keep)

  Action needed:
    - Add @pressman_2015 to bibliography.yaml
    - Add @sommerville to bibliography.yaml
    - Confirm data for each missing entry
```

For each missing entry, ask the user for the reference data and generate the `bibliography.yaml` entry on the spot.

---

## Step 3 — Apply Fixes

After presenting findings, ask:
> "Do you want me to apply these fixes directly, or would you prefer to review them one by one?"

**Option 1: Apply all fixes** — Agent makes all corrections to the relevant files in one pass.

**Option 2: Fix by file** — Agent goes through each file one at a time, showing the proposed changes before applying them.

**Option 3: Fix specific issues only** — User specifies which categories or files to fix.

For each change applied, show a brief diff:

```
Fixing: sections/01-pendahuluan.typ

  Before: "...diakses secara online..."
  After:  "...diakses secara daring..."

  Before: '#image("images/diagram.png", width: 80%)'
  After:  '#glide-figure("images/diagram.png", "Diagram Alur Sistem")'
```

After all fixes are applied, confirm:
> "All fixes applied to {N} files. Do you want to run the review again to confirm everything is clean?"

---

## Step 4 — Post-Review Summary

After the review session, present a final report:

```
Review Complete — {Document Title}

Files reviewed: {N}
Issues found: {total}
  Language issues:    {N}
  Formatting issues:  {N}
  Content gaps:       {N}
  Citation issues:    {N}

Issues fixed: {N}
Issues pending (manual):
  - [ ] Add screenshot for Chapter 4 (use /glide-design)
  - [ ] Expand "Tujuan Penelitian" subsection in Chapter 1
  - [ ] Add @pressman_2015 reference data to bibliography.yaml

plan.md status:
  All chapters written: {Yes / No — X chapters still incomplete}

Recommendation:
  {Ready for final build / Needs X more revisions before export}
```

If everything is clean, offer:
> "Your document looks good. Run the pre-build checklist from `glide-prd` and then export your PDF."

---

## Agent Behavior Constraints

- **Never rewrite entire chapters.** Only make targeted, surgical fixes. Preserve the author's voice and structure unless it violates formal standards.
- **Always show before/after.** Never apply a change silently — always show what changed.
- **Prioritize critical issues first.** Order: missing content → Typst syntax errors → citation gaps → language style → minor phrasing.
- **Respect the user's choices.** If the user disagrees with a suggestion, accept it and move on. Do not repeat the same suggestion.
- **Flag, don't invent.** If a citation is missing, flag it — never invent author names, dates, or titles to fill the gap.
- **Suggest `/glide-design` for missing visuals.** If content review reveals a chapter should have a figure but none exists, suggest using the `glide-design` skill to create it.
- **Suggest `/glide-prd` for content gaps.** If entire subsections are missing, suggest returning to `glide-prd` to write them properly rather than improvising in the review.
- **Keep `plan.md` updated.** If the review reveals a chapter is truly complete, mark it `[x]` in `plan.md`. If revisions are still needed, leave it `[ ]`.
