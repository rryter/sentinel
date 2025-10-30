# UI Design Generator

You are tasked with creating 3 different UI design variations based on this brief:

**Brief:** {{arg}}

## Process:

### Step 1: Brainstorm Design Variations

Analyze the brief and propose 3 distinct design approaches. Consider:
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

Launch 3 general-purpose agents IN PARALLEL to implement each design variation.

**CRITICAL**: You MUST send a single message containing 3 Task tool calls to run all agents simultaneously.

Each agent should receive a prompt following this structure:

```
Implement UI Design Variation [1/2/3]: [Variation Name]

Original Brief: {{arg}}

Design Approach:
- Concept: [concept from brainstorming]
- Layout: [layout pattern]
- Key Features: [key features list]
- Target Use Case: [best for scenario]

Implementation Requirements:
1. Create HTML and CSS representation in: ui-design/[feature-name]-variation-[1/2/3]/
2. Use Tailwind 4
3. Make the component immediately usable/demonstrable

File Structure:
- [feature-name]-variation-[1/2/3]/
  - [component-name].html
  - [component-name].css (if needed)

Deliverable:
A HTML & CSS representation that demonstrates the design variation with realistic mock data.
```

### Step 3: Summary

After all agents complete, provide a summary comparing the 3 variations and guidance on when to use each approach.
