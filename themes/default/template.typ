
#let project_root_dir = state("project_root", "/")
#let is-outline = state("is-outline", false)

#let project(
  title: "",
  author: "",
  margin: (left: 4cm, right: 3cm, top: 3cm, bottom: 3cm),
  font: "Times New Roman",
  fontsize: 12pt,
  line_spacing: 1.5,
  text_align: "justify",
  heading_align: "center",
  paragraph_spacing: 1em,
  heading_spacing: 1em,
  list_indent: 1cm,
  first_line_indent: 0pt,
  project_root: "/",
  citation_style: "apa",
  body
) = {
  // Store project root in a state for helpers to use
  project_root_dir.update(project_root)

  // Set citation style
  set cite(style: citation_style)
  set bibliography(style: citation_style)

  // Map alignment strings to Typst constants
  let align_map = (
    "left": left,
    "right": right,
    "center": center,
    "justify": left,
  )
  
  let body_align = align_map.at(text_align, default: left)
  let h_align = align_map.at(heading_align, default: center)

  // Set metadata
  set document(title: title, author: author)
  
  // Set page properties
  set page(
    paper: "a4",
    margin: margin,
  )
  
  // Header and Footer Logic for Formal Indonesian Standards
  set page(
    header: context {
      // Only show header (top-right) if we are in 'decimal' mode and NOT at a chapter start
      let headings = query(heading.where(level: 1))
      let is_chapter_start = headings.any(h => h.location().page() == here().page())
      let is_decimal = here().page-numbering() == "1"
      
      if is_decimal and not is_chapter_start {
        set align(right)
        counter(page).display()
      }
    },
    footer: context {
      let headings = query(heading.where(level: 1))
      let is_chapter_start = headings.any(h => h.location().page() == here().page())
      let is_roman = here().page-numbering() == "i"
      let is_decimal = here().page-numbering() == "1"
      
      // Show footer (bottom-center) if we are in 'roman' mode OR at a chapter start in 'decimal' mode
      if is_roman or (is_decimal and is_chapter_start) {
        set align(center)
        counter(page).display()
      }
    }
  )

  // Set text properties
  set text(
    font: font,
    size: fontsize,
    lang: "id",
    region: "id",
  )
  
  // Set paragraph properties
  set par(
    justify: text_align == "justify", 
    leading: (line_spacing - 1.0) * 1em, 
    first-line-indent: first_line_indent,
    spacing: paragraph_spacing
  )
  set align(body_align)
  
  // Force indentation even for the first paragraph after a heading
  // show par: set block(spacing: paragraph_spacing) // Removed as per Typst warning
  
  // Set block spacing for headings
  // 'above' ensures separation from previous text
  // 'below' is handled by our manual v() in show rules
  show heading: set block(above: 1.5em, below: 0pt)
  
  show heading: it => {
    it
    // Ghost paragraph to force indentation on next real paragraph
    par(text(size: 0pt, ""))
  }

  show figure: it => {
    it
    par(text(size: 0pt, ""))
  }
  
  // Set List & Enumeration properties
  set list(indent: 0pt, body-indent: list_indent)
  set enum(indent: 0pt, body-indent: list_indent)
  
  // Custom TOC logic: Set state when rendering outline
  show outline: it => {
    is-outline.update(true)
    it
    is-outline.update(false)
  }

  // Set headings
  show heading.where(level: 1): it => {
    set align(h_align)
    set text(size: fontsize, weight: "bold")
    it
    v(heading_spacing)
  }
  
  show heading.where(level: 2): it => {
    set text(size: fontsize, weight: "bold")
    it
    v(heading_spacing / 2)
  }

  body
}

// Helper for figures
#let glide-figure(src, caption, width: 80%, height: auto) = {
  // Let the figure be static so it can be referenced (no outer context block)
  figure(
    context {
      let root = project_root_dir.get()
      let full_src = if src.starts-with("/") { src } else { root + "/" + src }
      image(full_src, width: width, height: height)
    },
    caption: caption,
  )
}

// Helper for tables
#let glide-table(caption: "", body) = {
  figure(
    body,
    caption: caption,
  )
}

// Helper for aligned fields (Key : Value)
#let glide-field(key, value) = {
  grid(
    columns: (120pt, 20pt, 1fr),
    gutter: 0pt,
    key, [:], value
  )
}

// Helper for Bab Heading (different TOC vs Doc)
#let glide-bab(toc: none, body) = {
  pagebreak(weak: true)
  heading(level: 1)[
    #context {
      if is-outline.get() and toc != none {
        toc
      } else {
        body
      }
    }
  ]
}

// Helper for bibliography
#let glide-bib(path) = {
  context {
    let root = project_root_dir.get()
    let full_path = if path.starts-with("/") { path } else { root + "/" + path }
    bibliography(full_path)
  }
}
