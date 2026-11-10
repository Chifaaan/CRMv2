# Spec Delta

## MODIFIED Requirements

### Requirement: Assignee sees only running and completed SIMPRO stages

Pada Detail Proyek SIMPRO, pilihan tahap Board SHALL hanya berisi step SIMPRO yang sedang berjalan atau sudah selesai untuk semua role. Step yang belum berjalan MUST NOT ditampilkan atau dapat diakses, dan step selesai bersifat read-only.

#### Scenario: Hide pending stages from Assignee

- **WHEN** pengguna mana pun membuka tab Board proyek SIMPRO
- **THEN** pilihan tahap hanya berisi step aktif dan step selesai

#### Scenario: Assignee cannot access a pending stage

- **WHEN** Assignee mencoba membuka step SIMPRO yang belum berjalan melalui pilihan tahap atau tautan langsung
- **THEN** sistem tidak menampilkan step tersebut dan memilih step aktif atau step selesai yang tersedia

#### Scenario: View completed stage read-only

- **WHEN** pengguna memilih step yang sudah selesai
- **THEN** board menampilkan task step tersebut tanpa aksi edit

#### Scenario: Default to the running stage

- **WHEN** proyek memiliki step SIMPRO yang sedang berjalan
- **THEN** Board memilih step tersebut secara default
