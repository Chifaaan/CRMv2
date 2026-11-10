# Spec Delta

## Purpose

Menyatukan CRM dan SIMPRO ke dalam satu alur kerja: CRM menjadi pintu masuk utama untuk dashboard, proyek, dan pekerjaan proyek, sementara SIMPRO hanya menyisakan pekerjaan personal.

## ADDED Requirements

### Requirement: Single workspace navigation

Area SIMPRO SHALL hanya menampilkan **My Tasks** dan **Forms**. Menu **Dashboard** dan **Projects** SIMPRO MUST NOT ditampilkan, dan CRM SHALL menjadi pintu masuk tunggal untuk dashboard serta daftar proyek.

#### Scenario: SIMPRO navigation only shows personal work
- **WHEN** pengguna membuka aplikasi
- **THEN** area SIMPRO hanya menampilkan My Tasks dan Forms

#### Scenario: Old dashboard route opens CRM
- **WHEN** pengguna membuka route Dashboard SIMPRO lama
- **THEN** sistem mengarahkan pengguna ke Dashboard CRM

#### Scenario: Old projects route opens CRM Projects
- **WHEN** pengguna membuka route Projects SIMPRO lama
- **THEN** sistem mengarahkan pengguna ke CRM Projects

### Requirement: CRM project work tabs replace SIMPRO project detail

Detail Proyek CRM SHALL menyediakan tab **Board**, **Backlog**, dan **Forms** yang memindahkan fungsi tab Detail Proyek SIMPRO. Detail Proyek SIMPRO lama MUST NOT menjadi tujuan utama untuk pekerjaan proyek.

#### Scenario: Open project board from CRM
- **WHEN** pengguna membuka tab Board pada Detail Proyek CRM
- **THEN** sistem menampilkan board Kanban proyek tersebut di dalam CRM

#### Scenario: Open project backlog from CRM
- **WHEN** pengguna membuka tab Backlog pada Detail Proyek CRM
- **THEN** sistem menampilkan daftar task proyek tersebut di dalam CRM

#### Scenario: Open project forms from CRM
- **WHEN** pengguna membuka tab Forms pada Detail Proyek CRM
- **THEN** sistem menampilkan Form proyek dan Form Keuangan yang terkait proyek tersebut di dalam CRM

#### Scenario: Legacy SIMPRO project link opens CRM tab
- **WHEN** pengguna membuka route Board, Backlog, atau Forms milik Detail Proyek SIMPRO lama
- **THEN** sistem mengarahkan pengguna ke tab yang setara pada Detail Proyek CRM
