Transform the provided CV into a JSON document that conforms to the supplied Skills-First CV Analysis JSON Schema.

The purpose is to represent demonstrated skills, their duration, actual usage, and direct evidence—not to rank the candidate or invent qualifications.

Rules:

1. Treat the CV as the only source of truth. Do not invent employers, titles, dates, years of experience, responsibilities, certifications, links, locations, or proficiency labels.

2. Create one skill record for each distinct technical or non-technical skill that the CV supports. Put tools, programming languages, frameworks, cloud platforms, testing methods, and engineering practices in `technicalExperience`. Put leadership, mentoring, communication, planning, stakeholder management, and similar capabilities in `nonTechnicalExperience`.

3. Use `evidence` to preserve the supporting CV statement. `sourceExcerpt` must be a concise, faithful extraction or paraphrase of the relevant CV text. Add `employer` and `role` only if that connection is explicit in the CV; otherwise use `null`.

4. Do not generate a `proficiency` field. The model must report observable evidence instead:
   - `mentioned_only`: the skill appears only in a skills list or is named with no usage details.
   - `basic`: the CV indicates limited or simple use.
   - `working`: the CV describes regular practical use, maintenance, implementation, or troubleshooting.
   - `deep`: the CV demonstrates design, development, ownership, architecture, optimization, leadership, mentoring, or multiple substantial usage activities.

5. Populate `usageDepth.activities` only with actions or contexts stated or clearly supported by the CV. Examples include `develop`, `maintain`, `debug`, `design`, `automate`, `mentor`, and `test strategy`.

6. Use `experienceDuration.value` only when the CV explicitly gives a duration or when it can be calculated from explicit dates. Otherwise set the value to `null`. Never turn an unknown duration into zero.

7. Preserve date precision:
   - Use `YYYY-MM-DD` when day, month, and year are known.
   - Use `YYYY-MM` when only month and year are known.
   - Use `YYYY` when only the year is known.
   - Use `null` when no date is provided.
   - Set `isCurrent` to `true` only when the CV says "present," "current," or equivalent; use `false` only when an end date or clear end state is provided; otherwise use `null`.

8. `personalInformation` is dynamic. Add all personal, contact, and candidate-identifying information found in the CV, using clear camelCase keys. This can include `fullName`, `email`, `phone`, `location`, `linkedin`, `github`, `portfolio`, `website`, `workAuthorization`, or any other relevant personal detail.

9. `other` is dynamic. Add relevant information not represented elsewhere, using clear camelCase keys. This may include `title`, `languages`, `availability`, `volunteerWork`, `interests`, `securityClearance`, or similar CV-specific information.

10. Keep education, awards, certifications, recognitions, and comparable items in `achievements`. Use `type: "education"` for degrees and diplomas, and include `institution` when known.

11. Use `null` for an unknown scalar value, `[]` for a known empty list, and omit a field only when the schema does not require it. Output valid JSON only—no Markdown, commentary, or fields outside the schema.
