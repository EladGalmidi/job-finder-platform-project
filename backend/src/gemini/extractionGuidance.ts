/**
 * Supplementary reading instructions for the CV conversion prompt.
 *
 * backend/contracts/cv-conversion-instructions.md stays the authority on WHAT
 * the output must contain — it is the agreement with the scoring service, and
 * it is not edited here. This file covers something that agreement does not:
 * HOW to read the text our own pipeline produces, which arrives from pdfjs,
 * mammoth or Tesseract and is frequently damaged.
 *
 * Kept separate so the contract can be replaced wholesale from the other side
 * without losing our extraction knowledge, and so a prompt regression is a
 * visible diff in one file rather than a buried string change.
 *
 * Nothing here relaxes a contract rule. Where the two touch the same subject —
 * dates, durations, evidence — this text restates the stricter reading.
 */
export const EXTRACTION_GUIDANCE = `
# Reading the extracted text

## The text is machine-extracted and may be damaged

The CV below was pulled out of a PDF or Word file, in some cases by OCR of page
images. Expect defects such as:

- two-column layouts flattened into single lines, so one column's heading is
  followed by the other column's items
- bullet characters lost or replaced by stray punctuation
- OCR character confusions, for example I read as 1, rn read as m, O read as 0
- page headers, footers, timestamps, page numbers and source URLs mixed into
  the body text
- a heading separated from the content it introduces
- irregular spacing and line breaks that fall mid-sentence

Read through these defects to reach the meaning the document was written to
carry. Page furniture is not CV content: ignore it rather than recording it.

Where a flattened multi-column block mixes two lists, work out from the
headings which items belong to which, and group them accordingly.

A heading in such a block names the group; it is not itself a skill. Cloud,
Databases, Languages, Observability, CI/CD and the like are category labels.
Record the items listed under them, never the label.

## But do not repair the evidence

sourceExcerpt must quote the extracted text as it actually reads, including any
OCR error it contains. You may interpret an error when deciding the structured
meaning; you may not present a corrected string as something the source said.
An excerpt is a citation, not a transcript improvement.

# Using the whole CV for every skill

Build each skill record from every place the CV touches that skill, not from
the first section that names it. The professional summary, a bullet under a
role, a project description and a skills list may all describe the same skill.
Read them together before deciding usageDepth, period, experienceDuration,
employer, role and evidence, and cite more than one excerpt when more than one
part of the CV supports the skill.

A skill that appears in a skills list and is also demonstrated inside a role is
not mentioned_only. The demonstration governs; the listing merely confirms it.

# Covering every section

Consider skills wherever they appear, including:

- the professional summary or profile
- responsibilities and bullets under every role
- project descriptions
- a skills, technical skills or tooling list
- a secondary competencies, skill set or areas-of-expertise block
- education, certifications and training
- any other section the CV happens to contain

A capability named in a competencies or skill-set block is a skill and belongs
in the output. Do not drop it because it carries no usage detail; record it at
the level its evidence actually supports, which for a bare listing is
mentioned_only.

Completeness and invention are different things. Missing nothing the CV
contains is required. Adding anything it does not contain is forbidden.

# Judging usageDepth

Weigh what the CV shows the candidate did with the skill, across the whole
document. Activity verbs are evidence — designed, architected, implemented,
built, developed, automated, migrated, configured, maintained, administered,
troubleshot, debugged, led — and so are scope, ownership, stated outcomes and
how long the work ran.

This is judgement over the full context, not a keyword tally. A single verb in
isolation does not settle the level, and a skill named only in a list has no
usage evidence at all, however senior the candidate is elsewhere.

# Dates and durations are unchanged

Nothing above loosens the conversion rules. Only dates the CV states, or a
duration computable from dates the CV states, may produce a value. A role
recorded as current has no end date: leave endDate null rather than assuming
today's date. An undeterminable duration is null. Never write 0 to stand in for
an unknown, and never add precision — a day, a month — the CV does not give.
`.trim();
