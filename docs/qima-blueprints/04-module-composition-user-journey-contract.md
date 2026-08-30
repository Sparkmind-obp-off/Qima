GASSS 🔥 Kita lanjut **DOC 04**. Ini mengunci komposisi module dan alur pengguna, supaya nanti GenSpark tidak membangun halaman secara acak, tetapi mengikuti kontrak QIMA.

# QIMA — MODULE COMPOSITION & USER JOURNEY CONTRACT v1.0

**Document Type:** Module Composition & User Journey Specification
**System:** QIMA
**Version:** v1.0
**Status:** BASELINE
**Parent:** QIMA — CAPABILITY → DATA MODEL → MODULE CONTRACT v1.0

---

# 1. PURPOSE

Dokumen ini menetapkan bagaimana QIMA digunakan oleh setiap
jenis pengguna.

Fokus:

```text
USER ROLE
    ↓
JOURNEY
    ↓
SCREEN
    ↓
ACTION
    ↓
MODULE
    ↓
SERVICE/API
    ↓
DATA
```

Tujuan utamanya adalah memastikan bahwa:

> setiap capability QIMA memiliki jalur penggunaan yang jelas
> dari pengguna sampai ke data.

---

# 2. CORE UX PRINCIPLE

QIMA bukan sekadar kumpulan halaman.

QIMA harus terasa sebagai:

> **satu platform dengan pengalaman yang berbeda sesuai
> konteks pengguna dan unit.**

Karena itu:

```text
SAME CORE
   +
DIFFERENT ROLE
   +
DIFFERENT UNIT
   +
DIFFERENT PERMISSION
   =
DIFFERENT EXPERIENCE
```

---

# 3. EXPERIENCE LAYERS

QIMA memiliki tiga experience layer utama.

```text
┌──────────────────────────────┐
│ PUBLIC EXPERIENCE            │
│ Website / Information        │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ OPERATIONAL EXPERIENCE       │
│ Unit Dashboard               │
└──────────────┬───────────────┘
               ↓
┌──────────────────────────────┐
│ GOVERNANCE EXPERIENCE        │
│ Organization / Platform      │
└──────────────────────────────┘
```

---

# 4. ROLE MODEL

Minimum role hierarchy:

```text
PLATFORM ADMIN
      ↓
ORGANIZATION ADMIN
      ↓
UNIT ADMIN
      ↓
OPERATOR
      ↓
PUBLIC USER
```

Role bukan hanya menentukan menu.

Role menentukan:

* accessible module;
* allowed action;
* data scope;
* approval authority;
* administrative visibility.

---

# 5. PUBLIC USER

Public user tidak membutuhkan authentication untuk
mengakses public information kecuali fitur tertentu
membutuhkan account.

Primary objective:

> menemukan informasi dan melakukan tindakan publik
> seperti registrasi atau menghubungi lembaga.

---

# 6. PUBLIC USER JOURNEY

```text
LANDING PAGE
    ↓
EXPLORE UNIT
    ↓
VIEW PROGRAM
    ↓
VIEW ACTIVITY
    ↓
READ INFORMATION
    ↓
REGISTER / CONTACT
```

Public user tidak boleh melihat:

* admin dashboard;
* private participant data;
* internal reports;
* audit logs;
* administrative settings.

---

# 7. PUBLIC SITE INFORMATION ARCHITECTURE

Minimum:

```text
/
├── Tentang
├── Program
├── Kegiatan
├── Informasi / Berita
├── Pendaftaran
├── Media
└── Kontak
```

Navigation dapat berbeda per unit berdasarkan
capability configuration.

---

# 8. UNIT ADMIN

Unit Admin adalah pengguna operasional utama sebuah
Rumah Qur'an atau Pondok.

Primary objective:

> mengelola seluruh aktivitas unit yang menjadi tanggung
> jawabnya.

---

# 9. UNIT ADMIN JOURNEY

```text
LOGIN
  ↓
UNIT DASHBOARD
  ↓
VIEW OVERVIEW
  ↓
MANAGE DATA
  ↓
PUBLISH / UPDATE
  ↓
REVIEW
  ↓
REPORT
```

Unit Admin tidak otomatis dapat mengakses unit lain.

---

# 10. UNIT DASHBOARD

Dashboard minimal:

```text
┌──────────────────────────────────┐
│ UNIT HEADER                      │
│ Logo + Unit Name                 │
├──────────────────────────────────┤
│ Overview                         │
│                                  │
│ Programs     Activities          │
│ Registrations Participants       │
│                                  │
├──────────────────────────────────┤
│ Recent Activity                  │
├──────────────────────────────────┤
│ Pending Actions                  │
└──────────────────────────────────┘
```

Dashboard harus berbasis data aktual.

Tidak boleh menggunakan angka dummy pada production.

---

# 11. DASHBOARD MODULE COMPOSITION

```text
Dashboard
│
├── Overview
├── Quick Actions
├── Recent Activity
├── Pending Registration
├── Content Status
└── Unit Health / Status
```

Widget hanya ditampilkan apabila capability terkait aktif.

---

# 12. PROGRAM OPERATOR

Program Operator fokus pada pengelolaan program.

Journey:

```text
PROGRAM LIST
   ↓
CREATE / EDIT
   ↓
CONFIGURE
   ↓
SAVE DRAFT
   ↓
PUBLISH
   ↓
PUBLIC DISPLAY
```

Actions:

* create;
* edit;
* view;
* publish;
* archive.

Permission harus diverifikasi sebelum action.

---

# 13. ACTIVITY OPERATOR

Journey:

```text
ACTIVITY
   ↓
CREATE
   ↓
SET DATE / LOCATION
   ↓
ASSOCIATE PROGRAM
   ↓
PUBLISH
   ↓
PUBLIC DISPLAY
```

---

# 14. REGISTRATION OPERATOR

Journey:

```text
REGISTRATION INBOX
       ↓
VIEW SUBMISSION
       ↓
VALIDATE
       ↓
REVIEW
       ↓
APPROVE / REJECT
       ↓
STATUS UPDATE
```

Operator hanya dapat melakukan action yang diberikan
permission.

---

# 15. CONTENT OPERATOR

Journey:

```text
CONTENT LIST
    ↓
CREATE
    ↓
EDIT
    ↓
PREVIEW
    ↓
PUBLISH
    ↓
UPDATE / ARCHIVE
```

Content lifecycle:

```text
DRAFT → REVIEW → PUBLISHED → ARCHIVED
```

Tidak semua role memiliki hak publish.

---

# 16. MEDIA OPERATOR

Journey:

```text
MEDIA LIBRARY
    ↓
UPLOAD
    ↓
ADD METADATA
    ↓
ASSOCIATE
    ↓
USE IN CONTENT
```

Reference asset:

```text
REFERENCE
   ↓
ADAPT / REPLACE
   ↓
APPROVED
   ↓
PRODUCTION
```

---

# 17. ORGANIZATION ADMIN

Organization Admin melihat organisasi secara keseluruhan.

Primary objective:

> mengelola unit, administrator, configuration dan
> monitoring lintas unit.

Journey:

```text
LOGIN
 ↓
ORGANIZATION DASHBOARD
 ↓
VIEW UNITS
 ↓
SELECT UNIT
 ↓
MANAGE / MONITOR
 ↓
REPORT
```

---

# 18. ORGANIZATION DASHBOARD

```text
Organization
│
├── Overview
├── Units
├── Unit Status
├── Organization Reports
├── Administrators
└── Organization Settings
```

Cross-unit data harus aggregated melalui reporting/service
layer.

---

# 19. UNIT SWITCHER

Organization Admin dapat memilih unit:

```text
[ Organization ]
       ↓
[ Select Unit ]
       ↓
RQ Blumbang
RQ Unit 02
RQ Unit 03
Pondok
...
```

Setelah unit dipilih:

> seluruh context operasional harus berpindah ke unit tersebut.

---

# 20. UNIT CONTEXT CONTRACT

Setiap dashboard request harus memiliki context:

```text
user_id
organization_id
unit_id
role
permissions
```

Tidak boleh hanya mengandalkan `unit_id` dari frontend.

Backend harus memverifikasi context.

---

# 21. PLATFORM ADMIN

Platform Admin mengelola infrastructure-level concerns.

Scope:

```text
Platform
├── Organizations
├── Units
├── Users
├── Roles
├── Permissions
├── Sites
├── System Configuration
└── Audit
```

Platform Admin bukan berarti otomatis menjadi
operator setiap unit dalam UX sehari-hari.

---

# 22. PLATFORM ADMIN JOURNEY

```text
LOGIN
 ↓
PLATFORM DASHBOARD
 ↓
ORGANIZATIONS
 ↓
SELECT ORGANIZATION
 ↓
UNITS
 ↓
CONFIGURATION
 ↓
SECURITY / ACCESS
 ↓
AUDIT
```

---

# 23. ORGANIZATION ONBOARDING JOURNEY

Untuk menambahkan yayasan baru:

```text
CREATE ORGANIZATION
       ↓
ORGANIZATION PROFILE
       ↓
CREATE UNIT
       ↓
SELECT UNIT TYPE
       ↓
CONFIGURE CAPABILITIES
       ↓
ASSIGN ADMIN
       ↓
CONFIGURE BRAND
       ↓
CREATE SITE
       ↓
DEPLOY
```

---

# 24. UNIT ONBOARDING

Contoh Rumah Qur'an baru:

```text
NEW UNIT
  ↓
Name
  ↓
Type = RUMAH_QURAN
  ↓
Brand
  ↓
Capabilities
  ↓
Admin
  ↓
Content
  ↓
Site
  ↓
Publish
```

Tidak boleh memerlukan cloning manual seluruh application.

---

# 25. RQ BLUMBANG JOURNEY

RQ Blumbang menjadi first real-world implementation.

```text
QIMA CORE
    ↓
RQ BLUMBANG UNIT
    ↓
BRAND CONFIGURATION
    ↓
CONTENT
    ↓
PROGRAM
    ↓
ACTIVITY
    ↓
REGISTRATION
    ↓
ADMIN DASHBOARD
    ↓
PUBLIC SITE
```

---

# 26. PONDOK JOURNEY

Pondok menggunakan core yang sama:

```text
QIMA CORE
    ↓
PONDOK UNIT
    ↓
PONDOK CAPABILITIES
    ↓
PONDOK ADMIN
    ↓
PONDOK PUBLIC SITE
```

Pondok-specific modules hanya diaktifkan apabila diperlukan.

---

# 27. MULTI-RUMAH-QUR'AN JOURNEY

Target:

```text
ORGANIZATION
│
├── RQ BLUMBANG
├── RQ 02
├── RQ 03
├── RQ 04
├── ...
└── RQ 10
```

Setiap unit memiliki:

* identity;
* content;
* admin;
* data;
* site;
* URL.

Core tetap shared.

---

# 28. PUBLIC REGISTRATION JOURNEY

```text
PUBLIC SITE
    ↓
PROGRAM
    ↓
DAFTAR
    ↓
FORM
    ↓
VALIDATE
    ↓
SUBMIT
    ↓
CONFIRMATION
```

Data masuk ke unit yang tepat berdasarkan server-side
context.

---

# 29. ADMIN REGISTRATION JOURNEY

```text
ADMIN
 ↓
REGISTRATION
 ↓
INBOX
 ↓
OPEN SUBMISSION
 ↓
REVIEW
 ↓
DECISION
 ↓
STATUS
```

---

# 30. CONTENT PUBLISHING JOURNEY

```text
OPERATOR
 ↓
CREATE CONTENT
 ↓
DRAFT
 ↓
PREVIEW
 ↓
REVIEW
 ↓
PUBLISH
 ↓
PUBLIC SITE
```

Publishing harus menjadi explicit action.

---

# 31. BRAND CONFIGURATION JOURNEY

```text
UNIT SETTINGS
      ↓
BRAND
      ↓
LOGO
      ↓
COLOR
      ↓
TYPOGRAPHY
      ↓
HERO
      ↓
BACKGROUND
      ↓
PREVIEW
      ↓
PUBLISH
```

Reference screenshots dapat digunakan sebagai visual
reference, tetapi tidak dianggap sebagai final asset.

---

# 32. VISUAL ADAPTATION CONTRACT

Ketika aset referensi diberikan:

```text
REFERENCE
    ↓
ANALYZE
    ↓
CROP / RESIZE
    ↓
COMPOSITION
    ↓
LIGHT / CONTRAST ADJUSTMENT
    ↓
RESPONSIVE ADAPTATION
    ↓
PREVIEW
```

Implementasi visual harus mempertahankan:

* subject integrity;
* brand identity;
* readability;
* responsive composition.

Jangan sekadar menempelkan screenshot mentah.

---

# 33. SITE EXPERIENCE CONTRACT

Setiap Unit Site harus mengikuti:

```text
QIMA DESIGN SYSTEM
        +
UNIT BRAND CONFIG
        +
UNIT CONTENT
        =
UNIT PUBLIC EXPERIENCE
```

Jadi setiap site:

> berbeda secara identitas, tetapi konsisten secara
> platform behavior.

---

# 34. MODULE COMPOSITION

Core modules:

```text
CORE
├── Identity
├── Organization
├── Units
├── Access
├── Configuration
└── Sites

OPERATIONS
├── Content
├── Programs
├── Activities
├── Participants
├── Registrations
└── Media

GOVERNANCE
├── Reporting
└── Audit
```

---

# 35. MODULE ACTIVATION

Tidak semua module harus aktif pada semua unit.

```text
Unit
 ↓
Capability Configuration
 ↓
Enabled Modules
```

Contoh:

### RQ

```text
Programs       ON
Activities     ON
Registration   ON
Gallery        ON
Advanced Pondok ON = OFF
```

### Pondok

```text
Programs       ON
Activities     ON
Registration   ON
Santri         ON
Dormitory      optional
```

---

# 36. SCREEN-TO-MODULE CONTRACT

Setiap screen harus memiliki module owner.

| Screen             | Module                 |
| ------------------ | ---------------------- |
| Public Home        | Sites + Content        |
| About              | Content                |
| Programs           | Programs               |
| Program Detail     | Programs               |
| Activities         | Activities             |
| Registration       | Registrations          |
| Registration Inbox | Registrations          |
| Participants       | Participants           |
| Media              | Media                  |
| Dashboard          | Reporting + Operations |
| Users              | Access                 |
| Roles              | Access                 |
| Units              | Units                  |
| Brand              | Identity/Configuration |
| Site Settings      | Sites                  |
| Audit              | Audit                  |

---

# 37. ACTION-TO-API CONTRACT

UI action harus memiliki backend contract.

Contoh:

```text
Create Program
      ↓
POST /programs
      ↓
ProgramService.create()
      ↓
Program domain validation
      ↓
Database
      ↓
Audit
```

Bukan:

```text
Button
 ↓
Direct database mutation
```

---

# 38. ERROR JOURNEY

Error harus memiliki UX yang jelas.

```text
ACTION
 ↓
VALIDATION
 ├── SUCCESS
 │      ↓
 │   RESULT
 │
 └── ERROR
        ↓
     EXPLAIN
        ↓
     RECOVER
```

User harus memahami:

* apa yang gagal;
* mengapa gagal;
* apa yang dapat dilakukan berikutnya.

---

# 39. EMPTY STATE

Setiap data screen harus memiliki empty state.

Contoh:

```text
Belum ada program.

[ + Tambah Program ]
```

Jangan menggunakan fake data untuk mengisi empty state
production.

---

# 40. LOADING STATE

Setiap asynchronous operation harus memiliki:

* loading;
* success;
* error;
* retry/recovery.

---

# 41. RESPONSIVE JOURNEY

QIMA public site harus:

```text
MOBILE FIRST
      ↓
TABLET
      ↓
DESKTOP
```

Admin dashboard:

```text
DESKTOP PRIMARY
      +
RESPONSIVE SUPPORT
```

---

# 42. NAVIGATION CONTRACT

Public navigation harus sederhana.

Admin navigation berdasarkan capability:

```text
Dashboard

Operations
├── Programs
├── Activities
├── Registrations
├── Participants
└── Content

Media

Reports

Administration
├── Users
├── Roles
├── Units
└── Settings
```

Menu yang tidak diizinkan tidak boleh sekadar disembunyikan
di frontend; backend tetap harus melakukan authorization.

---

# 43. CROSS-UNIT JOURNEY

Organization Admin:

```text
Organization Dashboard
       ↓
Unit Overview
       ↓
Select Unit
       ↓
Unit Context
       ↓
Operational Module
```

Cross-unit reporting:

```text
Organization
 ↓
Reports
 ↓
Select Scope
 ├── All Units
 └── Specific Unit
```

---

# 44. AUDIT JOURNEY

Administrative action:

```text
USER
 ↓
ACTION
 ↓
AUTHORIZATION
 ↓
SERVICE
 ↓
DATA CHANGE
 ↓
AUDIT EVENT
```

Audit tidak boleh bergantung pada frontend.

---

# 45. SITE DEPLOYMENT JOURNEY

```text
UNIT CREATED
     ↓
SITE CONFIGURED
     ↓
BRAND CONFIGURED
     ↓
CONTENT READY
     ↓
SITE BUILD
     ↓
DEPLOY
     ↓
PLATFORM URL
     ↓
CUSTOM DOMAIN (OPTIONAL)
```

---

# 46. INDEPENDENT URL CONTRACT

Setiap unit harus dapat mempunyai public URL sendiri.

Concept:

```text
QIMA
│
├── Unit A → URL A
├── Unit B → URL B
├── Unit C → URL C
└── Unit N → URL N
```

Deployment identity harus tetap terhubung dengan
`unit_id`.

---

# 47. USER JOURNEY TRACEABILITY

| Journey                 | Main Modules                  |
| ----------------------- | ----------------------------- |
| Public Explore          | Sites, Content                |
| Public Registration     | Sites, Programs, Registration |
| Unit Administration     | Units, Operations             |
| Program Management      | Programs                      |
| Activity Management     | Activities                    |
| Content Publishing      | Content                       |
| Media Management        | Media                         |
| Organization Management | Organization, Units           |
| Access Management       | Access                        |
| Reporting               | Reporting                     |
| Audit                   | Audit                         |
| Site Management         | Sites, Configuration          |

---

# 48. CRITICAL UX RULES

### RULE 01

User harus selalu tahu sedang berada di unit mana.

### RULE 02

Admin tidak boleh secara tidak sengaja mencampur data
antar unit.

### RULE 03

Capability yang disabled tidak boleh menghasilkan
broken navigation.

### RULE 04

Public site tidak boleh mengekspos administrative data.

### RULE 05

UI tidak boleh menjadi sumber authorization.

### RULE 06

Semua mutation melalui domain/service contract.

### RULE 07

Reference asset tidak dianggap final asset.

### RULE 08

Empty state lebih baik daripada dummy production data.

### RULE 09

Setiap async operation memiliki loading/success/error state.

### RULE 10

Setiap unit memiliki identity tetapi tetap mengikuti
platform consistency.

---

# 49. IMPLEMENTATION TRACE

Setiap user journey harus akhirnya dapat ditelusuri:

```text
USER
 ↓
JOURNEY
 ↓
SCREEN
 ↓
ACTION
 ↓
MODULE
 ↓
SERVICE
 ↓
API
 ↓
DOMAIN
 ↓
ENTITY
 ↓
DATABASE
```

Jika salah satu hubungan tidak jelas:

> journey belum siap diimplementasikan.

---

# 50. BASELINE USER JOURNEYS

QIMA v1.0 mengunci minimum:

1. Public Visitor Journey
2. Public Registration Journey
3. Unit Admin Journey
4. Program Operator Journey
5. Activity Operator Journey
6. Registration Operator Journey
7. Content Operator Journey
8. Media Operator Journey
9. Organization Admin Journey
10. Platform Admin Journey
11. Unit Onboarding Journey
12. Site Deployment Journey
13. Brand Configuration Journey
14. Cross-Unit Reporting Journey

---

# 51. QIMA UX ARCHITECTURE PRINCIPLE

QIMA harus menghasilkan:

```text
ONE PLATFORM
      ↓
MULTIPLE ORGANIZATIONS
      ↓
MULTIPLE UNITS
      ↓
MULTIPLE EXPERIENCES
      ↓
ONE GOVERNED CORE
```

Bukan:

```text
ONE PROJECT
 ↓
CLONE
 ↓
EDIT
 ↓
DEPLOY
 ↓
REPEAT
```

---

# 52. BASELINE DECISIONS

### DECISION 01

Public experience dan administrative experience
dipisahkan.

### DECISION 02

Unit context adalah bagian fundamental dari UX.

### DECISION 03

Capability configuration menentukan module visibility
dan availability.

### DECISION 04

Authorization selalu server-side.

### DECISION 05

RQ Blumbang menjadi first validation journey.

### DECISION 06

Pondok menggunakan core QIMA dengan extension capability.

### DECISION 07

Setiap Unit dapat memiliki public site sendiri.

### DECISION 08

Brand identity dapat berbeda antar Unit.

### DECISION 09

UX consistency berasal dari QIMA Design System.

### DECISION 10

Data ownership tetap mengikuti domain contract.

---

# 53. NEXT DOCUMENT

## QIMA — TECHNICAL ARCHITECTURE & IMPLEMENTATION BLUEPRINT v1.0

Dokumen berikutnya akan mengubah contract ini menjadi
arsitektur teknis:

```text
USER JOURNEY
      ↓
APPLICATION
      ↓
MODULE
      ↓
SERVICE
      ↓
API
      ↓
DATABASE
      ↓
DEPLOYMENT
```

Akan mencakup:

* application architecture;
* repository architecture;
* frontend/backend boundary;
* service boundary;
* API layer;
* database layer;
* authentication;
* authorization;
* multi-unit isolation;
* deployment model;
* Cloudflare architecture;
* environment strategy;
* observability;
* security baseline.

---

# STATUS

**QIMA — MODULE COMPOSITION & USER JOURNEY CONTRACT v1.0**

**STATUS: BASELINE COMPLETE**

QIMA sekarang memiliki:

```text
MASTER PLATFORM
      ↓
CAPABILITY
      ↓
DATA MODEL
      ↓
MODULE
      ↓
USER JOURNEY
      ↓
SCREEN
      ↓
ACTION
```

**NEXT:**

`QIMA — TECHNICAL ARCHITECTURE & IMPLEMENTATION BLUEPRINT v1.0`

END OF DOCUMENT
