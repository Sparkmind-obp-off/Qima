GASSS 🔥 Kita langsung turun satu level dari Capability Matrix ke **kontrak domain + data + module**. Di sini kita mulai mengunci bagaimana QIMA benar-benar dibentuk secara teknis, tetapi **belum masuk ke implementasi database/API detail**—itu kita kunci di dokumen berikutnya.

# QIMA — CAPABILITY → DATA MODEL → MODULE CONTRACT v1.0

**Document Type:** Domain, Data & Module Contract
**System:** QIMA
**Version:** v1.0
**Status:** BASELINE
**Parent:** QIMA — CAPABILITY GAP MATRIX v1.0
**Primary Objective:** Translate approved QIMA capabilities into domain boundaries, core entities, ownership rules, module responsibilities, service boundaries, and UI/API responsibilities.

---

# 1. PURPOSE

Dokumen ini menjadi jembatan antara:

```text id="qima01"
CAPABILITY
    ↓
DOMAIN
    ↓
ENTITY
    ↓
DATA OWNERSHIP
    ↓
MODULE
    ↓
SERVICE
    ↓
API
    ↓
UI
```

Dokumen ini menetapkan **apa yang dimiliki setiap domain dan module**, bukan implementasi kode final.

---

# 2. CORE ARCHITECTURAL RULE

QIMA menggunakan prinsip:

> **DOMAIN FIRST — MODULE SECOND — IMPLEMENTATION THIRD**

Artinya module tidak boleh dibuat hanya karena kebutuhan UI.

Setiap module harus mempunyai:

* domain responsibility;
* ownership;
* entity;
* business rule;
* service boundary;
* API responsibility;
* UI responsibility;
* authorization boundary.

---

# 3. ORGANIZATIONAL MODEL

Model organisasi:

```text id="qima02"
QIMA PLATFORM
      │
      ▼
ORGANIZATION
      │
      ├── UNIT
      │    ├── PONDOK
      │    ├── RQ BLUMBANG
      │    └── RQ LAINNYA
      │
      └── USERS / ADMINS
```

Relationship:

```text
Organization 1 ─── N Unit
Unit         1 ─── N Domain Records
User         N ─── N Unit
```

Akses user ditentukan melalui role dan permission.

---

# 4. DOMAIN MAP

QIMA dibagi menjadi domain berikut:

```text id="qima03"
┌───────────────────────────────────────┐
│              QIMA CORE                │
├───────────────────────────────────────┤
│ Identity                               │
│ Organization                           │
│ Unit                                   │
│ Access Control                         │
│ Content                                │
│ Program                                │
│ Activity                               │
│ Participant                            │
│ Registration                           │
│ Media                                  │
│ Reporting                              │
│ Audit                                  │
│ Deployment / Site                      │
│ Configuration                          │
└───────────────────────────────────────┘
```

Pondok dan Rumah Qur'an menggunakan domain bersama
sebanyak mungkin, tetapi dapat menambahkan domain-specific
capabilities.

---

# 5. DOMAIN 01 — ORGANIZATION

## Responsibility

Mengelola organisasi/yayasan induk.

Core entity:

```text id="qima04"
Organization
```

Attributes konseptual:

```text
id
name
slug
description
logo
contact
address
status
created_at
updated_at
```

Organization menjadi parent bagi seluruh Unit.

---

# 6. DOMAIN 02 — UNIT

## Responsibility

Mengelola lembaga/unit yang berada di bawah Organization.

Entity:

```text id="qima05"
Unit
```

Attributes konseptual:

```text
id
organization_id
name
slug
type
description
status
logo
contact
address
created_at
updated_at
```

Unit type minimal:

```text
PONDOK
RUMAH_QURAN
```

Future types harus dapat ditambahkan tanpa merombak model.

---

# 7. UNIT TYPE CONTRACT

Unit type menentukan capability set, bukan database terpisah.

Contoh:

```text id="qima06"
PONDOK
 ├── Santri
 ├── Teacher
 ├── Class
 ├── Program
 └── Activity

RUMAH_QURAN
 ├── Participant
 ├── Teacher
 ├── Class
 ├── Program
 └── Activity
```

Shared domain:

* Program
* Activity
* Content
* Registration
* Media
* Reporting

Unit-specific capability dapat ditambahkan melalui
configuration/module activation.

---

# 8. DOMAIN 03 — IDENTITY

Identity memiliki dua lapisan:

### Organization Identity

Mewakili QIMA organization.

### Unit Identity

Mewakili identitas public masing-masing unit.

Entity:

```text id="qima07"
BrandProfile
```

Konseptual:

```text
id
unit_id
logo
favicon
primary_color
secondary_color
font_config
theme_config
hero_config
social_links
created_at
updated_at
```

BrandProfile tidak boleh mengandung data operasional.

---

# 9. DOMAIN 04 — ACCESS CONTROL

Core entities:

```text id="qima08"
User
Role
Permission
UserUnitAssignment
RolePermission
```

Relationship:

```text
User
 ↓
UserUnitAssignment
 ↓
Unit

User
 ↓
Role
 ↓
Permission
```

Authorization harus selalu mempertimbangkan:

```text
USER
+
ROLE
+
PERMISSION
+
UNIT CONTEXT
```

---

# 10. USER CONTRACT

User bertanggung jawab terhadap identity/access.

Minimal:

```text id="qima09"
User
├── id
├── name
├── email / identifier
├── authentication metadata
├── status
├── created_at
└── updated_at
```

Credential sensitif tidak boleh disimpan secara sembarangan.

---

# 11. DOMAIN 05 — CONTENT

Content mengelola informasi public-facing.

Entity konseptual:

```text id="qima10"
Page
Article
Announcement
```

Setiap content harus memiliki ownership context.

Contoh:

```text
organization_id
unit_id
```

Jika content bersifat organization-wide, `unit_id` dapat
bernilai null sesuai contract final.

---

# 12. CONTENT VISIBILITY

Content memiliki visibility/lifecycle.

Konseptual:

```text
DRAFT
  ↓
REVIEW
  ↓
PUBLISHED
  ↓
ARCHIVED
```

Public website hanya boleh menampilkan content yang
memenuhi publishing rules.

---

# 13. DOMAIN 06 — PROGRAM

Entity:

```text id="qima11"
Program
```

Konseptual:

```text
id
unit_id
title
slug
description
status
start_date
end_date
metadata
created_at
updated_at
```

Program merupakan domain operasional lintas unit.

---

# 14. PROGRAM RULE

Program harus selalu memiliki unit owner kecuali
ditetapkan sebagai organization-level program.

Public representation dan administrative management
harus menggunakan domain rules yang sama.

---

# 15. DOMAIN 07 — ACTIVITY

Entity:

```text id="qima12"
Activity
```

Konseptual:

```text
id
unit_id
program_id
title
description
activity_date
status
location
metadata
created_at
updated_at
```

Activity dapat terkait dengan Program tetapi tidak selalu
harus bergantung pada Program apabila business rule
mengizinkannya.

---

# 16. DOMAIN 08 — PARTICIPANT

Participant merupakan generic operational identity untuk
peserta kegiatan/program.

Entity:

```text id="qima13"
Participant
```

Konseptual:

```text
id
unit_id
name
contact
status
metadata
created_at
updated_at
```

Data tambahan yang bersifat khusus Pondok atau RQ tidak
boleh dipaksakan masuk ke core Participant apabila
business semantics berbeda.

---

# 17. DOMAIN 09 — REGISTRATION

Registration merupakan proses pendaftaran.

Entity:

```text id="qima14"
Registration
```

Konseptual:

```text
id
unit_id
program_id
applicant_data
status
submitted_at
reviewed_at
reviewed_by
metadata
created_at
updated_at
```

Lifecycle:

```text
DRAFT
 ↓
SUBMITTED
 ↓
UNDER_REVIEW
 ↓
APPROVED / REJECTED
 ↓
COMPLETED
```

Status final mengikuti kebutuhan domain aktual.

---

# 18. REGISTRATION OWNERSHIP

Registration selalu memiliki:

```text
unit_id
```

sehingga submission tidak dapat berpindah unit secara
sembarangan.

Admin hanya dapat mengelola registration sesuai
permission dan unit scope.

---

# 19. DOMAIN 10 — MEDIA

Media bertanggung jawab terhadap asset digital.

Entity:

```text id="qima15"
MediaAsset
```

Konseptual:

```text
id
unit_id
file_reference
type
title
alt_text
metadata
status
created_at
updated_at
```

Media dapat digunakan oleh:

* Page;
* Article;
* Program;
* Activity;
* BrandProfile;
* Gallery.

---

# 20. REFERENCE ASSET CONTRACT

Reference image harus dapat dibedakan dari production asset.

Konseptual:

```text
MediaAsset.status

REFERENCE
ACTIVE
ARCHIVED
```

Reference asset tidak boleh dianggap sebagai official final
asset tanpa approval.

---

# 21. DOMAIN 11 — REPORTING

Reporting tidak boleh membuat duplicate operational data.

Reporting membaca domain data.

Architecture:

```text
PROGRAM
ACTIVITY
REGISTRATION
PARTICIPANT
       ↓
REPORTING SERVICE
       ↓
UNIT REPORT
       ↓
ORGANIZATION REPORT
```

Report dapat berada pada:

```text
UNIT LEVEL
ORGANIZATION LEVEL
```

---

# 22. DOMAIN 12 — AUDIT

Entity:

```text id="qima16"
AuditLog
```

Konseptual:

```text
id
actor_id
unit_id
action
resource_type
resource_id
previous_state
new_state
timestamp
metadata
```

AuditLog bersifat append-oriented.

Admin biasa tidak boleh memodifikasi audit history.

---

# 23. DOMAIN 13 — SITE / DEPLOYMENT

Public site identity harus dipisahkan dari core organization
data.

Entity konseptual:

```text id="qima17"
Site
DomainMapping
```

Site:

```text
id
unit_id
site_identifier
status
configuration
```

DomainMapping:

```text
id
site_id
hostname
type
status
```

---

# 24. DOMAIN 14 — CONFIGURATION

Configuration memungkinkan unit mengaktifkan capability.

Entity konseptual:

```text id="qima18"
UnitCapability
UnitConfiguration
```

Contoh:

```text
RQ BLUMBANG
 ├── Programs = ON
 ├── Activities = ON
 ├── Registration = ON
 ├── Gallery = ON
 └── Advanced Reporting = OFF
```

Pondok dapat mempunyai capability berbeda.

---

# 25. CORE MODULE MAP

Domain diimplementasikan melalui module:

```text id="qima19"
modules/
│
├── identity/
├── organization/
├── units/
├── access/
├── content/
├── programs/
├── activities/
├── participants/
├── registrations/
├── media/
├── reporting/
├── audit/
├── sites/
└── configuration/
```

Struktur final repository akan ditentukan pada
Implementation Contract.

---

# 26. MODULE CONTRACT — ORGANIZATION

Responsibility:

* organization CRUD;
* organization profile;
* organization administration;
* organization-level configuration.

Input:

* organization data.

Output:

* organization entity;
* organization summary.

Must NOT:

* directly manage unit operational data without invoking
  appropriate domain/service boundary.

---

# 27. MODULE CONTRACT — UNITS

Responsibility:

* create unit;
* update unit;
* activate/deactivate unit;
* configure unit;
* assign unit administrators.

Must enforce:

```text
organization ownership
+
authorization
```

---

# 28. MODULE CONTRACT — ACCESS

Responsibility:

* authentication;
* session;
* roles;
* permissions;
* authorization checks.

This module is security-critical.

No UI-only permission enforcement.

---

# 29. MODULE CONTRACT — CONTENT

Responsibility:

* page management;
* article management;
* announcement management;
* publishing lifecycle.

Must respect:

```text
organization scope
unit scope
publication status
```

---

# 30. MODULE CONTRACT — PROGRAMS

Responsibility:

* create program;
* update program;
* publish program;
* archive program;
* retrieve public program.

Program ownership:

```text
unit_id
```

---

# 31. MODULE CONTRACT — ACTIVITIES

Responsibility:

* activity CRUD;
* program relationship;
* schedule;
* location;
* public activity representation.

---

# 32. MODULE CONTRACT — REGISTRATION

Responsibility:

* public registration;
* validation;
* submission;
* review;
* status;
* applicant management.

This module must never bypass authorization for admin actions.

---

# 33. MODULE CONTRACT — PARTICIPANTS

Responsibility:

* participant records;
* participant status;
* participant relationship to programs/activities.

---

# 34. MODULE CONTRACT — MEDIA

Responsibility:

* upload;
* metadata;
* association;
* replacement;
* archive;
* retrieval.

Must support reference → production asset transition.

---

# 35. MODULE CONTRACT — REPORTING

Responsibility:

* aggregation;
* filtering;
* unit reports;
* organization summaries.

Reporting should not mutate operational domain data.

---

# 36. MODULE CONTRACT — AUDIT

Responsibility:

* capture important administrative actions;
* retrieve audit records according to permission.

Must not expose sensitive credentials.

---

# 37. MODULE CONTRACT — SITES

Responsibility:

* site registration;
* site configuration;
* URL/hostname mapping;
* site status.

Must connect:

```text
SITE
 ↓
UNIT
 ↓
BRAND
 ↓
CONTENT
```

---

# 38. MODULE CONTRACT — CONFIGURATION

Responsibility:

* unit capability activation;
* theme configuration;
* feature configuration;
* operational configuration.

Configuration must not become an uncontrolled storage
for arbitrary business data.

---

# 39. SERVICE BOUNDARY

Service boundaries follow domain responsibilities.

Example:

```text
UnitService
ProgramService
ActivityService
RegistrationService
ParticipantService
ContentService
MediaService
ReportingService
AuditService
SiteService
```

A service should not directly manipulate another domain's
internal state without an explicit contract.

---

# 40. API BOUNDARY

API routes expose domain capabilities.

Conceptual:

```text
/api/v1/organizations
/api/v1/units
/api/v1/users
/api/v1/roles
/api/v1/content
/api/v1/programs
/api/v1/activities
/api/v1/participants
/api/v1/registrations
/api/v1/media
/api/v1/reports
/api/v1/audit
/api/v1/sites
```

Exact methods, payloads, validation, error contracts and
authorization will be specified in the API Contract document.

---

# 41. UI BOUNDARY

UI must consume domain/service contracts.

Public:

```text
Home
About
Programs
Activities
Registration
Announcements
Media
Contact
```

Admin:

```text
Dashboard
Units
Content
Programs
Activities
Registrations
Participants
Media
Reports
Users
Roles
Settings
Audit
```

UI must not bypass service/API contracts to manipulate
database state directly.

---

# 42. ADMIN CONTEXT

Every administrative request must establish:

```text
USER
 ↓
ORGANIZATION
 ↓
UNIT
 ↓
ROLE
 ↓
PERMISSION
 ↓
ACTION
```

Example:

```text
RQ Blumbang Admin
    ↓
RQ Blumbang
    ↓
Program Manager
    ↓
program.update
    ↓
Program A
```

Cross-unit access requires explicit permission.

---

# 43. DATA ISOLATION CONTRACT

Mandatory rule:

> A unit-scoped request must never return data belonging to
> another unit unless the caller has explicit cross-unit
> authorization.

This rule applies to:

* API;
* service;
* database queries;
* admin dashboard;
* reporting;
* exports.

---

# 44. ORGANIZATION VS UNIT DATA

### Organization-level

Examples:

* organization profile;
* organization identity;
* organization-wide configuration;
* cross-unit reporting.

### Unit-level

Examples:

* programs;
* activities;
* participants;
* registrations;
* local content;
* local media.

The system must not confuse the two scopes.

---

# 45. PONDOK EXTENSION CONTRACT

Pondok may extend the core model.

Potential entities:

```text
Santri
Class
Teacher
Dormitory
```

These are NOT automatically core entities.

They become Pondok-specific modules if validated by actual
requirements.

---

# 46. RUMAH QUR'AN EXTENSION CONTRACT

RQ may extend the core model.

Potential entities:

```text
Teacher
Class
Participant
LearningGroup
```

Again, only validated requirements become mandatory.

---

# 47. RQ BLUMBANG IMPLEMENTATION CONTRACT

RQ Blumbang must consume QIMA core rather than create a
parallel architecture.

Conceptually:

```text
QIMA CORE
   ↓
RQ UNIT CONFIG
   ↓
RQ BLUMBANG BRAND
   ↓
RQ BLUMBANG CONTENT
   ↓
RQ BLUMBANG SITE
```

Existing RQ-IBL code must be audited before extraction,
generalization or replacement.

---

# 48. DEPLOYMENT CONTRACT

Deployment identity:

```text
QIMA CORE
    ↓
SITE
    ↓
UNIT
    ↓
HOSTNAME
```

A unit may have:

```text
platform URL
```

and later:

```text
custom domain
```

Example conceptual:

```text
rqblumbang.platform-domain
```

or:

```text
rqblumbang.custom-domain
```

Exact domain infrastructure belongs to Technical
Architecture.

---

# 49. MODULE DEPENDENCY RULE

Dependency direction:

```text
UI
 ↓
API
 ↓
APPLICATION/SERVICE
 ↓
DOMAIN
 ↓
DATA ACCESS
```

Avoid:

```text
UI
 ↓
DATABASE
```

or:

```text
Module A
 ↓
Module B internals
```

Use explicit contracts.

---

# 50. DOMAIN EVENT POSSIBILITY

Future architecture may support domain events such as:

```text
UnitCreated
ProgramPublished
RegistrationSubmitted
RegistrationApproved
ActivityCreated
ContentPublished
```

Events are not mandatory for v1 unless required by actual
implementation.

---

# 51. DATA LIFECYCLE

Core lifecycle:

```text
CREATE
 ↓
VALIDATE
 ↓
STORE
 ↓
PUBLISH / ACTIVATE
 ↓
UPDATE
 ↓
ARCHIVE
```

Delete behavior must be determined per domain.

Never apply hard-delete universally.

---

# 52. TRACEABILITY MATRIX

| Capability              | Domain        | Module                 | Priority |
| ----------------------- | ------------- | ---------------------- | -------- |
| Organization Management | Organization  | organization           | P0       |
| Unit Management         | Unit          | units                  | P0       |
| Authentication          | Access        | access                 | P0       |
| Authorization           | Access        | access                 | P0       |
| Branding                | Identity      | identity/configuration | P0       |
| Content                 | Content       | content                | P1       |
| Programs                | Program       | programs               | P0       |
| Activities              | Activity      | activities             | P1       |
| Participants            | Participant   | participants           | P1       |
| Registration            | Registration  | registrations          | P1       |
| Media                   | Media         | media                  | P1       |
| Reporting               | Reporting     | reporting              | P1       |
| Audit                   | Audit         | audit                  | P1       |
| Site URL                | Site          | sites                  | P0       |
| Custom Domain           | Site          | sites                  | P1       |
| Capability Toggle       | Configuration | configuration          | P1       |

---

# 53. CONTRACT RULES

Every future module must define:

```text
1. PURPOSE
2. DOMAIN OWNER
3. ENTITIES
4. DATA OWNERSHIP
5. BUSINESS RULES
6. SERVICE BOUNDARY
7. API CONTRACT
8. UI CONTRACT
9. AUTHORIZATION
10. AUDIT REQUIREMENTS
11. TEST REQUIREMENTS
```

A module that cannot define these boundaries is not ready
for implementation.

---

# 54. NON-GOALS

This document does not yet finalize:

* SQL schema;
* indexes;
* foreign key implementation;
* REST payload schemas;
* authentication provider;
* Cloudflare implementation;
* exact repository folders;
* final React/UI component hierarchy;
* final role matrix;
* detailed test cases.

Those belong to subsequent documents.

---

# 55. BASELINE DECISIONS

The following are now baseline decisions:

### DECISION 01

QIMA uses a shared platform core.

### DECISION 02

Organization and Unit are separate concepts.

### DECISION 03

RQ Blumbang is a Unit, not the platform root.

### DECISION 04

Pondok is a separate Unit type.

### DECISION 05

Unit-scoped data must be isolated.

### DECISION 06

Brand identity is configurable per Unit.

### DECISION 07

Public site identity is associated with a Unit.

### DECISION 08

Each Unit can have an independent URL.

### DECISION 09

Custom domain support is a platform capability.

### DECISION 10

Admin access is permission + unit scoped.

### DECISION 11

Reference assets are replaceable and are not automatically
final production assets.

### DECISION 12

Domain boundaries must precede implementation structure.

---

# 56. NEXT DOCUMENT

## QIMA — MODULE COMPOSITION & USER JOURNEY CONTRACT v1.0

Next we will define:

```text
DOMAIN
 ↓
MODULE COMPOSITION
 ↓
USER ROLE
 ↓
USER JOURNEY
 ↓
SCREEN
 ↓
ACTION
 ↓
API
 ↓
DATA
```

Primary journeys:

1. Public visitor
2. Registration applicant
3. Unit administrator
4. Organization administrator
5. Platform administrator
6. Content operator
7. Program operator
8. Reporting user
9. Future Pondok operator

---

# STATUS

**QIMA — CAPABILITY → DATA MODEL → MODULE CONTRACT v1.0**

STATUS: **BASELINE COMPLETE**

ARCHITECTURAL POSITION:

**QIMA CORE → ORGANIZATION → UNIT → DOMAIN → MODULE**

FIRST REFERENCE UNIT:

**R