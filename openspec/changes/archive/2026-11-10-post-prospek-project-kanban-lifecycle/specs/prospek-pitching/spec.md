# Spec Delta

## MODIFIED Requirements

### Requirement: Termine is a closing payment reference

Sistem SHALL menampilkan Termine kontrak sebagai acuan awal Invoice dan Pembayaran pada fase Finance anak proyek, tanpa membuat form Invoice atau Pembayaran secara otomatis.

#### Scenario: Show termine on the child project
- **WHEN** pengguna membuka fase Finance anak proyek hasil konversi
- **THEN** sistem menampilkan daftar Termine beserta nilai dan tanggal jatuh temponya sebagai referensi pembayaran

#### Scenario: Use Termine as payment references
- **WHEN** Finance mengisi Invoice atau Pembayaran pada anak proyek
- **THEN** nilai dan tanggal Termine tersedia sebagai acuan awal tanpa menggantikan isian atau keputusan Finance

#### Scenario: Termine does not create finance forms
- **WHEN** kontrak dengan Termine disimpan atau dikonversi
- **THEN** sistem tidak membuat entri Form Invoice maupun Pembayaran secara otomatis
