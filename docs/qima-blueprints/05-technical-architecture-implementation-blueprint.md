QIMA — TECHNICAL ARCHITECTURE & IMPLEMENTATION BLUEPRINT v1.0

Document Type: Technical Architecture & Implementation Blueprint
System: QIMA
Version: v1.0
Status: BASELINE
Parent: QIMA — MODULE COMPOSITION & USER JOURNEY CONTRACT v1.0

1. PURPOSE

Dokumen ini menerjemahkan seluruh baseline QIMA sebelumnya
menjadi arsitektur teknis yang implementable.

Alur:

QIMA PLATFORM
      ↓
ORGANIZATION
      ↓
UNIT
      ↓
USER JOURNEY
      ↓N
MODULE
      ↓
SERVICE
      ↓
API
      ↓
DATABASE
      ↓
DEPLOYMENT

Tujuan:

memastikan developer/AI builder tidak membuat architecture
baru berdasarkan interpretasi sendiri.

2. ARCHITECTURAL PRINCIPLE

QIMA menggunakan:

SHARED CORE
+
MULTI-ORGANIZATION
+
MULTI-UNIT
+
CONFIGURABLE CAPABILITY
+
UNIT-SCOPED DATA
+
INDEPENDENT SITE DEPLOYMENT

Bukan:

CLONE PROJECT
+
MANUAL EDIT
+
MANUAL REBUILD
3. HIGH-LEVEL ARCHITECTURE
                    QIMA PLATFORM
                         │
              ┌──────────┴──────────┐
              │                     │
          PUBLIC WEB             ADMIN APP
              │                     │
              └──────────┬──────────┘
                         ↓
                    API LAYER
                         ↓
               APPLICATION SERVICES
                         ↓
                    DOMAIN CORE
                         ↓
                  DATA ACCESS LAYER
                         ↓
                     DATABASE

Supporting infrastructure:

Authentication
Authorization
Media Storage
Deployment
Logging
Audit
Configuration
4. APPLICATION LAYERS

QIMA menggunakan separation:

Presentation
     ↓
Application
     ↓
Domain
     ↓
Infrastructure
Presentation
Public site;
Admin dashboard;
authentication UI.
Application
use cases;
orchestration;
authorization context;
service coordination.
Domain
entities;
business rules;
domain validation;
domain contracts.
Infrastructure
database;
storage;
external providers;
deployment services.
5. FRONTEND ARCHITECTURE

Frontend terdiri dari dua experience:

apps/
├── web/
└── admin/
Web

Public-facing site.

Admin

Authenticated operational interface.

Keduanya menggunakan shared:

packages/
├── ui/
├── design-system/
├── types/
└── config/
6. BACKEND ARCHITECTURE

Backend terdiri dari:

API
 ↓
APPLICATION SERVICES
 ↓
DOMAIN MODULES
 ↓
REPOSITORIES
 ↓
DATABASE

Contoh:

ProgramController
      ↓
ProgramService
      ↓
ProgramDomain
      ↓
ProgramRepository
      ↓
Database
7. MODULE-BASED BACKEND

Backend tidak boleh menjadi satu file/service besar.

Logical modules:

modules/
├── identity/
├── organization/
├── units/
├── access/
├── configuration/
├── sites/
├── content/
├── programs/
├── activities/
├── participants/
├── registrations/
├── media/
├── reporting/
└── audit/
8. DOMAIN OWNERSHIP

Setiap module memiliki ownership terhadap domain-nya sendiri.

Contoh:

programs/
├── domain/
├── application/
├── infrastructure/
└── api/

Module lain tidak boleh mengakses internal implementation
secara langsung.

9. SERVICE BOUNDARY

Service bertanggung jawab terhadap use case.

Contoh:

ProgramService
├── createProgram()
├── updateProgram()
├── publishProgram()
├── archiveProgram()
└── getProgram()

Service tidak boleh menjadi dumping ground untuk seluruh
business logic.

10. DOMAIN LAYER

Domain layer berisi:

Entity
Value Object
Business Rule
Domain Validation
Domain Event

Domain tidak boleh bergantung langsung pada:

React;
HTTP;
database driver;
Cloudflare;
storage provider.
11. API LAYER

API menjadi boundary antara client dan application layer.

Base:

/api/v1/

Resources:

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
12. API RULE

API harus:

validate input;
authenticate request;
authorize request;
establish organization context;
establish unit context;
call application service;
return standardized response.
13. REQUEST CONTEXT

Setiap authenticated request menghasilkan:

RequestContext
├── userId
├── organizationId
├── unitId
├── roles
└── permissions

Context tidak boleh dipercaya hanya berdasarkan payload
frontend.

Server harus resolve dan validate context.

14. MULTI-ORGANIZATION MODEL

QIMA mendukung:

Organization A
 ├── Unit A1
 ├── Unit A2
 └── Unit A3

Organization B
 ├── Unit B1
 ├── Unit B2
 └── Unit B3

Tidak boleh terjadi accidental cross-organization access.

15. MULTI-UNIT MODEL

Satu organization dapat memiliki banyak Unit.

Contoh:

Qur'an Institute Mas'ud
│
├── Pondok Pesantren
├── RQ Blumbang
├── RQ 02
├── RQ 03
├── ...
└── RQ 10

Semua menggunakan QIMA Core.

16. DATA ISOLATION

Default query behavior:

organization_id = currentOrganization
AND
unit_id = currentUnit

Untuk organization-level query:

organization_id = currentOrganization

Untuk platform-level query:

explicit platform authorization required
17. AUTHORIZATION ARCHITECTURE

Authorization:

User
 ↓
Role
 ↓
Permission
 ↓
Scope
 ↓
Action

Contoh:

program.update

dapat memiliki scope:

OWN_UNIT
ORGANIZATION
PLATFORM
18. DATABASE ARCHITECTURE

Database menggunakan relational model.

Core tables:

organizations
units
users
roles
permissions
user_unit_assignments
role_permissions
brand_profiles
pages
articles
announcements
programs
activities
participants
registrations
media_assets
reports
audit_logs
sites
domain_mappings
unit_capabilities
unit_configurations

Exact schema ditentukan pada Database/API Specification.

19. DATABASE OWNERSHIP

Semua operational tables yang unit-scoped harus memiliki
unit_id.

Contoh:

programs.unit_id
activities.unit_id
participants.unit_id
registrations.unit_id
media_assets.unit_id

Organization-level tables menggunakan:

organization_id
20. DATABASE SAFETY

Application tidak boleh menerima arbitrary unit_id lalu
langsung melakukan query.

Incorrect:

GET /programs?unit_id=other-unit

Correct:

current authenticated context
        ↓
authorization
        ↓
allowed unit scope
        ↓
query
21. DATA ACCESS LAYER

Repositories menjadi abstraction terhadap persistence.

Contoh:

ProgramRepository
ActivityRepository
RegistrationRepository
ParticipantRepository

Service menggunakan repository contract.

Domain tidak mengetahui database implementation.

22. TRANSACTION BOUNDARY

Transaction digunakan ketika satu business operation
membutuhkan beberapa perubahan data yang harus konsisten.

Contoh:

Approve Registration
      ↓
Update Registration
      ↓
Create Participant
      ↓
Create Audit Log

Operation tersebut harus memiliki consistency strategy.

23. AUTHENTICATION

Authentication provider bersifat replaceable.

Architecture harus memisahkan:

Authentication Provider
        ↓
QIMA User Identity

Sehingga QIMA tidak mengikat domain User langsung pada
provider tertentu.

24. MEDIA ARCHITECTURE

Media flow:

UPLOAD
  ↓
STORAGE
  ↓
MEDIA_ASSET
  ↓
REFERENCE
  ↓
CONTENT

Database menyimpan metadata/reference, bukan file binary
besar secara langsung kecuali terdapat alasan teknis yang
jelas.

25. BRAND ARCHITECTURE

Brand configuration:

Unit
 ↓
BrandProfile
 ↓
Design Tokens
 ↓
Public Site

Minimal token:

colors
typography
spacing
radius
logo
favicon
hero
background
26. VISUAL ASSET PIPELINE

Reference asset:

SOURCE
 ↓
REFERENCE
 ↓
ADAPTATION
 ↓
APPROVAL
 ↓
PRODUCTION

AI-assisted adaptation dapat digunakan sebagai tooling,
tetapi final asset tetap harus dapat diganti tanpa
mengubah application code.

27. DESIGN SYSTEM

QIMA menggunakan shared design system:

Button
Input
Select
Modal
Table
Card
Badge
Tabs
Navigation
Sidebar
Header
Footer
Hero
Section
Form

Unit branding mengubah tokens, bukan menggandakan
component library.

28. PUBLIC SITE ARCHITECTURE

Public site terdiri dari:

Site Shell
├── Header
├── Navigation
├── Content
├── Footer
└── Theme

Content bersifat unit-aware.

29. ADMIN ARCHITECTURE

Admin shell:

AdminShell
├── Sidebar
├── Header
├── UnitSwitcher
├── MainContent
└── Notification

Menu dihasilkan berdasarkan:

role
+
permissions
+
unit capabilities
30. ROUTING

Public:

/
 /tentang
 /program
 /program/[slug]
 /kegiatan
 /pendaftaran
 /media
 /kontak

Admin:

/admin
/admin/programs
/admin/activities
/admin/registrations
/admin/participants
/admin/content
/admin/media
/admin/reports
/admin/users
/admin/roles
/admin/units
/admin/settings
/admin/audit

Exact route naming dapat disesuaikan implementasi final.

31. SITE RESOLUTION

Request public:

hostname
   ↓
DomainMapping
   ↓
Site
   ↓
Unit
   ↓
Brand + Content

Dengan demikian:

URL
 ↓
SITE
 ↓
UNIT
 ↓
DATA
32. INDEPENDENT DEPLOYMENT MODEL

QIMA dirancang untuk:

ONE CORE REPOSITORY
       ↓
MULTIPLE DEPLOYMENTS
       ↓
MULTIPLE UNIT SITES

Contoh:

QIMA Repository
│
├── RQ Blumbang deployment
├── Pondok deployment
├── RQ 02 deployment
├── RQ 03 deployment
└── ...

Deployment configuration menentukan Unit target.

33. DEPLOYMENT CONFIGURATION

Conceptual environment:

QIMA_ORGANIZATION_ID
QIMA_UNIT_ID
QIMA_SITE_ID
DATABASE_URL
STORAGE_CONFIG
AUTH_CONFIG

Secret tidak boleh ditulis ke source code.

34. CUSTOM DOMAIN

Architecture mendukung:

Platform URL
       ↓
Custom Domain
       ↓
DomainMapping
       ↓
Site
       ↓
Unit

Custom domain tidak boleh mengubah business logic.

35. ENVIRONMENT STRATEGY

Minimum:

development
staging
production

Flow:

development
     ↓
staging
     ↓
production

Production deployment tidak boleh bergantung pada
developer-local configuration.

36. CONFIGURATION STRATEGY

Configuration dibagi:

Platform Config

Global QIMA behavior.

Organization Config

Organization-level settings.

Unit Config

Unit capabilities and identity.

Site Config

Public site presentation.

Tidak semua configuration boleh override platform
security rules.

37. SECURITY BASELINE

Minimum:

authentication;
authorization;
input validation;
output sanitization;
secure secrets;
rate limiting where appropriate;
audit logging;
least privilege;
unit isolation;
organization isolation.
38. API ERROR CONTRACT

Standard structure:

{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}

Internal stack traces tidak boleh dikirim ke public client.

39. API SUCCESS CONTRACT

Concept:

{
  "success": true,
  "data": {},
  "meta": {}
}

Exact response schema akan dikunci pada API Contract.

40. OBSERVABILITY

Minimum:

Application Logs
Error Tracking
Audit Logs
Deployment Logs

Operational logs dan audit logs memiliki fungsi berbeda.

41. AUDIT ARCHITECTURE

Important mutations:

CREATE
UPDATE
DELETE
PUBLISH
APPROVE
REJECT
ROLE CHANGE
PERMISSION CHANGE
CONFIGURATION CHANGE

menghasilkan audit record sesuai policy.

42. CACHING

Caching hanya digunakan setelah ownership dan invalidation
jelas.

Public content dapat dicache.

Administrative mutations harus memiliki invalidation
strategy.

Jangan menambahkan caching kompleks hanya demi performance
sebelum diperlukan.

43. PERFORMANCE PRINCIPLES

Prioritas:

Correctness
 ↓
Security
 ↓
Maintainability
 ↓
Performance

Optimization dilakukan berdasarkan actual bottleneck.

44. FILE / REPOSITORY STRATEGY

Target konseptual:

qima/
│
├── apps/
│   ├── web/
│   └── admin/
│
├── modules/
│   ├── identity/
│   ├── organization/
│   ├── units/
│   ├── access/
│   ├── configuration/
│   ├── sites/
│   ├── content/
│   ├── programs/
│   ├── activities/
│   ├── participants/
│   ├── registrations/
│   ├── media/
│   ├── reporting/
│   └── audit/
│
├── packages/
│   ├── ui/
│   ├── design-system/
│   ├── types/
│   └── config/
│
├── infrastructure/
│
├── docs/
│
└── tests/

Repository structure final akan dikunci pada
Implementation Contract.

45. SHARED VS UNIT-SPECIFIC CODE
Shared
business primitives
domain contracts
UI components
services
API patterns
security
database infrastructure
Unit-specific
brand
content
configuration
enabled capabilities
specific extension modules

Unit-specific code harus menjadi pengecualian, bukan
default.

46. RQ BLUMBANG MIGRATION PRINCIPLE

RQ Blumbang tidak langsung dibuang.

Flow:

EXISTING RQ-IBL
      ↓
AUDIT
      ↓
CLASSIFY
 ┌────┼──────────────┐
 ↓    ↓              ↓
KEEP ADAPT          REPLACE
      ↓
QIMA CORE
      ↓
RQ BLUMBANG UNIT

Tujuannya menghindari kehilangan fitur penting yang sudah
terbukti.

47. LEGACY CODE RULE

Code existing hanya dipindahkan ke QIMA apabila:

sesuai domain;
sesuai security model;
sesuai multi-unit architecture;
sesuai module boundary;
dapat dipertahankan.

Jangan memindahkan legacy code secara blind.

48. TEST ARCHITECTURE

Testing layers:

Unit Tests
     ↓
Domain Tests
     ↓
Service Tests
     ↓
API Tests
     ↓
Integration Tests
     ↓
E2E Tests

Critical flows wajib memiliki E2E coverage.

49. CRITICAL E2E FLOWS

Minimum:

Login
Unit Selection
Program Creation
Program Publishing
Public Program View
Registration Submission
Registration Review
Participant Creation
Brand Configuration
Site Resolution
Authorization Boundary
Cross-Unit Isolation
50. DEPLOYMENT PIPELINE

Concept:

COMMIT
 ↓
LINT
 ↓
TYPECHECK
 ↓
UNIT TEST
 ↓
BUILD
 ↓
INTEGRATION TEST
 ↓
DEPLOY STAGING
 ↓
E2E
 ↓
APPROVAL
 ↓
PRODUCTION

Exact CI provider dapat ditentukan kemudian.

51. DATABASE MIGRATION RULE

Database changes harus versioned.

Migration 001
Migration 002
Migration 003
...

Tidak boleh mengubah production database secara manual
tanpa migration strategy.

52. BACKUP & RECOVERY

Production database harus memiliki:

backup strategy;
restore procedure;
recovery verification.

Backup tidak dianggap valid hanya karena "backup job"
berhasil; restore harus dapat diuji.

53. SCALABILITY MODEL

QIMA harus scalable secara horizontal pada application
layer.

Concept:

Users
  ↓
Public/Admin Apps
  ↓
API
  ↓
Services
  ↓
Database / Storage

Scaling complexity tidak boleh dimasukkan sebelum
diperlukan.

54. ARCHITECTURAL INVARIANTS

Invariant yang tidak boleh dilanggar:

1. Unit data isolation
2. Organization isolation
3. Server-side authorization
4. Domain ownership
5. Service boundary
6. No direct UI → DB access
7. Shared core architecture
8. Configurable unit identity
9. Independent site identity
10. Versioned database changes
55. IMPLEMENTATION ORDER

Recommended implementation sequence:

PHASE 01
Foundation
 ↓
PHASE 02
Identity + Access
 ↓
PHASE 03
Organization + Unit
 ↓
PHASE 04
Configuration + Brand
 ↓
PHASE 05
Site
 ↓
PHASE 06
Programs
 ↓
PHASE 07
Activities
 ↓
PHASE 08
Registration + Participants
 ↓
PHASE 09
Content + Media
 ↓
PHASE 10
Reporting + Audit
 ↓
PHASE 11
RQ Blumbang Validation
 ↓
PHASE 12
Pondok Extensions
56. RQ BLUMBANG FIRST DELIVERY

RQ Blumbang menjadi validation target.

Minimum vertical slice:

QIMA CORE
  ↓
ORGANIZATION
  ↓
RQ BLUMBANG UNIT
  ↓
BRAND
  ↓
PUBLIC SITE
  ↓
ADMIN
  ↓
PROGRAM
  ↓
REGISTRATION
  ↓
REPORT

Jika vertical slice berhasil:

architecture dianggap tervalidasi secara praktis.

57. PONDOK SECOND DELIVERY

Setelah RQ Blumbang stabil:

QIMA CORE
  ↓
PONDOK UNIT
  ↓
PONDOK CAPABILITIES
  ↓
PONDOK EXTENSIONS

Jangan membangun seluruh Pondok domain sebelum core
QIMA terbukti.

58. IMPLEMENTATION GATE

Tidak boleh masuk coding besar sebelum tersedia:

✓ Master Platform Blueprint
✓ Capability Gap Matrix
✓ Capability → Data → Module Contract
✓ Module Composition & User Journey
✓ Technical Architecture

Berikutnya harus dikunci:

Database Schema
API Contract
Domain Specification
59. TRACEABILITY

Setiap implementation artifact harus dapat ditelusuri:

Requirement
 ↓
Capability
 ↓
Domain
 ↓
Module
 ↓
Journey
 ↓
Service
 ↓
API
 ↓
Entity
 ↓
Implementation
 ↓
Test
60. BASELINE DECISIONS
DECISION 01

QIMA menggunakan shared-core architecture.

DECISION 02

Organization dan Unit tetap dipisahkan.

DECISION 03

RQ Blumbang adalah validation unit pertama.

DECISION 04

Pondok merupakan extension unit type.

DECISION 05

Frontend tidak memiliki akses langsung ke database.

DECISION 06

Authorization dilakukan server-side.

DECISION 07

Semua unit-scoped data wajib terisolasi.

DECISION 08

Brand configuration bersifat data/configuration driven.

DECISION 09

Public site dapat dideploy secara independen per Unit.

DECISION 10

Custom domain dipetakan melalui Site/DomainMapping.

DECISION 11

Legacy RQ-IBL diaudit dan dimigrasikan secara selektif.

DECISION 12

Database migration harus versioned.

DECISION 13

Implementation dilakukan secara vertical slice,
bukan membangun semua module sekaligus.

61. NEXT DOCUMENT
QIMA — DATABASE SCHEMA, API CONTRACT & DOMAIN SPECIFICATION v1.0

Dokumen berikutnya akan mengunci:

ENTITY
 ↓
TABLE
 ↓
FIELD
 ↓
RELATIONSHIP
 ↓
CONSTRAINT
 ↓
INDEX
 ↓
API ENDPOINT
 ↓
REQUEST
 ↓
RESPONSE
 ↓
VALIDATION
 ↓
AUTHORIZATION
 ↓
ERROR

Setelah dokumen tersebut selesai, kita baru memiliki
fondasi yang cukup kuat untuk masuk ke:

UX/UI SYSTEM
        ↓
IMPLEMENTATION CONTRACT
        ↓
REPOSITORY STRUCTURE
        ↓
TESTING
        ↓
DELIVERY
STATUS

QIMA — TECHNICAL ARCHITECTURE & IMPLEMENTATION BLUEPRINT v1.0

STATUS: BASELINE COMPLETE

Arsitektur utama sekarang:

QIMA
│
├── Organization
│    ├── Unit
│    │    ├── Brand
│    │    ├── Site
│    │    └── Operational Data
│    │
│    └── Cross-Unit Governance
│
├── Shared Core
│
├── Public Web
│
├── Admin App
│
└── Deployment Layer

FIRST VALIDATION UNIT: RQ BLUMBANG

SECOND EXTENSION: PONDOK

TARGET: MULTI-UNIT / MULTI-SITE QIMA PLATFORM

NEXT:
QIMA — DATABASE SCHEMA, API CONTRACT & DOMAIN SPECIFICATION v1.0

END OF DOCUMENT
