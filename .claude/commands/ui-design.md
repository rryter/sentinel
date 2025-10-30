# UI Design Generator

You are tasked with creating 3 different UI design variations based on this brief:

**Brief:** {{arg}}

## Process:

### Step 1: Brainstorm Design Variations

First, analyze the brief and determine a consistent **feature-name** following these rules:
- Use kebab-case (lowercase with hyphens)
- 2-4 words maximum
- Descriptive but concise
- Valid directory name (no spaces, special characters, or slashes)
- Examples: "dashboard", "profile-editor", "analytics-view", "code-review"

**Feature Name:** [feature-name]

Validate this name before proceeding. It will be used in all directory paths and must follow the rules above.

Then propose 3 distinct design approaches. Consider:

- Different layout patterns (e.g., dashboard grid, wizard flow, card-based, list-detail, kanban)
- Different visual styles (e.g., minimal/clean, data-dense, illustrative, modern/bold)
- Different user flows and interaction patterns
- Information hierarchy and focus areas
- Target audience needs and use case priorities

Document your 3 design variations clearly:

**Variation 1: [Name]**

- Concept: [2-3 sentence description of the design philosophy]
- Layout pattern: [e.g., grid-based dashboard, vertical timeline, card carousel]
- Key features: [Main UI elements and interactions]
- Best for: [User scenario or use case this excels at]

**Variation 2: [Name]**

- Concept: [2-3 sentence description]
- Layout pattern: [Different from variation 1]
- Key features: [Main UI elements and interactions]
- Best for: [Different user scenario]

**Variation 3: [Name]**

- Concept: [2-3 sentence description]
- Layout pattern: [Different from variations 1 & 2]
- Key features: [Main UI elements and interactions]
- Best for: [Different user scenario]

### Step 2: Implement in Parallel

Use the Task tool to launch 3 general-purpose agents IN PARALLEL to implement each design variation.

**CRITICAL**: You MUST send a single message containing 3 Task tool calls to run all agents simultaneously. Do NOT wait for one agent to complete before starting the next.

Each agent should receive a prompt following this structure:

```
Implement UI Design Variation [1/2/3]: [Variation Name]

Context:
- Original Brief: {{arg}}
- Feature Name: [feature-name] ← USE THIS EXACT NAME in all file paths
- Design Approach:
  - Concept: [concept from brainstorming]
  - Layout: [layout pattern]
  - Key Features: [key features list]
  - Target Use Case: [best for scenario]

Implementation Requirements:
1. Create HTML and CSS in directory: ui-design/[feature-name]-variation-[1/2/3]/
2. Use Tailwind 4 via CDN: <script src="https://cdn.tailwindcss.com"></script>
3. Include inline Tailwind config if needed for custom colors/spacing
4. Make the component immediately viewable by opening the HTML file in a browser
5. Use semantic HTML elements (nav, main, article, aside, section, header, footer)
6. Include basic accessibility (alt text, ARIA labels for interactive elements, keyboard navigation)
7. **IMPORTANT:** Use the exact feature name specified above for the directory structure

File Structure (use this exact pattern):
- ui-design/[feature-name]-variation-[1/2/3]/
  - index.html (main file - use a descriptive component name internally)
  - styles.css (optional, only if custom CSS beyond Tailwind is needed)
  - README.md (document design decisions, key features, and trade-offs)

Example: ui-design/dashboard-variation-1/index.html

Deliverable Requirements:
- Working HTML prototype with Tailwind 4 styling
- Include 8-12 items of realistic mock data (not Lorem ipsum)
- Show multiple states where applicable (empty, loading, populated, error)
- Responsive design considerations (mobile, tablet, desktop)
- Consider alignment with Spartan UI design principles where applicable
- Document key design decisions in README.md

Deliverable:
A complete, immediately viewable HTML prototype that demonstrates the design variation.
All 3 variations should use the SAME feature name, only the variation number differs.
```

Error Handling:
- Wait for all 3 agents to complete
- If any agent fails, note which variation failed and why
- You may retry a failed agent once
- If retries fail, proceed to Step 3 with successful variations only

### Step 3: Create Comparison & Summary

After all agents complete, create a comparison page and summary.

#### 3.1: Generate Comparison Page

Create `ui-design/[feature-name]-comparison.html` that includes:
- Title: "UI Design Comparison: [Feature Name]"
- Brief description of the original brief
- Side-by-side preview of all 3 variations (use iframes or embedded views)
- Links to each individual HTML file
- Summary of each variation's approach
- Recommendations from the summary below

#### 3.2: Update Design Catalog

Create or update `ui-design/INDEX.md` with an entry for this design session:

```markdown
## [Feature Name] - [YYYY-MM-DD]

**Brief:** [brief description]

**Variations:**
- [Variation 1 Name](./[feature-name]-variation-1/index.html) - [one-line description]
- [Variation 2 Name](./[feature-name]-variation-2/index.html) - [one-line description]
- [Variation 3 Name](./[feature-name]-variation-3/index.html) - [one-line description]

**Comparison:** [Link to comparison page](./[feature-name]-comparison.html)

**Recommendation:** [brief recommendation summary]

---
```

#### 3.3: Provide Summary

Provide a markdown summary comparing the 3 variations with:
- **Comparison Table:** Side-by-side feature matrix
- **Strengths & Weaknesses:** For each variation
- **Use Cases:** When to use each approach
- **Recommendation:** For typical scenarios matching the brief

### Step 4: User Output & Next Steps

Provide the user with:

1. **File Paths:** Absolute paths to all generated files
   - `ui-design/[feature-name]-variation-1/index.html`
   - `ui-design/[feature-name]-variation-2/index.html`
   - `ui-design/[feature-name]-variation-3/index.html`
   - `ui-design/[feature-name]-comparison.html`

2. **Viewing Instructions:**
   ```bash
   # Open comparison page to view all 3 variations side-by-side
   open ui-design/[feature-name]-comparison.html

   # Or open individual variations
   open ui-design/[feature-name]-variation-1/index.html
   ```

3. **Next Steps Suggestions:**
   - **Refine a design:** Run `/ui-design [refined-brief focusing on chosen variation]`
   - **Implement in Angular:** Translate chosen design to Angular components using Spartan UI
   - **Share for feedback:** Send comparison page link to team members
   - **Iterate:** Make adjustments based on feedback and run command again
   - **Document decision:** Note which variation was chosen and why in project docs

4. **Design Catalog:** Link to `ui-design/INDEX.md` to view all past design sessions
