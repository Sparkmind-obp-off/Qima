QIMA — MASTER TRACEABILITY MATRIX + IMPLEMENTATION EXECUTION PLAN v1.0

Status: MASTER EXECUTION BASELINE
Version: 1.0
System: QIMA
Layer: Master Control / Traceability / Implementation / Delivery

1. PURPOSE

Dokumen ini merupakan master control document QIMA.

Seluruh blueprint sebelumnya dipetakan ke dalam satu execution chain:

PRODUCT
   ↓
SCOPE
   ↓
MODULE
   ↓
DOMAIN
   ↓
DATABASE
   ↓
API
   ↓
UX/UI
   ↓
REPOSITORY
   ↓
IMPLEMENTATION
   ↓
TEST
   ↓
QA
   ↓
DEPLOYMENT

Tujuan dokumen:

Menghilangkan ambiguity saat development.
Menjaga traceability antar seluruh layer.
Menentukan urutan implementasi.
Menentukan dependency.
Menentukan acceptance criteria.
Menjadi dasar task engineering.
Menjadi kontrol agar implementation tidak keluar dari MVP scope.
2. SOURCE-OF-TRUTH HIERARCHY

Urutan authority:

1. Product Vision
2. MVP Scope & Boundary
3. Module / User Journey Contract
4. Technical Architecture
5. Database / API / Domain Specification
6. UX/UI Specification
7. Implementation Contract
8. Testing / QA / Delivery Blueprint
9. This Master Execution Plan
10. Code

Jika terdapat konflik:

STOP
 ↓
Identify source
 ↓
Resolve conflict
 ↓
Update affected contract
 ↓
Continue implementation

Code tidak boleh menjadi alasan untuk mempertahankan architecture yang salah.

3. MASTER TRACEABILITY MODEL

Setiap requirement QIMA harus memiliki jalur:

Requirement ID
      ↓
Business Capability
      ↓
Module
      ↓
Domain Entity
      ↓
Database
      ↓
API
      ↓
Screen
      ↓
Permission
      ↓
Implementation Task
      ↓
Test
      ↓
Release Gate
4. REQUIREMENT ID CONVENTION

Canonical prefixes:

PRD-xxx       Product
SCP-xxx       Scope
AUTH-xxx      Authentication
ORG-xxx       Organization
UNIT-xxx      Unit
USR-xxx       User
ACC-xxx       Access
PROG-xxx      Program
ACT-xxx       Activity
PART-xxx      Participant
REG-xxx       Registration
ATT-xxx       Attendance
CONT-xxx      Content
RPT-xxx       Report
AUD-xxx       Audit
SET-xxx       Settings
PUB-xxx       Public Experience
SEC-xxx       Security
NFR-xxx       Non-functional
5. PRIORITY SYSTEM
P0 = MVP Critical
P1 = Important
P2 = Secondary
P3 = Future / Optional

Implementation order:

P0 → P1 → P2 → P3

P2/P3 tidak boleh mengganggu completion P0.

6. MASTER CAPABILITY MAP
QIMA
│
├── Identity & Access
│   ├── Authentication
│   ├── Users
│   ├── Roles
│   └── Permissions
│
├── Organization
│   ├── Organization
│   ├── Unit
│   └── Site
│
├── Program Operations
│   ├── Programs
│   ├── Activities
│   ├── Participants
│   ├── Registrations
│   └── Attendance
│
├── Content
│
├── Reporting
│
├── Audit
│
├── Settings
│
└── Public Experience
7. MASTER TRACEABILITY MATRIX
ID	Capability	Module	Domain	DB	API	UI	Priority
AUTH-001	Login	Auth	User/Session	users/sessions	/auth/*	Login	P0
ORG-001	Organization	Organizations	Organization	organizations	/organizations	Org Admin	P0
UNIT-001	Unit	Units	Unit	units	/units	Unit Admin	P0
ACC-001	Access	Users/Access	Role/Permission	roles/permissions	/users/*	Access UI	P0
PROG-001	Programs	Programs	Program	programs	/programs	Program UI	P0
ACT-001	Activities	Activities	Activity	activities	/activities	Activity UI	P0
PART-001	Participants	Participants	Participant	participants	/participants	Participant UI	P0
REG-001	Registration	Registrations	Registration	registrations	/registrations	Registration UI	P0
ATT-001	Attendance	Attendance	Attendance	attendance	/attendance	Attendance UI	P0
CONT-001	Content	Content	Content	content	/content	Content UI	P1
RPT-001	Reporting	Reports	Report	derived/query	/reports	Reports	P1
AUD-001	Audit	Audit	AuditEvent	audit_logs	/audit	Audit UI	P1
SET-001	Settings	Settings	Configuration	settings	/settings	Settings	P1
PUB-001	Public Experience	Public	PublicResource	derived	/public/*	Public UI	P1
SEC-001	Scope Isolation	Shared/Auth	Scope	all scoped tables	all scoped APIs	—	P0
8. FOUNDATION TRACEABILITY
FND-001 — Repository
Requirement
→ Repository exists
→ apps/web
→ apps/api
→ packages
→ database
→ tests
→ docs

Acceptance:

Repository builds successfully.
FND-002 — Configuration
Requirement
→ Environment Configuration
→ config module
→ .env.example

Acceptance:

Application validates required configuration at startup.
FND-003 — Database
Requirement
→ Database foundation
→ migration system
→ schema

Acceptance:

Fresh database can be created from migrations.
FND-004 — Error Handling
Requirement
→ Shared Error Contract
→ API Error Handler
→ Frontend Error Mapping

Acceptance:

No raw internal exception is exposed to users.
9. AUTHENTICATION TRACEABILITY
AUTH-001
Login
 ↓
User
 ↓
Session
 ↓
Authentication API
 ↓
Login Screen
 ↓
Auth Test

Acceptance:

Valid credentials authenticate.
Invalid credentials fail.
Protected resources reject anonymous access.
10. ORGANIZATION TRACEABILITY
ORG-001
Organization
 ↓
Organization Entity
 ↓
organizations
 ↓
Organization API
 ↓
Organization Screen
 ↓
Authorization Test

Acceptance:

Organization is uniquely identifiable.
Organization ownership is preserved.
11. UNIT TRACEABILITY
UNIT-001
Unit
 ↓
Unit Entity
 ↓
units
 ↓
Unit API
 ↓
Unit Management UI
 ↓
Scope Test

Acceptance:

Unit belongs to correct organization.
12. ACCESS TRACEABILITY
ACC-001
User
 ↓
Role
 ↓
Permission
 ↓
Scope
 ↓
Authorization Middleware
 ↓
Protected API
 ↓
Access UI
 ↓
Authorization Tests

Acceptance:

Role permissions are enforced server-side.
13. PROGRAM TRACEABILITY
PROG-001
Program
 ↓
Program Entity
 ↓
programs
 ↓
ProgramRepository
 ↓
CreateProgram
 ↓
POST /api/v1/programs
 ↓
Program Form
 ↓
Program Test

Acceptance:

Authorized user can create program
within authorized unit scope.
14. ACTIVITY TRACEABILITY
ACT-001
Activity
 ↓
Activity Entity
 ↓
activities
 ↓
ActivityRepository
 ↓
CreateActivity
 ↓
POST /api/v1/activities
 ↓
Activity UI
 ↓
Activity Test

Acceptance:

Activity cannot belong to an unauthorized unit.
15. PARTICIPANT TRACEABILITY
PART-001
Participant
 ↓
Participant Entity
 ↓
participants
 ↓
ParticipantRepository
 ↓
CreateParticipant
 ↓
POST /api/v1/participants
 ↓
Participant UI
 ↓
Participant Test

Acceptance:

Participant remains scoped to its authorized unit.
16. REGISTRATION TRACEABILITY
REG-001
Registration
 ↓
Registration Entity
 ↓
registrations
 ↓
RegistrationRepository
 ↓
CreateRegistration
 ↓
POST /api/v1/registrations
 ↓
Registration UI
 ↓
Registration Integration Test

Critical invariant:

Participant Unit
      =
Program Unit

Otherwise:

REJECT
17. ATTENDANCE TRACEABILITY
ATT-001
Attendance
 ↓
Attendance Entity
 ↓
attendance
 ↓
AttendanceRepository
 ↓
RecordAttendance
 ↓
POST /api/v1/attendance
 ↓
Attendance UI
 ↓
Attendance E2E

Critical invariant:

Participant
+
Activity
+
Unit

must be compatible.

18. CONTENT TRACEABILITY
CONT-001
Content
 ↓
Content Entity
 ↓
content
 ↓
ContentRepository
 ↓
Create / Publish Content
 ↓
Content API
 ↓
Content Management UI
 ↓
Content Test

Publishing is an audited mutation.

19. REPORTING TRACEABILITY
RPT-001
Operational Data
 ↓
Report Query
 ↓
Report API
 ↓
Report UI
 ↓
Report Test

Reports must respect scope.

A Unit A user must never receive Unit B report data.

20. AUDIT TRACEABILITY
AUD-001
Mutation
 ↓
Audit Event
 ↓
audit_logs
 ↓
Audit API
 ↓
Audit UI
 ↓
Audit Test

Critical mutations must be auditable.

21. SECURITY TRACEABILITY
SEC-001 — Organization Isolation
Organization Context
 ↓
Authorization
 ↓
Repository Scope
 ↓
Database Query
 ↓
API Response
SEC-002 — Unit Isolation
Unit Context
 ↓
Authorization
 ↓
Scoped Query
 ↓
Result
SEC-003 — IDOR Protection
Direct Resource ID
 ↓
Scope Check
 ↓
Authorized?
 ├── YES → Continue
 └── NO → Reject
22. NON-FUNCTIONAL TRACEABILITY
NFR-001 — Security
Authentication
Authorization
Scope Isolation
Input Validation
Secret Protection
NFR-002 — Reliability
Transaction Integrity
Error Handling
Migration Reliability
Recovery Procedure
NFR-003 — Performance
Pagination
Indexed Queries
Bounded Payloads
No obvious N+1 patterns
NFR-004 — Accessibility
Keyboard
Labels
Focus
Contrast
Semantic structure
23. MASTER DEPENDENCY GRAPH
FOUNDATION
    │
    ├── Database
    ├── Config
    ├── Error Handling
    └── Logging
           │
           ↓
AUTHENTICATION
           │
           ↓
ORGANIZATION
           │
           ↓
UNIT
           │
           ↓
ACCESS / SCOPE
           │
           ├──────────────┐
           ↓              ↓
       PROGRAM        PARTICIPANT
           │              │
           ↓              │
       ACTIVITY           │
           │              │
           └──────┬───────┘
                  ↓
             REGISTRATION
                  ↓
             ATTENDANCE
                  ↓
               REPORT
24. IMPLEMENTATION PHASES
PHASE 0 — PROJECT BOOTSTRAP
Objective

Membangun foundation repository.

Tasks:

T0.01 Initialize repository
T0.02 Configure package manager
T0.03 Configure web application
T0.04 Configure API application
T0.05 Configure shared packages
T0.06 Configure lint
T0.07 Configure formatter
T0.08 Configure type checking
T0.09 Configure test framework
T0.10 Create environment contract

Exit Criteria:

✓ Repository builds
✓ Web starts
✓ API starts
✓ Tests execute
PHASE 1 — DATABASE FOUNDATION

Tasks:

T1.01 Database connection
T1.02 Migration system
T1.03 Base schema
T1.04 Organization schema
T1.05 Unit schema
T1.06 User schema
T1.07 Role schema
T1.08 Permission schema
T1.09 Scope relationships
T1.10 Audit schema

Exit Criteria:

✓ Fresh database migration
✓ Constraints validated
✓ Seed works
PHASE 2 — AUTHENTICATION & ACCESS

Tasks:

T2.01 Authentication
T2.02 Session management
T2.03 Login API
T2.04 Logout
T2.05 User context
T2.06 Role resolution
T2.07 Permission resolution
T2.08 Scope context
T2.09 Authorization middleware
T2.10 Access tests

Verified implementation status (2026-09-04):

✓ T2.01 Authentication
✓ T2.02 Session management
✓ T2.03 Login API
✓ T2.04 Logout
✓ T2.05 User context
✓ T2.06 Role resolution
✓ T2.07 Permission resolution
✓ T2.08 Scope context
✓ T2.09 Authorization middleware
✓ T2.10 Access tests

Evidence:

- `packages/domain/src/authorization.ts`
- `apps/api/src/application/authorization/resolve-authorization-context.ts`
- `apps/api/src/modules/auth/authorization-middleware.ts`
- `GET /api/v1/auth/access/organizations/:organizationId/units/:unitId`
- `tests/unit/phase2-authorization-domain.test.ts`
- `tests/api/auth-access.test.ts`

Exit Criteria:

✓ Login works
✓ Protected API works
✓ Unauthorized access rejected
PHASE 3 — ORGANIZATION & UNIT

Tasks:

T3.01 Organization CRUD
T3.02 Unit CRUD
T3.03 Organization → Unit relationship
T3.04 Unit scope
T3.05 Unit authorization
T3.06 Unit isolation tests

Verified implementation status (2026-09-04):

✓ T3.01 Organization create/read/list/update API and use cases
✓ T3.02 Unit create/read/list/update API and use cases
✓ T3.03 Organization → Unit foreign key and immutable ownership boundary
✓ T3.04 Server-owned organization/unit scope on protected queries
✓ T3.05 Existing Phase 2 role/permission authorization reused server-side
✓ T3.06 Cross-organization, cross-unit, IDOR, and regression tests

Evidence:

- `packages/domain/src/organization.ts`
- `apps/api/src/application/organization/organization-use-cases.ts`
- `apps/api/src/application/organization/unit-use-cases.ts`
- `apps/api/src/modules/organization/routes.ts`
- `apps/api/src/infrastructure/database/repositories.ts`
- `tests/unit/phase3-organization-unit-domain.test.ts`
- `tests/integration/phase3-organization-unit-repository.test.ts`
- `tests/api/phase3-organization-unit.test.ts`

Exit Criteria:

✓ Organization works
✓ Unit works
✓ Isolation works
PHASE 4 — PROGRAM

Tasks:

T4.01 Program schema
T4.02 Program domain
T4.03 Program repository
T4.04 CreateProgram
T4.05 UpdateProgram
T4.06 ListPrograms
T4.07 Program API
T4.08 Program UI
T4.09 Program tests

Verified implementation status (2026-09-04):

✓ T4.01 Program schema, constraints, indexes, and Unit foreign key
✓ T4.02 Program domain state and validation invariants
✓ T4.03 Unit-scoped ProgramRepository persistence operations
✓ T4.04 CreateProgram with server-authorized organization/unit scope
✓ T4.05 UpdateProgram with scoped load and IDOR protection
✓ T4.06 ListPrograms with server-side Unit scope and bounded pagination
✓ T4.07 Authenticated Program API with role/permission enforcement
✓ T4.08 Program list, detail, create, and edit UI states
✓ T4.09 Domain, migration, repository, API, UI, regression, and isolation tests

Evidence:

- `database/migrations/0006_phase4_program_schema.sql`
- `packages/domain/src/program.ts`
- `packages/domain/src/repositories.ts`
- `apps/api/src/infrastructure/database/repositories.ts`
- `apps/api/src/application/program/program-use-cases.ts`
- `apps/api/src/modules/program/routes.ts`
- `apps/web/src/program-shell.ts`
- `public/static/programs.js`
- `tests/unit/phase4-program-domain.test.ts`
- `tests/integration/phase4-program-repository.test.ts`
- `tests/integration/phase4-program-ui.test.ts`
- `tests/api/phase4-program.test.ts`

Exit Criteria:

✓ Program lifecycle works
✓ Scope enforced
PHASE 5 — ACTIVITY

Tasks:

T5.01 Activity schema
T5.02 Activity domain
T5.03 Activity repository
T5.04 Activity use cases
T5.05 Activity API
T5.06 Activity UI
T5.07 Activity tests

Exit Criteria:

✓ Activity works
✓ Program relationship valid
✓ Scope enforced
PHASE 6 — PARTICIPANT

Tasks:

T6.01 Participant schema
T6.02 Participant domain
T6.03 Participant repository
T6.04 Participant use cases
T6.05 Participant API
T6.06 Participant UI
T6.07 Participant tests

Exit Criteria:

✓ Participant lifecycle works
✓ Scope enforced
PHASE 7 — REGISTRATION

Tasks:

T7.01 Registration schema
T7.02 Registration domain
T7.03 Registration repository
T7.04 CreateRegistration
T7.05 ApproveRegistration
T7.06 RejectRegistration
T7.07 Registration API
T7.08 Registration UI
T7.09 Cross-unit validation
T7.10 Integration tests

Exit Criteria:

✓ Registration lifecycle works
✓ Cross-unit registration rejected
✓ Audit generated
PHASE 8 — ATTENDANCE

Tasks:

T8.01 Attendance schema
T8.02 Attendance domain
T8.03 Attendance repository
T8.04 RecordAttendance
T8.05 UpdateAttendance
T8.06 Attendance API
T8.07 Attendance UI
T8.08 Attendance tests
T8.09 E2E attendance journey

Exit Criteria:

✓ Attendance works
✓ Scope works
✓ E2E passes
PHASE 9 — REPORTING

Tasks:

T9.01 Report query architecture
T9.02 Operational summary
T9.03 Program report
T9.04 Participant report
T9.05 Attendance report
T9.06 Scope filtering
T9.07 Report API
T9.08 Report UI
T9.09 Report tests

Exit Criteria:

✓ Reports are accurate
✓ Scope enforced
PHASE 10 — CONTENT

Tasks:

T10.01 Content schema
T10.02 Content domain
T10.03 Content repository
T10.04 Content CRUD
T10.05 Publishing
T10.06 Content API
T10.07 Content UI
T10.08 Audit
T10.09 Tests

Exit Criteria:

✓ Content lifecycle works
✓ Publish action audited
PHASE 11 — AUDIT & SETTINGS

Tasks:

T11.01 Audit query
T11.02 Audit UI
T11.03 Settings schema
T11.04 Settings API
T11.05 Settings UI
T11.06 Authorization
T11.07 Tests
PHASE 12 — PUBLIC EXPERIENCE

Tasks:

T12.01 Public home
T12.02 Public program listing
T12.03 Program detail
T12.04 Public content
T12.05 Registration entry
T12.06 Responsive behavior
T12.07 Accessibility
T12.08 Public E2E
PHASE 13 — HARDENING

Tasks:

T13.01 Security audit
T13.02 IDOR tests
T13.03 Cross-unit tests
T13.04 Cross-organization tests
T13.05 Input validation audit
T13.06 Dependency audit
T13.07 Performance audit
T13.08 Accessibility audit
T13.09 Error leakage audit

Exit Criteria:

No unresolved P0 security issue.
PHASE 14 — RELEASE CANDIDATE

Tasks:

T14.01 Full test suite
T14.02 Build verification
T14.03 Migration verification
T14.04 Staging deployment
T14.05 Staging E2E
T14.06 Smoke test
T14.07 Release notes
T14.08 Rollback verification
PHASE 15 — MVP PRODUCTION

Tasks:

T15.01 Production deployment
T15.02 Database migration
T15.03 Smoke test
T15.04 Auth verification
T15.05 Critical workflow verification
T15.06 Monitoring

MVP status:

READY

only after all release gates pass.

25. MASTER TEST MATRIX
Area	Unit	Integration	API	E2E	Security
Auth	✓	✓	✓	✓	✓
Organization	✓	✓	✓	✓	✓
Unit	✓	✓	✓	✓	✓
Access	✓	✓	✓	✓	✓
Programs	✓	✓	✓	✓	✓
Activities	✓	✓	✓	✓	✓
Participants	✓	✓	✓	✓	✓
Registration	✓	✓	✓	✓	✓
Attendance	✓	✓	✓	✓	✓
Reports	✓	✓	✓	✓	✓
Content	✓	✓	✓	✓	✓
Audit	✓	✓	✓	—	✓
26. CRITICAL E2E JOURNEY

Canonical MVP journey:

Login
 ↓
Dashboard
 ↓
Create Program
 ↓
Create Activity
 ↓
Create Participant
 ↓
Create Registration
 ↓
Approve Registration
 ↓
Record Attendance
 ↓
View Report

Expected:

PASS
27. SECURITY E2E JOURNEY
User A
 ↓
Unit A
 ↓
Request Unit B Resource
 ↓
Authorization
 ↓
REJECT

Repeat against:

GET
POST
PATCH
DELETE
SEARCH
REPORT
28. RELEASE GATES
Gate G0 — Build
✓ Build
✓ Typecheck
✓ Lint
Gate G1 — Functional
✓ P0 features
✓ Core journey
✓ API contracts
Gate G2 — Security
✓ Authentication
✓ Authorization
✓ IDOR
✓ Scope isolation
✓ Secret protection
Gate G3 — Data
✓ Migration
✓ Constraints
✓ Transactions
✓ Integrity
Gate G4 — UX
✓ Loading
✓ Empty
✓ Error
✓ Responsive
✓ Accessibility baseline
Gate G5 — Delivery
✓ Staging
✓ Smoke test
✓ Backup
✓ Rollback
29. ABSOLUTE RELEASE BLOCKERS

Any of the following blocks release:

P0 security vulnerability
Cross-unit data leak
Cross-organization data leak
Authentication bypass
Data corruption
Broken critical workflow
Failed migration
Unrecoverable production state
30. IMPLEMENTATION BOARD STRUCTURE

Engineering board should use:

BACKLOG
READY
IN PROGRESS
CODE REVIEW
TESTING
QA
STAGING
DONE
BLOCKED
31. TASK FORMAT

Every implementation task should contain:

Task ID
Requirement ID
Module
Objective
Dependencies
Files / Area
Acceptance Criteria
Tests
Status

Example:

Task:
T7.04

Requirement:
REG-001

Module:
Registrations

Objective:
Implement CreateRegistration.

Dependencies:
Participant
Program
Scope

Acceptance:
Participant and Program must belong
to compatible scope.

Tests:
Unit
Integration
API
Security
32. IMPLEMENTATION ORDER RULE

Developer harus mengikuti dependency order.

Do not:

Build UI first
then invent API
then invent database
then change domain

Correct:

Contract
 ↓
Domain
 ↓
Database
 ↓
Use Case
 ↓
API
 ↓
UI
 ↓
Tests
33. VERTICAL SLICE RULE

Setelah foundation siap, feature sebaiknya dibangun secara vertical slice:

Domain
 ↓
Persistence
 ↓
Use Case
 ↓
API
 ↓
UI
 ↓
Tests

Contoh:

Program

diselesaikan end-to-end sebelum berpindah ke feature berikutnya jika dependency memungkinkan.

34. DEFINITION OF READY

Task dapat masuk READY jika:

✓ Requirement known
✓ Scope known
✓ Domain known
✓ API known
✓ DB impact known
✓ UI known
✓ Permission known
✓ Acceptance criteria known
35. DEFINITION OF DONE

Task masuk DONE jika:

✓ Code complete
✓ Tests pass
✓ Authorization verified
✓ Scope verified
✓ UX states complete
✓ Documentation updated
36. TRACEABILITY COMPLETION RULE

Tidak boleh ada:

Requirement

yang tidak memiliki:

Implementation
+
Test

Dan tidak boleh ada:

Implementation

yang tidak memiliki:

Requirement / documented technical reason
37. ARCHITECTURE DRIFT CONTROL

Jika developer ingin menambahkan:

new module
new database table
new API
new external service
new infrastructure

yang tidak ada dalam baseline:

Architecture Review Required
38. MVP BOUNDARY CONTROL

Jika sebuah feature tidak dibutuhkan untuk core journey:

Defer

bukan otomatis:

Add to MVP

MVP harus tetap:

Small
Coherent
Usable
Testable
Deployable
39. CORE MVP DEFINITION

QIMA MVP minimal harus mampu:

Authenticate User
      ↓
Resolve Organization
      ↓
Resolve Unit / Scope
      ↓
Manage Program
      ↓
Manage Activity
      ↓
Manage Participant
      ↓
Manage Registration
      ↓
Record Attendance
      ↓
View Operational Report

dengan:

Authorization
Scope Isolation
Audit
Validation
Testing
40. FINAL MVP ACCEPTANCE MATRIX
Capability	Implemented	Tested	Scoped	Release
Authentication	✓	✓	✓	✓
Organization	✓	✓	✓	✓
Unit	✓	✓	✓	✓
Access	✓	✓	✓	✓
Program	✓	✓	✓	✓
Activity	✓	✓	✓	✓
Participant	✓	✓	✓	✓
Registration	✓	✓	✓	✓
Attendance	✓	✓	✓	✓
Report	✓	✓	✓	✓
41. FINAL EXECUTION SEQUENCE

QIMA sekarang memiliki execution sequence resmi:

01. Bootstrap Repository
        ↓
02. Configure Environment
        ↓
03. Setup Database
        ↓
04. Implement Authentication
        ↓
05. Implement Organization
        ↓
06. Implement Unit
        ↓
07. Implement Roles / Permissions
        ↓
08. Implement Scope Isolation
        ↓
09. Implement Programs
        ↓
10. Implement Activities
        ↓
11. Implement Participants
        ↓
12. Implement Registrations
        ↓
13. Implement Attendance
        ↓
14. Implement Reports
        ↓
15. Implement Content
        ↓
16. Implement Audit / Settings
        ↓
17. Implement Public Experience
        ↓
18. Security Hardening
        ↓
19. Full QA
        ↓
20. Staging
        ↓
21. Release Candidate
        ↓
22. Production
        ↓
23. Smoke Test
        ↓
24. MVP READY
42. MASTER CONTROL LOOP

Selama development:

SELECT TASK
    ↓
CHECK CONTRACT
    ↓
IMPLEMENT
    ↓
TEST
    ↓
TRACE
    ↓
REVIEW
    ↓
MERGE
    ↓
NEXT TASK

Jika test gagal:

FIX
 ↓
RETEST

Jika contract conflict:

STOP
 ↓
ARCHITECTURE DECISION
 ↓
UPDATE CONTRACT
 ↓
CONTINUE
43. MASTER STATUS MODEL

Setiap requirement menggunakan status:

NOT STARTED
READY
IN PROGRESS
IMPLEMENTED
TESTING
VERIFIED
RELEASED
DEFERRED
BLOCKED

VERIFIED berarti:

Implementation
+
Tests
+
Acceptance

telah terpenuhi.

44. FINAL SYSTEM TRACEABILITY

QIMA sekarang dapat ditelusuri:

BUSINESS GOAL
      ↓
PRODUCT REQUIREMENT
      ↓
MVP REQUIREMENT
      ↓
CAPABILITY
      ↓
MODULE
      ↓
DOMAIN
      ↓
DATABASE
      ↓
USE CASE
      ↓
API
      ↓
SCREEN
      ↓
PERMISSION
      ↓
REPOSITORY
      ↓
IMPLEMENTATION TASK
      ↓
TEST
      ↓
QA
      ↓
DEPLOYMENT
45. FINAL IMPLEMENTATION LAW

QIMA implementation harus selalu menjawab tiga pertanyaan:

WHAT?
Requirement apa yang sedang dibangun?
WHERE?
Module / layer / repository mana yang bertanggung jawab?
PROOF?
Test apa yang membuktikan bahwa requirement tersebut benar?

Jika salah satu tidak dapat dijawab:

Implementation is NOT READY.
46. MASTER EXECUTION COMMAND

Mulai dari repository kosong:

INIT
 ↓
FOUNDATION
 ↓
DATABASE
 ↓
AUTH
 ↓
SCOPE
 ↓
CORE OPERATIONS
 ↓
REPORTING
 ↓
PUBLIC
 ↓
HARDENING
 ↓
QA
 ↓
STAGING
 ↓
PRODUCTION

Tidak melompat langsung ke production feature sebelum foundation dan scope security selesai.

47. QIMA v1.0 COMPLETION CRITERIA

QIMA MVP dinyatakan selesai apabila:

✓ Product contract satisfied
✓ MVP scope satisfied
✓ Core modules implemented
✓ Database implemented
✓ API implemented
✓ UX implemented
✓ Repository structure compliant
✓ Authentication works
✓ Authorization works
✓ Unit isolation works
✓ Organization isolation works
✓ Critical audit works
✓ Unit tests pass
✓ Integration tests pass
✓ API tests pass
✓ Cri