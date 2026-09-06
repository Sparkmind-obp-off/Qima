# QIMA — DEMO / MEETING VALIDATION CHECKLIST v1.0

**Document ID:** DOC-12  
**Status:** ACTIVE — MEETING VALIDATION  
**Purpose:** Menjadi checklist validasi demo QIMA sebelum meeting dan menjadi handoff gate menuju P2 Backend Foundation/Continuation.

---

## 1. Position

DOC-12 adalah operational validation layer untuk prototype yang sudah dibangun berdasarkan DOC-11.

It does not replace DOC 01–11 and does not change production architecture.

Execution principle:

> **Validate the experience first. Integrate production after the meeting.**

P2 Backend Foundation/Continuation hanya dimulai setelah feedback meeting dicatat dan prototype direction dikunci.

---

## 2. Meeting Demo Journey

Presenter mengikuti satu alur utama tanpa database intervention:

```text
/demo
  ↓
Public Landing
  ↓
Explore Program
  ↓
Program Detail
  ↓
Registration
  ↓
Registration Success
  ↓
/demo/admin/login
  ↓
Admin Demo Login
  ↓
/demo/admin
  ↓
Dashboard
  ↓
Programs
  ↓
Registrations
  ↓
Unit Context / Switcher
```

Primary journey adalah source of truth untuk meeting validation.

---

## 3. Validation Matrix

| Area | Check | Expected | Status |
|---|---|---|---|
| Public route | `/demo` | Render prototype public | READY — route implemented |
| Public identity | QIMA + RQ Blumbang | Clear platform/unit distinction | READY — implemented |
| Program | Program cards | Interactive and opens detail flow | READY — implemented |
| Registration | Form | Name + contact + optional note + program | READY — implemented |
| Registration success | Success state | Clear status and admin handoff | READY — implemented |
| Admin route | `/demo/admin/login` | Demo login screen renders | READY — implemented |
| Admin transition | Demo login CTA | Opens admin dashboard | READY — implemented |
| Admin dashboard | `/demo/admin` | Metrics + operational views | READY — implemented |
| Admin programs | Programs view | Mock operational list | READY — implemented |
| Admin registrations | Registrations view | Mock registration list | READY — implemented |
| Unit context | Unit switcher | Shows shared-core / unit concept | READY — implemented |
| Demo safety | DEMO MODE banner | Explicitly separates prototype from production | READY — implemented |
| Responsive | Desktop/tablet/mobile | No critical layout break | NEEDS HUMAN VISUAL CHECK |
| Accessibility | Keyboard/focus/contrast | Baseline usable | NEEDS HUMAN CHECK |
| Runtime | Browser console | No critical errors | NEEDS LIVE/CI CHECK |
| Build | `npm run build` | Build succeeds | NEEDS CI/LOCAL RESULT |
| Full quality gate | `npm run verify` | Full repository gate succeeds | NEEDS CI/LOCAL RESULT |
| Deployment | Preview/demo URL | Demo opens successfully | NEEDS DEPLOYMENT CHECK |

---

## 4. Presenter Script

### Step 1 — Establish the thesis

Open `/demo` and state:

> “QIMA bukan satu website untuk satu lembaga. Ini satu platform core yang bisa membawa banyak unit dengan identitas masing-masing.”

### Step 2 — Show unit identity

Point to **RQ Blumbang** and the unit context.

Use the unit switcher to show **QIMA Platform** without changing the application core.

### Step 3 — Show public experience

Open a program and demonstrate:

- program discovery;
- detail;
- registration;
- success state.

Do not describe mock submission as a real production transaction.

### Step 4 — Cross the operational boundary

Select **Buka Admin Demo** and show the demo login.

Then enter the admin dashboard.

### Step 5 — Show operational value

Show:

- dashboard metrics;
- programs;
- activities;
- registrations;
- participants where available;
- unit context.

### Step 6 — Close with architecture

State:

> “Yang kita validasi hari ini adalah experience dan operating model. Backend production akan diintegrasikan setelah flow ini disepakati.”

---

## 5. Meeting Feedback Capture

Only record feedback that changes one of these categories:

- user journey;
- information hierarchy;
- terminology;
- unit identity;
- required capability;
- admin workflow;
- registration workflow;
- reporting expectation;
- production integration priority.

Do not immediately rewrite production architecture during the meeting.

### Feedback Log

| ID | Feedback | Category | Decision | Follow-up Phase |
|---|---|---|---|---|
| M-001 | _meeting input_ | _category_ | _accept / defer / reject_ | _P2 / later_ |
| M-002 | _meeting input_ | _category_ | _accept / defer / reject_ | _P2 / later_ |
| M-003 | _meeting input_ | _category_ | _accept / defer / reject_ | _P2 / later_ |

---

## 6. Freeze Rules

After meeting validation:

1. freeze validated UX direction;
2. record accepted changes before implementation;
3. do not fork the repository per unit;
4. do not move mock data into production storage;
5. do not introduce production credentials into prototype;
6. do not rewrite verified Phase 2–6 foundations without evidence;
7. map accepted feedback back to DOC 04/07/08/09/10 where necessary.

---

## 7. P2 Handoff Gate

P2 Backend Foundation/Continuation may start when:

- primary demo journey has been reviewed;
- meeting feedback is captured;
- accepted UX changes are identified;
- deferred items are explicitly separated;
- production integration priorities are clear;
- existing verified production foundation remains the baseline.

P2 must continue from the current verified repository state, not restart completed phases.

---

## 8. Technical Safety Boundary

Prototype:

```text
UI → Mock Data → Local State / Simulated Interaction → Demo Result
```

Production:

```text
UI → API → Application Service → Domain → Data Access → Database
```

The meeting must never imply that prototype mock interactions are persisted production transactions.

---

## 9. Current Handoff State

At the time this checklist is created:

- P0 prototype/public experience is implemented;
- P0 admin experience is implemented;
- unified Public → Registration → Admin journey is implemented;
- DEMO MODE / ADMIN DEMO boundaries are visible;
- production Phase 2–6 foundation remains outside the prototype layer;
- CI status must be verified before claiming a green quality gate;
- live deployment must be verified before claiming deployment success.

**Next gate:** meeting validation → feedback capture → P2 Backend Foundation/Continuation.

---

## 10. Non-Negotiable Statement

> **P1 validates the product experience. P2 integrates production capability.**

No production foundation is considered changed merely because prototype/demo work changes the presentation layer.
