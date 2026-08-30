QIMA — UX/UI DESIGN SYSTEM & SCREEN SPECIFICATION v1.0

Status: Architecture Baseline
Version: 1.0
System: QIMA
Layer: UX / UI / Screen Specification
Depends On:

QIMA — PRODUCT VISION & POSITIONING
QIMA — MVP SCOPE & BOUNDARY
QIMA — MODULE COMPOSITION & USER JOURNEY CONTRACT
QIMA — TECHNICAL ARCHITECTURE & IMPLEMENTATION BLUEPRINT
QIMA — DATABASE SCHEMA, API CONTRACT & DOMAIN SPECIFICATION
1. PURPOSE

Dokumen ini mendefinisikan kontrak UX/UI QIMA sebelum implementation.

Dokumen mencakup:

Design principles
Information architecture
Navigation
Layout system
Design tokens
Component system
Responsive behavior
Screen inventory
Screen responsibilities
User interaction rules
Loading/error/empty states
Accessibility
Role-aware UI
Public site
Admin application
Multi-unit experience

Dokumen ini tidak menentukan implementasi framework tertentu.

2. UX NORTH STAR

QIMA harus terasa:

SIMPLE
CLEAR
FAST
TRUSTWORTHY
CONSISTENT
CALM
OPERATIONAL

User tidak boleh dipaksa memahami struktur teknis QIMA.

Sistem harus menjawab:

"Saya sedang berada di mana, saya bisa melakukan apa, dan langkah berikutnya apa?"

3. PRIMARY UX PRINCIPLES
3.1 Clarity First

Setiap screen harus memiliki:

Page Title
Context
Primary Action
Main Content
Relevant Secondary Actions
3.2 Progressive Disclosure

Jangan menampilkan semua informasi sekaligus.

Overview
   ↓
Detail
   ↓
Action
   ↓
Advanced Options
3.3 Context Awareness

UI harus selalu mengetahui:

Current User
Current Organization
Current Unit
Current Site
Current Role

Jika user memiliki beberapa Unit, UI harus menyediakan Unit Switcher.

3.4 Consistency

Komponen yang melakukan fungsi sama harus memiliki:

visual behavior yang sama
interaction behavior yang sama
terminology yang sama
3.5 Operational Efficiency

Admin/staff yang melakukan pekerjaan berulang harus dapat menyelesaikannya dengan sedikit langkah.

Target:

Find
→ Understand
→ Act
→ Confirm
4. INFORMATION ARCHITECTURE

QIMA terdiri dari dua primary surfaces:

PUBLIC EXPERIENCE
        +
ADMIN APPLICATION
5. PUBLIC EXPERIENCE

Public experience digunakan oleh visitor/participant.

Struktur:

Home
├── About
├── Programs
├── Activities / Events
├── Articles / Content
├── FAQ
└── Contact

Primary objective:

Discover
→ Understand
→ Trust
→ Take Action
6. ADMIN APPLICATION

Admin structure:

Dashboard

Organization
├── Organization Profile
└── Organization Settings

Units
├── Unit List
├── Unit Detail
└── Unit Settings

Programs
├── Program List
├── Program Detail
└── Program Form

Activities
├── Activity List
├── Activity Detail
└── Activity Form

Participants
├── Participant List
├── Participant Detail
└── Participant Form

Registrations
├── Registration List
└── Registration Detail

Attendance
├── Activity Attendance
└── Attendance History

Content
├── Content List
├── Content Editor
└── Published Content

Reports
├── Participants
├── Programs
├── Activities
└── Attendance

Users & Access
├── Users
├── Roles
└── Permissions

Audit
└── Audit Log

Settings
└── System / Unit Settings
7. GLOBAL ADMIN LAYOUT

Desktop:

┌─────────────────────────────────────────────────────┐
│ Top Bar                                             │
├─────────────┬───────────────────────────────────────┤
│             │                                       │
│ Sidebar     │ Main Content                          │
│             │                                       │
│ Navigation  │                                       │
│             │                                       │
│             │                                       │
└─────────────┴───────────────────────────────────────┘

Mobile:

┌───────────────────────┐
│ Header                │
├───────────────────────┤
│                       │
│ Main Content          │
│                       │
│                       │
├───────────────────────┤
│ Bottom / Menu Action  │
└───────────────────────┘
8. GLOBAL HEADER

Header minimum elements:

Logo / QIMA Identity
Organization / Unit Context
Search
Notifications
User Menu

Depending on screen width, elements may collapse.

9. SIDEBAR

Sidebar contains primary navigation.

Example:

Dashboard

OPERATIONS
Programs
Activities
Participants
Registrations
Attendance

CONTENT
Content

REPORTING
Reports

MANAGEMENT
Units
Users & Access
Audit

SETTINGS
Settings

Navigation items are permission-aware.

A user must not see navigation items for capabilities they cannot access.

10. UNIT SWITCHER

For multi-unit users:

┌───────────────────────────┐
│ Current Unit              │
│ Rumah Qur'an A       ▾    │
└───────────────────────────┘

Switching Unit:

Current Unit
     ↓
Select Unit
     ↓
Update Context
     ↓
Refresh Scoped Data

No operational data from the previous Unit may remain visible after context switching.

11. DESIGN TOKEN SYSTEM

QIMA should use semantic tokens rather than hardcoded visual values.

11.1 Color Roles

Semantic roles:

primary
secondary
background
surface
surface-muted
text-primary
text-secondary
border
success
warning
danger
info

The implementation may map these roles to actual color values.

11.2 Typography

Hierarchy:

Display
H1
H2
H3
Body Large
Body
Body Small
Caption
Label

Typography must prioritize readability over decorative styling.

12. SPACING SYSTEM

Use consistent spacing scale.

Baseline:

4
8
12
16
24
32
40
48
64

Components should use spacing tokens rather than arbitrary values.

13. BORDER RADIUS

Use a limited radius scale:

sm
md
lg
full

Avoid excessive variation.

14. ELEVATION

Elevation levels:

none
low
medium
high

Use elevation primarily for:

dropdowns
dialogs
floating elements
important cards

Do not make every surface appear elevated.

15. CORE COMPONENT SYSTEM

QIMA UI must establish reusable components.

Minimum:

Button
IconButton
Input
Textarea
Select
Combobox
Checkbox
Radio
Switch
DatePicker
SearchInput

Card
Badge
Avatar
Table
DataTable
Tabs
Breadcrumb
Pagination

Modal
Drawer
Dropdown
Tooltip
Toast
Alert
ConfirmDialog

Skeleton
Spinner
EmptyState
ErrorState

Form
FormField
FormSection
16. BUTTON SYSTEM

Variants:

Primary
Secondary
Tertiary
Danger
Ghost

States:

Default
Hover
Focus
Pressed
Disabled
Loading

Primary action harus jelas.

Contoh:

+ Tambah Program
Simpan
Terbitkan
Catat Kehadiran
17. FORM DESIGN

Form harus dikelompokkan berdasarkan logical sections.

Contoh:

Program

[ Informasi Dasar ]

Nama Program
Deskripsi

[ Periode ]

Tanggal Mulai
Tanggal Selesai

[ Kapasitas ]

Kapasitas

[ Actions ]

Batal      Simpan

Form tidak boleh menjadi satu blok panjang tanpa grouping.

18. VALIDATION UX

Validation harus muncul dekat dengan field terkait.

Contoh:

Nama Program
[________________]

Nama program wajib diisi.

Tidak hanya menampilkan:

Error: Validation failed

di bagian atas.

19. TABLE SYSTEM

DataTable digunakan untuk operational data.

Minimum:

Column
Sort
Filter
Search
Pagination
Row Action
Bulk Action (jika diperlukan)

Contoh:

Participants

Search participants...

Name       Status      Program       Actions
──────────────────────────────────────────────
Ahmad      Active      Tahfidz       View
Fatimah    Active      Tahfidz       View
20. MOBILE TABLE BEHAVIOR

Table tidak boleh sekadar overflow tanpa strategy.

Pada mobile:

Primary information
+
Contextual row action
+
Detail drawer/page

Column sekunder dapat dipindahkan ke detail view.

21. EMPTY STATE

Setiap list harus memiliki empty state.

Format:

[Illustration/Icon]

Belum ada program

Belum ada program yang dibuat untuk unit ini.

[ + Tambah Program ]

Empty state harus memberikan next action bila memungkinkan.

22. LOADING STATE

Gunakan skeleton untuk page/list yang membutuhkan waktu.

Contoh:

████████████
██████ █████

████████████
██████ █████

Spinner digunakan untuk action singkat:

[Simpan...]
23. ERROR STATE

Error harus menjelaskan:

Apa yang terjadi
Apa yang dapat dilakukan user

Contoh:

Data belum dapat dimuat.

Silakan coba lagi.

[ Coba Lagi ]

Jangan menampilkan technical stack trace kepada user.

24. CONFIRMATION PATTERN

Untuk destructive action:

Hapus Program?

Program ini akan dihapus dan tidak lagi muncul dalam daftar aktif.

[Batal] [Hapus]

Untuk action biasa:

Simpan perubahan?

Confirmation tidak boleh digunakan secara berlebihan.

25. TOAST

Toast digunakan untuk feedback singkat.

Success:

Program berhasil disimpan.

Error:

Perubahan gagal disimpan.

Toast tidak boleh menjadi satu-satunya tempat untuk informasi kritis.

26. DASHBOARD SCREEN

Route:

/dashboard

Purpose:

Memberikan operational overview.

Structure:

Dashboard
────────────────────────────

[Current Unit]

Summary Cards
├── Programs
├── Participants
├── Activities
└── Pending Registrations

Recent Activities

Upcoming Activities

Quick Actions

Dashboard tidak boleh menjadi tempat seluruh data ditampilkan.

27. PROGRAM LIST SCREEN

Route:

/programs

Elements:

Page Header
├── Title
└── + Tambah Program

Search / Filter

Program Table

Pagination

Primary action:

Tambah Program
28. PROGRAM DETAIL SCREEN

Route:

/programs/:id

Structure:

Breadcrumb

Program Name
Status
Actions

Overview
├── Description
├── Period
└── Capacity

Activities

Registrations

Participants

Actions

Detail screen menjadi hub untuk operational actions yang berkaitan dengan Program.

29. PROGRAM FORM SCREEN

Route:

/programs/new
/programs/:id/edit

Sections:

Basic Information
Schedule
Capacity
Status

Actions:

Cancel
Save Draft
Save
30. ACTIVITY LIST SCREEN

Route:

/activities

Primary information:

Activity
Program
Date
Location
Status

Actions:

View
Edit
Attendance
31. ACTIVITY DETAIL SCREEN

Route:

/activities/:id

Structure:

Activity Header

Overview
Program
Schedule
Location

Participants

Attendance

Actions

Primary operational action:

Catat Kehadiran
32. ATTENDANCE SCREEN

Route:

/activities/:id/attendance

Structure:

Activity
Date

Participant          Status
────────────────────────────
Ahmad                Present
Fatimah              Present
Ali                  Absent

[ Simpan Kehadiran ]

Status selection harus cepat digunakan.

33. PARTICIPANT LIST

Route:

/participants

Features:

Search
Filter
Status
Program
Pagination

Primary action:

+ Tambah Peserta
34. PARTICIPANT DETAIL

Route:

/participants/:id

Structure:

Participant

Profile
Contact
Status

Programs
Registrations

Attendance History
35. REGISTRATION LIST

Route:

/registrations

Columns:

Participant
Program
Registered At
Status
Actions

Status:

PENDING
APPROVED
REJECTED
CANCELLED
36. REGISTRATION DETAIL

Route:

/registrations/:id

Display:

Participant
Program
Registration Date
Status
History

Authorized users may:

Approve
Reject
Cancel

depending on permission.

37. CONTENT LIST

Route:

/content

Content types:

Page
Article
Announcement
Event
FAQ

Filters:

Type
Status
Author
Date
38. CONTENT EDITOR

Route:

/content/new
/content/:id/edit

Structure:

Title
Slug
Content
Excerpt
Status
Publishing

Actions:

Save Draft
Preview
Publish
39. REPORT SCREEN

Route:

/reports

Report categories:

Participants
Programs
Activities
Attendance

Reports must be scoped to authorized organization/unit context.

40. UNIT MANAGEMENT

Route:

/units

Unit list:

Name
Type
Status
Site
Actions

Unit detail:

Profile
Branding
Settings
Users
Programs
Content
Sites
41. USER MANAGEMENT

Route:

/users

Structure:

Users
├── Name
├── Email
├── Status
├── Role
└── Scope

User detail must expose only information the current user is authorized to view.

42. ACCESS MANAGEMENT

Role assignment UX:

User
 ↓
Organization Scope
 ↓
Unit Scope
 ↓
Role
 ↓
Permissions

Do not expose raw permission complexity to ordinary users unless necessary.

43. AUDIT LOG SCREEN

Route:

/audit

Columns:

Date
User
Action
Resource
Unit

Filters:

User
Action
Resource
Unit
Date

Audit detail:

Action
Actor
Timestamp
Resource
Scope
Metadata
44. SETTINGS SCREEN

Settings divided into:

Organization
Unit
Site
User
System

Users should not see configuration areas outside their permission scope.

45. PUBLIC HOME SCREEN

Route:

/

Structure:

Header
Hero
Introduction
Programs
Upcoming Activities
Latest Content
Call To Action
Footer

Primary objective:

Understand what this Unit does
        ↓
Discover available programs
        ↓
Take relevant action
46. PUBLIC PROGRAM SCREEN

Route:

/programs

Cards:

Program Name
Description
Period
Status
CTA

Program detail:

Program
Description
Schedule
Information
Registration CTA
47. PUBLIC CONTENT SCREEN

Article/page layout:

Title
Published Date
Author
Content
Related Content
CTA

Content should prioritize readability.

48. RESPONSIVE BREAKPOINT STRATEGY

QIMA should support:

Mobile
Tablet
Desktop
Large Desktop

Exact pixel breakpoints remain implementation-level decisions.

Behavior is more important than fixed breakpoint numbers.

49. RESPONSIVE RULES

Desktop:

Sidebar
Multi-column layout
Data tables

Tablet:

Condensed navigation
Reduced columns
Responsive cards

Mobile:

Single column
Collapsed navigation
Bottom/inline actions
Detail-first data presentation

Primary actions must remain accessible.

50. ACCESSIBILITY

Minimum requirements:

Keyboard navigable
Visible focus state
Semantic HTML
Accessible labels
Sufficient contrast
Form error association
Screen-reader friendly controls
No color-only meaning

Interactive elements must have accessible names.

51. ROLE-AWARE UI

UI visibility follows permission.

Concept:

Permission
    ↓
Capability
    ↓
Navigation Visibility
    ↓
Action Visibility

However:

UI hiding is NOT authorization.

Backend authorization remains authoritative.

52. SECURITY UX

Sensitive operations should use:

Confirmation
Permission feedback
Session awareness
Clear error messages

Never expose:

password
password hash
internal authorization details
private system secrets
53. SEARCH UX

Global search should eventually support:

Participants
Programs
Activities
Content

Search results must respect current authorization scope.

No unauthorized resource may appear in search results.

54. NOTIFICATION UX

Notifications may include:

Registration pending
Registration approved
Activity reminder
System notification

Notification system remains extensible and does not need to be fully implemented in MVP unless required by scope.

55. NAVIGATION RULE

Navigation must follow information hierarchy.

User should not need to understand database structure.

Bad:

Entities
Aggregates
Resources

Good:

Program
Peserta
Kegiatan
Kehadiran
Laporan
56. TERMINOLOGY RULE

Use consistent Indonesian operational terminology for end users.

Example:

Participant → Peserta
Program → Program
Activity → Kegiatan
Registration → Pendaftaran
Attendance → Kehadiran
Content → Konten
Report → Laporan
Unit → Unit
Organization → Organisasi

Technical terminology may remain English inside developer-facing contracts.

57. SCREEN STATE MODEL

Every major screen must account for:

Initial
Loading
Success
Empty
Error
Unauthorized
Not Found

Example:

Screen
 ├── Loading
 ├── Loaded
 │    ├── Has Data
 │    └── Empty
 ├── Error
 ├── Unauthorized
 └── Not Found
58. PAGE ACTION HIERARCHY

Each screen should have:

1 Primary Action
0–3 Secondary Actions
Contextual Actions

Avoid presenting ten equally prominent buttons.

59. MODAL POLICY

Use modal for:

Confirmation
Short form
Focused action

Do not use modal for:

Large operational workflow
Complex editing
Long forms

Use dedicated page/drawer instead.

60. DRAWER POLICY

Drawer is appropriate for:

Quick details
Filters
Secondary contextual information
Quick edit

Drawer should not become a hidden second application.

61. UI DATA CONTRACT

UI consumes API contract.

UI must not assume undocumented fields.

Flow:

API Contract
     ↓
Typed Client Model
     ↓
View Model
     ↓
UI Component
62. ERROR MAPPING

API error codes should map to human-readable UI states.

Example:

RESOURCE_NOT_FOUND
→ Data tidak ditemukan.

FORBIDDEN
→ Anda tidak memiliki akses.

VALIDATION_ERROR
→ Periksa kembali data yang dimasukkan.

CONFLICT
→ Data sudah ada / terjadi konflik.

INTERNAL_SERVER_ERROR
→ Terjadi kesalahan. Silakan coba lagi.
63. PERFORMANCE UX

UI should prioritize:

Fast first render
Progressive loading
Skeleton states
Pagination
Lazy loading where appropriate
Optimistic UI only where safe

Do not load large operational datasets unnecessarily.

64. PUBLIC VS ADMIN DESIGN

Public:

Trust
Story
Discovery
Accessibility
Conversion

Admin:

Efficiency
Density
Clarity
Operations
Data accuracy

They may share design tokens and components, but should not be forced into identical layouts.

65. COMPONENT ARCHITECTURE

Conceptual structure:

Design Tokens
      ↓
Primitive Components
      ↓
Composite Components
      ↓
Domain Components
      ↓
Screen Components
      ↓
Page / Route

Example:

Button
 ↓
FormField
 ↓
ProgramForm
 ↓
ProgramCreateScreen
66. DOMAIN UI COMPONENTS

Reusable domain components:

ProgramCard
ProgramStatusBadge
ParticipantStatusBadge
RegistrationStatusBadge
ActivityCard
AttendanceTable
ParticipantSummary
UnitSwitcher
ScopeIndicator
AuditTimeline
67. SCREEN INVENTORY
Public
PUB-01 Home
PUB-02 About
PUB-03 Programs
PUB-04 Program Detail
PUB-05 Activities
PUB-06 Activity Detail
PUB-07 Content
PUB-08 Content Detail
PUB-09 FAQ
PUB-10 Contact
Admin
ADM-01 Login
ADM-02 Dashboard

ADM-03 Unit List
ADM-04 Unit Detail
ADM-05 Unit Settings

ADM-06 Program List
ADM-07 Program Detail
ADM-08 Program Create
ADM-09 Program Edit

ADM-10 Activity List
ADM-11 Activity Detail
ADM-12 Activity Create/Edit
ADM-13 Attendance

ADM-14 Participant List
ADM-15 Participant Detail
ADM-16 Participant Create/Edit

ADM-17 Registration List
ADM-18 Registration Detail

ADM-19 Content List
ADM-20 Content Editor

ADM-21 Reports
ADM-22 Users
ADM-23 Roles & Access
ADM-24 Audit
ADM-25 Settings
68. SCREEN PRIORITY
P0 — MVP Critical
ADM-01 Login
ADM-02 Dashboard

ADM-06 Program List
ADM-07 Program Detail
ADM-08 Program Create
ADM-09 Program Edit

ADM-10 Activity List
ADM-11 Activity Detail
ADM-13 Attendance

ADM-14 Participant List
ADM-15 Participant Detail
ADM-16 Participant Create/Edit

ADM-17 Registration List
ADM-18 Registration Detail

ADM-03 Unit List
ADM-04 Unit Detail

PUB-01 Home
PUB-03 Programs
PUB-04 Program Detail
P1
Content
Reports
Users
Settings
Audit
Advanced public pages
P2
Advanced notifications
Advanced analytics
Advanced search
Additional automation
69. USER JOURNEY → SCREEN MAPPING

Primary journey:

Visitor
 ↓
Public Home
 ↓
Programs
 ↓
Program Detail
 ↓
Registration

Operational journey:

Admin Login
 ↓
Dashboard
 ↓
Program
 ↓
Activity
 ↓
Attendance
 ↓
Report

Participant journey:

Participant
 ↓
Program
 ↓
Registration
 ↓
Approval
 ↓
Activity
 ↓
Attendance

Management journey:

Organization Admin
 ↓
Unit
 ↓
Users
 ↓
Programs
 ↓
Reports
 ↓
Audit
70. UI → DOMAIN TRACEABILITY
Dashboard
 → Programs
 → Participants
 → Activities
 → Registrations

Program Screen
 → programs

Activity Screen
 → activities

Participant Screen
 → participants

Registration Screen
 → registrations

Attendance Screen
 → attendance_records

Content Screen
 → contents

Unit Screen
 → units

Access Screen
 → users
 → roles
 → permissions

Audit Screen
 → audit_logs
71. DEFINITION OF DONE

UX/UI v1.0 dianggap siap untuk implementation apabila:

Information architecture defined

Public/Admin surfaces defined

Navigation defined

Role-aware navigation defined

Unit switching defined

Design tokens defined

Core components defined

Responsive behavior defined

Loading/empty/error states defined

Accessibility baseline defined

Screen inventory defined

Screen priorities defined

User journeys mapped

UI/domain traceability established

API/UI contract boundary established

72. NEXT DOCUMENT

Setelah UX/UI Design System & Screen Specification v1.0 dikunci:

QIMA — DATABASE SCHEMA, API CONTRACT & DOMAIN SPECIFICATION v1.0
                         ↓
QIMA — UX/UI DESIGN SYSTEM & SCREEN SPECIFICATION v1.0
                         ↓
QIMA — IMPLEMENTATION CONTRACT, REPOSITORY & MODULE STRUCTURE v1.0
                         ↓
QIMA — TESTING, QA & DELIVERY BLUEPRINT v1.0
                         ↓
QIMA — MASTER TRACEABILITY MATRIX + IMPLEMENTATION EXECUTION PLAN v1.0

Dokumen berikutnya harus menerjemahkan seluruh kontrak di atas menjadi struktur repository, module boundaries, implementation rules, dependency rules, coding contracts, environment contract, dan execution structure.
