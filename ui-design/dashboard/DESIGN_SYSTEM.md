# Sentinel Design System - Quick Reference

This document provides a quick reference for the Sentinel dashboard design system. Use this when building new components or features.

---

## Color Palette

### Gray Scale (Cool Undertone)

```css
--gray-50:  hsl(210, 20%, 98%)  #F9FAFB
--gray-100: hsl(210, 17%, 95%)  #F1F3F5
--gray-200: hsl(210, 15%, 89%)  #E2E6EA
--gray-300: hsl(210, 13%, 78%)  #C5CBD3
--gray-400: hsl(210, 11%, 65%)  #9CA3AF
--gray-500: hsl(210, 10%, 52%)  #6B7280
--gray-600: hsl(210, 12%, 43%)  #4B5563
--gray-700: hsl(210, 14%, 33%)  #374151
--gray-800: hsl(210, 16%, 24%)  #1F2937
--gray-900: hsl(210, 18%, 15%)  #111827
```

**Usage:**
- 50-100: Backgrounds, subtle highlights
- 200-300: Borders, dividers
- 400-500: Disabled states, placeholders
- 600-700: Secondary text, icons
- 800-900: Primary text, headings

### Primary Blue

```css
--primary-50:  hsl(217, 100%, 97%)  #F0F4FF
--primary-100: hsl(217, 95%, 92%)   #E0E9FF
--primary-200: hsl(217, 93%, 85%)   #C7D7FE
--primary-300: hsl(217, 91%, 75%)   #A4BCFD
--primary-400: hsl(217, 88%, 65%)   #7DA2FB
--primary-500: hsl(217, 85%, 55%)   #5B8DEF
--primary-600: hsl(217, 70%, 48%)   #4F46E5  ← Main brand color
--primary-700: hsl(217, 65%, 40%)   #4338CA
--primary-800: hsl(217, 60%, 32%)   #3730A3
--primary-900: hsl(217, 55%, 24%)   #312E81
```

**Usage:**
- Buttons, links, active states
- Focus indicators
- Selected items
- Brand elements

### Success Green

```css
--success-500: hsl(142, 70%, 45%)  #059669  ← Base
--success-600: hsl(142, 75%, 38%)  #047857  ← Text on light bg
--success-700: hsl(142, 75%, 32%)  #065F46  ← Text on colored bg
```

**Usage:**
- Success messages, completed states
- Positive metrics (improvements)
- High efficiency indicators

### Warning Amber

```css
--warning-500: hsl(38, 92%, 45%)   #D97706  ← Base
--warning-600: hsl(38, 90%, 38%)   #B45309  ← Text on light bg
--warning-700: hsl(38, 88%, 32%)   #92400E  ← Text on colored bg
```

**Usage:**
- Warning messages, caution states
- Medium efficiency indicators
- Degraded performance

### Error Red

```css
--error-500: hsl(0, 75%, 52%)    #DC2626  ← Base
--error-600: hsl(0, 70%, 45%)    #B91C1C  ← Text on light bg
--error-700: hsl(0, 68%, 38%)    #991B1B  ← Text on colored bg
```

**Usage:**
- Error messages, failed states
- Negative metrics (regressions)
- Low efficiency indicators

---

## Typography

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
             'Helvetica Neue', Arial, sans-serif;
```

### Size Scale

| Token | Size | Usage |
|-------|------|-------|
| `--text-xs` | 12px | Tiny labels, captions, metadata |
| `--text-sm` | 14px | Table text, secondary info, body text |
| `--text-base` | 16px | Default body text, inputs |
| `--text-lg` | 18px | Emphasized body text |
| `--text-xl` | 20px | Small headings, subtitles |
| `--text-2xl` | 24px | Section headings |
| `--text-3xl` | 30px | Page subheadings |
| `--text-4xl` | 36px | Page titles |
| `--text-5xl` | 48px | Hero text, display |

### Weight Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--font-normal` | 400 | Body text, descriptions |
| `--font-medium` | 500 | Emphasized text, labels |
| `--font-semibold` | 600 | Headings, important values |
| `--font-bold` | 700 | Strong emphasis, titles |

### Examples

```css
/* Page Title */
font-size: var(--text-4xl);
font-weight: var(--font-bold);
line-height: 1.2;
letter-spacing: -0.02em;

/* Section Heading */
font-size: var(--text-xl);
font-weight: var(--font-semibold);
line-height: 1.3;

/* Body Text */
font-size: var(--text-sm);
font-weight: var(--font-normal);
line-height: 1.5;

/* Uppercase Label */
font-size: var(--text-xs);
font-weight: var(--font-medium);
text-transform: uppercase;
letter-spacing: 0.05em;
```

---

## Spacing Scale

Base unit: **4px**

| Token | Size | Usage |
|-------|------|-------|
| `--space-1` | 4px | Fine details, tight gaps |
| `--space-2` | 8px | Small gaps, compact elements |
| `--space-3` | 12px | Comfortable small spacing |
| `--space-4` | 16px | Base spacing unit |
| `--space-5` | 20px | Medium spacing |
| `--space-6` | 24px | Comfortable spacing |
| `--space-8` | 32px | Large spacing |
| `--space-10` | 40px | Extra large spacing |
| `--space-12` | 48px | Section separation |
| `--space-16` | 64px | Major section gaps |
| `--space-20` | 80px | Very large gaps |
| `--space-24` | 96px | Huge gaps |

### Application Guide

```css
/* Related items (label + input) */
margin-bottom: var(--space-2);  /* 8px */

/* Form fields */
margin-bottom: var(--space-6);  /* 24px */

/* Card padding */
padding: var(--space-6);  /* 24px */

/* Section separation */
margin-bottom: var(--space-12);  /* 48px */

/* Page margins */
padding: var(--space-8);  /* 32px */
```

---

## Border Radius

| Token | Size | Usage |
|-------|------|-------|
| `--radius-sm` | 4px | Small elements, badges |
| `--radius-md` | 6px | Buttons, inputs, nav items |
| `--radius-lg` | 8px | Cards, containers |
| `--radius-xl` | 12px | Large cards, modals |
| `--radius-full` | 9999px | Pills, circles, rounded ends |

---

## Box Shadows

Realistic depth with two-layer shadows:

```css
/* Subtle - barely elevated */
--shadow-xs: 0 1px 2px rgba(0,0,0,0.04);

/* Small - raised button, card */
--shadow-sm: 0 1px 3px rgba(0,0,0,0.1),
             0 1px 2px rgba(0,0,0,0.06);

/* Medium - dropdown, hover card */
--shadow-md: 0 4px 6px rgba(0,0,0,0.07),
             0 2px 4px rgba(0,0,0,0.05);

/* Large - dialog, prominent card */
--shadow-lg: 0 10px 15px rgba(0,0,0,0.1),
             0 4px 6px rgba(0,0,0,0.05);

/* Extra large - modal */
--shadow-xl: 0 20px 25px rgba(0,0,0,0.1),
             0 10px 10px rgba(0,0,0,0.04);
```

**Usage:**
- xs: Subtle borders alternative
- sm: Cards, buttons
- md: Hover states, dropdowns
- lg: Dialogs, prominent elements
- xl: Modals, popovers

---

## Components

### Buttons

#### Primary Button

```css
.button-primary {
  height: 44px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 500;
  background: var(--primary-600);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
}

.button-primary:hover {
  background: var(--primary-700);
  box-shadow: var(--shadow-sm);
}
```

#### Secondary Button

```css
.button-secondary {
  height: 44px;
  padding: 0 20px;
  font-size: 14px;
  font-weight: 500;
  background: white;
  color: var(--gray-700);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
}

.button-secondary:hover {
  background: var(--gray-50);
  border-color: var(--gray-400);
}
```

### Form Inputs

```css
input, textarea, select {
  height: 44px;
  padding: 0 16px;
  font-size: 16px;  /* Prevents zoom on iOS */
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  background: var(--gray-50);
}

input:focus {
  outline: none;
  background: white;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px var(--primary-100);
}
```

### Cards

```css
.card {
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-xs);
}

.card:hover {
  box-shadow: var(--shadow-sm);
  border-color: var(--gray-300);
}
```

### Badges

```css
.badge {
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.badge-primary {
  background: var(--primary-100);
  color: var(--primary-700);
}

.badge-success {
  background: var(--success-50);
  color: var(--success-700);
}
```

---

## Patterns

### Three-Level Hierarchy

Use for any list or table where you need to show related information:

```css
/* Primary: What matters most */
.primary {
  font-size: 14px;
  font-weight: 600;
  color: var(--gray-900);
}

/* Secondary: Supporting info */
.secondary {
  font-size: 12px;
  font-weight: 500;
  color: var(--gray-600);
}

/* Tertiary: Metadata */
.tertiary {
  font-size: 12px;
  font-weight: 400;
  color: var(--gray-500);
}
```

### Status Indicators

```css
/* Success */
.status-success {
  background: var(--success-50);
  border: 1px solid var(--success-200);
  color: var(--success-700);
}

/* Warning */
.status-warning {
  background: var(--warning-50);
  border: 1px solid var(--warning-200);
  color: var(--warning-700);
}

/* Error */
.status-error {
  background: var(--error-50);
  border: 1px solid var(--error-200);
  color: var(--error-700);
}
```

### Metric Cards

```css
.metric-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-value {
  font-size: 36px;
  font-weight: 700;
  color: var(--gray-900);
  line-height: 1.2;
  letter-spacing: -0.02em;
}

.metric-trend {
  font-size: 14px;
  font-weight: 500;
  color: var(--success-700);
}
```

---

## Transitions

```css
/* Standard transitions */
--transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);
```

**Usage:**
- Fast: Hover states, highlights
- Base: Most UI transitions
- Slow: Page transitions, animations

---

## Breakpoints

```css
/* Mobile first approach */
@media (max-width: 640px)  { /* sm */ }
@media (max-width: 768px)  { /* md */ }
@media (max-width: 1024px) { /* lg */ }
@media (max-width: 1280px) { /* xl */ }
@media (max-width: 1536px) { /* 2xl */ }
```

---

## Accessibility

### Focus Indicators

```css
*:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
```

### Contrast Requirements

- **Normal text (< 18px)**: 4.5:1 minimum
- **Large text (≥ 18px or ≥ 14px bold)**: 3:1 minimum
- **UI components**: 3:1 minimum

### ARIA Labels

Always provide labels for icon-only buttons:

```html
<button aria-label="Delete item">
  <svg><!-- icon --></svg>
</button>
```

---

## Code Style Guide

### CSS Organization

1. Layout properties (display, position, etc.)
2. Box model (width, height, padding, margin)
3. Typography (font, line-height, etc.)
4. Visual (color, background, border)
5. Misc (cursor, transition, etc.)

```css
.example {
  /* Layout */
  display: flex;
  align-items: center;
  gap: 8px;

  /* Box model */
  width: 100%;
  padding: 16px;
  margin-bottom: 24px;

  /* Typography */
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;

  /* Visual */
  color: var(--gray-900);
  background: white;
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  box-shadow: var(--shadow-xs);

  /* Misc */
  cursor: pointer;
  transition: all 200ms;
}
```

### Naming Conventions

- Use kebab-case for classes: `.metric-card`
- Use descriptive names: `.button-primary` not `.btn-1`
- Use BEM-light for components: `.card__header`, `.card__body`
- Avoid generic names: `.text` → `.metric-label`

---

## Quick Component Reference

### Table Cells

```html
<!-- Scan ID -->
<div class="scan-id">
  <span class="scan-number">#9</span>
  <span class="scan-badge badge-new">New</span>
</div>

<!-- Date -->
<div class="date-cell">
  <span class="date-primary">Oct 31, 2024</span>
  <span class="date-secondary">2:45 PM</span>
</div>

<!-- Metric with Change -->
<div class="metric-cell">
  <span class="metric-primary">1,537ms</span>
  <span class="metric-change change-negative">+43.2%</span>
</div>

<!-- Efficiency Bar -->
<div class="efficiency-cell">
  <div class="efficiency-bar-container">
    <div class="efficiency-bar efficiency-high" style="width: 92%"></div>
  </div>
  <span class="efficiency-value">92%</span>
</div>
```

---

## Resources

- **Design Guidelines**: `/Users/rryter/.claude/agents/docs/design-guidelines.md`
- **Refactoring UI**: https://refactoringui.com/
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **Color Contrast Checker**: https://webaim.org/resources/contrastchecker/

---

*Last Updated: November 2, 2025*
