---

name: figma-to-code
description: Implement Figma designs in the current web project. Use when the user provides a Figma URL or requests pixel-accurate implementation of a Figma screen.
---

# Figma to Code

## Workflow

1. Inspect the existing project structure and identify its framework, styling system, and reusable components.
2. Retrieve the Figma design context through the connected Figma MCP server.
3. Inspect the relevant frames, component hierarchy, typography, colors, spacing, assets, and responsive variants.
4. Reuse existing project components and design tokens whenever possible.
5. Implement the design using the project's existing conventions and dependencies.
6. Use the actual assets from Figma when available. Do not replace real assets with arbitrary placeholders.
7. Match layout, spacing, typography, colors, borders, shadows, and interaction states as closely as possible.
8. Implement responsive behavior for mobile and desktop based on available designs.
9. Run relevant checks and compare the implementation with the original design.
10. Report any missing design information or visual differences that could not be resolved.

## Constraints

- Do not replace the project's framework or styling system.
- Do not install dependencies unless necessary.
- Do not rewrite unrelated features.
- Do not invent missing design specifications when they can be clarified.
- Prefer maintainable, reusable components over duplicated markup.
