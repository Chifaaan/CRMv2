# Spec Delta

## ADDED Requirements

### Requirement: Assignee sees only running and completed SIMPRO stages

Pada Detail Proyek SIMPRO, Assignee SHALL hanya melihat step SIMPRO yang sedang berjalan atau sudah selesai; step yang belum berjalan tidak ditampilkan, dan step selesai bersifat read-only.

#### Scenario: Hide pending stages from Assignee
- **WHEN** Assignee membuka tab Board proyek SIMPRO
- **THEN** pilihan tahap hanya berisi step aktif dan step selesai

#### Scenario: View completed stage read-only
- **WHEN** Assignee memilih step yang sudah selesai
- **THEN** board menampilkan task step tersebut tanpa aksi edit

### Requirement: Link Pekerjaan can be saved explicitly

Sistem SHALL menyediakan tombol Simpan pada isian Link Pekerjaan dan menyimpan perubahan link tanpa memerlukan transisi status. PM/Admin SHALL dapat memindahkan card ke status mana pun selama card memiliki assignee, dengan Link Pekerjaan wajib diisi sebelum In Progress.

#### Scenario: Save a link
- **WHEN** pengguna yang berhak menekan Simpan pada Link Pekerjaan
- **THEN** sistem menyimpan link terbaru dan mencatat before/after di riwayat proyek

#### Scenario: Save an empty link
- **WHEN** pengguna menekan Simpan dengan Link Pekerjaan kosong
- **THEN** sistem menolak penyimpanan dan menampilkan pesan bahwa link wajib diisi

#### Scenario: PM moves a card to any status
- **WHEN** PM pemilik atau Admin memindahkan card yang sudah memiliki assignee ke status mana pun selain Completed
- **THEN** sistem menerapkan perpindahan tersebut

#### Scenario: PM cannot move an unassigned card
- **WHEN** PM pemilik atau Admin mencoba memindahkan card tanpa assignee
- **THEN** sistem menolak dan meminta assignee ditetapkan lebih dahulu

#### Scenario: PM moving to In Progress requires a link
- **WHEN** PM pemilik atau Admin memindahkan card ke In Progress tanpa Link Pekerjaan
- **THEN** sistem menolak perpindahan tersebut

## MODIFIED Requirements

### Requirement: A valid Link Pekerjaan is required to start a card

The system SHALL require a non-empty Link Pekerjaan before a card enters In Progress, SHALL NOT validate URL protocol or syntax, and SHALL preserve the existing link when work returns from Need Revision.

#### Scenario: Reject missing or invalid link
- **WHEN** an assigned worker moves a To Do card to In Progress without a non-empty Link Pekerjaan
- **THEN** the transition is rejected and the card remains in To Do

#### Scenario: Accept any non-empty link text
- **WHEN** an assigned worker enters any non-empty Link Pekerjaan
- **THEN** the link is accepted without HTTP/HTTPS validation

#### Scenario: Resume revised work
- **WHEN** an assigned worker moves a Need Revision card to In Progress
- **THEN** the previous Link Pekerjaan remains saved and may be updated

#### Scenario: Provide link access guidance
- **WHEN** an assigned worker enters a Link Pekerjaan
- **THEN** the UI advises that the link must be accessible to the project PM and Managers
