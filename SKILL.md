---
name: shelfree-design
description: Use this skill to generate well-branded interfaces and assets for Shelfree ERP — either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, color tokens, typography, interaction patterns, and UI kit components for the Shelfree ERP platform (Finance, Sales, Purchasing, Warehouse, Manufacturing, People modules).
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (screens, flows, prototypes, decks, etc), copy assets out and create Design Component (.dc.html) files. Reference the token CSS and follow the visual foundations in readme.md closely.

Key design facts to carry into every artifact:
- Font: Geist (UI) + Geist Mono (codes/numbers) from Google Fonts
- Dark mode default; light mode via data-theme="light"
- Primary: oklch(0.72 0.13 58) dark / oklch(0.62 0.14 50) light — warm terracotta
- Hover: translateY(-1px) + 0 4px 12px -3px shadow + .14s ease transition
- Radius: 8px inputs/buttons, 10px cards/panels, 999px pills
- Icons: Lucide-style stroke SVGs (stroke-width 1.9), inline only
- No emoji, no gradients in app chrome, tabular-nums for all financial data

If the user invokes this skill without other guidance, ask what screen or flow they want to design, clarify the module (Finance, Sales, etc.) and whether they need dark or light mode, then produce a DC file following the Shelfree visual language exactly.
