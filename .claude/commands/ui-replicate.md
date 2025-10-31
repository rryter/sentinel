# UI Replicate Command

Generate pixel-perfect HTML/CSS replications from reference designs using Playwright MCP for visual comparison.

## Usage

```
/ui-replicate <feature-name> [reference-image-path]
```

**Arguments:**
- `feature-name` (required): Name for the replication (e.g., "login", "dashboard", "pricing-page")
- `reference-image-path` (optional): Path to reference image. Defaults to `ui-design/inspiration/<feature-name>/<feature-name>.jpg`

**Examples:**
```bash
/ui-replicate login
/ui-replicate dashboard ui-design/inspiration/dashboard/screenshot.png
/ui-replicate pricing-page
```

## Output Structure

Generated files are saved to:
```
ui-design/replication/<feature-name>/index.html
```

Example: `ui-design/replication/login/index.html`

## Instructions

When this command is invoked, follow these steps:

### 1. Read Reference Design
- Read the reference image from the specified path or default location
- Analyze the design carefully, noting:
  - Layout structure (grid, flexbox, positioning)
  - Color scheme (exact colors, gradients)
  - Typography (font sizes, weights, families)
  - Spacing (padding, margins, gaps)
  - Interactive elements (buttons, inputs, links)
  - Visual effects (shadows, borders, rounded corners, transitions)

### 2. Generate HTML/CSS
Create a standalone HTML file with:

**Required Elements:**
- Tailwind 4 CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Semantic HTML5 elements: `<nav>`, `<main>`, `<article>`, `<aside>`, `<section>`, `<header>`, `<footer>`
- Proper document structure with `<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`

**Accessibility Requirements:**
- Alt text for all images
- ARIA labels for interactive elements (buttons, links, form controls)
- Keyboard navigation support (proper tab order, focus states)
- Semantic heading hierarchy (h1, h2, h3, etc.)
- Form labels associated with inputs
- Color contrast compliance where possible

**CSS Approach:**
- Use Tailwind utility classes for all styling
- Add custom CSS in `<style>` tag only when Tailwind utilities are insufficient
- Match colors, spacing, and typography from reference design as closely as possible
- Include hover states and transitions for interactive elements
- Ensure responsive design principles (mobile-first if applicable)

**Code Quality:**
- Clean, well-indented code
- Comments for complex sections
- Organized class names
- No inline styles (use Tailwind classes or style tag)

### 3. Save Generated File
- Create directory: `ui-design/replication/<feature-name>/`
- Save file as: `ui-design/replication/<feature-name>/index.html`

### 4. Visual Comparison with Playwright MCP
- Navigate to the generated HTML file: `file:///home/rryter/projects/sentinel/ui-design/replication/<feature-name>/index.html`
- Take a screenshot of the rendered page
- Compare visually with the reference design
- Identify differences in:
  - Layout and positioning
  - Colors and gradients
  - Typography and spacing
  - Interactive states
  - Overall visual fidelity

### 5. Iterative Refinement
- Based on visual comparison, identify specific differences
- Make targeted adjustments to HTML/CSS
- Reload page and compare again
- Repeat until the replication matches the reference design closely
- Focus on the most visually significant differences first

### 6. Final Report
Provide a summary including:
- Path to generated file
- Key design elements replicated
- Any intentional deviations from reference (with reasoning)
- Accessibility features included
- Browser compatibility notes (if relevant)

## Important Notes

- **Pixel-perfect** means "as close as possible" - exact pixel matching is not required, but visual fidelity should be high
- Use Playwright MCP for all browser interactions and screenshots
- If fonts in reference design are not web-safe, use similar Google Fonts or system fonts
- If images are needed, use placeholder services (e.g., `https://placehold.co/600x400`) or semantic colors
- Focus on structure and styling; functionality can be non-functional (e.g., buttons don't need to actually work)
- Always check the generated HTML in a browser before marking as complete

## Common Design Patterns to Watch For

- **Split-screen layouts**: Use CSS Grid or Flexbox with appropriate ratios
- **Diagonal dividers**: Use CSS transforms (skew, rotate) or SVG
- **Gradients**: Use Tailwind gradient utilities or custom CSS gradients
- **Shadows**: Match box-shadow and text-shadow closely
- **Forms**: Ensure proper input styling, focus states, and validation UI
- **Buttons**: Match padding, border-radius, hover/active states
- **Social login icons**: Use SVG icons or icon libraries

## Troubleshooting

If Playwright MCP is not available:
- Fall back to manually opening the file in a browser
- Use browser dev tools to compare with reference
- Take manual screenshots for comparison

If visual differences persist:
- Check browser zoom level (should be 100%)
- Verify color values in dev tools
- Use browser's "measure" tool for spacing
- Compare computed styles in dev tools