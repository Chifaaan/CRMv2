# Spec Delta

## Purpose

Memungkinkan Manager menerima penugasan operasional task SIMPRO dan entri Form, dengan hak assign PM yang terbatas pada Manager proyek serta hak eksekusi yang setara Assignee.

## ADDED Requirements

### Requirement: Manager dapat dipilih sebagai assignee operasional

Sistem SHALL mengizinkan user role Manager dipilih sebagai assignee task SIMPRO dan entri Form. User role Assignee tetap dapat dipilih seperti sebelumnya.

#### Scenario: Manager muncul di pilihan assignee

- **WHEN** pengguna yang berhak meng-assign membuka pilihan assignee untuk task atau entri Form
- **THEN** user role Manager dan Assignee tersedia sebagai pilihan

#### Scenario: Manager di-assign ke task

- **WHEN** Manager dipilih sebagai assignee sebuah task
- **THEN** task menyimpan Manager tersebut sebagai assignee dan berpindah ke status To Do

### Requirement: PM hanya boleh meng-assign kepada Manager proyek

PM pemilik proyek SHALL dapat meng-assign task SIMPRO dan entri Form hanya kepada Manager yang ditunjuk pada proyek tersebut. PM MUST NOT meng-assign kepada Manager lain atau kepada Assignee.

#### Scenario: PM meng-assign kepada Manager proyek

- **WHEN** PM pemilik proyek meng-assign task kepada Manager penanggung jawab proyeknya
- **THEN** assignment berhasil

#### Scenario: PM meng-assign kepada Manager lain

- **WHEN** PM pemilik proyek mencoba meng-assign task kepada Manager yang bukan penanggung jawab proyeknya
- **THEN** sistem menolak assignment tersebut

#### Scenario: PM meng-assign kepada Assignee

- **WHEN** PM pemilik proyek mencoba meng-assign task kepada user role Assignee
- **THEN** sistem menolak assignment tersebut

### Requirement: Manager dan Admin tetap dapat meng-assign

Manager dan Admin SHALL tetap dapat meng-assign task SIMPRO dan entri Form kepada Assignee maupun Manager, sesuai aturan assignment yang berlaku.

#### Scenario: Manager meng-assign task kepada Assignee

- **WHEN** Manager meng-assign task kepada user role Assignee
- **THEN** assignment berhasil

#### Scenario: Manager meng-assign task kepada Manager lain

- **WHEN** Manager meng-assign task kepada user role Manager
- **THEN** assignment berhasil

### Requirement: Manager assignee mendapat hak eksekusi operasional

Manager yang menjadi assignee SHALL dapat memulai task, mengajukan task untuk review, serta mengisi dan submit entri Form miliknya, setara dengan Assignee.

#### Scenario: Manager memulai task

- **WHEN** Manager yang menjadi assignee memindahkan task dari To Do ke In Progress
- **THEN** perpindahan status berhasil

#### Scenario: Manager submit task untuk review

- **WHEN** Manager yang menjadi assignee mengajukan task dari In Progress ke Awaiting Approval
- **THEN** task masuk antrean review PM

#### Scenario: Manager mengisi form entry miliknya

- **WHEN** Manager yang menjadi assignee menyimpan draft dan submit entri Form miliknya
- **THEN** entri Form tersimpan sebagai Submitted

### Requirement: Manager assignee tidak mendapat hak review

Manager yang menjadi assignee MUST NOT memperoleh hak menyetujui atau meminta revisi task maupun entri Form. Hak review tetap hanya untuk PM pemilik proyek dan Admin.

#### Scenario: Manager mencoba menyetujui task

- **WHEN** Manager yang menjadi assignee mencoba menyetujui task miliknya
- **THEN** sistem menolak aksi review tersebut

### Requirement: Penugasan Manager muncul di My Tasks, Forms, dan workload

Task dan entri Form yang di-assign kepada Manager SHALL muncul di My Tasks dan Forms milik Manager tersebut, serta dihitung sebagai beban operasional Manager di halaman workload.

#### Scenario: Task Manager muncul di My Tasks

- **WHEN** Manager membuka My Tasks
- **THEN** task yang di-assign kepadanya tampil di daftar

#### Scenario: Workload Manager dihitung

- **WHEN** Manager memiliki task atau form aktif yang di-assign kepadanya
- **THEN** workload Manager menampilkan jumlah task dan form aktif tersebut

### Requirement: Assignment kepada Manager tercatat di audit trail

Setiap assignment task atau entri Form kepada Manager SHALL dicatat sebagai event audit trail yang menyebutkan task/form dan Manager penerima.

#### Scenario: Task di-assign kepada Manager

- **WHEN** sebuah task di-assign kepada Manager
- **THEN** audit trail proyek mencatat event assignment beserta identitas Manager penerima
