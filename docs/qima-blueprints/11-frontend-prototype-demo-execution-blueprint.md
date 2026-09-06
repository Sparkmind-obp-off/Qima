# QIMA — FRONT-END PROTOTYPE & DEMO EXECUTION BLUEPRINT v1.0

**Document ID:** DOC-11  
**Status:** ACTIVE — PROTOTYPE EXECUTION  
**Purpose:** Menjadi kontrak eksekusi frontend prototype/demo QIMA sebelum integrasi backend production.

---

## 1. Purpose & Position

DOC 11 menjembatani blueprint QIMA DOC 01–10 menuju prototype frontend yang dapat dipresentasikan, diuji, dan divalidasi tanpa merusak arsitektur production.

Prototype adalah **demonstration layer**, bukan pengganti production architecture.

Prinsip utama:

> **Prototype fast, preserve the core, integrate later.**

Prototype harus cukup nyata untuk menunjukkan pengalaman produk, tetapi tidak boleh menyamarkan mock data atau simulated interaction sebagai backend production.

---

## 2. Source-of-Truth Hierarchy

DOC 01–10 tetap menjadi source of truth platform dan production.

DOC 11 hanya mengatur:

- prototype UX/UI;
- visual direction;
- demo journey;
- mock data;
- simulated interaction;
- prototype deployment;
- prototype QA;
- handoff menuju production integration.

Tidak boleh membuat domain model, permission model, database contract, atau deployment architecture baru yang bertentangan dengan DOC 01–10.

---

## 3. Prototype Objective

Prototype v1 harus mampu memperlihatkan:

1. identitas QIMA sebagai platform;
2. identitas unit yang dapat berubah tanpa mengubah core aplikasi;
3. public website unit;
4. program dan aktivitas;
5. CTA pendaftaran;
6. simulasi registration flow;
7. admin dashboard unit;
8. ringkasan program/registrasi/aktivitas;
9. unit switcher atau unit context demonstration;
10. responsive experience pada desktop dan mobile.

Prototype tidak wajib memiliki:

- database production;
- real authentication;
- real payment;
- real email/WhatsApp delivery;
- real analytics;
- real multi-tenant persistence;
- production-grade authorization enforcement.

Fitur tersebut mengikuti production implementation plan setelah prototype validation.

---

## 4. Prototype Implementation Mode

QIMA memiliki dua execution modes.

### Mode A — PROTOTYPE / DEMO

```text
UI
 ↓
Mock Data
 ↓
Local State / Simulated Interaction
 ↓
Demo Result
```

### Mode B — PRODUCTION

```text
UI
 ↓
API
 ↓
Application Service
 ↓
Domain
 ↓
Data Access
 ↓
Database
```

Prototype code harus dirancang agar Mode A dapat diganti secara bertahap menuju Mode B tanpa membangun ulang seluruh UI.

---

## 5. Visual Direction

Visual identity QIMA harus terasa:

- modern;
- trustworthy;
- warm;
- educational;
- spiritual tanpa menjadi dekoratif berlebihan;
- premium tetapi tetap approachable;
- clean dan mudah dipahami.

Visual tidak boleh terasa seperti generic SaaS dashboard yang ditempeli ornamen Qur'an.

### Visual Priorities

1. clarity;
2. hierarchy;
3. trust;
4. identity;
5. usability;
6. motion.

Motion selalu berada di bawah hierarchy dan usability.

---

## 6. Design System Contract

Prototype wajib menggunakan design tokens dan reusable components, bukan styling halaman secara terpisah.

### Token Categories

- color;
- typography;
- spacing;
- radius;
- border;
- shadow/elevation;
- sizing;
- motion timing;
- responsive breakpoints.

### Component Foundation

Minimal:

- Button;
- Link;
- Badge;
- Card;
- Avatar/Logo;
- Input;
- Select;
- Tabs;
- Modal/Drawer;
- Toast;
- Navigation;
- Hero;
- Section;
- Stat;
- Data table/list;
- Empty state;
- Loading state;
- Error state.

Komponen harus reusable lintas unit.

---

## 7. Multi-Unit Visual Contract

QIMA adalah satu platform core dengan banyak unit.

Prototype harus membuktikan bahwa visual identity dapat berubah melalui configuration/data, bukan fork kode.

Unit configuration minimal:

```text
unit.name
unit.slug
unit.logo
unit.favicon
unit.colors
unit.typography
unit.hero
unit.imagery
unit.contact
unit.address
unit.socials
unit.tone
```

### Demo Unit

**QIMA** digunakan sebagai platform-level identity.

**RQ Blumbang** digunakan sebagai reference unit/demo tenant.

Prototype juga boleh menyediakan unit kedua sebagai visual validation untuk membuktikan bahwa shared core dapat melayani identitas berbeda.

---

## 8. Public Demo Screen Inventory

### P0 — Required

1. Home / Landing
2. About / Information
3. Program listing
4. Program detail
5. Activity / Events
6. Registration flow
7. Registration success state

### P1 — Recommended

8. Unit profile
9. Contact
10. Gallery/content section
11. FAQ
12. Unit switcher/demo selector

---

## 9. Admin Demo Screen Inventory

### P0 — Required

1. Demo login
2. Dashboard
3. Programs
4. Activities
5. Registrations
6. Unit context indicator/switcher

### P1 — Recommended

7. Participants
8. Content
9. Reports
10. Settings / branding preview

Admin prototype may use simulated login and mock authorization state.

---

## 10. Primary Demo Journey

Primary meeting flow:

```text
Open QIMA
 ↓
Platform / Unit Landing
 ↓
Explore Program
 ↓
Program Detail
 ↓
Register
 ↓
Registration Success
 ↓
Demo Admin Login
 ↓
Dashboard
 ↓
Programs
 ↓
Registrations
 ↓
Switch Unit / View Unit Context
```

The journey should be completable end-to-end without dead ends.

---

## 11. Mock Data Contract

Mock data must resemble production domain objects closely enough that UI integration later is predictable.

Recommended mock entities:

- Organization;
- Unit;
- Site;
- Program;
- Activity;
- Participant;
- Registration;
- Content;
- User;
- Dashboard metrics.

Mock data should be centralized rather than embedded inside page components.

Example conceptual structure:

```text
mock/
  organizations
  units
  programs
  activities
  participants
  registrations
  content
  users
  dashboard
```

No production secrets or real personal data may be placed in prototype fixtures.

---

## 12. Interaction Contract

Prototype interactions may be simulated but must feel coherent.

Examples:

- navigation works;
- filters visibly change state;
- tabs switch content;
- modal opens/closes;
- registration progresses through steps;
- submit displays success state;
- dashboard counters use mock data;
- unit switcher updates unit identity and relevant content;
- search/filter produces deterministic mock results.

Do not implement fake backend calls merely to create the appearance of production integration.

---

## 13. Motion System

Motion should communicate hierarchy and state.

Allowed:

- page entrance;
- section reveal;
- hover/focus transitions;
- card interaction;
- navigation transition;
- modal/drawer transition;
- subtle hero movement;
- controlled scroll/parallax.

Rules:

- motion must be fast enough for a product demo;
- avoid constant animation;
- avoid excessive parallax;
- avoid motion behind important text;
- respect reduced-motion preferences;
- never sacrifice performance for spectacle.

---

## 14. Hero & Imagery Rules

Hero sections should communicate immediately:

1. who the unit/platform is;
2. what it offers;
3. what the visitor should do next.

Use strong imagery with sufficient contrast and readable content hierarchy.

Reference assets are not automatically production-approved assets. Prototype may use placeholders/sample imagery when final assets are unavailable.

---

## 15. Responsive Contract

Prototype must be validated at minimum for:

- desktop;
- tablet;
- mobile.

Rules:

- navigation collapses cleanly;
- hero remains readable;
- cards reflow naturally;
- tables become responsive lists or horizontal scroll where appropriate;
- touch targets remain usable;
- no horizontal overflow;
- typography remains hierarchical.

---

## 16. Accessibility Baseline

Prototype must include:

- semantic HTML where practical;
- keyboard-accessible controls;
- visible focus states;
- readable contrast;
- form labels;
- meaningful button/link text;
- reduced-motion consideration;
- accessible navigation landmarks where appropriate.

Prototype accessibility is a baseline quality requirement, not a later production-only concern.

---

## 17. Prototype Deployment Strategy

Prototype deployment must remain separate conceptually from production deployment.

Recommended structure:

```text
ONE QIMA REPOSITORY
        |
        +-- Prototype deployment
        |
        +-- QIMA platform deployment
        |
        +-- RQ Blumbang unit deployment
        |
        +-- Future unit deployments
```

### Important

There are **not** two separate QIMA codebases.

The intended model is:

> **ONE SHARED CORE → MULTIPLE DEPLOYMENTS / DOMAINS / UNIT IDENTITIES**

For example, the same repository/core can later serve:

- the main QIMA platform/site;
- RQ Blumbang public site;
- another Rumah Qur'an;
- a pondok unit;
- future organizations/units.

Each deployment may have its own domain, environment configuration, unit identity, and enabled capabilities while consuming the same platform core.

Prototype deployment may use a dedicated preview/demo URL. It must not be treated as the production deployment of QIMA or RQ Blumbang.

---

## 18. Environment & Configuration Separation

Prototype configuration must be isolated from production secrets.

Prototype may use:

- mock configuration;
- demo unit configuration;
- public-safe sample values;
- preview environment variables.

Never commit:

- API keys;
- database credentials;
- authentication secrets;
- private tokens;
- production credentials.

Production environment contracts remain governed by DOC 05, DOC 06, and DOC 08.

---

## 19. Prototype QA Gate

Prototype is ready for meeting/demo only when:

### Functional

- all P0 screens render;
- primary navigation works;
- primary CTA works;
- registration demo completes;
- admin demo completes;
- unit switching works where included;
- no critical broken route exists.

### Visual

- typography is consistent;
- spacing is consistent;
- components are reusable;
- unit identity is coherent;
- desktop/mobile layouts are stable;
- motion is controlled.

### Technical

- no critical runtime errors;
- no critical console errors;
- no exposed secrets;
- build succeeds;
- deployment succeeds.

### Demo

A presenter must be able to complete the primary journey without manual database intervention or code changes.

---

## 20. Production Handoff Contract

After prototype validation, replace layers progressively:

```text
Mock Data
   ↓
API Contract
   ↓
Application Services
   ↓
Domain Logic
   ↓
Database
```

The UI should remain as stable as practical.

Prototype findings should feed back into:

- DOC 04 user journeys;
- DOC 07 UX/UI system;
- DOC 08 implementation contract;
- DOC 09 QA;
- DOC 10 execution plan.

---

## 21. Execution Order

### Phase P0 — Prototype Foundation

- establish visual tokens;
- establish component foundation;
- establish mock data;
- establish unit configuration;
- establish prototype routing.

### Phase P1 — Public Experience

- landing;
- program;
- activity;
- content/information;
- registration demo.

### Phase P2 — Admin Experience

- demo login;
- dashboard;
- program management view;
- registration view;
- unit context.

### Phase P3 — Demo Polish

- responsive refinement;
- motion;
- accessibility;
- loading/empty/error states;
- visual consistency;
- demo QA.

### Phase P4 — Deployment

- preview deployment;
- meeting validation;
- collect feedback;
- freeze validated prototype direction.

### Phase P5 — Production Integration

Proceed using DOC 01–10 and the verified implementation state of the repository. Do not blindly restart already-implemented production foundation phases.

---

## 22. Definition of Done — DOC 11

DOC 11 execution is complete when:

- a polished QIMA prototype is deployed;
- RQ Blumbang can be demonstrated as a unit identity;
- public journey works;
- registration demo works;
- admin journey works;
- responsive behavior is validated;
- prototype QA gate passes;
- deployment is clearly separated from production;
- mock data is isolated;
- no production architecture is compromised;
- handoff path to backend integration is documented.

---

## 23. Non-Negotiable Principles

1. **Do not fork the platform for each unit.**
2. **Do not hardcode RQ Blumbang into the platform core.**
3. **Do not treat prototype mock data as production data.**
4. **Do not expose production secrets.**
5. **Do not rebuild DOC 01–10 unnecessarily.**
6. **Do not let visual experimentation override domain architecture.**
7. **Do not let prototype shortcuts become accidental production architecture.**
8. **One core, multiple units, multiple deployments.**
9. **Prototype first for validation; production integration follows the established blueprint.**

---

## 24. Final Architecture Statement

QIMA remains:

> **ONE PLATFORM CORE — MULTIPLE INDEPENDENT UNITS — MULTIPLE DEPLOYMENTS — ONE SHARED ARCHITECTURE.**

The prototype exists to make that architecture visible and experienceable before the complete production system is finished.
