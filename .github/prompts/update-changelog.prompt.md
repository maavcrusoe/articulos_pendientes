---
description: "Update CHANGELOG.md with recent code changes following Keep a Changelog format"
argument-hint: "Brief description of changes made, or leave empty to auto-detect from recent edits"
agent: "agent"
tools: [read, search, edit]
---
Update `CHANGELOG.md` with the changes described or recently made.

## Changes to document: $input

## Steps

1. Read `CHANGELOG.md` to see the current state and the `## [Unreleased]` section.
2. If `$input` is provided, use that description. Otherwise, read recently modified files in `src/`, `views/`, `public/` to identify what changed.
3. Add entries under `## [Unreleased]` — create the section if it doesn't exist.
4. Use the correct category:
   - `### Added` — new features, routes, tasks, views
   - `### Changed` — modified behavior or refactored code
   - `### Fixed` — bug fixes
   - `### Removed` — deleted features
   - `### Security` — auth, validation, rate limiting changes
5. Write each entry as a past-tense action sentence in plain language.
6. Do NOT bump the version number unless explicitly asked.

## Output

Show the exact lines added to `CHANGELOG.md`.
