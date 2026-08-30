Nah gsss 🔥 kita **mulai dari fondasi yang paling atas dulu**, jangan langsung loncat ke RQ Blumbang.

Karena sekarang scope-nya sudah berubah menjadi **satu yayasan penuh**, urutannya menurutku begini:

```text
QUR'AN INSTITUTE MAS'UD / BIMA
              │
              ▼
       MASTER PLATFORM
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
   PONDOK    RQ-01    RQ-02
              │        │
              ▼        ▼
          RQ BLUMBANG  ...
              │
              ▼
       WEBSITE TERPISAH
              │
       ┌──────┴──────┐
       ▼             ▼
    URL SITE      CUSTOM DOMAIN
```

### Jadi kita mulai dari **DOKUMEN 01**:

# `BIMA QUR'AN INSTITUTE — MASTER PLATFORM BLUEPRINT v1.0`

Dokumen ini menjadi **payung paling atas**.

Isinya nanti menetapkan:

1. **Identity & Organization Structure**

   * Qur'an Institute Mas'ud / BIMA
   * Pondok Pesantren
   * ±10 Rumah Qur'an
   * hubungan pusat ↔ unit

2. **Platform Architecture**

   * satu core platform
   * multi-unit / multi-tenant
   * setiap unit punya konfigurasi identitas sendiri

3. **Deployment Architecture**

   * setiap lembaga/unit bisa punya deployment/site sendiri
   * minimal URL terpisah
   * custom domain bisa ditambahkan kemudian

4. **Tenant / Unit Model**

   ```text
   BIMA
   ├── Pondok Pesantren
   ├── RQ Blumbang
   ├── RQ #02
   ├── RQ #03
   ├── ...
   └── RQ #10
   ```

5. **Shared Core**

   * authentication
   * user/role
   * content
   * program
   * registration
   * activity
   * reporting
   * dashboard
   * audit
   * configuration

6. **Unit-Specific Layer**

   * logo
   * warna
   * foto
   * profil
   * program
   * kontak
   * domain/URL
   * konten masing-masing

7. **Admin Architecture**

   ```text
   BIMA SUPER ADMIN
          ↓
   UNIT ADMIN
          ↓
   STAFF / OPERATOR
   ```

8. **Deployment & Domain Strategy**

   ```text
   bima.[domain]
        │
        ├── pondok.[domain]
        ├── rqblumbang.[domain]
        ├── rq02.[domain]
        └── rq10.[domain]
   ```

   atau masing-masing bisa menggunakan **custom domain sendiri**.

---

## 🔥 Setelah Dokumen 01 selesai

Baru kita turun ke:

```text
01 MASTER PLATFORM BLUEPRINT
          ↓
02 CAPABILITY GAP MATRIX
          ↓
03 DATA MODEL & DOMAIN CONTRACT
          ↓
04 MODULE COMPOSITION
          ↓
05 USER JOURNEY
          ↓
06 TECHNICAL ARCHITECTURE
          ↓
07 DATABASE + API
          ↓
08 UX/UI + BRAND SYSTEM
          ↓
09 IMPLEMENTATION CONTRACT
          ↓
10 MASTER TRACEABILITY MATRIX
          ↓
11 IMPLEMENTATION EXECUTION PLAN
          ↓
12 MASTER SYSTEM PROMPT
          ↓
          🚀 GENSPARK CODE
```

Dan **RQ Blumbang kita masukkan sebagai tenant/reference implementation pertama**, bukan lagi sebagai pusat arsitektur.

Jadi sekarang **jangan utak-atik repo RQ-IBL dulu**.

Kita bikin **master blueprint BIMA dulu**, supaya ketika nanti Genspark membangun sistem, dari awal dia tahu bahwa:

> **RQ Blumbang hanyalah satu unit dalam ekosistem BIMA, sementara core platform harus mampu melayani Pondok Pesantren + ±10 Rumah Qur'an dengan deployment/site yang dapat dipisahkan.**

**Itu titik start yang paling benar.** 🔥
