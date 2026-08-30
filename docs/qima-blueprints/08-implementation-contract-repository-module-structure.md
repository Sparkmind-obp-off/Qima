QIMA — IMPLEMENTATION CONTRACT, REPOSITORY & MODULE STRUCTURE v1.0

Status: Implementation Baseline
Version: 1.0
System: QIMA
Layer: Engineering / Repository / Module Architecture

Depends On:

QIMA — PRODUCT VISION & POSITIONING
QIMA — MVP SCOPE & BOUNDARY
QIMA — MODULE COMPOSITION & USER JOURNEY CONTRACT
QIMA — TECHNICAL ARCHITECTURE & IMPLEMENTATION BLUEPRINT
QIMA — DATABASE SCHEMA, API CONTRACT & DOMAIN SPECIFICATION
QIMA — UX/UI DESIGN SYSTEM & SCREEN SPECIFICATION
1. PURPOSE

Dokumen ini menjadi implementation contract QIMA.

Tujuannya memastikan bahwa:

Blueprint
   ↓
Architecture
   ↓
Domain
   ↓
Database
   ↓
API
   ↓
UX/UI
   ↓
Repository
   ↓
Modules
   ↓
Code
   ↓
Testing
   ↓
Deployment

memiliki satu arah implementasi yang konsisten.

Dokumen ini menentukan:

repository structure
application structure
module boundaries
dependency rules
backend structure
frontend structure
shared layer
configuration
environment variables
database migration
API organization
authorization boundaries
testing structure
deployment boundaries
coding rules
implementation sequence
2. IMPLEMENTATION PRINCIPLE

QIMA menggunakan prinsip:

MODULAR
SCOPED
DOMAIN-ORIENTED
API-FIRST
TYPE-SAFE
TESTABLE
AUDITABLE
DEPLOYABLE

MVP tidak perlu dipaksakan menjadi microservices.

Baseline:

ONE REPOSITORY
ONE APPLICATION SYSTEM
MODULAR INTERNAL ARCHITECTURE

Jika kebutuhan meningkat, module dapat dipisahkan kemudian.

3. REPOSITORY PRINCIPLE

Repository adalah source of truth implementation.

Struktur harus membuat developer dapat menjawab:

Where is this feature?
Where is its domain rule?
Where is its API?
Where is its database logic?
Where is its UI?
Where is its test?

tanpa harus mencari seluruh repository.

4. CANONICAL REPOSITORY STRUCTURE

Baseline:

qima/
│
├── apps/
│   ├── web/
│   └── api/
│
├── packages/
│   ├── ui/
│   ├── config/
│   ├── types/
│   ├── validation/
│   └── utils/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── fixtures/
│
├── docs/
│   ├── architecture/
│   ├── domain/
│   ├── api/
│   ├── ux/
│   └── implementation/
│
├── scripts/
│
├── tests/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── package.json
├── README.md
└── ...

Exact framework-specific files remain implementation decisions.

5. APPLICATION BOUNDARY

QIMA memiliki dua primary application surfaces:

apps/web
apps/api
apps/web

Responsible for:

Public website
Admin application
UI routing
client-side state
API consumption
presentation
apps/api

Responsible for:

authentication
authorization
domain use cases
API
database access
audit
validation
business rules
6. WEB APPLICATION STRUCTURE

Recommended conceptual structure:

apps/web/
│
├── src/
│   ├── app/
│   │   ├── public/
│   │   └── admin/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── domain/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── units/
│   │   ├── programs/
│   │   ├── activities/
│   │   ├── participants/
│   │   ├── registrations/
│   │   ├── attendance/
│   │   ├── content/
│   │   ├── reports/
│   │   ├── users/
│   │   ├── audit/
│   │   └── settings/
│   │
│   ├── lib/
│   ├── hooks/
│   ├── services/
│   ├── stores/
│   └── types/
│
└── tests/
7. API APPLICATION STRUCTURE

Recommended:

apps/api/
│
├── src/
│   │
│   ├── config/
│   │
│   ├── infrastructure/
│   │   ├── database/
│   │   ├── auth/
│   │   ├── logging/
│   │   └── storage/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── organizations/
│   │   ├── units/
│   │   ├── sites/
│   │   ├── users/
│   │   ├── programs/
│   │   ├── activities/
│   │   ├── participants/
│   │   ├── registrations/
│   │   ├── attendance/
│   │   ├── content/
│   │   ├── reports/
│   │   ├── audit/
│   │   └── settings/
│   │
│   ├── shared/
│   │   ├── errors/
│   │   ├── validation/
│   │   ├── authorization/
│   │   ├── pagination/
│   │   └── types/
│   │
│   └── app/
│
└── tests/
8. MODULE CONTRACT

Setiap module harus memiliki boundary yang jelas.

Canonical module:

module/
├── domain/
├── application/
├── infrastructure/
├── presentation/
└── index

Contoh:

programs/
│
├── domain/
│   ├── entities/
│   ├── rules/
│   └── repositories/
│
├── application/
│   ├── create-program/
│   ├── update-program/
│   ├── get-program/
│   └── list-programs/
│
├── infrastructure/
│   ├── repositories/
│   └── persistence/
│
├── presentation/
│   ├── routes/
│   ├── controllers/
│   └── schemas/
│
└── index.ts
9. DOMAIN LAYER

Domain layer berisi business meaning.

Domain layer boleh mengetahui:

Business rules
Entities
Value objects
Domain invariants
Domain repository contracts

Domain layer tidak boleh mengetahui:

HTTP
React
database driver
request object
response object
UI
hosting provider
10. APPLICATION LAYER

Application layer mengorkestrasi use case.

Contoh:

CreateProgram
UpdateProgram
DeleteProgram
GetProgram
ListPrograms

Use case bertanggung jawab terhadap:

Input
 ↓
Validation
 ↓
Authorization context
 ↓
Domain operation
 ↓
Repository
 ↓
Audit
 ↓
Output
11. INFRASTRUCTURE LAYER

Infrastructure menangani technical implementation.

Contoh:

PostgreSQL adapter
Authentication adapter
Object storage
Email provider
Logging
Cache
External API

Domain tidak boleh bergantung langsung terhadap provider tertentu.

12. PRESENTATION LAYER

Presentation bertanggung jawab terhadap API transport.

Contoh:

HTTP Request
 ↓
Route
 ↓
Controller
 ↓
Use Case
 ↓
Response

Controller tidak boleh menjadi tempat business logic utama.

13. SHARED MODULE

Shared hanya berisi sesuatu yang benar-benar generic.

Allowed:

errors
pagination
result types
validation primitives
authorization primitives
logging
common utilities

Tidak boleh menjadikan shared/ sebagai tempat menaruh semua kode yang tidak tahu harus ditempatkan di mana.

14. DEPENDENCY RULE

Dependency direction:

Presentation
      ↓
Application
      ↓
Domain

Infrastructure
      ↓
Domain / Application Contracts

Core rule:

DOMAIN
must not depend on
INFRASTRUCTURE
15. MODULE DEPENDENCY RULE

Module tidak boleh saling mengakses database module lain secara langsung.

Bad:

ProgramModule
    ↓
direct SQL
    ↓
Participants table

Better:

ProgramModule
    ↓
Participant contract / use case
    ↓
ParticipantModule

Atau gunakan application-level orchestration bila operasi memang lintas-domain.

16. DATABASE ACCESS RULE

Hanya infrastructure/repository layer yang boleh mengakses database secara langsung.

Tidak boleh:

Controller
 → SQL

Tidak boleh:

UI
 → Database

Tidak boleh:

Domain Entity
 → ORM

Database access harus melalui repository/persistence boundary.

17. API ROUTING CONTRACT

Canonical:

/api/v1/auth
/api/v1/organizations
/api/v1/units
/api/v1/sites
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

Routes harus mengikuti resource semantics.

18. CONTROLLER CONTRACT

Controller harus tipis.

Ideal:

receive request
→ validate transport input
→ resolve context
→ call use case
→ map result
→ return response

Controller tidak boleh berisi:

complex business rules
SQL queries
authorization logic scattered everywhere
large transformations
19. VALIDATION CONTRACT

Validation dibagi:

Transport Validation
        ↓
Domain Validation
        ↓
Database Constraints

Ketiganya memiliki fungsi berbeda.

Transport:

Format
Required
Type
Length

Domain:

Business invariant

Database:

Integrity
Uniqueness
Foreign key
20. AUTHORIZATION CONTRACT

Authorization dilakukan server-side.

Pipeline:

Authenticated User
        ↓
Resolve Organization
        ↓
Resolve Unit
        ↓
Resolve Role
        ↓
Resolve Permission
        ↓
Authorize Action
        ↓
Execute Use Case

UI visibility tidak dianggap sebagai authorization.

21. SCOPE CONTEXT

Request context dapat berbentuk:

RequestContext
├── userId
├── organizationId
├── unitId
├── siteId
├── roles
└── permissions

Context dibuat server-side.

Client tidak boleh menentukan authorization context secara bebas.

22. REPOSITORY CONTRACT

Repository interface berada dekat domain/application contract.

Contoh:

ProgramRepository

create()
findById()
findMany()
update()
delete()

Tetapi operational query harus menerima scope:

findById(unitId, programId)

bukan sekadar:

findById(programId)

jika resource memerlukan unit isolation.

23. TRANSACTION CONTRACT

Transaction boundary berada pada application/infrastructure orchestration.

Contoh:

CreateRegistration
      ↓
BEGIN
      ↓
Validate
      ↓
Create Registration
      ↓
Create Audit Log
      ↓
COMMIT

Failure:

ROLLBACK
24. AUDIT CONTRACT

Mutation penting harus menghasilkan audit event.

Minimal:

CREATE
UPDATE
DELETE
APPROVE
REJECT
PUBLISH
LOGIN
LOGOUT
ASSIGN_ROLE
CHANGE_SCOPE

Audit tidak boleh dibuat dari UI.

Audit dibuat server-side.

25. FRONTEND FEATURE CONTRACT

Frontend feature harus mengikuti domain capability.

Contoh:

features/programs/
├── api/
├── components/
├── hooks/
├── schemas/
├── types/
├── pages/
└── index

Feature tidak boleh mengambil alih tanggung jawab feature lain secara sembarangan.

26. UI COMPONENT CONTRACT

Component hierarchy:

Design Token
    ↓
Primitive
    ↓
Composite
    ↓
Domain Component
    ↓
Feature Component
    ↓
Screen

Contoh:

Button
 ↓
FormField
 ↓
ProgramForm
 ↓
ProgramCreateScreen
27. STATE MANAGEMENT

State dibagi:

Server State
UI State
Form State
Session State
Scope State

Server state tidak boleh diduplikasi secara berlebihan menjadi global UI state.

28. API CLIENT CONTRACT

Frontend tidak melakukan raw HTTP request di setiap component.

Gunakan centralized API layer:

features/programs/api/
    programs.client

Component:

Component
 ↓
Hook
 ↓
API Client
 ↓
/api/v1/programs
29. ERROR HANDLING FRONTEND

API error:

error.code
error.message
error.details

dipetakan ke UI.

Tidak boleh menampilkan raw server exception.

30. ENVIRONMENT CONTRACT

Minimum environments:

development
staging
production

Environment-specific configuration:

DATABASE_URL
AUTH_SECRET
APP_URL
API_URL
STORAGE_CONFIG
LOG_LEVEL

Secret tidak boleh masuk repository.

31. ENVIRONMENT FILE POLICY

Repository menyediakan:

.env.example

Tidak boleh commit:

.env
.env.local
production secrets
private credentials
API keys

.gitignore harus melindungi secret files.

32. CONFIGURATION ACCESS

Application code tidak boleh membaca process.env secara tersebar.

Gunakan centralized configuration:

config/
   environment
   database
   auth
   storage

Dengan validation saat startup.

Jika required configuration tidak tersedia:

Application must fail fast.
33. DATABASE MIGRATION CONTRACT

Setiap perubahan schema harus melalui migration.

Flow:

Schema Change
 ↓
Migration
 ↓
Review
 ↓
Apply
 ↓
Test

Tidak boleh melakukan perubahan database production secara manual tanpa migration record.

34. SEED CONTRACT

Seeds digunakan untuk:

Development
Testing
Initial configuration

Seed tidak boleh bergantung pada production secrets.

35. FIXTURE CONTRACT

Fixtures digunakan untuk:

Unit tests
Integration tests
E2E scenarios

Fixture harus deterministic.

36. API CONTRACT TESTING

Setiap endpoint penting minimal memiliki:

Success test
Validation test
Unauthorized test
Forbidden test
Not found test
Scope isolation test

Untuk mutation:

Audit test

juga diperlukan.

37. UNIT TEST STRUCTURE

Domain rules:

module/domain/*.test

Use cases:

module/application/*.test

Unit test tidak boleh membutuhkan real production database.

38. INTEGRATION TEST STRUCTURE

Integration test memverifikasi:

Use Case
+
Repository
+
Database

Contoh:

CreateProgramIntegrationTest
RegistrationIntegrationTest
AttendanceIntegrationTest
39. E2E TEST STRUCTURE

E2E memverifikasi journey.

Critical MVP journey:

Login
→ Dashboard
→ Create Program
→ Create Activity
→ Create Participant
→ Register Participant
→ Record Attendance

Public:

Home
→ Programs
→ Program Detail
→ Registration
40. MULTI-UNIT ISOLATION TEST

Ini merupakan critical security test.

Scenario:

Unit A
Participant A

Unit B
Participant B

User dengan access Unit A:

CAN → Participant A
CANNOT → Participant B

Test harus memastikan:

GET
POST
PATCH
DELETE
SEARCH
REPORT

semuanya tetap scoped.

41. ROLE TEST MATRIX

Minimal:

Super Admin
Organization Admin
Unit Admin
Staff
Teacher
Viewer

Setiap role diuji terhadap:

Read
Create
Update
Delete
Approve
Publish
Audit
Settings
42. CODING RULES

Code harus:

Readable
Explicit
Typed
Small
Testable
Consistent

Hindari:

God classes
God functions
Hidden side effects
Circular dependencies
Magic strings
Duplicated business rules
43. NAMING RULE

Domain terminology harus konsisten.

Contoh:

Participant
Program
Activity
Registration
Attendance
Unit
Organization

Jangan menggunakan tiga nama berbeda untuk entity yang sama.

44. BUSINESS RULE LOCATION

Business rule:

Domain

Use-case orchestration:

Application

Database implementation:

Infrastructure

HTTP handling:

Presentation

Visual behavior:

Web/UI
45. LOGGING CONTRACT

Application logging harus mencakup context yang relevan:

request_id
user_id
organization_id
unit_id
action
status
duration

Jangan log:

password
tokens
secret keys
sensitive credentials
46. OBSERVABILITY READINESS

QIMA minimal harus siap untuk:

Application Logs
Error Tracking
Request Tracing
Performance Metrics

MVP tidak harus langsung menggunakan observability platform kompleks.

47. API DOCUMENTATION

Setiap endpoint harus dapat dijelaskan melalui:

Method
Path
Authentication
Authorization
Request
Response
Errors
Scope

OpenAPI/Swagger dapat digunakan sebagai implementation artifact.

48. FILE OWNERSHIP RULE

Setiap file harus memiliki satu alasan utama untuk berubah.

Contoh:

program repository

tidak sekaligus menangani:

participant
attendance
email
UI formatting
49. MODULE COMPLETION CONTRACT

Sebuah module dianggap selesai apabila:

Domain
✓

Use Cases
✓

Repository
✓

API
✓

Validation
✓

Authorization
✓

Audit
✓

UI
✓

Tests
✓

Tidak cukup hanya membuat CRUD endpoint.

50. IMPLEMENTATION ORDER

Urutan implementation QIMA:

Phase 1 — Foundation
Repository
Environment
Database
Core configuration
Logging
Error handling
Auth foundation
Phase 2 — Organization & Scope
Organization
Unit
Site
Domain Mapping
Roles
Permissions
Scope Context
Phase 3 — Core Operations
Programs
Activities
Participants
Registrations
Attendance
Phase 4 — Content & Reporting
Content
Reports
Audit UI
Settings
Phase 5 — Public Experience
Public Home
Programs
Program Detail
Activities
Content
Registration flow
Phase 6 — Hardening
Security
Isolation tests
Performance
Accessibility
E2E
Deployment
Monitoring
51. MVP MODULE PRIORITY
P0
auth
organizations
units
users/access
programs
activities
participants
registrations
attendance
P1
sites
domain mappings
content
reports
audit
settings
P2
advanced notifications
advanced analytics
automation
external integrations
52. IMPLEMENTATION DEPENDENCY GRAPH
Foundation
    ↓
Auth
    ↓
Organization
    ↓
Unit
    ↓
Access / Scope
    ↓
Programs
    ↓
Activities
    ↓
Participants
    ↓
Registrations
    ↓
Attendance
    ↓
Reports
    ↓
Public Experience
53. GIT / VERSION CONTROL CONTRACT

Branch strategy dapat menggunakan:

main
develop
feature/*
fix/*

Setiap feature harus memiliki:

Small scope
Clear purpose
Tests
Reviewable changes

Commit message harus menjelaskan perubahan.

54. PULL REQUEST CONTRACT

PR minimal menjelaskan:

What changed?
Why?
Which module?
Which requirement?
How tested?
Any migration?
Any API change?
Any security implication?
55. DEFINITION OF READY

Feature siap dikerjakan jika:

Requirement jelas

Domain identified

API contract tersedia

Database impact diketahui

UX screen tersedia

Permission diketahui

Acceptance criteria tersedia

Dependencies diketahui

56. DEFINITION OF DONE

Feature selesai apabila:

Domain implemented

Database migration implemented

API implemented

Authorization implemented

Validation implemented

Audit implemented where required

UI implemented

Loading state implemented

Empty state implemented

Error state implemented

Unit tests passed

Integration tests passed

Scope isolation tested

E2E coverage added where critical

Documentation updated

57. DEPLOYMENT CONTRACT

Deployment architecture:

Git Repository
      ↓
CI / Build
      ↓
Test
      ↓
Build Artifact
      ↓
Staging
      ↓
Verification
      ↓
Production

Production deployment tidak boleh melewati validation tanpa alasan yang terdokumentasi.

58. DATABASE DEPLOYMENT

Database migration harus dijalankan melalui controlled deployment process.

Flow:

Application Build
      ↓
Migration Check
      ↓
Migration
      ↓
Application Deployment

Migration yang destructive harus melalui review khusus.

59. BACKWARD COMPATIBILITY

API v1 harus menjaga compatibility.

Jika perubahan breaking diperlukan:

/api/v2

Tidak boleh mengubah response contract v1 secara diam-diam.

60. DOCUMENTATION SOURCE OF TRUTH

Hierarchy dokumentasi:

Product Contract
      ↓
Architecture Contract
      ↓
Domain/Data Contract
      ↓
UX/UI Contract
      ↓
Implementation Contract
      ↓
Code

Jika code berbeda dengan contract:

Either
1. Fix code
or
2. Explicitly update contract

Tidak boleh membiarkan divergence tanpa keputusan.

61. ANTI-PATTERNS

QIMA implementation dilarang berkembang menjadi:

Random CRUD
Database-first without domain
Controller-heavy architecture
UI-driven business rules
Global unscoped queries
Shared-folder dumping ground
Hardcoded permissions
Hardcoded tenant IDs
Secrets in repository
Manual production database edits
Duplicated business rules
62. REPOSITORY TARGET STATE

Target akhir repository:

qima/
│
├── apps/
│   ├── web/
│   │   └── src/
│   │       ├── app/
│   │       ├── components/
│   │       ├── features/
│   │       ├── hooks/
│   │       ├── services/
│   │       └── lib/
│   │
│   └── api/
│       └── src/
│           ├── modules/
│           ├── infrastructure/
│           ├── shared/
│           └── config/
│
├── packages/
│   ├── ui/
│   ├── types/
│   ├── validation/
│   ├── config/
│   └── utils/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   └── fixtures/
│
├── tests/
│   ├── integration/
│   └── e2e/
│
├── docs/
│
├── scripts/
│
├── .env.example
└── README.md
63. TRACEABILITY CONTRACT

Setiap implementation unit harus dapat ditelusuri:

Requirement ID
      ↓
Module
      ↓
Domain Entity
      ↓
Database Table
      ↓
Use Case
      ↓
API Endpoint
      ↓
Screen
      ↓
Permission
      ↓
Test

Contoh:

REG-001
 ↓
registrations
 ↓
Registration
 ↓
registrations table
 ↓
CreateRegistration
 ↓
POST /api/v1/registrations
 ↓
Registration Screen
 ↓
registrations.create
 ↓
RegistrationIntegrationTest
64. IMPLEMENTATION MASTER RULE

Jika ada konflik antara implementasi dan contract:

STOP
↓
Identify conflict
↓
Determine source-of-truth document
↓
Resolve architecture decision
↓
Update affected contract
↓
Continue implementation

Jangan menyelesaikan konflik dengan workaround lokal yang membuat architecture drift.

65. FINAL IMPLEMENTATION CONTRACT

QIMA v1.0 menggunakan:

ONE REPOSITORY
        ↓
MODULAR APPLICATION
        ↓
SEPARATED WEB + API
        ↓
DOMAIN-ORIENTED MODULES
        ↓
EXPLICIT SCOPE
        ↓
SERVER-SIDE AUTHORIZATION
        ↓
SCOPED REPOSITORIES
        ↓
VERSIONED API
        ↓
AUDITABLE MUTATIONS
        ↓
AUTOMATED TESTING
        ↓
CONTROLLED DEPLOYMENT
66. NEXT DOCUMENT

Setelah Implementation Contract ini dikunci, dokumen berikutnya adalah:

QIMA — TESTING, QA & DELIVERY BLUEPRINT v1.0

Dokumen tersebut akan mengubah seluruh contract sebelumnya menjadi:

Test Strategy
Test Matrix
Unit Tests
Integration Tests
API Tests
Security Tests
Multi-Tenant Isolation Tests
E2E Tests
Accessibility Tests
Performance Tests
Release Gates
Deployment Gates
QA Checklist
Definition of Done

Setelah itu barulah kita membuat dokumen final:

QIMA — MASTER TRACEABILITY MATRIX
+ IMPLEMENTATION EXECUTION PLAN v1.0

yang berfungsi sebagai master execution map untuk benar-benar membangun QIMA dari repository kosong sampai MVP siap dijalank