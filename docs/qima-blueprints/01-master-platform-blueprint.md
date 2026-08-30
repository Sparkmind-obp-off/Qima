GASSSS 🔥 Kita **langsung execute DOC 01**, nggak berhenti di outline.

Ini menjadi fondasi paling atas untuk seluruh project sebelum kita turun ke capability, data model, module, technical architecture, sampai akhirnya Master System Prompt Genspark.

# QIMA — MASTER PLATFORM BLUEPRINT v1.0

**Document Type:** Master Platform Architecture
**System:** QIMA
**Version:** v1.0
**Status:** BASELINE — FOUNDATION
**Primary Objective:** Establish the complete platform foundation for a multi-unit Qur'an education ecosystem.

---

# 1. SYSTEM DEFINITION

QIMA adalah platform digital terpadu yang dirancang untuk menaungi dan mengelola beberapa lembaga/unit pendidikan Qur'an dalam satu ekosistem.

Platform harus mampu melayani:

* organisasi/yayasan pusat;
* pondok pesantren;
* Rumah Qur'an;
* unit pendidikan Qur'an lainnya yang dapat ditambahkan di masa depan.

QIMA bukan sekadar website.

QIMA adalah **platform multi-unit** yang menyediakan:

* public website;
* administrative dashboard;
* data management;
* content management;
* program management;
* registration;
* activity management;
* reporting;
* user & role management;
* auditability;
* branding per unit;
* deployment/site isolation.

---

# 2. CORE ARCHITECTURAL PRINCIPLE

QIMA menggunakan prinsip:

> **ONE PLATFORM CORE — MULTIPLE INDEPENDENT UNITS**

Artinya satu fondasi software dapat digunakan oleh banyak unit tanpa membuat ulang sistem dari awal.

Model konseptual:

```text
QIMA
│
├── PLATFORM CORE
│   ├── Identity
│   ├── Authentication
│   ├── Authorization
│   ├── Users
│   ├── Content
│   ├── Programs
│   ├── Activities
│   ├── Registration
│   ├── Reporting
│   ├── Dashboard
│   ├── Audit
│   └── Configuration
│
├── PONDOK PESANTREN
│
├── RUMAH QUR'AN 01
│   └── RQ BLUMBANG
│
├── RUMAH QUR'AN 02
│
├── RUMAH QUR'AN 03
│
├── ...
│
└── RUMAH QUR'AN 10
```

Jumlah unit tidak boleh dikunci secara permanen pada angka 10.

±10 Rumah Qur'an adalah **initial scope**, bukan batas teknis platform.

---

# 3. ARCHITECTURAL LEVELS

QIMA terdiri dari empat level utama.

## LEVEL 1 — PLATFORM

Menyediakan kemampuan bersama untuk seluruh ekosistem.

Contoh:

* authentication;
* authorization;
* user management;
* role management;
* configuration;
* audit;
* API;
* database;
* deployment infrastructure.

## LEVEL 2 — ORGANIZATION

Mewakili organisasi/yayasan induk.

Organization memiliki:

* identity;
* profile;
* governance;
* administrators;
* organizational configuration.

## LEVEL 3 — UNIT

Mewakili lembaga operasional.

Contoh:

* Pondok Pesantren;
* RQ Blumbang;
* RQ lainnya.

Setiap unit memiliki:

* profile;
* logo;
* visual identity;
* content;
* programs;
* activities;
* administrators;
* contact information;
* site configuration.

## LEVEL 4 — OPERATION

Berisi data dan aktivitas sehari-hari.

Contoh:

* peserta;
* pendaftaran;
* program;
* kegiatan;
* pengumuman;
* laporan;
* dokumentasi.

---

# 4. MULTI-UNIT MODEL

QIMA harus menggunakan model multi-unit/multi-tenant secara konseptual.

Setiap record operasional harus dapat dikaitkan dengan unit pemiliknya.

Contoh:

```text
Organization
    │
    ├── Unit A
    │     ├── Programs
    │     ├── Activities
    │     ├── Registrations
    │     └── Content
    │
    ├── Unit B
    │     ├── Programs
    │     ├── Activities
    │     ├── Registrations
    │     └── Content
    │
    └── Unit C
          ├── Programs
          ├── Activities
          ├── Registrations
          └── Content
```

Data Unit A tidak boleh tercampur dengan Unit B.

---

# 5. UNIT IDENTITY ISOLATION

Setiap unit dapat memiliki identitas visual sendiri.

Identity layer minimal mencakup:

* organization/unit name;
* logo;
* favicon;
* primary color;
* secondary color;
* typography;
* imagery;
* hero imagery;
* background;
* section treatment;
* contact;
* address;
* social links;
* content tone.

Dengan demikian:

```text
QIMA CORE
      │
      ├── RQ BLUMBANG
      │      ├── Logo A
      │      ├── Theme A
      │      └── Content A
      │
      ├── RQ 02
      │      ├── Logo B
      │      ├── Theme B
      │      └── Content B
      │
      └── PONDOK
             ├── Logo C
             ├── Theme C
             └── Content C
```

Core system tetap sama.

Identitas presentation layer dapat berbeda.

---

# 6. DEPLOYMENT PRINCIPLE

Setiap unit harus dapat memiliki public site yang terpisah.

Minimal:

```text
QIMA PLATFORM
      │
      ├── Unit A → URL A
      ├── Unit B → URL B
      ├── Unit C → URL C
      └── Unit N → URL N
```

Custom domain harus dapat ditambahkan per unit.

Contoh konseptual:

```text
rqblumbang.example-platform.com
rq02.example-platform.com
pondok.example-platform.com
```

atau:

```text
rqblumbang.org
rq02.org
pondok.org
```

Domain aktual mengikuti domain yang tersedia dan konfigurasi deployment.

---

# 7. DEPLOYMENT ISOLATION

"Terpisah" berarti setiap unit memiliki public endpoint/site identity sendiri.

Namun platform tidak harus membuat codebase baru untuk setiap unit.

Model yang diutamakan:

```text
SHARED CORE
      │
      ├── DEPLOYMENT / SITE A
      ├── DEPLOYMENT / SITE B
      ├── DEPLOYMENT / SITE C
      └── DEPLOYMENT / SITE N
```

Tujuannya:

* maintainability;
* consistency;
* scalability;
* easier updates;
* lower duplication;
* independent branding;
* independent public URL.

Arsitektur teknis final untuk deployment akan ditentukan pada dokumen Technical Architecture.

---

# 8. RQ BLUMBANG POSITION

RQ Blumbang bukan lagi root architecture.

RQ Blumbang menjadi:

> **FIRST REFERENCE UNIT / FIRST IMPLEMENTATION CLIENT**

Posisinya:

```text
QIMA
│
└── Rumah Qur'an
    │
    └── RQ Blumbang
```

Repository `RQ-IBL-Blumbang` menjadi sumber implementation/reference yang harus direkonsiliasi ke platform QIMA.

Tidak boleh ada asumsi bahwa seluruh arsitektur QIMA hanya dibangun untuk kebutuhan RQ Blumbang.

---

# 9. PONDOK PESANTREN

Pondok Pesantren merupakan salah satu unit utama dalam QIMA.

Namun kebutuhan pondok tidak boleh dipaksakan identik dengan Rumah Qur'an.

Pondok dapat memiliki capability tambahan seperti:

* santri;
* program pendidikan;
* kelas;
* kegiatan;
* pengajar;
* asrama;
* fasilitas;
* administrasi;
* laporan.

Capability tersebut akan ditentukan secara detail pada Capability Gap Matrix.

---

# 10. RUMAH QUR'AN

Rumah Qur'an merupakan unit yang dapat memiliki karakteristik operasional tersendiri.

Capability potensial:

* profile;
* program;
* kegiatan;
* kelas;
* peserta;
* pengajar;
* pendaftaran;
* dokumentasi;
* pengumuman;
* laporan.

RQ Blumbang menjadi reference implementation pertama untuk memvalidasi model ini.

---

# 11. PLATFORM CORE

Platform Core harus menyediakan capability yang dapat digunakan lintas unit.

Core capability:

### Identity

* organization identity;
* unit identity;
* branding;
* configuration.

### Access

* authentication;
* authorization;
* roles;
* permissions;
* session management.

### Content

* pages;
* announcements;
* media;
* articles/content.

### Operations

* programs;
* activities;
* registrations;
* participants.

### Management

* dashboard;
* users;
* units;
* reports;
* audit logs.

### Infrastructure

* database;
* API;
* storage;
* deployment;
* configuration.

---

# 12. ADMINISTRATION HIERARCHY

QIMA harus mendukung hirarki administrasi.

Model awal:

```text
QIMA SUPER ADMIN
       │
       ▼
ORGANIZATION ADMIN
       │
       ├── PONDOK ADMIN
       │
       ├── RQ BLUMBANG ADMIN
       │
       ├── RQ 02 ADMIN
       │
       └── RQ N ADMIN
```

Namun role final tidak boleh ditentukan hanya berdasarkan nama.

Permission harus didefinisikan berdasarkan capability.

---

# 13. DATA OWNERSHIP

Setiap data harus memiliki ownership boundary.

Contoh:

```text
RQ Blumbang
├── Programs
├── Activities
├── Registrations
└── Content
```

Admin RQ Blumbang hanya boleh mengelola data yang menjadi kewenangannya.

Organization-level administrator dapat memiliki akses lintas unit sesuai permission.

Platform-level administrator memiliki akses teknis sesuai security model.

---

# 14. ADMIN DASHBOARD

Dashboard merupakan bagian inti dari QIMA.

Dashboard tidak boleh hanya berupa mockup.

Dashboard harus terhubung ke:

* authentication;
* authorization;
* API;
* database;
* domain logic.

Dashboard minimal menyediakan:

```text
Dashboard
├── Overview
├── Content
├── Programs
├── Activities
├── Registrations
├── Participants
├── Users
├── Reports
├── Settings
└── Audit
```

Module final akan ditentukan setelah Capability Gap Matrix.

---

# 15. PUBLIC WEBSITE

Setiap unit dapat memiliki public-facing website.

Struktur konseptual:

```text
PUBLIC SITE
├── Home
├── About
├── Programs
├── Activities
├── Events
├── Registration
├── Information
├── Gallery/Media
├── Contact
└── Other approved pages
```

Tidak semua unit harus memiliki halaman yang sama.

Template harus fleksibel terhadap capability unit.

---

# 16. CONTENT ARCHITECTURE

Content harus dipisahkan antara:

### Global / Organization Content

Informasi organisasi induk.

### Unit Content

Informasi khusus unit.

### Shared Content

Konten yang memang boleh digunakan lintas unit.

### Private/Admin Content

Data operasional yang tidak boleh tampil di public website.

---

# 17. BRAND SYSTEM ARCHITECTURE

Brand bukan hardcoded page decoration.

Brand harus menjadi configuration layer.

Contoh:

```text
Unit
│
├── identity
├── theme
├── logo
├── imagery
├── typography
├── colors
└── content configuration
```

Tujuannya agar pergantian identitas unit tidak membutuhkan rewrite aplikasi.

---

# 18. REFERENCE ASSET POLICY

Screenshot/foto/reference yang diberikan untuk suatu unit harus diperlakukan sebagai:

**REFERENCE ASSET**

bukan otomatis:

**FINAL PRODUCTION ASSET**

Agent harus dapat:

* menganalisis visual;
* menentukan focal point;
* melakukan crop;
* melakukan responsive composition;
* menyesuaikan contrast;
* menyesuaikan overlay;
* menentukan placement;
* membuat komposisi yang sesuai layout.

Namun agent tidak boleh mengklaim foto reference sebagai foto resmi final jika belum diberikan sebagai aset final.

---

# 19. SCALABILITY

QIMA harus dirancang agar penambahan unit baru tidak membutuhkan pembangunan platform dari nol.

Target:

```text
ADD NEW UNIT
      ↓
REGISTER UNIT
      ↓
CONFIGURE IDENTITY
      ↓
CONFIGURE DOMAIN
      ↓
ASSIGN ADMIN
      ↓
ENABLE CAPABILITIES
      ↓
DEPLOY SITE
```

Penambahan unit harus menjadi configuration + onboarding process sebanyak mungkin, bukan fork manual seluruh aplikasi.

---

# 20. EXTENSIBILITY

Platform harus memungkinkan penambahan:

* Rumah Qur'an baru;
* pondok baru;
* program baru;
* role baru;
* module baru;
* deployment baru;
* domain baru.

Tanpa merusak unit yang sudah berjalan.

---

# 21. SECURITY PRINCIPLE

Security berlaku lintas organisasi dan unit.

Minimal:

* authentication;
* authorization;
* tenant isolation;
* resource-level authorization;
* secure sessions;
* input validation;
* output protection;
* secrets management;
* auditability;
* safe error handling.

Client-side visibility bukan security boundary.

Server-side authorization adalah authoritative.

---

# 22. AUDITABILITY

Aktivitas administratif penting harus dapat dilacak.

Audit record dapat mencakup:

* actor;
* action;
* resource;
* timestamp;
* previous state;
* new state;
* metadata yang relevan.

Jangan menyimpan secret atau credential sensitif dalam audit log.

---

# 23. API PRINCIPLE

API harus mengikuti domain dan ownership boundary.

Contoh konseptual:

```text
/api/v1/organizations
/api/v1/units
/api/v1/programs
/api/v1/activities
/api/v1/registrations
/api/v1/users
/api/v1/reports
```

Endpoint final akan ditentukan dalam API Contract.

Tidak boleh ada API yang memungkinkan satu unit mengakses data unit lain tanpa permission yang sah.

---

# 24. DATABASE PRINCIPLE

Database harus merepresentasikan:

```text
Organization
    ↓
Unit
    ↓
Domain Entities
```

Entity operasional yang bersifat unit-specific harus memiliki hubungan yang jelas dengan unit owner.

Jangan membuat duplicate entity hanya karena unitnya berbeda.

---

# 25. TECHNOLOGY NEUTRALITY

Dokumen ini tidak mengunci framework atau teknologi implementasi secara berlebihan.

Technical decisions akan ditentukan pada:

**QIMA — TECHNICAL ARCHITECTURE & IMPLEMENTATION BLUEPRINT**

dengan mempertimbangkan:

* existing RQ-IBL implementation;
* Genspark Code;
* Cloudflare;
* database;
* deployment;
* maintainability;
* security;
* scalability.

---

# 26. EXISTING RQ-IBL REPOSITORY

Repository:

`Sparkmind-obp-off/RQ-IBL-Blumbang`

diposisikan sebagai:

**Existing Reference Implementation**

bukan sebagai keseluruhan QIMA platform.

Proses berikutnya:

```text
RQ-IBL REPOSITORY
       ↓
AUDIT
       ↓
RECONCILIATION
       ↓
IDENTIFY REUSABLE CORE
       ↓
EXTRACT / GENERALIZE
       ↓
QIMA CORE
       ↓
RQ BLUMBANG UNIT
```

Tidak boleh melakukan rewrite tanpa alasan arsitektural yang kuat.

---

# 27. IMPLEMENTATION STRATEGY

Urutan pengembangan:

```text
QIMA FOUNDATION
      ↓
CORE PLATFORM
      ↓
MULTI-UNIT MODEL
      ↓
IDENTITY / BRAND SYSTEM
      ↓
ADMIN CORE
      ↓
PUBLIC SITE ENGINE
      ↓
RQ BLUMBANG
      ↓
PONDOK
      ↓
ADDITIONAL RQ UNITS
```

RQ Blumbang digunakan sebagai first implementation untuk memvalidasi platform.

---

# 28. SUCCESS CRITERIA

QIMA v1 foundation dianggap berhasil apabila:

[ ] QIMA memiliki platform boundary yang jelas

[ ] Organization dan Unit dapat dibedakan

[ ] Multi-unit architecture telah didefinisikan

[ ] RQ Blumbang dapat menjadi unit pertama

[ ] Pondok dapat menjadi unit tersendiri

[ ] Unit baru dapat ditambahkan

[ ] Branding dapat berbeda per unit

[ ] Public site dapat dipisahkan per unit

[ ] URL/site identity dapat dipisahkan

[ ] Custom domain dapat didukung

[ ] Admin hierarchy telah didefinisikan

[ ] Tenant/data isolation telah didefinisikan

[ ] Shared core telah didefinisikan

[ ] Existing RQ-IBL repository memiliki posisi yang jelas

[ ] Arsitektur siap diturunkan menjadi capability matrix

---

# 29. NON-GOALS

Dokumen ini belum menentukan secara final:

* seluruh database schema;
* seluruh API endpoint;
* seluruh UI;
* seluruh role;
* seluruh permission;
* framework final;
* deployment implementation detail;
* Cloudflare configuration detail;
* seluruh capability Pondok;
* seluruh capability Rumah Qur'an.

Semua itu akan menjadi dokumen turunan.

---

# 30. TRACEABILITY FOUNDATION

Setiap dokumen berikutnya harus dapat ditelusuri kembali ke blueprint ini.

Chain:

```text
QIMA PLATFORM PRINCIPLE
        ↓
CAPABILITY
        ↓
DOMAIN
        ↓
DATA
        ↓
MODULE
        ↓
API
        ↓
UI
        ↓
SECURITY
        ↓
TEST
        ↓
IMPLEMENTATION
        ↓
DEPLOYMENT
```

Tidak boleh ada fitur besar yang muncul tanpa alasan yang dapat ditelusuri.

---

# 31. MASTER ARCHITECTURAL STATEMENT

QIMA adalah:

> **A multi-unit digital platform for a Qur'an education ecosystem, providing a shared technical core with independently configurable organizational units, identities, administrative boundaries, public websites, URLs, and deployment targets.**

RQ Blumbang merupakan:

> **the first reference implementation and validation unit of the QIMA platform.**

Pondok Pesantren dan Rumah Qur'an lainnya merupakan:

> **additional organizational units that must be able to operate independently while remaining within the shared QIMA platform architecture.**

---

# 32. NEXT DOCUMENT

Dokumen berikutnya:

## QIMA — CAPABILITY GAP MATRIX v1.0

Fokus:

```text
CURRENT CAPABILITY
        ↓
REQUIRED CAPABILITY
        ↓
GAP
        ↓
PRIORITY
        ↓
DOMAIN
        ↓
MODULE
        ↓
IMPLEMENTATION
```

Capability akan dipetakan untuk:

1. QIMA Platform Core
2. Organization/Yayasan
3. Pondok Pesantren
4. Rumah Qur'an
5. RQ Blumbang
6. Admin
7. Public Website
8. Multi-Unit Management
9. Deployment
10. Security
11. Reporting
12. Future extensibility

---

# STATUS

**QIMA — MASTER PLATFORM BLUEPRINT v1.0**

STATUS: **FOUNDATION BASELINE**

NEXT:

**QIMA — CAPABILITY GAP MATRIX v1.0**

END OF DOCUMENT

**Nah, ini baru fondasinya gsss.** 🔥

Dan keputusan pentingnya sekarang sudah terkunci: **kita tidak lagi membangun “RQ Blumbang dengan tambahan unit”, tetapi membangun QIMA sebagai platform induk, lalu RQ Blumbang menjadi unit/reference implementation pertama.**

Berikutnya kita **langsung gas DOC 02 — `QIMA — CAPABILITY GAP MATRIX v1.0`**, tanpa mengulang blueprint ini lagi.
