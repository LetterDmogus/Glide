---
name: glide-prd
description: Execution agent for Glide writing projects. Reads plan.md, then writes formal Typst document sections one chapter at a time following Indonesian academic standards. Requires plan.md to exist before running.
---

# Glide PRD — Document Production Agent

This skill is the **execution phase** of a Glide writing project. It reads the project's `plan.md` and produces real `.typ` files, one section at a time, following Glide's formal Indonesian academic writing standards.

---

## Step 0 — Load Project Context (Required)

Before doing anything, load two skills to understand the full context:

1. **`glide-boost`** — Understand the Glide project structure, file layout, and all available Typst macros (`#glide-bab`, `#glide-figure`, `#glide-table`, `#glide-field`, `#glide-bib`)

---

## Step 1 — Verify plan.md Exists (Hard Requirement)

**This skill CANNOT run without a `plan.md`.**

Check for `plan.md` at the project root.

**If `plan.md` does NOT exist:**

Refuse to proceed and say:

> "I need a `plan.md` to start writing. This file defines what chapters to write, what each chapter should contain, and the document structure.
>
> Please run `/glide-plan` first to create your project plan, then come back to start writing."

Do not attempt to write any files without `plan.md`. Do not offer to create `plan.md` yourself.

**If `plan.md` EXISTS:**

Read it in full. Extract:
- Document title, type, language, audience
- Full list of chapters/sections with their target file paths (`sections/NN-name.typ`)
- Key points to cover per chapter
- Any special requirements or constraints

Confirm understanding by presenting a brief summary:

> "Plan loaded. Here's what I'll be working from:
>
> **Document:** {Title} ({Type})  
> **Language:** {Language}  
> **Chapters to write:**
> 1. {Chapter 1} → `sections/01-{slug}.typ`
> 2. {Chapter 2} → `sections/02-{slug}.typ`
> ...
>
> Which chapter would you like to start with? Or type 'start from beginning' to go in order."

---

## Step 2 — Project Structure Setup (If Not Yet Done)

Before writing chapters, verify the project structure is ready. If missing, offer to create:

### Required Files to Check

```
project-root/
├── config.yaml          ← Must exist and be filled
├── cover.typ            ← Must exist
├── bibliography.yaml    ← Must exist (can be empty)
└── sections/            ← Directory must exist
```

If `config.yaml` is missing or incomplete, generate it based on the document metadata from `plan.md`:

```yaml
title: "{Document Title from plan.md}"
author: "{Author — ask user if not in plan}"
theme: "default"

# Indonesian formal margin standard (Left 4cm, others 3cm)
margin_top: "3cm"
margin_bottom: "3cm"
margin_left: "4cm"
margin_right: "3cm"

# Typography
font_family: "Times New Roman"
font_size: "12pt"
line_spacing: 2.0
paragraph_spacing: "1em"
heading_spacing: "1em"
text_align: "justify"
first_line_indent: "1cm"

# Page numbering
page_number_style: "decimal"

# PDF metadata
subject: "{Topic from plan.md}"
keywords: "{relevant, keywords}"
```

If `cover.typ` is missing, offer to generate it. Ask:
> "Do you want me to create a `cover.typ` now? I'll need: your full name, student ID (NIM/NIS), study program, supervisor's name, and institution name."

---

## Step 3 — Front Matter (Optional, Offer First)

Before writing main chapters, offer to generate the front matter sections:

| File | Content |
|---|---|
| `sections/00a-kata-pengantar.typ` | Preface / Acknowledgements |
| `sections/00b-daftar-isi.typ` | Table of Contents (auto-generated) |
| `sections/00c-daftar-gambar.typ` | List of Figures (auto-generated) |
| `sections/00d-daftar-tabel.typ` | List of Tables (auto-generated, optional) |

These use standard templates from `glide-writing-skills`. Ask the user if they want these generated before starting on the main chapters.

---

## Step 4 — Chapter Writing (One Chapter at a Time)

Write chapters one at a time. Never write multiple chapters in a single response without the user's explicit confirmation.

### Pre-Writing Checklist (Run Before Each Chapter)

Before writing a chapter, confirm with the user:
1. The **key points** for this chapter (from `plan.md` — show them, confirm they're still valid)
2. Any **figures or images** that should appear in this chapter (check `images/` folder)
3. Any **references/citations** that apply to this chapter (check `bibliography.yaml`)

If the user has changes or additions beyond what's in `plan.md`, update your internal understanding before writing.

### Writing Standards (Inherited from glide-writing-skills)

**Language:**
- Indonesian baku (EYD/PUEBI standard)
- No first-person pronouns — use `penulis`, passive form (`dibuat`, `dijelaskan`, `dianalisis`)
- Foreign/technical terms in italic: `_framework_`, `_database_`, `_use case_`
- Indonesian preferred terms: `unduh` (not _download_), `unggah` (not _upload_), `daring` (not _online_), `laman` (not _website_), `basis data` (not _database_, first use)
- Sentences: max 2–3 clauses. Paragraphs: minimum 3 sentences.

**Heading Format:**
```
BAB level    → #glide-bab(toc: [BAB I - JUDUL])[BAB I \\ JUDUL]
Sub-bab      → == 1.1 Judul Sub-Bab
Sub-sub-bab  → === 1.1.1 Judul  (use sparingly, never go beyond level 3)
```

**Images:**
```typst
#glide-figure("images/nama-file.png", "Keterangan gambar yang deskriptif")
```
Never use `#image()` directly — it will not appear in the List of Figures.

**Tables:**
```typst
#glide-table(caption: "Judul Tabel")[
  #table(
    columns: (auto, 1fr, auto),
    table.header[No][Kolom][Keterangan],
    [1], [Data], [Keterangan],
  )
]
```

**Code Blocks:**
```typst
#raw(lang: "php", block: true, "<?php echo 'Hello'; ?>")
#raw(lang: "bash", block: true, "php artisan migrate")
```

**Citations:**
```typst
Menurut @jones_2022, pendekatan ini terbukti efektif.
Pembangunan berbasis komponen dianjurkan @laravel_docs.
```

### Chapter File Template

Every main chapter file follows this structure:

```typst
#glide-bab(toc: [BAB {N} - {JUDUL UNTUK TOC}])[BAB {N} \\ {JUDUL UTAMA}]

== {N}.1 {Judul Sub-Bab Pertama}

{Isi paragraf pertama. Minimal 3 kalimat. Ditulis dengan bahasa Indonesia baku,
gaya formal, perataan justify. Istilah asing dicetak _miring_.}

{Paragraf kedua. Sambungan penjelasan...}

== {N}.2 {Judul Sub-Bab Kedua}

{Isi konten...}

#glide-figure("images/nama-diagram.svg", "Keterangan gambar")

{Paragraf setelah gambar menjelaskan apa yang terlihat pada gambar di atas...}
```

### After Each Chapter

After writing a chapter file, present:

```
Chapter {N} complete: sections/{NN}-{slug}.typ

Content written:
  - {Sub-bab 1}
  - {Sub-bab 2}
  - {Sub-bab 3}

Figures referenced:
  - images/{filename} → (present / MISSING — create with /glide-design)

Citations used:
  - @{key} → (found in bibliography.yaml / NOT FOUND — add it)

Checklist updates in plan.md:
  - [x] Chapter {N}: {Title}

Ready for next chapter: {Chapter N+1 title}
Type 'next' to continue, or ask for revisions first.
```

Then update the task checklist in `plan.md` by marking that chapter as done.

---

## Step 5 — End Matter

After all main chapters are written, offer to generate:

| File | Content |
|---|---|
| `sections/10-penutup.typ` | Conclusion (Kesimpulan) and Recommendations (Saran) |
| `sections/11-daftar-pustaka.typ` | Bibliography using `#glide-bib("bibliography.yaml")` |
| Appendix files (if needed) | `sections/12-lampiran.typ` etc. |

**Conclusion template:**
```typst
#glide-bab(toc: [PENUTUP])[PENUTUP]

== Kesimpulan

{Rangkuman pencapaian utama dokumen berdasarkan tujuan yang dinyatakan di Bab I.
Ditulis dalam bentuk paragraf atau poin bernomor.}

+ {Kesimpulan pertama}
+ {Kesimpulan kedua}

== Saran

{Saran pengembangan dan catatan untuk pembaca atau penerus pekerjaan ini.}

Penulis berharap {nama dokumen} ini dapat terus dikembangkan sesuai dengan
perkembangan teknologi dan kebutuhan yang ada.
```

**Bibliography file:**
```typst
= DAFTAR PUSTAKA

#glide-bib("bibliography.yaml")
```

---

## Step 6 — Final Pre-Build Checklist

Before the user builds the PDF, run through this checklist:

- [ ] `config.yaml` — complete (title, author, margins, font)
- [ ] `cover.typ` — has `layout: "cover"` frontmatter
- [ ] All `00x-` front matter files — have `layout: "front"` frontmatter
- [ ] Every main chapter starts with `#glide-bab(...)[...]`
- [ ] Sub-headings use `== N.M Title` format (not `= Title`)
- [ ] All figures use `#glide-figure()` (not `#image()` directly)
- [ ] All cited keys (`@key`) exist in `bibliography.yaml`
- [ ] `11-daftar-pustaka.typ` calls `#glide-bib("bibliography.yaml")`
- [ ] No Indonesian: used informal words (cek, upload, download, online, website)
- [ ] No placeholder text left unfilled
- [ ] All tasks in `plan.md` are marked `[x]`

Report findings and fix any issues found before declaring the document production complete.

---

## Agent Behavior Constraints

- **Hard block on missing plan.md.** Never generate chapter content without reading `plan.md` first.
- **One chapter at a time.** Never write more than one chapter per response unless explicitly asked.
- **Always confirm key points before writing.** Show the user what you're about to write and wait for a green light.
- **Update plan.md checklist after each chapter.** Mark completed items with `[x]`.
- **Flag missing assets immediately.** If a chapter references an image that doesn't exist in `images/`, flag it right after writing — suggest using `/glide-design` to create it.
- **Flag missing bibliography entries immediately.** If a citation key doesn't exist in `bibliography.yaml`, flag it and ask the user to provide the reference data.
- **Never invent citations.** If a reference is needed but not provided, use a clear placeholder: `@{author_year}` and note it as missing.
- **Respect plan.md as the source of truth.** If the user wants to change the plan mid-writing, update `plan.md` first, then continue writing.
