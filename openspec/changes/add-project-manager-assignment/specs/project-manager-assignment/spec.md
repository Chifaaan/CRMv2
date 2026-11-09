# Spec Delta

## Purpose

Menetapkan satu Manager penanggung jawab pada proyek agar tanggung jawab, notifikasi, dan tampilan tim proyek menjadi jelas tanpa mengubah visibilitas proyek yang sudah ada.

## ADDED Requirements

### Requirement: Proyek memiliki satu Manager penanggung jawab

Sistem SHALL menyimpan paling banyak satu Manager penanggung jawab per proyek. Penunjukan Manager bersifat opsional; proyek tanpa Manager tetap valid dan ditampilkan sebagai belum ditugaskan.

#### Scenario: Proyek dibuat dengan Manager

- **WHEN** PM membuat proyek dan memilih seorang user role Manager
- **THEN** proyek menyimpan Manager tersebut dan menampilkannya sebagai Manager penanggung jawab

#### Scenario: Proyek dibuat tanpa Manager

- **WHEN** PM membuat proyek tanpa memilih Manager
- **THEN** proyek tetap dibuat dan Manager penanggung jawab ditampilkan sebagai belum ditugaskan

### Requirement: PM pemilik dan Admin dapat mengubah Manager proyek

PM pemilik proyek dan Admin SHALL dapat memilih atau mengganti Manager penanggung jawab saat membuat proyek dan melalui Edit Proyek. PM lain, Manager, dan Assignee MUST NOT dapat mengubahnya.

#### Scenario: PM pemilik mengganti Manager

- **WHEN** PM pemilik proyek memilih Manager lain melalui Edit Proyek
- **THEN** Manager penanggung jawab proyek berubah

#### Scenario: PM bukan pemilik mencoba mengganti Manager

- **WHEN** PM yang bukan pemilik proyek mencoba mengubah Manager proyek
- **THEN** sistem menolak perubahan tersebut

### Requirement: Hanya user role Manager yang dapat ditunjuk

Pemilihan Manager penanggung jawab SHALL hanya menerima user dengan role Manager. User role lain MUST NOT dapat dipilih sebagai Manager proyek.

#### Scenario: Memilih user non-Manager

- **WHEN** pengguna mencoba menetapkan user role Assignee sebagai Manager proyek
- **THEN** sistem menolak pilihan tersebut

### Requirement: Penunjukan Manager tidak mengurangi visibilitas proyek

Penunjukan Manager MUST NOT mengubah aturan visibilitas proyek yang sudah ada. Manager tetap dapat melihat seluruh proyek sesuai aturan saat ini.

#### Scenario: Manager melihat proyek yang tidak ditugaskan kepadanya

- **WHEN** Manager membuka daftar proyek
- **THEN** Manager tetap melihat seluruh proyek yang diizinkan oleh aturan visibilitas yang berlaku

### Requirement: Manager proyek tampil di tim dan menerima notifikasi

Manager penanggung jawab SHALL tampil sebagai anggota tim proyek dan menerima notifikasi saat ditunjuk atau diganti.

#### Scenario: Manager ditunjuk pada proyek

- **WHEN** PM menunjuk seorang Manager pada proyek
- **THEN** Manager tersebut tampil di tim proyek dan menerima notifikasi penunjukan

### Requirement: Perubahan Manager proyek tercatat di audit trail

Setiap penunjukan atau perubahan Manager penanggung jawab SHALL dicatat sebagai event audit trail proyek yang menyebutkan Manager sebelum dan sesudah perubahan.

#### Scenario: Manager proyek diganti

- **WHEN** PM pemilik mengganti Manager proyek dari Manager A ke Manager B
- **THEN** audit trail mencatat event perubahan Manager beserta identitas Manager lama dan baru
