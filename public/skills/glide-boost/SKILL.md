---
name: glide-boost
description: Professional Typst-to-PDF orchestration for GLIDE projects. Use to manage report structure, validate document health, and build formal PDFs, focusing on the productivity of the user.
---

# GLIDE Boost (Typst Version)

Orchestrate professional formal reports using the GLIDE framework based on the **Typst** typesetting engine.

## 🚀 Activation

The folder of the project consist of the following rules below.

## ✍️ Writing Standards (Indonesian Formal Report)

- **Language**: Always write content in **Indonesian** using a semi-formal tutorial style.
- **Project Structure**:
  - `config.yaml`: Set document metadata and layout configurations (fonts, margins, spacings).
  - `cover.typ`: Typst file for the cover page layout (frontmatter: `layout: cover`).
  - `sections/`: Contains individual `.typ` files sorted alphabetically or by prefix (e.g., `01-pendahuluan.typ`).
  - `images/`: Store all graphic assets.
  - `bibliography.yaml`: Reference lists in YAML format.

- **Available Typst Helpers/Macros**:
  - **Chapters**: Use `#glide-bab(toc: [Judul TOC])[Judul Bab]` to start a chapter with optional different heading in Table of Contents.
    *Example:* `#glide-bab(toc: [BAB I - PENDAHULUAN])[BAB I \ PENDAHULUAN]`
  - **Headings**: Use standard Typst heading format (`== Sub-heading` or `=== Sub-sub-heading`).
  - **Images**: Use `#glide-figure("images/path.png", "Caption Gambar")` instead of plain images.
  - **Tables**: Wrap tables using `#glide-table(caption: "Judul Tabel")[#table(...)]`.
  - **Aligned Info**: Use `#glide-field("Label", "Value")` for aligned key-value metadata (e.g., Cover Identity).
  - **Bibliography**: Call `#glide-bib("bibliography.yaml")` at the end of the document to print references.
  - **Citations**: Cite references using `@entry_id` (must match the key in `bibliography.yaml`).

- **Formatting Standards**:
  - Bold: `*teks tebal*`
  - Italic: `_teks miring_`
  - Lists: Use `+ Item` for numbered lists or `- Item` for bullet lists.
  - Line Break: Use `\` for manual line break inside headings or blocks.
