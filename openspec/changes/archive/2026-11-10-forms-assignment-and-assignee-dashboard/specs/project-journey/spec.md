# Spec Delta

## ADDED Requirements

### Requirement: Project phase stepper reflects included phases

Stepper fase pada header detail proyek MUST menampilkan fase Prospek ketika proyek memiliki step Prospek, di samping Planning, Running, dan Finance. Proyek tanpa step Prospek MUST tetap menampilkan tiga fase.

#### Scenario: Prospek project shows the Prospek tab
- **WHEN** proyek dibuat dengan tahapan Prospek
- **THEN** stepper header menampilkan Prospek beserta step wajibnya

#### Scenario: Project without Prospek stays three phases
- **WHEN** proyek tidak memiliki step Prospek
- **THEN** stepper menampilkan Planning, Running, dan Finance saja
