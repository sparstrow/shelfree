# Skill — Interactive prototype

Verbatim source of the built-in **Interactive prototype** skill, kept here for
reference so prototype work in this project can be checked against it.

## Skill

> Create a fully interactive prototype with realistic state management and
> transitions. Use React useState/useEffect for dynamic behavior. Include hover
> states, click interactions, form validation, animated transitions, and
> multi-step navigation flows. It should feel like a real working app, not a
> static mockup.

## How it applies here

This project's own rules take precedence where they overlap (see root
`CLAUDE.md`):

- Reusable surfaces are Design Components (`.dc.html` via `dc_write`), not plain
  React pages; logic lives in the `Component extends DCLogic` class rather than
  `useState`/`useEffect`.
- The skill's interaction bar is the floor, not the ceiling — this project also
  requires motion from day one, hover feedback on every clickable element, full
  keyboard/right-click input model, and empty/loading/error states in the first
  build.
- Every shortcut added must be registered in Settings ▸ General ▸ Keyboard
  shortcuts in the same turn.
