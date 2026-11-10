# Release Notes — CRM × SIMPRO Prototype

## November 2026 — Journey per fase, Media/BOD, dan revenue tracking

Change: `evolve-workflow-roles-revenue`

### Baru

- Journey disusun per fase. Proyek baru hanya memuat tahap Prospek; setelah Close Won, PM menyusun Planning dan Running, lalu Closing ditambahkan otomatis.
- Tahap Brief Received pada Event Program menampung Create Strategy, KV, Contact Vendor, Site Survey, Budget & Quotation, dan Vendor Selection sebagai entri.
- Role **Media**: SIMPRO untuk task/entri yang di-assign, serta pengisian BAST yang di-assign.
- Role **BOD**: dashboard `/business` read-only untuk revenue, cost, margin, margin %, planned RAB, dan variance per unit bisnis.
- Media Order (MO) sebagai tabel interaktif per proyek dengan mapping unit bisnis dan roll-up ke group/umbrella.
- Link kerja wajib (`http`/`https`) saat kartu masuk In Progress; link tersimpan di kartu dan audit trail.
- Mapping unit bisnis pada item RAB.

### Perubahan perilaku

- Gerbang menang tidak lagi mengaktifkan tahap berikutnya secara otomatis; PM harus menyusun dan memulai fase berikutnya.
- PM dapat melihat dan menyusun fase Planning/Running setelah menang, tetapi tidak dapat mengubah fase yang sudah dimulai.
- Manager dapat memilih dirinya sendiri sebagai assignee kartu backlog.
- RAB yang sudah approved menjadi planned cost baseline; RAB terkunci setelah baseline.

### Migrasi

- Data `localStorage` versi 3 dimigrasikan ke versi 4 tanpa reset: `phaseStates` diturunkan dari tahap yang ada, user Media/BOD ditambahkan, `mediaOrders` diinisialisasi, dan event migrasi dicatat idempotent.
- Item RAB lama tanpa unit bisnis tetap terbaca dan ditandai "Belum dipetakan".

### Rujukan

- `openspec/changes/evolve-workflow-roles-revenue/specs/project-journey/spec.md`
- `openspec/changes/evolve-workflow-roles-revenue/specs/work-assignment/spec.md`
- `openspec/changes/evolve-workflow-roles-revenue/specs/revenue-tracking/spec.md`
- `Docs/Revenue-Tracking.md`
- `Docs/Stage-Types.md`
