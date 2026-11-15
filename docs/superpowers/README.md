# Superpowers brainstorming workflow (adapted for Shelfree)

This folder adapts the **brainstorming** and **writing-plans** skills from
[Superpowers](https://github.com/obra/superpowers) for use inside this design
system. Superpowers proper is a coding-agent plugin (Claude Code, Codex, …) and
is *not* installed here — instead we follow its discipline as a project
convention. The verbatim source skills (with their supporting prompts) live in
[`reference/`](reference/) — one folder per skill, mirroring the upstream
`skills/<name>/` layout; the workflow below is the version we actually run in
this project.

## Why we use it

You brainstorm a lot. Ideas that live only in chat get lost, and jumping
straight to building bakes in unexamined assumptions. This workflow makes sure
every idea leaves a trail: a **spec** that captures the decision, and a **plan**
that turns it into concrete, buildable steps — both stored, not just discussed.

## The two artifacts

| Artifact | Where it goes | What it is |
|---|---|---|
| **Spec** (design doc) | `docs/superpowers/specs/YYYY-MM-DD-<topic>.md` | The *what* and *why*: purpose, constraints, chosen approach, success criteria. Written after brainstorming, before any building. |
| **Plan** | `docs/superpowers/plans/YYYY-MM-DD-<feature>.md` | The *how*: bite-sized tasks with exact files, code, and verification steps, derived from an approved spec. |

These sit alongside the existing per-page functional docs (`docs/erp-app/`,
`docs/locations-warehouses/`, …). Specs/plans capture *decisions in flight*;
the per-page docs remain the *living spec of what's built*. When a plan ships,
its outcome still gets folded into the relevant page doc per root `CLAUDE.md`.

## How to use it — say the word and I run the flow

**To brainstorm:** start with something like *"let's brainstorm X"* or
*"I have an idea for X"*. I will:

1. **Explore context** — check the relevant files, docs, and components first.
2. **Ask one question at a time** — purpose, constraints, success criteria;
   multiple-choice when possible. (In this environment I may batch a few into a
   single `questions_v2` form when that's clearer than a back-and-forth.)
3. **Propose 2–3 approaches** with trade-offs and a recommendation.
4. **Present the design in sections**, getting your sign-off on each.
5. **Write the spec** to `specs/YYYY-MM-DD-<topic>.md`, self-review it for
   placeholders/contradictions/scope, then ask you to review it.

**Hard gate:** I do **not** start building — no components, no `.dc.html`, no
scaffolding — until a spec is written and you've approved it. That's the whole
point; it applies even to "simple" changes.

**To turn a spec into a plan:** once a spec is approved, say *"write the plan"*.
I produce a task-by-task plan in `plans/` with exact file paths and verification
steps, then we build from it.

## Existing docs are safe

Everything already in `docs/` stays where it is. This adds a `specs/` and
`plans/` lane for in-flight thinking; it does not replace the per-page
functional docs.
