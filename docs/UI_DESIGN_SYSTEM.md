# UI Design System — Shaheen Center (`سنتر شاهين`)

This document defines the visual foundation, typography, color tokens, RTL rules, and print specifications implemented in `client/src/index.css` and `client/src/components/ui/`.

---

## 1. Visual Direction

- **Theme:** Clean, high-contrast **Academic Operations** interface designed for long reception shifts and mobile-first usage (`UI-01`, `UI-02`, `NFR-USE-01..03`).
- **Layout Direction:** **Arabic RTL by default** (`<html lang="ar" dir="rtl">`), with right-hand sidebar navigation (`UI-03`).
- **Accessibility (`NFR-USE-02`):** Critical states (Paid/Due, Present/Late/Absent) **must always pair color + icon + Arabic label**.

---

## 2. Color Palette (CSS & Tailwind Tokens)

Defined in `client/src/index.css` via `@theme`:

### Brand & Surfaces

| Token                       | Hex       | Usage                                                             |
| :-------------------------- | :-------- | :---------------------------------------------------------------- |
| `brand-600` (Primary)       | `#0F4C5C` | Primary buttons, active navigation, headers, QR card header       |
| `brand-700` (Primary Hover) | `#0B3B48` | Hover/active state on primary buttons                             |
| `brand-500`                 | `#16697A` | Links, focus rings, secondary accents                             |
| `brand-50`                  | `#ECF6F8` | Active sidebar item background, subtle highlights                 |
| `accent-500`                | `#D97706` | Secondary highlight (warm amber/gold), badges, calls to attention |
| `surface-bg`                | `#F8FAFC` | App canvas background                                             |
| `surface-card`              | `#FFFFFF` | Cards, modals, tables, inputs                                     |
| `surface-border`            | `#E2E8F0` | Dividers, table borders, card hairlines                           |
| `ink-900`                   | `#0F172A` | Primary headings & high-emphasis text                             |
| `ink-600`                   | `#475569` | Secondary text, labels, metadata                                  |
| `ink-400`                   | `#94A3B8` | Placeholders, disabled text                                       |

### Semantic Status Colors (`FR-REC-02`, `FR-ATT-04`, `NFR-USE-02`)

| State                        | Arabic Label      | Solid (`text` / `border`) | Soft Surface (`bg`)          |
| :--------------------------- | :---------------- | :------------------------ | :--------------------------- |
| **Paid / Present / Success** | `مدفوع` / `حاضر`  | `#059669` (`status-paid`) | `#ECFDF5` (`status-paid-bg`) |
| **Due / Absent / Danger**    | `مستحق` / `غائب`  | `#DC2626` (`status-due`)  | `#FEF2F2` (`status-due-bg`)  |
| **Late / Warning / Pending** | `متأخر` / `معلق`  | `#D97706` (`status-late`) | `#FFFBEB` (`status-late-bg`) |
| **Excused / Info**           | `بعذر` / `معلومة` | `#0284C7` (`status-info`) | `#F0F9FF` (`status-info-bg`) |

---

## 3. Typography (Arabic RTL First)

Loaded in `client/index.html` via Google Fonts:

- **Primary UI & Headings (`--font-sans`):** **`Cairo`** (`400, 500, 600, 700, 800`) — crisp geometry, clear Arabic diacritics/letterforms at small table sizes and bold reception cards.
- **Secondary / Body & Data (`--font-body`):** **`IBM Plex Sans Arabic`** (`400, 500, 600, 700`).
- **Numbers & Currency:** Always apply `.tabular-nums` (or `dir="ltr"` on phone numbers, receipt numbers, and EGP amounts where needed) so columns align cleanly.

### Type Scale

| Element                          | Classes                                            |
| :------------------------------- | :------------------------------------------------- |
| Page Title                       | `text-2xl font-bold text-ink-900 tracking-tight`   |
| Section / Card Title             | `text-lg font-bold text-ink-900`                   |
| Body / Table Cell                | `text-sm font-medium text-ink-900`                 |
| Label / Caption                  | `text-xs font-semibold text-ink-600`               |
| Reception Student Name (`UI-05`) | `text-2xl sm:text-3xl font-extrabold text-ink-900` |

---

## 4. Spacing, Radius & Touch Targets (`NFR-USE-03`)

- **Minimum interactive height:** `min-h-[44px]` (`h-11`) for primary inputs and buttons on mobile/reception screens.
- **Border Radius:** Cards `rounded-xl` (`12px`), Buttons/Inputs `rounded-lg` (`8px`), Badges `rounded-full`.
- **Shadows:** Subtle elevation only (`shadow-xs` on cards, `shadow-lg` on modals/drawers).

---

## 5. RTL Layout Rules

- **NEVER** use `ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`.
- **ALWAYS** use logical properties: `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`.
- Phone numbers (`01012345678`), receipt codes (`RCP-2026-0001`), and times (`16:05`) should wrap in `<span dir="ltr" className="inline-block tabular-nums">...</span>`.

---

## 6. Print Specifications (`FR-STU-03`, `FR-PAY-02`)

Built-in utility classes in `client/src/index.css`:

- `.no-print`: Hides sidebar, topbar, and action buttons when printing.
- `.print-thermal-80mm`: Constrains receipt container to `80mm` width with high-contrast monochrome borders for thermal desk printers.
- `.print-qr-card`: Standard ID-card aspect (`85.6mm × 54mm`) for printing student QR cards individually or in an A4 grid.
