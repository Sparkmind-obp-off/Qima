QIMA — MASTER TRACEABILITY MATRIX + IMPLEMENTATION EXECUTION PLAN v1.1

Status: MASTER EXECUTION BASELINE — PROTOTYPE-FIRST
Version: 1.1
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

Mulai v1.1, execution strategy resmi menggunakan prototype-first delivery untuk validasi visual, UX, demo journey, dan kesiapan meeting sebelum production integration.

Prototype-first tidak menggantikan production architecture. Prototype adalah implementation mode sementara yang menggunakan Mock Data + Local State / Simulated Interaction dan tetap mengikuti kontrak platform.

Tujuan dokumen:
- Menghilangkan ambiguity saat development.
- Menjaga traceability antar seluruh layer.
- Menentukan urutan implementasi.
- Menentukan dependency.
- Menentukan acceptance criteria.
- Menjadi dasar task engineering.
- Menjadi kontrol agar implementation tidak keluar dari MVP scope.
- Menjaga agar pekerjaan backend yang telah VERIFIED tidak diulang.

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
9. DOC 11 — Frontend Prototype & Demo Execution Blueprint
10. This Master Execution Plan
11. Code

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
DOC 11 hanya mengatur prototype UX/UI, demo, mock data, prototype deployment, dan handoff; DOC 01–09 tetap menjadi production contract.

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

Prototype path diperbolehkan sebagai:
Requirement → Capability → Module → Screen → Mock Data → Simulated Interaction → Prototype QA → Demo Gate

Prototype path tidak menghapus production traceability.

4. REQUIREMENT ID CONVENTION

PRD-xxx Product
SCP-xxx Scope
AUTH-xxx Authentication
ORG-xxx Organization
UNIT-xxx Unit
USR-xxx User
ACC-xxx Access
PROG-xxx Program
ACT-xxx Activity
PART-xxx Participant
REG-xxx Registration
ATT-xxx Attendance
CONT-xxx Content
RPT-xxx Report
AUD-xxx Audit
SET-xxx Settings
PUB-xxx Public Experience
SEC-xxx Security
NFR-xxx Non-functional

5. PRIORITY SYSTEM

P0 = MVP Critical
P1 = Important
P2 = Secondary
P3 = Future / Optional

P2/P3 tidak boleh mengganggu completion P0.

Prototype priority:
P0 prototype = meeting-critical screens and demo journey.
P1 prototype = supporting screens.
P2/P3 prototype = defer.

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
├── Reporting
├── Audit
├── Settings
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
SET-001	Settings	Settings	Configuration	settings	/settings	Settings UI	P1
PUB-001	Public Experience	Public	PublicResource	derived	/public/*	Public UI	P1
SEC-001	Scope Isolation	Shared/Auth	Scope	all scoped tables	all scoped APIs	—	P0

8. FOUNDATION TRACEABILITY

FND-001 — Repository
Repository → apps/web → apps/api → packages → database → tests → docs.
Acceptance: repository builds successfully.

FND-002 — Configuration
Environment Configuration → config module → .env.example.
Acceptance: required configuration is validated at startup.

FND-003 — Database
Database foundation → migration system → schema.
Acceptance: fresh database can be created from migrations.

FND-004 — Error Handling
Shared Error Contract → API Error Handler → Frontend Error Mapping.
Acceptance: no raw internal exception is exposed to users.

9. AUTHENTICATION TRACEABILITY

AUTH-001
Login → User → Session → Authentication API → Login Screen → Auth Test.
Acceptance: valid credentials authenticate; invalid credentials fail; protected resources reject anonymous access.

10. ORGANIZATION TRACEABILITY

ORG-001
Organization → Organization Entity → organizations → Organization API → Organization Screen → Authorization Test.
Acceptance: organization is uniquely identifiable and ownership is preserved.

11. UNIT TRACEABILITY

UNIT-001
Unit → Unit Entity → units → Unit API → Unit Management UI → Scope Test.
Acceptance: unit belongs to correct organization.

12. ACCESS TRACEABILITY

ACC-001
User → Role → Permission → Scope → Authorization Middleware → Protected API → Access UI → Authorization Tests.
Acceptance: role permissions are enforced server-side.

13. PROGRAM TRACEABILITY

PROG-001
Program → Program Entity → programs → ProgramRepository → CreateProgram → POST /api/v1/programs → Program Form → Program Test.
Acceptance: authorized user can create program within authorized unit scope.

14. ACTIVITY TRACEABILITY

ACT-001
Activity → Activity Entity → activities → ActivityRepository → CreateActivity → POST /api/v1/activities → Activity UI → Activity Test.
Acceptance: activity cannot belong to an unauthorized unit.

15. PARTICIPANT TRACEABILITY

PART-001
Participant → Participant Entity → participants → ParticipantRepository → CreateParticipant → POST /api/v1/participants → Participant UI → Participant Test.
Acceptance: participant remains scoped to its authorized unit.

16. REGISTRATION TRACEABILITY

REG-001
Registration → Registration Entity → registrations → RegistrationRepository → CreateRegistration → POST /api/v1/registrations → Registration UI → Registration Integration Test.
Critical invariant: Participant Unit = Program Unit. Otherwise REJECT.

17. ATTENDANCE TRACEABILITY

ATT-001
Attendance → Attendance Entity → attendance → AttendanceRepository → RecordAttendance → POST /api/v1/attendance → Attendance UI → Attendance E2E.
Critical invariant: Participant + Activity + Unit must be compatible.

18. CONTENT TRACEABILITY

CONT-001
Content → Content Entity → content → ContentRepository → Create / Publish Content → Content API → Content Management UI → Content Test.
Publishing is an audited mutation.

19. REPORTING TRACEABILITY

RPT-001
Operational Data → Report Query → Report API → Report UI → Report Test.
Reports must respect scope. A Unit A user must never receive Unit B report data.

20. AUDIT TRACEABILITY

AUD-001
Mutation → Audit Event → audit_logs → Audit API → Audit UI → Audit Test.
Critical mutations must be auditable.

21. SECURITY TRACEABILITY

SEC-001 — Organization Isolation
Organization Context → Authorization → Repository Scope → Database Query → API Response.

SEC-002 — Unit Isolation
Unit Context → Authorization → Scoped Query → Result.

SEC-003 — IDOR Protection
Direct Resource ID → Scope Check → Authorized? YES → Continue / NO → Reject.

22. NON-FUNCTIONAL TRACEABILITY

NFR-001 — Security: Authentication, Authorization, Scope Isolation, Input Validation, Secret Protection.
NFR-002 — Reliability: Transaction Integrity, Error Handling, Migration Reliability, Recovery Procedure.
NFR-003 — Performance: Pagination, Indexed Queries, Bounded Payloads, no obvious N+1 patterns.
NFR-004 — Accessibility: Keyboard, Labels, Focus, Contrast, Semantic structure.

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

24. IMPLEMENTATION PHASES — v1.1 PROTOTYPE-FIRST

IMPORTANT EXECUTION RULE

Mulai v1.1, QIMA tidak lagi memakai urutan production-only sebagai urutan kerja praktis.

Urutan resmi delivery:

P0 — FRONTEND PROTOTYPE
P1 — DEMO / MEETING VALIDATION
P2 — BACKEND FOUNDATION / CONTINUATION
P3 — AUTH + ACCESS CONTINUATION
P4 — DOMAIN MODULES
P5 — PRODUCTION INTEGRATION
P6 — PRODUCTION QA / HARDENING
P7 — MULTI-DEPLOYMENT
P8 — SCALE / FUTURE UNITS

Prototype phase berjalan di atas architecture contract yang sudah ada dan tidak menghapus dependency production.

PHASE P0 — FRONTEND PROTOTYPE

Objective:
Membangun frontend prototype yang visually credible, responsive, dan siap didemokan tanpa menunggu seluruh backend production selesai.

Source:
DOC 01–10 + DOC 11.

Tasks:
PT0.01 Prototype foundation and route shell
PT0.02 Design tokens and reusable primitives
PT0.03 Public landing / home
PT0.04 Unit identity / branding configuration
PT0.05 Program listing
PT0.06 Program detail
PT0.07 Activity / events
PT0.08 Registration mock flow
PT0.09 Registration success state
PT0.10 Demo admin login
PT0.11 Admin dashboard
PT0.12 Program management demo
PT0.13 Activity management demo
PT0.14 Registration management demo
PT0.15 Unit switcher / unit context demo
PT0.16 Responsive states
PT0.17 Loading / empty / error states
PT0.18 Accessibility baseline
PT0.19 Controlled motion / parallax where useful
PT0.20 Mock data contract

Prototype mode:
UI → Mock Data → Local State / Simulated Interaction → Demo Result.

Exit Criteria:
✓ Critical screens render
✓ Demo navigation works
✓ Mock interactions work
✓ Responsive layout works
✓ No critical route errors
✓ No critical console errors
✓ QIMA and RQ Blumbang identity can be demonstrated
✓ Prototype remains compatible with production contracts

PHASE P1 — DEMO / MEETING VALIDATION

Objective:
Validate that the prototype can tell the QIMA platform story end-to-end.

Canonical demo:
Open Demo
 ↓
QIMA Landing
 ↓
Explore RQ Blumbang
 ↓
Program
 ↓
Program Detail
 ↓
Registration Mock
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
Unit Switcher
 ↓
Second Unit / Identity

Exit Criteria:
✓ Demo can be completed without backend dependency
✓ Visual hierarchy is credible
✓ Unit identity switching is understandable
✓ Core CTA and journey are clear
✓ Prototype is suitable for stakeholder review

PHASE P2 — BACKEND FOUNDATION / CONTINUATION

Objective:
Continue production implementation without restarting verified work.

RULE: VERIFIED WORK IS IMMUTABLE BY DEFAULT.

Existing verified Phase 2 and Phase 3 work remains accepted baseline as of 2026-09-04.
Do not recreate authentication, session, authorization, organization, unit, or scope work merely because prototype delivery happened first.

Verified Phase 2 evidence:
- `packages/domain/src/authorization.ts`
- `apps/api/src/application/authorization/resolve-authorization-context.ts`
- `apps/api/src/modules/auth/authorization-middleware.ts`
- `GET /api/v1/auth/access/organizations/:organizationId/units/:unitId`
- `tests/unit/phase2-authorization-domain.test.ts`
- `tests/api/auth-access.test.ts`

Verified Phase 3 evidence:
- `packages/domain/src/organization.ts`
- `apps/api/src/application/organization/organization-use-cases.ts`
- `apps/api/src/application/organization/unit-use-cases.ts`
- `apps/api/src/modules/organization/routes.ts`
- `apps/api/src/infrastructure/database/repositories.ts`
- `tests/unit/phase3-organization-unit-domain.test.ts`
- `tests/integration/phase3-organization-unit-repository.test.ts`
- `tests/api/phase3-organization-unit.test.ts`

Continuation means:
1. Verify current code state.
2. Reuse existing implementation.
3. Fix only actual gaps/regressions.
4. Extend from the existing contracts.
5. Do not duplicate modules or create parallel auth/scope systems.

PHASE P3 — AUTH + ACCESS CONTINUATION

Tasks are only for gaps not already satisfied by verified implementation.

T3C.01 Verify current authentication baseline
T3C.02 Verify current session baseline
T3C.03 Verify role/permission baseline
T3C.04 Verify organization/unit scope baseline
T3C.05 Address only discovered gaps
T3C.06 Regression tests

Exit Criteria:
✓ Existing Phase 2/3 verified gates remain green
✓ No duplicate auth/access architecture exists
✓ New work composes with existing server-side scope enforcement

PHASE P4 — DOMAIN MODULES

Continue production vertical slices in dependency order:

PROGRAM
ACTIVITY
PARTICIPANT
REGISTRATION
ATTENDANCE
REPORTING
CONTENT
AUDIT / SETTINGS

Existing verified Phase 4–6 work must be reused and extended, not recreated.

Verified Phase 4 baseline includes Program schema/domain/repository/use cases/API/UI/tests.
Verified Phase 5 baseline includes Activity schema/domain/repository/use cases/API/UI/security tests.
Verified Phase 6 baseline includes Participant schema/domain/repository/use cases/API/UI/security tests.

Production vertical slice rule:
Domain → Persistence → Use Case → API → UI → Tests.

PHASE P5 — PRODUCTION INTEGRATION

Prototype screens are progressively wired to real APIs.

Mode A:
UI → Mock Data → Local State / Simulated Interaction.

Mode B:
UI → API → Application Service → Domain → Data Access → Database.

Migration rule:
- Keep the existing UI contract where possible.
- Replace mock adapters with production adapters.
- Do not move business rules into visual components.
- Do not let prototype shortcuts become production architecture.

PHASE P6 — PRODUCTION QA / HARDENING

Tasks:
T6.01 Full test suite
T6.02 Build verification
T6.03 Security audit
T6.04 IDOR tests
T6.05 Cross-unit tests
T6.06 Cross-organization tests
T6.07 Input validation audit
T6.08 Dependency audit
T6.09 Performance audit
T6.10 Accessibility audit
T6.11 Error leakage audit
T6.12 Prototype-to-production regression

Exit Criteria:
✓ No unresolved P0 security issue
✓ No cross-unit data leak
✓ No cross-organization data leak
✓ Critical UX journeys work with production APIs
✓ Prototype behavior has been reconciled with production behavior

PHASE P7 — MULTI-DEPLOYMENT

Architecture rule:
ONE QIMA REPOSITORY
        ↓
SHARED PLATFORM CORE
        ↓
MULTIPLE DEPLOYMENTS / DOMAINS / UNIT IDENTITIES

Required production deployment model:
1. QIMA platform deployment
2. RQ Blumbang deployment

Future units use the same shared repository/core and receive their own configuration/deployment identity.

There is NO separate codebase fork for RQ Blumbang.

Each deployment may define:
- domain
- UNIT_ID / unit slug
- organization context
- logo / favicon
- colors / typography
- hero / imagery
- content
- contact information
- enabled capabilities

Prototype deployment is conceptually separate from production deployments and may exist as a temporary preview environment.

Exit Criteria:
✓ QIMA deployment works
✓ RQ Blumbang deployment works
✓ Both consume the same shared core
✓ Unit identity is isolated by configuration/context
✓ No secrets are committed
✓ Deployment configuration is documented

PHASE P8 — SCALE / FUTURE UNITS

After QIMA + RQ Blumbang are stable:
- add additional Rumah Qur’an units
- add pondok deployments where capability contract permits
- add additional organizations where architecture permits
- monitor performance and operational cost
- keep one shared core

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
Prototype UX	—	—	—	✓	✓

26. CRITICAL PRODUCTION E2E JOURNEY

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

Expected: PASS.

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

Repeat against GET, POST, PATCH, DELETE, SEARCH, REPORT.

28. PROTOTYPE QA GATE

Prototype may be marked DEMO READY only if:
✓ Critical screens render
✓ Navigation and CTAs work
✓ Mock interactions work
✓ Responsive behavior is verified
✓ Loading / empty / error states are acceptable
✓ Visual identity is consistent
✓ Typography hierarchy is stable
✓ No critical console errors
✓ No broken route
✓ Demo journey is completable
✓ No secrets are present
✓ Prototype is clearly isolated from production data paths

29. PRODUCTION RELEASE GATES

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

30. ABSOLUTE RELEASE BLOCKERS

Any of the following blocks release:
- P0 security vulnerability
- Cross-unit data leak
- Cross-organization data leak
- Authentication bypass
- Data corruption
- Broken critical workflow
- Failed migration
- Unrecoverable production state

31. IMPLEMENTATION BOARD STRUCTURE

BACKLOG
READY
IN PROGRESS
CODE REVIEW
TESTING
QA
STAGING
DONE
BLOCKED

32. TASK FORMAT

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

33. IMPLEMENTATION ORDER RULE

Production dependency order remains:
Contract → Domain → Database → Use Case → API → UI → Tests.

Prototype delivery is an explicit exception only for presentation/UX validation:
Contract → UX/UI → Mock Data → Simulated Interaction → Prototype QA.

The prototype exception must not invent production APIs, database rules, or domain behavior.

34. VERTICAL SLICE RULE

After foundation is ready, production feature should be built as:
Domain → Persistence → Use Case → API → UI → Tests.

Prototype may validate the UI before its production slice is complete, but the production slice remains required before release.

35. DEFINITION OF READY

Task can enter READY if:
✓ Requirement known
✓ Scope known
✓ Domain known or explicitly prototype-only
✓ API known or prototype adapter explicitly defined
✓ DB impact known or explicitly none for prototype
✓ UI known
✓ Permission known
✓ Acceptance criteria known

36. DEFINITION OF DONE

Production task:
✓ Code complete
✓ Tests pass
✓ Authorization verified
✓ Scope verified
✓ UX states complete
✓ Documentation updated

Prototype task:
✓ Screen complete
✓ Mock interaction complete
✓ Responsive
✓ Visual QA passed
✓ Demo path works
✓ No production contract damage

37. TRACEABILITY COMPLETION RULE

Tidak boleh ada requirement yang tidak memiliki Implementation + Test/Prototype QA evidence.
Tidak boleh ada implementation yang tidak memiliki requirement atau documented technical reason.

38. ARCHITECTURE DRIFT CONTROL

Jika developer ingin menambahkan new module, new database table, new API, new external service, atau new infrastructure yang tidak ada dalam baseline:

Architecture Review Required.

Prototype-only additions must remain clearly marked as prototype-only.

39. MVP BOUNDARY CONTROL

Jika sebuah feature tidak dibutuhkan untuk core journey: Defer.

MVP harus tetap:
Small
Coherent
Usable
Testable
Deployable

Prototype juga mengikuti batas ini: jangan menambah fitur hanya demi terlihat ramai.

40. CORE MVP DEFINITION

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

Dengan:
Authorization
Scope Isolation
Audit
Validation
Testing

41. FINAL MVP ACCEPTANCE MATRIX

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

42. FINAL EXECUTION SEQUENCE — v1.1

QIMA delivery now follows:

01. Preserve existing verified baseline
        ↓
02. Build Frontend Prototype
        ↓
03. Validate Demo / Meeting Journey
        ↓
04. Continue backend from verified Phase 2/3 state
        ↓
05. Complete remaining domain vertical slices
        ↓
06. Integrate prototype UI with production APIs
        ↓
07. Production QA + Security Hardening
        ↓
08. QIMA Production Deployment
        ↓
09. RQ Blumbang Production Deployment
        ↓
10. Multi-unit / Multi-deployment expansion
        ↓
11. Scale

The sequence changes delivery priority, not the architecture.

43. MASTER CONTROL LOOP

SELECT TASK
    ↓
CHECK CONTRACT
    ↓
CHECK EXISTING VERIFIED IMPLEMENTATION
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

If test fails: FIX → RETEST.
If contract conflict: STOP → ARCHITECTURE DECISION → UPDATE CONTRACT → CONTINUE.

44. MASTER STATUS MODEL

NOT STARTED
READY
IN PROGRESS
IMPLEMENTED
TESTING
VERIFIED
RELEASED
DEFERRED
BLOCKED

VERIFIED means implementation + tests + acceptance have been satisfied.

Prototype-specific status:
PROTOTYPE READY
DEMO READY

Prototype READY does not mean production VERIFIED.

45. FINAL SYSTEM TRACEABILITY

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

Prototype may temporarily stop at:
REQUIREMENT → CAPABILITY → MODULE → SCREEN → MOCK DATA → PROTOTYPE QA → DEMO.

46. FINAL IMPLEMENTATION LAW

QIMA implementation harus selalu menjawab tiga pertanyaan:

WHAT?
Requirement apa yang sedang dibangun?

WHERE?
Module / layer / repository mana yang bertanggung jawab?

PROOF?
Test atau QA evidence apa yang membuktikan requirement tersebut benar?

Jika salah satu tidak dapat dijawab:
Implementation is NOT READY.

47. MASTER EXECUTION COMMAND

PROTOTYPE-FIRST DELIVERY
 ↓
DEMO VALIDATION
 ↓
REUSE VERIFIED FOUNDATION
 ↓
PRODUCTION CORE OPERATIONS
 ↓
PRODUCTION INTEGRATION
 ↓
HARDENING
 ↓
QA
 ↓
QIMA DEPLOYMENT
 ↓
RQ BLUMBANG DEPLOYMENT
 ↓
FUTURE UNIT DEPLOYMENTS

Tidak melompat ke production release sebelum foundation, scope security, QA, dan release gates selesai.

48. QIMA v1.1 COMPLETION CRITERIA

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
✓ E2E critical journey passes
✓ Production QA passes
✓ QIMA deployment passes
✓ RQ Blumbang deployment passes
✓ No unresolved P0 security issue

49. NON-NEGOTIABLE EXECUTION RULES

1. Prototype-first is a delivery strategy, not a replacement architecture.
2. DOC 01–09 remain the production source of truth.
3. DOC 11 governs frontend prototype/demo execution.
4. Existing verified Phase 2 and Phase 3 work must not be rebuilt without an explicit defect/gap.
5. Existing verified Phase 4–6 work must be reused where applicable.
6. Prototype mock data must never be treated as production data.
7. Prototype shortcuts must not become production architecture.
8. RQ Blumbang must not become a codebase fork.
9. QIMA and RQ Blumbang are separate production deployments/domains from the same shared repository/core.
10. Future units follow the same shared-core / multiple-deployment model.
11. Secrets must never be committed.
12. Visual experiments must not override architecture, security, scope isolation, or accessibility requirements.
13. Production release remains blocked until all required release gates pass.

50. FINAL ARCHITECTURE + EXECUTION STATEMENT

ONE PLATFORM CORE
        ↓
MULTIPLE INDEPENDENT UNITS
        ↓
MULTIPLE DEPLOYMENTS
        ↓
ONE SHARED ARCHITECTURE

Delivery order:
PROTOTYPE FIRST
        ↓
DEMO VALIDATION
        ↓
PRODUCTION CONTINUATION
        ↓
INTEGRATION
        ↓
HARDENING
        ↓
QIMA + RQ BLUMBANG DEPLOYMENT
        ↓
SCALE

This v1.1 execution plan changes what gets delivered first; it does not discard verified engineering work and does not create a second architecture.