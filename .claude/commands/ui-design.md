# UI Design Generator

You are tasked with creating 3 different UI design variations based on this brief:

**Brief:** {{arg}}

## Process:

### Step 0: Check for Validation Flag

First, check if the brief contains the `--validate` flag:
- If `--validate` or `-v` is present: Set `AUTO_VALIDATE=true` and remove the flag from the brief before proceeding
- Otherwise: Set `AUTO_VALIDATE=false` and prompt user later

Examples:
- Input: `"create a dashboard --validate"` → Brief: `"create a dashboard"`, AUTO_VALIDATE=true
- Input: `"create a dashboard"` → Brief: `"create a dashboard"`, AUTO_VALIDATE=false

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
- **If validation was run:** Link to validation report at the top
- Side-by-side preview of all 3 variations (use iframes or embedded views)
- **If validation was run:** Add validation badges/metrics below each variation preview
- Links to each individual HTML file
- Summary of each variation's approach
- Recommendations from the summary below
- **If validation was run:** Highlight best performer based on metrics

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

### Step 3.5: Optional Validation (Playwright MCP)

**Trigger Conditions:**
- If `AUTO_VALIDATE=true`: Skip prompt and proceed directly to validation
- If `AUTO_VALIDATE=false`: Prompt the user with this message:

```
All 3 design variations have been generated successfully!

Would you like to run automated validation using Playwright MCP?
This will:
- Capture screenshots at multiple breakpoints (desktop 1920px, tablet 768px, mobile 375px)
- Run accessibility audits using axe-core (WCAG 2.1 AA compliance)
- Measure performance metrics (load time, DOM size, resource count)
- Verify basic interactions (forms, buttons, navigation)

Run validation? (yes/no):
```

**If user declines or Playwright MCP is not available:**
- Log a note that validation was skipped
- Proceed directly to Step 4

**If user accepts or AUTO_VALIDATE=true:**

1. **Check MCP Availability:**
   - Verify `playwright-mcp` is available in MCP servers
   - If not available: Inform user and skip to Step 4
   - If available: Proceed with validation

2. **Run Validation Checks:**
   For each variation (1, 2, 3), use Playwright MCP to:

   a. **Screenshot Capture:**
   - Open `ui-design/[feature-name]-variation-[N]/index.html` in browser
   - Capture full-page screenshots at:
     - Desktop: 1920x1080px viewport
     - Tablet: 768x1024px viewport
     - Mobile: 375x667px viewport
   - Save to: `ui-design/[feature-name]-variation-[N]/screenshots/`

   b. **Accessibility Audit:**
   - Run axe-core accessibility scan
   - Report violations by severity (critical, serious, moderate, minor)
   - Save report to: `ui-design/[feature-name]-variation-[N]/a11y-report.json`

   c. **Performance Metrics:**
   - Measure page load time
   - Count DOM nodes
   - List resource requests (CSS, JS, images)
   - Save metrics to: `ui-design/[feature-name]-variation-[N]/performance.json`

   d. **Basic Interaction Tests:**
   - Verify all buttons are clickable
   - Check form inputs accept keyboard input
   - Confirm navigation links work
   - Test responsive menu (if present)
   - Log results

3. **Generate Validation Report:**
   Create `ui-design/[feature-name]-validation-report.html` with:

   ```html
   <!DOCTYPE html>
   <html lang="en">
   <head>
     <title>Validation Report: [Feature Name]</title>
     <script src="https://cdn.tailwindcss.com"></script>
   </head>
   <body class="bg-gray-50 p-8">
     <div class="max-w-7xl mx-auto">
       <h1 class="text-3xl font-bold mb-6">Validation Report: [Feature Name]</h1>

       <!-- Summary Dashboard -->
       <div class="grid grid-cols-3 gap-6 mb-8">
         <!-- Per-variation summary cards with pass/fail metrics -->
       </div>

       <!-- Detailed Results per Variation -->
       <div class="space-y-8">
         <!-- Variation 1 -->
         <section class="bg-white rounded-lg shadow p-6">
           <h2>Variation 1: [Name]</h2>

           <!-- Screenshots Gallery -->
           <div class="grid grid-cols-3 gap-4 my-4">
             <img src="[feature-name]-variation-1/screenshots/desktop.png" />
             <img src="[feature-name]-variation-1/screenshots/tablet.png" />
             <img src="[feature-name]-variation-1/screenshots/mobile.png" />
           </div>

           <!-- Accessibility Results -->
           <div class="my-4">
             <h3>Accessibility Audit</h3>
             <ul><!-- List violations --></ul>
           </div>

           <!-- Performance Metrics -->
           <div class="my-4">
             <h3>Performance</h3>
             <table><!-- Metrics table --></table>
           </div>

           <!-- Interaction Tests -->
           <div class="my-4">
             <h3>Interaction Tests</h3>
             <ul><!-- Test results --></ul>
           </div>
         </section>

         <!-- Repeat for Variations 2 & 3 -->
       </div>

       <!-- Comparison Matrix -->
       <section class="bg-white rounded-lg shadow p-6 mt-8">
         <h2>Comparison Matrix</h2>
         <table class="w-full">
           <thead>
             <tr>
               <th>Metric</th>
               <th>Variation 1</th>
               <th>Variation 2</th>
               <th>Variation 3</th>
             </tr>
           </thead>
           <tbody>
             <tr><td>A11y Score</td><td colspan="3"><!-- Scores --></td></tr>
             <tr><td>Load Time</td><td colspan="3"><!-- Times --></td></tr>
             <tr><td>DOM Nodes</td><td colspan="3"><!-- Counts --></td></tr>
             <tr><td>Interactions</td><td colspan="3"><!-- Pass/Fail --></td></tr>
           </tbody>
         </table>
       </section>

       <!-- Recommendations -->
       <section class="bg-blue-50 rounded-lg p-6 mt-8">
         <h2>Recommendations</h2>
         <ul><!-- Based on validation results --></ul>
       </section>
     </div>
   </body>
   </html>
   ```

4. **Analyze Results & Offer Adjustments:**

   **Critical Issues Detected:**
   - Broken layouts (elements overflow viewport)
   - Severe accessibility violations (missing alt text, no keyboard navigation)
   - Failed interactions (buttons don't respond)
   - Performance issues (load time > 3s)

   **If ANY critical issues found:**
   ```
   Validation found critical issues in [list affected variations]:
   - [List specific issues]

   Would you like me to automatically fix these issues and regenerate the affected variation(s)? (yes/no):
   ```

   **If user agrees:**
   - Re-run the Task agent for affected variation(s) with additional instructions:
     - "IMPORTANT: Fix these validation issues: [list issues]"
     - Include specific guidance (e.g., "add alt text to all images", "ensure buttons have visible focus states")
   - Re-run validation on fixed variation(s)
   - Update validation report with new results

   **If user declines or no critical issues:**
   - Proceed to Step 4

5. **Update Comparison Page:**
   - Add link to validation report at top of comparison page
   - Add validation summary badges to each variation preview
   - Include best performer highlight based on metrics

### Step 4: User Output & Next Steps

Provide the user with:

1. **File Paths:** Absolute paths to all generated files
   - `ui-design/[feature-name]-variation-1/index.html`
   - `ui-design/[feature-name]-variation-2/index.html`
   - `ui-design/[feature-name]-variation-3/index.html`
   - `ui-design/[feature-name]-comparison.html`
   - **If validation was run:** `ui-design/[feature-name]-validation-report.html`

2. **Viewing Instructions:**
   ```bash
   # Open comparison page to view all 3 variations side-by-side
   open ui-design/[feature-name]-comparison.html

   # If validation was run, view the detailed validation report
   open ui-design/[feature-name]-validation-report.html

   # Or open individual variations
   open ui-design/[feature-name]-variation-1/index.html
   ```

3. **Validation Summary** (if validation was run):
   - Overall best performer based on combined metrics
   - Key findings from accessibility audits
   - Performance comparison highlights
   - Critical issues fixed (if any)

4. **Next Steps Suggestions:**
   - **Run validation later:** Use `/ui-design [feature-name] --validate` on existing designs
   - **Refine a design:** Run `/ui-design [refined-brief focusing on chosen variation]`
   - **Implement in Angular:** Translate chosen design to Angular components using Spartan UI
   - **Share for feedback:** Send comparison page link to team members
   - **Iterate:** Make adjustments based on feedback and run command again
   - **Document decision:** Note which variation was chosen and why in project docs

5. **Design Catalog:** Link to `ui-design/INDEX.md` to view all past design sessions
