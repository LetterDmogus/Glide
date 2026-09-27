---
name: glide-plan
description: Interactive planning agent for Glide projects. Conducts a structured interview to gather project requirements, then generates a complete plan.md document.
---

# Glide Plan — Project Planning Agent

This skill activates a **structured planning session**. The agent acts as a planning assistant that interviews the user to gather all necessary information before producing a complete `plan.md` document.

---

## Step 0 — Load Project Context (Required)

Before starting the interview, the agent MUST have a clear understanding of what a Glide project is and how it is structured.

**If you are not already familiar with the Glide project format, read the `glide-boost` skill first:**

> The `glide-boost` skill is located at `.agents/skills/glide-boost/SKILL.md` inside the project directory.  
> It explains the Glide project structure: `config.yaml`, `cover.typ`, `sections/`, `images/`, `bibliography.yaml`, and all available Typst helpers (`#glide-bab`, `#glide-figure`, `#glide-table`, etc.).

**Only proceed to Phase 1 once you understand:**
- What Glide is (a Typst-based document editor)
- The standard file structure of a Glide project
- The Typst macros available in Glide (so chapter file paths in `plan.md` are correct)

If `glide-boost` is not installed in this project, still proceed — but treat the project as a standard Glide/Typst project with the conventional structure described in `glide-boost`.

---

## Activation

This skill is triggered when the user types `/glide-plan` in the chat.

**Two possible entry points:**

| Entry | Behavior |
|---|---|
| `/glide-plan` (no description) | Agent starts the interview from Question 1 |
| `/glide-plan <brief description>` | Agent uses the description as a starting point, then asks follow-up questions for missing details |

---

## Phase 1 — Information Gathering (Interview)

When activated, the agent MUST NOT immediately write the plan. Instead, conduct a structured interview to collect all required information.

### Required Information Checklist

Before writing `plan.md`, the agent must confirm ALL of the following:

1. **Document Title** — Full formal title of the document/report
2. **Document Type** — e.g., skripsi, laporan praktikum, proposal penelitian, makalah, essay, technical report, etc.
3. **Subject / Topic** — Core topic or research subject
4. **Target Audience** — Who is this document for? (e.g., dosen pembimbing, tim internal, publik)
5. **Language** — Indonesian or English? Formal or semi-formal?
6. **Chapters / Sections** — What sections/chapters should exist? (Ask the user to list them, or suggest a standard structure based on document type)
7. **Key Content Per Chapter** — For each chapter, what are the key points that must be covered?
8. **References / Bibliography** — Does the user have existing references? (BibTeX, Mendeley, manual list)
9. **Deadline / Timeline** — Any target completion date or milestones?
10. **Special Requirements** — Any specific formatting, word count targets, or constraints?

### Interview Rules

- Ask questions **one group at a time** — do not dump all questions at once.
- Start with the most critical questions (Title, Type, Topic) in the first message.
- After the user answers, acknowledge their input briefly, then ask the next group.
- If the user's answer is vague, ask a clarifying follow-up before moving on.
- If the user says "skip" or "I don't know" for optional fields, accept it and move on.
- Once all required information is collected, explicitly confirm: **"I have everything I need. Generating your plan now..."**

### Interview Flow (Suggested Order)

**Round 1 — Foundation:**
> "To create your plan, I need a few details. Let's start:
> 1. What is the full title of your document?
> 2. What type of document is this? (e.g., skripsi, laporan, makalah, proposal)
> 3. What is the main topic or research subject?"

**Round 2 — Structure:**
> "Great! Now let's talk about structure:
> 4. Who is the target audience for this document?
> 5. What language and formality level? (e.g., Indonesian formal, English semi-formal)
> 6. What chapters or sections should this document have? I can suggest a standard structure if you're not sure."

**Round 3 — Content & Timeline:**
> "Almost there:
> 7. For each chapter, what are the key points or topics that MUST be covered?
> 8. Do you have any existing references or sources to include?
> 9. What is your target completion date or any important milestones?"

**Round 4 — Final Confirmation:**
> "Last question:
> 10. Are there any special requirements? (word count, specific formatting, constraints)
> 
> If everything above looks good, just say 'generate' and I'll create your plan!"

---

## Phase 2 — Plan Generation

After all information is confirmed, generate a `plan.md` file using the template below.

### Output Rules

- Write the plan to `plan.md` at the **root of the project directory**.
- If `plan.md` already exists, ask the user: **"A plan.md already exists. Replace it, or create plan-new.md?"**
- The plan must be written in the **same language as the document** (if Indonesian document → Indonesian plan).
- Use Markdown with clear headings, checkboxes, and tables.
- All section estimates (word count, dates) should be realistic based on the user's inputs.

### plan.md Template

```markdown
# Project Plan: {Document Title}

> **Document Type:** {Type}  
> **Subject:** {Topic}  
> **Language:** {Language & Formality}  
> **Target Audience:** {Audience}  
> **Deadline:** {Deadline or "Not specified"}  
> **Generated by:** Glide Plan — {Date}

---

## Overview

{1-2 sentence summary of what this document is about and its purpose.}

---

## Chapter Outline

### {Chapter 1 Title}
- **File:** `sections/01-{slug}.typ`
- **Key Points:**
  - {Point 1}
  - {Point 2}
- **Estimated Length:** ~{N} pages

### {Chapter 2 Title}
- **File:** `sections/02-{slug}.typ`
- **Key Points:**
  - {Point 1}
  - {Point 2}
- **Estimated Length:** ~{N} pages

{... repeat for all chapters ...}

---

## Task Checklist

- [ ] Set up project structure (config.yaml, cover.typ, sections/)
- [ ] Write Chapter 1: {Title}
- [ ] Write Chapter 2: {Title}
- [ ] Add figures and tables (images/)
- [ ] Add bibliography (bibliography.yaml)
- [ ] Final review and formatting check
- [ ] Export final PDF

---

## Timeline & Milestones

| Milestone | Target Date | Status |
|---|---|---|
| Project setup complete | {Date} | Not started |
| Chapter 1 draft | {Date} | Not started |
| Chapter 2 draft | {Date} | Not started |
| All chapters complete | {Date} | Not started |
| Final review | {Date} | Not started |
| Submission | {Deadline} | Not started |

---

## References

{List user-provided references here, or note "No references provided yet."}

---

## Notes & Special Requirements

{Any special formatting constraints, word count targets, or other requirements.}
```

---

## Agent Behavior Constraints

- **Never skip Phase 1.** Even if the user provides a brief description with `/glide-plan`, always confirm missing required fields.
- **Be concise in questions.** Don't write long paragraphs — keep interview messages short and scannable.
- **Be helpful with suggestions.** If the user doesn't know what chapters to include, suggest a standard structure based on the document type (e.g., for skripsi: Bab 1 Pendahuluan, Bab 2 Tinjauan Pustaka, Bab 3 Metodologi, Bab 4 Hasil dan Pembahasan, Bab 5 Kesimpulan).
- **Confirm before generating.** Always explicitly announce when you're moving from Phase 1 to Phase 2.
- **Only one file output.** The result of this skill is exactly one file: `plan.md`.
