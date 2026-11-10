# Proposal

## Why

Template dan Journey Management belum menegakkan step wajib per fase: fase Prospek bisa dibuat tanpa RAB dan keputusan menang/kalah, fase Finance bisa kehilangan BAST/Invoice, dan pengguna tidak melihat mana step wajib saat membuat proyek. Selain itu, tombol `Tambah step` memakai prompt berurutan yang mengabaikan fase pilihan sehingga step sering masuk ke Running, dan pemilihan step dilakukan lewat kartu terpisah padahal stepper di header sudah menampilkan fase/step.

## What Changes

- Fase **Prospek** menjadi fase opsional pada template. Saat membuat proyek, Prospek **tidak** ditambahkan secara default; pengguna menekan `Tambah tahapan Prospek` untuk menyertakannya beserta step wajib **RAB** dan **Decision Win / Loss**. Proyek yang menyertakan Prospek memulai journey dari Prospek sebelum Planning.
- Fase **Finance** selalu memiliki step wajib **BAST** dan **Invoice**. Mode Manual otomatis membuat kedua step Finance tersebut saat proyek dibuat, dengan opsi menyertakan Prospek.
- Step wajib tidak dapat dihapus atau diubah jenisnya saat penyusunan template dan saat pembuatan proyek; step lain berlabel **Opsional**. Setelah proyek berjalan, step boleh dihapus lewat Journey Management.
- Pembuatan proyek menampilkan label `Wajib`/`Opsional` per step dan ringkasan jumlahnya; step wajib yang belum ada ditambahkan otomatis. Mode Manual menampilkan keterangan bahwa tahapan/step dibuat di dalam proyek dan diatur di Journey Management.
- Journey Management memakai **dialog** Tambah/Edit Step (nama, fase, jenis step, jenis form/gerbang, Manager PIC, deskripsi) sehingga fase pilihan benar-benar dipakai. Daftar `Kelola fase` mengikuti fase yang dipilih pada stepper header (Planning menampilkan step Planning, Running menampilkan step Running). Kartu `Pilih Step` dihapus.
- Template **Event** dan **Event Eksekusi** memuat fase Prospek dengan RAB + Decision Win / Loss; template KOL mendapat step RAB (versi template naik).

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `project-journey`: menambah aturan step wajib per fase, fase Prospek opsional pada template, start dari Prospek, label wajib/opsional saat pembuatan proyek, dan UX dialog/pemilihan step di Journey Management.

## Impact

- `src/lib/prototype/mandatory-steps.ts` (baru), `templates.ts`, `domain.ts`, `store.ts`, `types.ts`
- `src/components/prototype/crm/project-detail.tsx`, `project-create.tsx`, `templates.tsx`
- `tests/mandatory-steps.test.ts` (baru), `tests/templates.test.ts`
- `AGENTS.md`, `Docs/Stage-Types.md`
