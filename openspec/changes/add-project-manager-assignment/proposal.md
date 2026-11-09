# Proposal

## Why

Saat ini proyek tidak memiliki Manager penanggung jawab, dan assignee operasional hanya boleh role Assignee. PM tidak bisa menunjuk Manager untuk proyeknya maupun menugaskan pekerjaan operasional kepada Manager. Akibatnya tanggung jawab Manager tidak terlihat di proyek, dan PM harus bergantung pada Manager/Admin untuk setiap penugasan.

## What Changes

- Proyek memiliki satu Manager penanggung jawab (`managerId`) yang dapat dipilih PM saat membuat proyek dan diubah lewat Edit Proyek oleh PM pemilik atau Admin.
- Manager yang ditunjuk tampil di tim proyek dan menerima notifikasi penugasan proyek.
- Manager dapat dipilih sebagai assignee untuk task SIMPRO dan entri Form.
- PM pemilik proyek boleh meng-assign task/form hanya kepada Manager yang ditunjuk pada proyek itu. Manager/Admin tetap dapat meng-assign seperti sebelumnya, termasuk ke Assignee.
- Manager yang menerima penugasan operasional mendapat hak eksekusi yang sama dengan Assignee: mulai task, submit review, serta mengisi dan submit form entry miliknya.
- Task dan form yang di-assign ke Manager muncul di My Tasks/Forms Manager dan dihitung di workload Manager.
- Penunjukan Manager proyek dan perubahan assignee dicatat di audit trail.

## Capabilities

### New Capabilities

- `project-manager-assignment`: penunjukan satu Manager penanggung jawab per proyek, perubahan oleh PM/Admin, tampilan tim, notifikasi, dan audit.
- `operational-assignment`: perluasan assignee operasional ke Manager, hak assign PM yang terbatas pada Manager proyek, hak eksekusi Manager, serta integrasi My Tasks/Forms/workload.

### Modified Capabilities

Tidak ada. Belum ada spec capability di proyek ini.

## Impact

- Model dan persistensi: `Project.managerId`, migrasi data lama, seed/demo.
- Domain dan permission: aturan assign task/form entry, transisi task oleh Manager, workload, visibilitas Forms/My Tasks.
- UI: form buat/edit proyek, header/tim proyek, TaskDialog, form entry assignment, My Tasks, Forms, workload.
- Audit trail: event penunjukan Manager proyek.
- Test: permission, assignment, workload, migrasi, dan regresi alur PM/Manager/Assignee.
