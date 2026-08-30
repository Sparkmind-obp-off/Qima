QIMA — DATABASE SCHEMA, API CONTRACT & DOMAIN SPECIFICATION v1.0

Status: Draft — Architecture Baseline
Version: 1.0
System: QIMA
Reference Implementation: RQBL / Rumah Qur'an
Architecture: Multi-Organization / Multi-Unit / Multi-Site
API Base: /api/v1

1. PURPOSE

Dokumen ini mendefinisikan kontrak teknis QIMA pada tiga lapisan utama:

Domain Specification
Database Schema
API Contract

Dokumen ini menjadi referensi bersama untuk:

Backend implementation
Database migration
API development
Frontend/Admin integration
Authorization
Reporting
Audit
Testing
Future vertical/unit expansion

Dokumen ini tidak mendefinisikan detail UI visual.

2. CORE DOMAIN MODEL

Model hierarki utama QIMA:

QIMA
│
├── Organization
│   │
│   ├── Unit
│   │   │
│   │   ├── Site / Deployment
│   │   │
│   │   ├── Programs
│   │   ├── Activities
│   │   ├── Registrations
│   │   ├── Participants
│   │   ├── Content
│   │   └── Reports
│   │
│   ├── Users
│   └── Organization Configuration
│
└── Platform Configuration
2.1 Organization

Organization adalah root ownership boundary.

Contoh:

Organization
└── RQBL

Organization dapat memiliki banyak Unit.

2.2 Unit

Unit adalah operational boundary.

Contoh:

RQBL
│
├── Pondok Pesantren
├── Rumah Qur'an A
├── Rumah Qur'an B
├── Rumah Qur'an C
└── ...

Unit memiliki:

identity
configuration
branding
administrators
programs
activities
participants
content
reports

Data antar-unit harus terisolasi secara logical scope.

2.3 Site

Site merupakan presentation/deployment identity yang merepresentasikan sebuah Unit.

Domain
   ↓
DomainMapping
   ↓
Site
   ↓
Unit
   ↓
Organization

Site tidak menjadi owner utama data bisnis.

Unit tetap menjadi operational owner.

3. DOMAIN ENTITIES
3.1 User

Representasi identitas pengguna sistem.

User
- id
- name
- email
- phone
- password_hash
- status
- created_at
- updated_at

User dapat memiliki akses ke satu atau lebih scope.

3.2 Role

Role mendefinisikan kumpulan permission.

Contoh:

SUPER_ADMIN
ORG_ADMIN
UNIT_ADMIN
STAFF
TEACHER
EDITOR
VIEWER

Role tidak boleh menjadi satu-satunya mekanisme authorization.

Authorization harus mempertimbangkan:

User
+
Role
+
Permission
+
Organization Scope
+
Unit Scope
3.3 Permission

Permission menggunakan pola:

resource.action

Contoh:

users.read
users.create
users.update

units.read
units.update

programs.read
programs.create
programs.update
programs.delete

participants.read
participants.create
participants.update

reports.read
audit.read
4. ORGANIZATION DOMAIN
organizations
organizations
-------------------------
id                  UUID PK
name                VARCHAR
slug                VARCHAR UNIQUE
status              VARCHAR
description         TEXT NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP
Constraints
organizations.slug UNIQUE
5. UNIT DOMAIN
units
units
-------------------------
id                  UUID PK
organization_id     UUID FK
name                VARCHAR
slug                VARCHAR
type                VARCHAR
status              VARCHAR
description         TEXT NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP

Relationship:

Organization 1 ─── N Unit

Constraint:

UNIQUE(organization_id, slug)
6. SITE DOMAIN
sites
sites
-------------------------
id                  UUID PK
unit_id             UUID FK
name                VARCHAR
slug                VARCHAR
status              VARCHAR
branding_config     JSONB
settings            JSONB
created_at          TIMESTAMP
updated_at          TIMESTAMP

Relationship:

Unit 1 ─── N Site
7. DOMAIN MAPPING
domain_mappings
domain_mappings
-------------------------
id                  UUID PK
site_id             UUID FK
domain              VARCHAR UNIQUE
type                VARCHAR
status              VARCHAR
is_primary          BOOLEAN
created_at          TIMESTAMP
updated_at          TIMESTAMP

Contoh:

domain
   ↓
domain_mapping
   ↓
site
   ↓
unit
   ↓
organization

Domain resolution harus dilakukan sebelum request masuk ke operational scope.

8. USER & ACCESS DOMAIN
users
users
-------------------------
id                  UUID PK
name                VARCHAR
email               VARCHAR UNIQUE
phone               VARCHAR NULL
password_hash       VARCHAR
status              VARCHAR
created_at          TIMESTAMP
updated_at          TIMESTAMP
user_organization_roles
user_organization_roles
-------------------------
id                  UUID PK
user_id             UUID FK
organization_id     UUID FK
role_id             UUID FK
created_at          TIMESTAMP
user_unit_roles
user_unit_roles
-------------------------
id                  UUID PK
user_id             UUID FK
unit_id             UUID FK
role_id             UUID FK
created_at          TIMESTAMP

Scope hierarchy:

Platform
   ↓
Organization
   ↓
Unit

User tidak boleh memperoleh akses Unit hanya karena mengetahui unit_id.

Access harus berasal dari explicit authorization assignment.

9. PROGRAM DOMAIN

Program adalah container aktivitas/layanan yang disediakan Unit.

programs
programs
-------------------------
id                  UUID PK
unit_id             UUID FK
name                VARCHAR
slug                VARCHAR
description         TEXT NULL
status              VARCHAR
start_date          DATE NULL
end_date            DATE NULL
capacity            INTEGER NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP

Relationship:

Unit 1 ─── N Program
10. ACTIVITY DOMAIN

Activity merupakan kegiatan aktual yang terkait dengan Program atau Unit.

activities
activities
-------------------------
id                  UUID PK
unit_id             UUID FK
program_id          UUID FK NULL
title               VARCHAR
description         TEXT NULL
activity_type       VARCHAR
start_at            TIMESTAMP
end_at              TIMESTAMP NULL
location            VARCHAR NULL
status              VARCHAR
created_at          TIMESTAMP
updated_at          TIMESTAMP

Relationship:

Unit
 └── Program
      └── Activity

Activity dapat pula berdiri langsung di bawah Unit.

11. PARTICIPANT DOMAIN

Participant merupakan individu yang mengikuti program/aktivitas.

participants
participants
-------------------------
id                  UUID PK
unit_id             UUID FK
name                VARCHAR
phone               VARCHAR NULL
email               VARCHAR NULL
date_of_birth       DATE NULL
gender              VARCHAR NULL
status              VARCHAR
metadata            JSONB NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP

Participant selalu memiliki operational ownership melalui unit_id.

12. REGISTRATION DOMAIN

Registration menghubungkan Participant dengan Program.

registrations
registrations
-------------------------
id                  UUID PK
unit_id             UUID FK
program_id          UUID FK
participant_id      UUID FK
status              VARCHAR
registered_at       TIMESTAMP
approved_at         TIMESTAMP NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP

Relationship:

Participant
     │
     └── Registration ─── Program

Constraint:

UNIQUE(program_id, participant_id)
13. CONTENT DOMAIN

Content digunakan untuk informasi publik maupun internal.

contents
contents
-------------------------
id                  UUID PK
unit_id             UUID FK
type                VARCHAR
title               VARCHAR
slug                VARCHAR
excerpt             TEXT NULL
body                TEXT
status              VARCHAR
published_at        TIMESTAMP NULL
author_id           UUID FK
created_at          TIMESTAMP
updated_at          TIMESTAMP

Contoh type:

PAGE
ARTICLE
ANNOUNCEMENT
EVENT
FAQ
14. ATTENDANCE DOMAIN

Attendance digunakan untuk mencatat kehadiran participant pada activity.

attendance_records
attendance_records
-------------------------
id                  UUID PK
unit_id             UUID FK
activity_id         UUID FK
participant_id      UUID FK
status              VARCHAR
recorded_at         TIMESTAMP
recorded_by         UUID FK
notes               TEXT NULL
created_at          TIMESTAMP
updated_at          TIMESTAMP

Status:

PRESENT
ABSENT
LATE
EXCUSED

Constraint:

UNIQUE(activity_id, participant_id)
15. AUDIT DOMAIN

QIMA membutuhkan auditability sebagai bagian dari core architecture.

audit_logs
audit_logs
-------------------------
id                  UUID PK
organization_id     UUID FK NULL
unit_id             UUID FK NULL
user_id             UUID FK NULL
action              VARCHAR
resource_type       VARCHAR
resource_id         UUID NULL
metadata            JSONB NULL
ip_address          VARCHAR NULL
user_agent          TEXT NULL
created_at          TIMESTAMP

Contoh:

CREATE
UPDATE
DELETE
LOGIN
LOGOUT
PUBLISH
APPROVE
REJECT

Audit log bersifat append-only.

Application layer tidak menyediakan operasi normal untuk mengubah audit record.

16. CONFIGURATION DOMAIN

Configuration dipisahkan dari operational data.

organization_settings
organization_settings
-------------------------
id                  UUID PK
organization_id     UUID FK
key                 VARCHAR
value               JSONB
created_at          TIMESTAMP
updated_at          TIMESTAMP
unit_settings
unit_settings
-------------------------
id                  UUID PK
unit_id             UUID FK
key                 VARCHAR
value               JSONB
created_at          TIMESTAMP
updated_at          TIMESTAMP

Constraint:

UNIQUE(organization_id, key)
UNIQUE(unit_id, key)
17. RELATIONSHIP MAP
Organization
│
├── Users / Organization Roles
│
├── Units
│   │
│   ├── Sites
│   │   └── Domain Mappings
│   │
│   ├── Unit Roles
│   │
│   ├── Programs
│   │   ├── Activities
│   │   │   └── Attendance
│   │   │
│   │   └── Registrations
│   │       └── Participants
│   │
│   ├── Content
│   │
│   ├── Settings
│   │
│   └── Audit Logs
│
└── Organization Settings
18. DATA OWNERSHIP RULE

Operational data harus memiliki explicit ownership.

Contoh:

Program       → unit_id
Activity      → unit_id
Participant   → unit_id
Registration  → unit_id
Content       → unit_id
Attendance    → unit_id

Jangan mengandalkan relasi tidak langsung sebagai satu-satunya scope filter.

19. MULTI-TENANT ISOLATION

Setiap operational query harus melewati scope resolver.

Contoh:

Request
  ↓
Authentication
  ↓
Authorization
  ↓
Organization Context
  ↓
Unit Context
  ↓
Repository Query

Query tidak boleh:

SELECT * FROM participants;

tanpa scope.

Harus berbentuk konsep:

SELECT *
FROM participants
WHERE unit_id = :currentUnitId;

Untuk resource lintas-unit, authorization harus secara eksplisit menentukan scope yang diperbolehkan.

20. API ARCHITECTURE

Base URL:

/api/v1

Struktur:

/api/v1/auth
/api/v1/organizations
/api/v1/units
/api/v1/sites
/api/v1/domains
/api/v1/users
/api/v1/programs
/api/v1/activities
/api/v1/participants
/api/v1/registrations
/api/v1/attendance
/api/v1/content
/api/v1/reports
/api/v1/audit
/api/v1/settings
21. API RESPONSE CONTRACT

Successful response:

{
  "data": {},
  "meta": {}
}

Collection:

{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}

Error:

{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found",
    "details": {}
  }
}
22. HTTP STATUS CONTRACT
200 OK
201 CREATED
204 NO_CONTENT

400 BAD_REQUEST
401 UNAUTHORIZED
403 FORBIDDEN
404 NOT_FOUND
409 CONFLICT
422 VALIDATION_ERROR
429 RATE_LIMITED

500 INTERNAL_SERVER_ERROR
23. AUTH API
POST /api/v1/auth/login

Request:

{
  "email": "user@example.com",
  "password": "password"
}

Response:

{
  "data": {
    "user": {},
    "access_token": "...",
    "expires_at": "..."
  }
}
POST /api/v1/auth/logout

Invalidates the active authentication session/token according to implementation strategy.

GET /api/v1/auth/me

Returns:

{
  "data": {
    "user": {},
    "organizations": [],
    "units": [],
    "permissions": []
  }
}
24. ORGANIZATION API
GET    /api/v1/organizations
POST   /api/v1/organizations
GET    /api/v1/organizations/:id
PATCH  /api/v1/organizations/:id

Organization deletion should not be implemented as unrestricted hard delete.

25. UNIT API
GET    /api/v1/units
POST   /api/v1/units
GET    /api/v1/units/:id
PATCH  /api/v1/units/:id

All Unit endpoints must enforce organization scope.

26. PROGRAM API
GET    /api/v1/programs
POST   /api/v1/programs
GET    /api/v1/programs/:id
PATCH  /api/v1/programs/:id
DELETE /api/v1/programs/:id

Create request:

{
  "name": "Program Tahfidz",
  "description": "...",
  "start_date": "2026-09-01",
  "end_date": "2026-12-31",
  "capacity": 30
}

unit_id should normally be resolved from authenticated context rather than trusted directly from arbitrary client input.

27. ACTIVITY API
GET    /api/v1/activities
POST   /api/v1/activities
GET    /api/v1/activities/:id
PATCH  /api/v1/activities/:id
DELETE /api/v1/activities/:id
28. PARTICIPANT API
GET    /api/v1/participants
POST   /api/v1/participants
GET    /api/v1/participants/:id
PATCH  /api/v1/participants/:id

Create:

{
  "name": "Participant Name",
  "phone": "...",
  "email": "...",
  "date_of_birth": "2010-01-01"
}
29. REGISTRATION API
GET    /api/v1/registrations
POST   /api/v1/registrations
GET    /api/v1/registrations/:id
PATCH  /api/v1/registrations/:id

Create:

{
  "program_id": "uuid",
  "participant_id": "uuid"
}

Backend harus memverifikasi bahwa:

program.unit_id
==
participant.unit_id
==
currentUnitId

sebelum registration dibuat.

30. ATTENDANCE API
GET    /api/v1/activities/:activityId/attendance
POST   /api/v1/activities/:activityId/attendance
PATCH  /api/v1/attendance/:id

Create:

{
  "participant_id": "uuid",
  "status": "PRESENT",
  "notes": null
}
31. CONTENT API
GET    /api/v1/content
POST   /api/v1/content
GET    /api/v1/content/:id
PATCH  /api/v1/content/:id
DELETE /api/v1/content/:id
POST   /api/v1/content/:id/publish

Public content harus melalui publication/status rules.

32. REPORT API

Reporting tidak boleh mengakses database secara bebas dari controller.

Contoh:

GET /api/v1/reports/participants
GET /api/v1/reports/programs
GET /api/v1/reports/attendance
GET /api/v1/reports/activity

Report harus tetap mengikuti authorization scope.

33. AUDIT API
GET /api/v1/audit
GET /api/v1/audit/:id

Audit endpoint bersifat read-only untuk authorized users.

34. PAGINATION

Default:

page=1
limit=20

Maximum:

limit=100

Contoh:

GET /api/v1/participants?page=1&limit=20
35. FILTERING

Filtering menggunakan query parameters.

Contoh:

GET /api/v1/participants?status=ACTIVE

Search:

GET /api/v1/participants?search=Ahmad

Sorting:

GET /api/v1/participants?sort=created_at&order=desc
36. VALIDATION RULES

Semua input dari client dianggap untrusted.

Validation dilakukan pada Application boundary.

Minimal:

Required fields
Type validation
Format validation
Length validation
Enum validation
Relationship validation
Scope validation
Authorization validation
37. DOMAIN INVARIANTS

Invariant utama:

Organization
Unit.organization_id must reference an existing Organization.
Unit
Unit.slug unique within Organization.
Program
Program belongs to exactly one Unit.
Participant
Participant belongs to exactly one Unit.
Registration
Program and Participant must belong to the same Unit.
Activity
Activity must belong to its Unit.
If program_id exists:
program.unit_id == activity.unit_id
Attendance
Activity and Participant must belong to the same Unit.
Content
Content belongs to exactly one Unit.
38. SOFT DELETE POLICY

Soft delete dapat digunakan untuk operational entities apabila historical integrity diperlukan.

Contoh:

deleted_at TIMESTAMP NULL

Namun soft delete bukan pengganti authorization.

Record yang sudah deleted tidak boleh otomatis muncul dalam normal queries.

39. ID POLICY

Primary identifiers menggunakan UUID.

Contoh:

550e8400-e29b-41d4-a716-446655440000

Client tidak boleh membuat ID untuk entity yang ownership-nya ditentukan server, kecuali ada alasan arsitektural yang eksplisit.

40. TIMESTAMP POLICY

Semua timestamp disimpan dalam UTC.

Field standar:

created_at
updated_at

Timestamp yang berkaitan dengan event:

start_at
end_at
registered_at
recorded_at
published_at

Presentation layer bertanggung jawab terhadap timezone lokal.

41. DATABASE INDEX POLICY

Minimal index:

organizations.slug

units.organization_id
units(organization_id, slug)

sites.unit_id

domain_mappings.domain
domain_mappings.site_id

user_organization_roles.user_id
user_organization_roles.organization_id

user_unit_roles.user_id
user_unit_roles.unit_id

programs.unit_id
programs(unit_id, slug)

activities.unit_id
activities.program_id

participants.unit_id

registrations.program_id
registrations.participant_id

attendance_records.activity_id
attendance_records.participant_id

contents.unit_id
contents.slug

audit_logs.organization_id
audit_logs.unit_id
audit_logs.user_id
audit_logs.created_at
42. API SECURITY CONTRACT

API wajib menerapkan:

Authentication
Authorization
Input validation
Scope isolation
Rate limiting
Audit logging
Secure password handling
Token/session expiration

Tidak boleh mempercayai:

client-provided unit_id
client-provided organization_id
client-provided role
client-provided permission

sebagai bukti authorization.

43. DOMAIN SERVICE BOUNDARY

Business rules tidak ditempatkan langsung di controller.

Pattern:

Controller
    ↓
Application Use Case
    ↓
Domain Service / Entity Rules
    ↓
Repository
    ↓
Database

Contoh:

CreateRegistrationUseCase

bertanggung jawab terhadap:

Validate participant
Validate program
Resolve current unit
Check ownership
Check duplicate registration
Create registration
Create audit event
44. REPOSITORY CONTRACT

Repository harus menyediakan access yang scoped.

Contoh konsep:

ParticipantRepository
    findById(unitId, participantId)

ProgramRepository
    findById(unitId, programId)

ActivityRepository
    findById(unitId, activityId)

Bukan:

findById(id)

untuk operational resource yang memerlukan tenant isolation.

45. TRANSACTION POLICY

Operation yang mengubah beberapa aggregate/data penting harus menggunakan transaction.

Contoh:

Create Registration
    ↓
Validate
    ↓
Insert Registration
    ↓
Create Audit Log
    ↓
Commit

Jika salah satu operasi gagal:

ROLLBACK
46. API VERSIONING

Current:

/api/v1

Breaking changes tidak dilakukan diam-diam pada v1.

Jika diperlukan breaking contract:

/api/v2

Backward compatibility menjadi tanggung jawab API evolution strategy.

47. DOMAIN EVENT READINESS

QIMA belum wajib menggunakan event-driven architecture pada MVP.

Namun domain dapat dipersiapkan untuk event:

ParticipantCreated
RegistrationCreated
RegistrationApproved
ActivityCreated
AttendanceRecorded
ContentPublished
UserAssignedToUnit

Event architecture tidak boleh dipaksakan sebelum dibutuhkan.

48. MVP DATABASE BOUNDARY

MVP minimal membutuhkan:

organizations
units
sites
domain_mappings

users
roles
permissions
user_organization_roles
user_unit_roles

programs
activities
participants
registrations
attendance_records

contents

organization_settings
unit_settings

audit_logs

Modul tambahan hanya dibuat ketika memiliki use case yang jelas.

49. IMPLEMENTATION RULE

Database schema harus diturunkan dari domain model.

Urutan implementasi:

Domain Entity
      ↓
Database Migration
      ↓
Repository
      ↓
Application Use Case
      ↓
API Controller
      ↓
Validation
      ↓
Authorization
      ↓
Audit
      ↓
Integration Test

Tidak boleh membangun endpoint terlebih dahulu lalu membentuk domain secara ad-hoc.

50. TRACEABILITY

Setiap entity harus dapat ditelusuri:

Requirement
    ↓
Domain Entity
    ↓
Database Table
    ↓
Repository
    ↓
Use Case
    ↓
API Endpoint
    ↓
Permission
    ↓
Audit Event
    ↓
Test

Dengan demikian QIMA memiliki single chain of traceability dari requirement sampai implementation.

51. NON-GOALS v1.0

Dokumen ini tidak menetapkan:

Specific frontend framework
Specific UI component library
Specific hosting provider
Specific payment gateway
Complex workflow engine
AI engine
Advanced analytics engine
Event-driven infrastructure
Microservices

Arsitektur tetap memungkinkan pengembangan tersebut pada fase berikutnya tanpa mengubah core domain secara sembarangan.

52. ARCHITECTURAL PRINCIPLE

QIMA harus mempertahankan prinsip:

ONE CORE
MULTIPLE ORGANIZATIONS
MULTIPLE UNITS
MULTIPLE SITES
ISOLATED OPERATIONAL DATA
EXPLICIT AUTHORIZATION
AUDITABLE ACTIONS
VERSIONED API
RELATIONAL DATA INTEGRITY
53. FINAL DOMAIN CONTRACT

Canonical hierarchy:

Organization
    ↓
Unit
    ↓
┌───────────────┬───────────────┬───────────────┐
Program         Participant     Content         Site
    ↓               ↓
Activity       Registration
    ↓
Attendance

Access hierarchy:

User
 ↓
Role
 ↓
Permission
 ↓
Organization Scope
 ↓
Unit Scope

Request hierarchy:

Request
 ↓
Authentication
 ↓
Domain/Site Resolution
 ↓
Authorization
 ↓
Application Use Case
 ↓
Domain Validation
 ↓
Repository
 ↓
Database
 ↓
Audit
54. DEFINITION OF DONE

QIMA Database/API/Domain v1.0 dianggap siap diimplementasikan apabila:

Semua core entities memiliki ownership yang jelas.

Organization → Unit hierarchy konsisten.

Site → DomainMapping → Unit resolution terdefinisi.

Operational data memiliki unit scope.

Authorization tidak bergantung pada client-provided scope.

Domain invariants terdefinisi.

Database constraints terdefinisi.

Index strategy tersedia.

API naming dan versioning konsisten.

Error contract konsisten.

Pagination/filtering contract tersedia.

Audit contract tersedia.

Repository scope contract tersedia.

Transaction boundary terdefinisi.

MVP database boundary jelas.

Traceability ke implementation dapat dilakukan.

55. NEXT DOCUMENT

Setelah dokumen ini dikunci, urutan berikutnya:

QIMA — DATABASE SCHEMA, API CONTRACT & DOMAIN SPECIFICATION v1.0
                         ↓
QIMA — UX/UI DESIGN SYSTEM & SCREEN SPECIFICATION v1.0
                         ↓
QIMA — IMPLEMENTATION CONTRACT, REPOSITORY & MODULE STRUCTURE v1.0
                         ↓
QIMA — TESTING, QA & DELIVERY BLUEPRINT v1.0
                         ↓
QIMA — MASTER TRACEABILITY MATRIX + IMPLEMENTATION EXECUTION PLAN v1.0

Database/API/Domain Specification v1.0 menjadi source of truth untuk kontrak data dan backend sebelum implementation dimulai.