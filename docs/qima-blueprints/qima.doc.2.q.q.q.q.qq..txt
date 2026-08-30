GASSS 🔥 Kita langsung masuk **DOC 02**, dan kali ini capability-nya kita petakan untuk **seluruh QIMA**, bukan hanya RQ Blumbang.

# QIMA — CAPABILITY GAP MATRIX v1.0

**Document Type:** Capability Gap Analysis
**System:** QIMA
**Version:** v1.0
**Status:** BASELINE
**Parent Document:** QIMA — MASTER PLATFORM BLUEPRINT v1.0
**Primary Objective:** Define the required capabilities of the QIMA ecosystem, identify implementation gaps, establish priorities, and create the bridge from platform requirements to domains and modules.

---

# 1. PURPOSE

Dokumen ini menerjemahkan Master Platform Blueprint menjadi capability yang dapat:

* diidentifikasi;
* diprioritaskan;
* dipetakan ke domain;
* dipetakan ke module;
* diimplementasikan;
* diuji;
* ditelusuri kembali ke requirement.

QIMA harus dipandang sebagai platform induk dengan beberapa jenis unit.

Scope capability:

```text
QIMA
│
├── PLATFORM CORE
├── ORGANIZATION
├── PONDOK PESANTREN
├── RUMAH QUR'AN
├── RQ BLUMBANG
├── ADMINISTRATION
├── PUBLIC WEBSITE
├── DATA & REPORTING
├── SECURITY
└── DEPLOYMENT
```

---

# 2. CAPABILITY STATUS MODEL

Setiap capability menggunakan status:

| Status   | Meaning                                      |
| -------- | -------------------------------------------- |
| EXISTING | Sudah tersedia pada implementation/reference |
| PARTIAL  | Sebagian tersedia                            |
| GAP      | Belum tersedia / belum memenuhi baseline     |
| REQUIRED | Wajib dibangun                               |
| OPTIONAL | Dapat ditambahkan kemudian                   |
| FUTURE   | Bukan prioritas initial release              |
| BLOCKED  | Memerlukan keputusan/data eksternal          |

Priority:

| Priority | Meaning                    |
| -------- | -------------------------- |
| P0       | Critical / foundation      |
| P1       | High / initial production  |
| P2       | Important / next iteration |
| P3       | Future                     |

---

# 3. PLATFORM CORE CAPABILITY MATRIX

| ID       | Capability              | Requirement                 | Status   | Priority | Domain       |
| -------- | ----------------------- | --------------------------- | -------- | -------- | ------------ |
| CORE-001 | Platform Identity       | QIMA identity layer         | REQUIRED | P0       | Platform     |
| CORE-002 | Organization Model      | Model organisasi induk      | REQUIRED | P0       | Organization |
| CORE-003 | Unit Model              | Model multi-unit            | REQUIRED | P0       | Organization |
| CORE-004 | Unit Isolation          | Isolasi data antar unit     | REQUIRED | P0       | Security     |
| CORE-005 | Configuration           | Config per unit             | REQUIRED | P0       | Platform     |
| CORE-006 | Authentication          | Login/session               | REQUIRED | P0       | Access       |
| CORE-007 | Authorization           | Permission enforcement      | REQUIRED | P0       | Access       |
| CORE-008 | Role Management         | Role & permission           | REQUIRED | P0       | Access       |
| CORE-009 | Audit                   | Administrative traceability | REQUIRED | P1       | Governance   |
| CORE-010 | API Foundation          | Domain API                  | REQUIRED | P0       | Platform     |
| CORE-011 | Error Handling          | Consistent error system     | REQUIRED | P1       | Platform     |
| CORE-012 | Validation              | Input validation            | REQUIRED | P0       | Platform     |
| CORE-013 | Media Management        | Asset management            | REQUIRED | P1       | Content      |
| CORE-014 | Notification Foundation | Notification capability     | OPTIONAL | P2       | Platform     |
| CORE-015 | Search                  | Cross/content search        | OPTIONAL | P2       | Platform     |

---

# 4. ORGANIZATION CAPABILITY MATRIX

| ID      | Capability             | Requirement                | Status   | Priority |
| ------- | ---------------------- | -------------------------- | -------- | -------- |
| ORG-001 | Organization Profile   | Profile yayasan/organisasi | REQUIRED | P1       |
| ORG-002 | Organization Identity  | Logo, name, identity       | REQUIRED | P0       |
| ORG-003 | Organization Admin     | Admin tingkat organisasi   | REQUIRED | P0       |
| ORG-004 | Unit Registry          | Daftar unit                | REQUIRED | P0       |
| ORG-005 | Unit Onboarding        | Menambah unit baru         | REQUIRED | P0       |
| ORG-006 | Unit Configuration     | Konfigurasi unit           | REQUIRED | P0       |
| ORG-007 | Unit Status            | Active/inactive            | REQUIRED | P1       |
| ORG-008 | Unit Assignment        | Admin → unit               | REQUIRED | P0       |
| ORG-009 | Cross-Unit Overview    | Monitoring lintas unit     | REQUIRED | P1       |
| ORG-010 | Organization Reporting | Ringkasan organisasi       | REQUIRED | P1       |

---

# 5. UNIT MANAGEMENT CAPABILITY

Setiap unit harus memiliki konfigurasi independen.

| ID       | Capability             | Requirement               | Status   | Priority |
| -------- | ---------------------- | ------------------------- | -------- | -------- |
| UNIT-001 | Unit Profile           | Profil unit               | REQUIRED | P0       |
| UNIT-002 | Unit Logo              | Logo unit                 | REQUIRED | P0       |
| UNIT-003 | Unit Theme             | Visual theme              | REQUIRED | P0       |
| UNIT-004 | Unit Content           | Konten unit               | REQUIRED | P0       |
| UNIT-005 | Unit Contact           | Kontak unit               | REQUIRED | P1       |
| UNIT-006 | Unit Address           | Lokasi/alamat             | REQUIRED | P1       |
| UNIT-007 | Unit Social Links      | Social media              | REQUIRED | P2       |
| UNIT-008 | Unit Domain            | URL/domain                | REQUIRED | P0       |
| UNIT-009 | Unit Admin             | Administrator unit        | REQUIRED | P0       |
| UNIT-010 | Unit Capability Toggle | Enable/disable capability | REQUIRED | P1       |

---

# 6. BRAND & VISUAL CAPABILITY MATRIX

| ID        | Capability               | Requirement               | Status   | Priority |
| --------- | ------------------------ | ------------------------- | -------- | -------- |
| BRAND-001 | Logo Management          | Logo per unit             | REQUIRED | P0       |
| BRAND-002 | Color System             | Primary/secondary colors  | REQUIRED | P0       |
| BRAND-003 | Typography               | Font hierarchy            | REQUIRED | P1       |
| BRAND-004 | Image Library            | Unit media                | REQUIRED | P1       |
| BRAND-005 | Hero Configuration       | Hero visual/content       | REQUIRED | P1       |
| BRAND-006 | Background Configuration | Background/section visual | REQUIRED | P1       |
| BRAND-007 | Component Theme          | Theme-aware components    | REQUIRED | P1       |
| BRAND-008 | Asset Replacement        | Replace reference assets  | REQUIRED | P1       |
| BRAND-009 | Responsive Visual System | Mobile/tablet/desktop     | REQUIRED | P0       |

### Reference Asset Rule

Screenshot atau foto yang diberikan sebagai referensi tidak otomatis dianggap final.

System harus memungkinkan:

```text
REFERENCE ASSET
      ↓
VISUAL ADAPTATION
      ↓
CURRENT ASSET
      ↓
FINAL OFFICIAL ASSET
```

Pergantian asset tidak boleh membutuhkan redesign total.

---

# 7. PONDOK PESANTREN CAPABILITY MATRIX

Pondok memiliki capability yang dapat berbeda dari Rumah Qur'an.

| ID         | Capability                | Status   | Priority |
| ---------- | ------------------------- | -------- | -------- |
| PONDOK-001 | Pondok Profile            | REQUIRED | P1       |
| PONDOK-002 | Santri Management         | REQUIRED | P1       |
| PONDOK-003 | Teacher/Ustadz Management | REQUIRED | P1       |
| PONDOK-004 | Program Pendidikan        | REQUIRED | P1       |
| PONDOK-005 | Class Management          | REQUIRED | P1       |
| PONDOK-006 | Activity Management       | REQUIRED | P1       |
| PONDOK-007 | Facility Management       | REQUIRED | P2       |
| PONDOK-008 | Dormitory/Asrama          | OPTIONAL | P2       |
| PONDOK-009 | Registration              | REQUIRED | P1       |
| PONDOK-010 | Reporting                 | REQUIRED | P1       |
| PONDOK-011 | Public Information        | REQUIRED | P1       |

---

# 8. RUMAH QUR'AN CAPABILITY MATRIX

| ID     | Capability                | Status   | Priority |
| ------ | ------------------------- | -------- | -------- |
| RQ-001 | RQ Profile                | REQUIRED | P0       |
| RQ-002 | Program Management        | REQUIRED | P0       |
| RQ-003 | Class Management          | REQUIRED | P1       |
| RQ-004 | Participant Management    | REQUIRED | P1       |
| RQ-005 | Teacher/Ustadz Management | REQUIRED | P1       |
| RQ-006 | Activity Management       | REQUIRED | P1       |
| RQ-007 | Registration              | REQUIRED | P1       |
| RQ-008 | Announcement              | REQUIRED | P1       |
| RQ-009 | Media/Gallery             | REQUIRED | P2       |
| RQ-010 | Reporting                 | REQUIRED | P1       |
| RQ-011 | Public Website            | REQUIRED | P0       |
| RQ-012 | Contact Management        | REQUIRED | P1       |

---

# 9. RQ BLUMBANG CAPABILITY MATRIX

RQ Blumbang menjadi first reference implementation.

| ID     | Capability                | Status      | Priority |
| ------ | ------------------------- | ----------- | -------- |
| BL-001 | RQ Identity               | PARTIAL     | P0       |
| BL-002 | Brand Theme               | PARTIAL     | P0       |
| BL-003 | Public Homepage           | PARTIAL     | P0       |
| BL-004 | Program Presentation      | PARTIAL     | P1       |
| BL-005 | Activity Presentation     | PARTIAL     | P1       |
| BL-006 | Media/Visual Presentation | PARTIAL     | P1       |
| BL-007 | Registration              | GAP         | P1       |
| BL-008 | Admin Authentication      | GAP/PARTIAL | P0       |
| BL-009 | Admin Dashboard           | GAP         | P0       |
| BL-010 | Data Management           | GAP         | P0       |
| BL-011 | Unit Configuration        | GAP/PARTIAL | P0       |
| BL-012 | Auditability              | GAP         | P1       |
| BL-013 | Deployment Identity       | REQUIRED    | P0       |
| BL-014 | Domain Mapping            | REQUIRED    | P1       |

RQ Blumbang menjadi validation environment untuk QIMA core.

---

# 10. PUBLIC WEBSITE CAPABILITY MATRIX

| ID      | Capability               | Status   | Priority |
| ------- | ------------------------ | -------- | -------- |
| WEB-001 | Unit Homepage            | REQUIRED | P0       |
| WEB-002 | About/Profile            | REQUIRED | P1       |
| WEB-003 | Programs                 | REQUIRED | P1       |
| WEB-004 | Activities               | REQUIRED | P1       |
| WEB-005 | Events                   | OPTIONAL | P2       |
| WEB-006 | Registration             | REQUIRED | P1       |
| WEB-007 | Announcements            | REQUIRED | P1       |
| WEB-008 | Media/Gallery            | REQUIRED | P2       |
| WEB-009 | Contact                  | REQUIRED | P1       |
| WEB-010 | Responsive Layout        | REQUIRED | P0       |
| WEB-011 | SEO Foundation           | REQUIRED | P1       |
| WEB-012 | Accessibility Foundation | REQUIRED | P1       |

---

# 11. ADMIN DASHBOARD CAPABILITY MATRIX

| ID      | Capability              | Status   | Priority |
| ------- | ----------------------- | -------- | -------- |
| ADM-001 | Dashboard Shell         | GAP      | P0       |
| ADM-002 | Overview                | GAP      | P0       |
| ADM-003 | Unit Switcher           | REQUIRED | P0       |
| ADM-004 | Content Management      | GAP      | P1       |
| ADM-005 | Program Management      | GAP      | P0       |
| ADM-006 | Activity Management     | GAP      | P1       |
| ADM-007 | Registration Management | GAP      | P0       |
| ADM-008 | Participant Management  | GAP      | P1       |
| ADM-009 | User Management         | GAP      | P0       |
| ADM-010 | Role Management         | GAP      | P0       |
| ADM-011 | Permission Management   | GAP      | P0       |
| ADM-012 | Media Management        | GAP      | P1       |
| ADM-013 | Reports                 | GAP      | P1       |
| ADM-014 | Settings                | GAP      | P0       |
| ADM-015 | Audit Log               | GAP      | P1       |

---

# 12. DATA MANAGEMENT CAPABILITY

Data lifecycle:

```text
CREATE
   ↓
VALIDATE
   ↓
STORE
   ↓
READ
   ↓
UPDATE
   ↓
ARCHIVE / DELETE
   ↓
AUDIT
```

Required capability:

| ID       | Capability       | Priority |
| -------- | ---------------- | -------- |
| DATA-001 | Data validation  | P0       |
| DATA-002 | Unit ownership   | P0       |
| DATA-003 | CRUD             | P0       |
| DATA-004 | Pagination       | P1       |
| DATA-005 | Search/filter    | P1       |
| DATA-006 | Status/lifecycle | P1       |
| DATA-007 | Audit trail      | P1       |
| DATA-008 | Archive          | P2       |
| DATA-009 | Import/export    | P2       |

---

# 13. REGISTRATION CAPABILITY

Registration is a cross-unit capability.

```text
PUBLIC USER
    ↓
REGISTRATION FORM
    ↓
VALIDATION
    ↓
SUBMISSION
    ↓
DATABASE
    ↓
ADMIN REVIEW
    ↓
STATUS
```

Required:

* registration form;
* validation;
* submission;
* status;
* admin review;
* applicant/participant record;
* auditability.

---

# 14. REPORTING CAPABILITY

Reporting operates at multiple levels.

### Unit level

```text
RQ / PONDOK
   ↓
UNIT REPORT
```

### Organization level

```text
MULTIPLE UNITS
      ↓
ORGANIZATION REPORT
```

Potential metrics:

* programs;
* activities;
* participants;
* registrations;
* active units;
* operational status.

Do not invent metrics before data availability is confirmed.

---

# 15. ACCESS CONTROL GAP

Required hierarchy:

```text
PLATFORM ADMIN
      ↓
ORGANIZATION ADMIN
      ↓
UNIT ADMIN
      ↓
STAFF / OPERATOR
```

Final roles and permissions must be capability-driven.

Core requirements:

* authentication;
* authorization;
* permission checking;
* unit scoping;
* server-side enforcement.

Priority: **P0**

---

# 16. MULTI-TENANT / MULTI-UNIT GAP

This is one of the most important architectural gaps.

Required:

```text
ONE QIMA CORE
      ↓
MULTIPLE UNITS
      ↓
ISOLATED DATA
      ↓
INDEPENDENT IDENTITY
      ↓
INDEPENDENT PUBLIC SITE
```

Required capabilities:

| ID         | Capability                    | Priority |
| ---------- | ----------------------------- | -------- |
| TENANT-001 | Unit registration             | P0       |
| TENANT-002 | Unit identification           | P0       |
| TENANT-003 | Unit data scoping             | P0       |
| TENANT-004 | Unit branding                 | P0       |
| TENANT-005 | Unit admin                    | P0       |
| TENANT-006 | Unit URL                      | P0       |
| TENANT-007 | Custom domain support         | P1       |
| TENANT-008 | Unit capability configuration | P1       |

---

# 17. DEPLOYMENT CAPABILITY

Deployment must support independent public sites.

Concept:

```text
QIMA CORE
   │
   ├── SITE / UNIT A
   ├── SITE / UNIT B
   ├── SITE / UNIT C
   └── SITE / UNIT N
```

Requirements:

* independent URL;
* unit-aware configuration;
* environment separation;
* domain mapping;
* production deployment;
* Cloudflare compatibility.

Priority:

**P0/P1**

Exact technical implementation belongs to Technical Architecture.

---

# 18. CONTENT MANAGEMENT GAP

Required content capabilities:

```text
PAGE
ARTICLE
ANNOUNCEMENT
PROGRAM
ACTIVITY
MEDIA
CONTACT
```

Each content entity must respect unit ownership.

---

# 19. MEDIA MANAGEMENT GAP

Media should be treated as managed assets.

Requirements:

* upload;
* replacement;
* metadata;
* association with unit;
* association with content;
* safe deletion;
* responsive delivery where supported.

Reference images must remain replaceable.

---

# 20. OBSERVABILITY

Future/important capability:

* application errors;
* deployment status;
* health checks;
* logs;
* performance monitoring.

Priority: **P2**

Do not over-engineer initial release.

---

# 21. SECURITY GAP MATRIX

| Capability          | Priority |
| ------------------- | -------- |
| Authentication      | P0       |
| Authorization       | P0       |
| Unit isolation      | P0       |
| Input validation    | P0       |
| Secure sessions     | P0       |
| Secret management   | P0       |
| API protection      | P0       |
| Audit logging       | P1       |
| Rate limiting       | P1       |
| Security monitoring | P2       |

---

# 22. SEO & PUBLIC DISCOVERY

Each public unit should have:

* unique title;
* metadata;
* description;
* canonical URL strategy;
* social sharing metadata;
* sitemap strategy;
* robots strategy.

Priority: **P1**

---

# 23. ACCESSIBILITY

Public-facing interfaces should target practical accessibility fundamentals:

* semantic HTML;
* keyboard navigation;
* sufficient contrast;
* alt text;
* readable typography;
* clear focus states;
* form labels;
* accessible errors.

Priority: **P1**

---

# 24. CAPABILITY PRIORITY STACK

## P0 — FOUNDATION

```text
QIMA Core
Multi-Unit Model
Authentication
Authorization
Unit Isolation
Organization Model
Unit Model
Brand Configuration
Admin Foundation
Public Site Foundation
API
Database
Deployment Identity
```

## P1 — INITIAL PRODUCTION

```text
Programs
Activities
Registration
Participants
Content
Media
Reports
Audit
SEO
Accessibility
Custom Domain
```

## P2 — ENHANCEMENT

```text
Advanced Search
Import/Export
Notifications
Advanced Reporting
Observability
Advanced Media
```

## P3 — FUTURE

Capabilities not required for initial production and not yet
validated against real operational requirements.

---

# 25. MAJOR GAP SUMMARY

The most important gaps identified are:

### GAP-01

QIMA platform abstraction has not yet been fully extracted from
the RQ Blumbang implementation.

### GAP-02

Multi-unit architecture must be explicitly implemented.

### GAP-03

Unit-level data isolation must be enforced.

### GAP-04

Unit-level identity/configuration must be implemented.

### GAP-05

Independent public site/URL architecture must be implemented.

### GAP-06

Admin dashboard is not yet a complete operational system.

### GAP-07

Real CRUD/data management must be connected to the dashboard.

### GAP-08

Role/permission architecture must be enforced server-side.

### GAP-09

Pondok capability set must be modeled separately from RQ.

### GAP-10

Future Rumah Qur'an onboarding must be configuration-driven.

---

# 26. FIRST IMPLEMENTATION PRIORITY

The first implementation should NOT attempt to complete every
capability simultaneously.

Recommended sequence:

```text
1. QIMA CORE
       ↓
2. ORGANIZATION / UNIT MODEL
       ↓
3. AUTH + RBAC
       ↓
4. UNIT BRAND CONFIGURATION
       ↓
5. PUBLIC SITE ENGINE
       ↓
6. ADMIN DASHBOARD
       ↓
7. DATA MANAGEMENT
       ↓
8. RQ BLUMBANG
       ↓
9. PONDOK
       ↓
10. ADDITIONAL RQ UNITS
```

---

# 27. RQ BLUMBANG AS VALIDATION CASE

RQ Blumbang is the first implementation target because an
existing implementation already exists.

Therefore:

```text
EXISTING RQ BLUMBANG
       ↓
AUDIT
       ↓
CAPABILITY GAP
       ↓
GENERALIZE
       ↓
QIMA CORE
       ↓
REIMPLEMENT / RECONCILE
       ↓
RQ BLUMBANG UNIT
```

The objective is not merely to make RQ Blumbang look better.

The objective is to validate whether QIMA's architecture can
support a real unit.

---

# 28. CAPABILITY-TO-MODULE BRIDGE

The next document must translate capability into modules.

Example:

```text
UNIT MANAGEMENT
      ↓
Unit Domain
      ↓
Unit Module
      ↓
Unit API
      ↓
Unit Admin UI
      ↓
Unit Public Configuration
```

Likewise:

```text
PROGRAM MANAGEMENT
      ↓
Program Domain
      ↓
Program Module
      ↓
Program API
      ↓
Program Dashboard
      ↓
Program Public Page
```

---

# 29. TRACEABILITY REQUIREMENT

Every P0/P1 capability must eventually have:

```text
CAPABILITY
↓
DOMAIN
↓
DATA MODEL
↓
MODULE
↓
A