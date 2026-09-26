# Design System Specification: The Academic Editorial

## 1. Overview & Creative North Star
**Creative North Star: The Scholarly Curator**

This design system rejects the "standard software" look in favor of a high-end editorial experience. It is designed to feel like a premium digital monograph—authoritative yet breathing, structured yet fluid. We move away from the rigid, boxed-in layouts of traditional EdTech. Instead, we embrace **The Scholarly Curator**—a philosophy that uses intentional white space, sophisticated tonal layering, and "asymmetric balance" to guide a student’s focus without the fatigue of heavy UI chrome.

The goal is to foster an environment of "calm rigor." By utilizing high-contrast typography scales and overlapping surface elements, we create a sense of intellectual depth. We are not just building a tool; we are building a digital campus that feels as permanent and prestigious as stone and ink.

---

## 2. Colors & Surface Philosophy
The palette is rooted in deep, intellectual blues (`primary`) and organic, growth-oriented greens (`secondary`). 

### The "No-Line" Rule
To achieve a premium editorial feel, **1px solid borders are strictly prohibited for sectioning.** Physical boundaries must be defined through background color shifts or subtle tonal transitions. For example:
- A main content area using `surface` might sit adjacent to a sidebar using `surface-container-low`.
- A header should be distinguished by a shift to `surface-container-highest`, never a divider line.

### Surface Hierarchy & Nesting
Think of the UI as a series of stacked, high-quality paper stocks. Use the `surface-container` tiers to create "nested" importance:
- **Base Layer:** `background` (#f7f9ff).
- **Secondary Content Areas:** `surface-container-low`.
- **Primary Interaction Cards:** `surface-container-lowest` (pure white) to provide a "pop" of clarity against the blue-tinted backgrounds.
- **Persistent Utilities:** `surface-container-high` for navigation or auxiliary panels.

### The "Glass & Gradient" Rule
To prevent the UI from feeling "flat" or "corporate," use Glassmorphism for floating overlays (e.g., modals, dropdowns). Apply `surface_container_highest` at 80% opacity with a `backdrop-blur` of 12px-20px. 

### Signature Textures
Main CTAs and Hero sections should utilize a subtle linear gradient from `primary` (#00152a) to `primary_container` (#102a43) at a 135-degree angle. This adds a "lithographic" soul to the digital surface, suggesting depth and professional polish.

---

## 3. Typography
The system uses a dual-font strategy to balance character with readability.

*   **Display & Headlines (Lexend):** Used for all `display` and `headline` scales. Lexend was designed specifically to reduce visual stress and improve reading speed. In this system, use it to provide a modern, encouraging voice. Large `display-lg` headings should be treated as "hero" elements with tighter letter spacing (-0.02em).
*   **Body & Titles (Public Sans):** A neutral, strong, and highly legible typeface. Use `title-lg` for section headers to convey authority. `body-md` is your workhorse for educational content, providing a clean, academic feel that doesn't distract.

**Hierarchy Note:** Always maintain a significant scale jump between headlines and body text. If a `headline-md` is used, the supporting text should be `body-md`, skipping the title sizes to create "Editorial Air" (breathing room).

---

## 4. Elevation & Depth
Depth in this design system is achieved through **Tonal Layering** rather than traditional drop shadows.

*   **The Layering Principle:** Place `surface-container-lowest` elements on top of `surface-container-low` backgrounds to create a natural, soft lift. This mimics how light hits different thicknesses of paper.
*   **Ambient Shadows:** Where a floating effect is required (e.g., a floating action button or a modal), use an ultra-diffused shadow: `box-shadow: 0 12px 32px -4px rgba(0, 29, 51, 0.08)`. The shadow color is derived from `on_surface` to ensure it feels like a natural occlusion of light.
*   **The "Ghost Border" Fallback:** If a container requires definition against an identical background color, use a "Ghost Border": `outline_variant` at 15% opacity. Never use 100% opaque borders.
*   **Glassmorphism:** Use semi-transparent `surface_bright` with a blur effect for global navigation bars. This allows the educational content to "peek through" as the student scrolls, maintaining context and flow.

---

## 5. Components

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. Text in `on_primary`. Corner radius: `md` (0.375rem). Use `title-sm` for button labels for a more sophisticated, "learned" look.
*   **Secondary:** `surface-container-highest` background with `primary` text. No border.
*   **Tertiary:** No background. `primary` text. Use for low-emphasis actions like "Cancel" or "Learn More."

### Input Fields
*   Avoid the "box" look. Use a `surface-container-low` background with a bottom-only "Ghost Border" of `outline_variant`.
*   On focus, transition the background to `surface_container_lowest` and the bottom border to `primary`.
*   **Labels:** Use `label-md` in `on_surface_variant`. Always place labels above the input, never as placeholders.

### Cards & Lists
*   **No Dividers:** Forbid the use of line dividers between list items. Use 16px or 24px of vertical white space to separate thoughts.
*   **Academic Cards:** Use `surface-container-lowest` with a `lg` (0.5rem) corner radius. For interactive cards, apply a subtle `primary_fixed_dim` 2px left-accent bar to indicate "selectability" without boxing the content in.

### Chips
*   Use `secondary_container` for "Success" or "Completed" states.
*   Use `tertiary_fixed` (#ffdcc3) for "In Progress" or "Attention Needed."
*   Shape should always be `full` (pill-shaped) to contrast against the structured, rectangular grid of the content.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts. For example, a 60/40 split where the 60% column contains the core text and the 40% column contains "marginalia" (notes, chips, or citations).
*   **Do** prioritize "Reading Flow." Ensure line lengths for `body-md` do not exceed 70 characters.
*   **Do** use `secondary` (Academic Green) for encouraging feedback, such as "Correct Answer" or "Progress Saved."

### Don't
*   **Don't** use pure black (#000000) for text. Always use `on_surface` (#001d33) to maintain the deep blue academic tone.
*   **Don't** use standard "Material Design" shadows. They are too heavy for this editorial aesthetic.
*   **Don't** crowd the interface. If a screen feels busy, increase the white space between sections rather than adding borders to separate them.
*   **Don't** use high-saturation "neon" colors. Stick to the muted, professional tones provided in the palette to maintain a "Trustworthy" atmosphere.