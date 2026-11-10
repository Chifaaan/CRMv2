# Media Order, RAB, dan Business

Dokumen ini melengkapi `Docs/PRD-Alur-CRM-Baru.md` dan `Docs/Stage-Types.md`. Fokusnya pencatatan revenue, biaya vendor, margin per unit bisnis, rollup Umbrella Project, dan Business.

## Unit bisnis

Katalog tetap untuk rilis ini:

| ID | Label |
| --- | --- |
| `makerspace` | Makerspace |
| `makerspace-video` | Makerspace Video |
| `spektrum` | Spektrum |

Setiap item RAB dan MO wajib dipetakan ke satu `businessUnitId` agar dihitung komersial. Item tanpa unit tetap tersimpan dan ditandai "Belum dipetakan"; item tersebut dikecualikan dari revenue, cost, margin, dan baseline sampai dipetakan.

## RAB

- `RabPayload` berisi `items: RabItem[]` dan `notes`.
- `RabItem` berisi `id`, `description`, `category`, `qty`, `unit`, `unitPrice`, dan `businessUnitId`.
- Total RAB = jumlah `qty × unitPrice`.
- RAB berada pada step Form Keuangan Finance dan editable selama step-nya aktif; RAB yang sudah `approved` menjadi acuan biaya.
- RAB yang sudah `approved` menjadi **planned cost baseline** di dashboard.

## Media Order (MO)

- MO menempel pada satu proyek; satu proyek boleh punya banyak MO. MO dikelola dari tab **Media Order** di detail proyek CRM dan dari kategori Form Keuangan **Media Order**.
- Form `mo` adalah wadah status/assignee/submit/review; isi negosiasi tetap berupa dokumen `MediaOrder`.
- `MediaOrder` berisi `id`, `projectId`, `number`, `title`, `status`, `items`, `notes`, `createdById`, `createdAt`, `updatedAt`, `updatedById`.
- Status MO: `draft`, `final`, `cancelled`. MO `cancelled` tidak dihitung.
- `MediaOrderItem` berisi `id`, `description`, `qty`, `unit`, `clientUnitPrice`, `vendorUnitCost`, dan `businessUnitId`.
- MO read-only saat proyek `done`, `lost`, atau `cancelled`, dan bagi role Assignee, Media, atau BOD.
- Tab Media Order dan form MO tampil untuk Admin, Manager, PM, dan Finance.
- MO proyek yang masuk Umbrella Project ikut ter-roll up ke umbrella tersebut; proyek tanpa umbrella dihitung standalone.
- MO dan kontrak tidak membuat step atau form Finance lain secara otomatis.

## Akumulatif komersial

- Akumulatif RAB proyek = jumlah `qty × unitPrice` dari item RAB **approved** yang sudah dipetakan ke unit bisnis.
- Akumulatif MO proyek = jumlah `qty × clientUnitPrice` dari dokumen MO **non-cancelled** yang itemnya sudah dipetakan.
- Akumulatif RAB/MO Umbrella Project = jumlah akumulatif seluruh proyek anggota yang tidak `lost`/`cancelled`.
- Proyek `lost` atau `cancelled` tidak menyumbang nilai; item tanpa unit bisnis dikecualikan dan ditandai `unmapped`.
- Angka yang sama dipakai di card proyek, header detail proyek, detail Umbrella, tabel Business, dan Business Dashboard. Nominal disembunyikan dari Assignee dan Media.

## Rumus

- Revenue item = `qty × clientUnitPrice`.
- Cost item = `qty × vendorUnitCost`.
- Margin item = revenue − cost.
- Margin % item = margin / revenue × 100; bernilai 0 bila revenue 0.
- Total MO menjumlahkan seluruh item dan menghitung margin % dari total.
- Variance unit bisnis = cost MO − planned RAB cost.
- Planned RAB cost per unit hanya dihitung dari RAB `approved` yang itemnya sudah dipetakan.

## Business

- Route `/business` adalah Business Dashboard; `/business/rab` dan `/business/mo` adalah tabel komersial per proyek. Ketiganya berada dalam satu submenu Business.
- Akses: Admin, Manager, PM, Finance, dan BOD, read-only. Assignee dan Media tidak melihat menu Business dan diarahkan ke landing page.
- PM hanya melihat baris proyek miliknya; Manager, Finance, Admin, dan BOD melihat portofolio komersial non-closed.
- Tabel RAB menampilkan proyek, umbrella, fase/status, jumlah item, total RAB, status RAB, update terakhir, dan pembukaan detail RAB.
- Tabel MO menampilkan proyek, umbrella, fase/status, jumlah dokumen MO, jumlah item, revenue, cost, margin, margin %, status mapping, dan pembukaan detail MO.
- Baris dengan item `unmapped` menampilkan peringatan dan mengecualikan item tersebut dari total.
- Edit RAB/MO tidak dilakukan dari tabel Business; aksi detail membuka permukaan proyek yang sesuai (BOD mendapat detail read-only).
- Business Dashboard menampilkan revenue, cost, margin, margin %, jumlah item, planned RAB, dan variance per unit bisnis, dengan filter umbrella dan periode. Nilai berasal dari RAB approved dan MO non-cancelled tanpa input manual.

## Audit

Perubahan MO/RAB dicatat lewat `recordProjectEvent`:

- `media_order.created`
- `media_order.updated`
- `media_order.item_changed`
- `media_order.deleted`

Metadata menyimpan `orderId`, `itemId`, nilai `before`, dan `after`, termasuk unit bisnis.
