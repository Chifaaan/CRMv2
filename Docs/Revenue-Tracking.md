# Media Order, RAB, dan Business Dashboard

Dokumen ini melengkapi `Docs/PRD-Alur-CRM-Baru.md` dan `Docs/Stage-Types.md`. Fokusnya pencatatan revenue, biaya vendor, margin per unit bisnis, dan dashboard BOD.

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

- MO menempel pada satu proyek; satu proyek boleh punya banyak MO. MO dikelola dari tab **Media Order** di detail proyek CRM.
- `MediaOrder` berisi `id`, `projectId`, `number`, `title`, `status`, `items`, `notes`, `createdById`, `createdAt`, `updatedAt`, `updatedById`.
- Status MO: `draft`, `final`, `cancelled`. MO `cancelled` tidak dihitung di dashboard.
- `MediaOrderItem` berisi `id`, `description`, `qty`, `unit`, `clientUnitPrice`, `vendorUnitCost`, dan `businessUnitId`.
- MO read-only saat proyek `done`, `lost`, atau `cancelled`, dan bagi role Assignee, Media, atau BOD.
- Tab Media Order tampil untuk Admin, Manager, PM, dan Finance.
- MO proyek yang masuk group ikut ter-roll up ke umbrella group tersebut (group dikelola dari halaman Groups); proyek tanpa group dihitung standalone.
- MO dan kontrak tidak membuat step atau form Finance otomatis.

## Rumus

- Revenue item = `qty × clientUnitPrice`.
- Cost item = `qty × vendorUnitCost`.
- Margin item = revenue − cost.
- Margin % item = margin / revenue × 100; bernilai 0 bila revenue 0.
- Total MO menjumlahkan seluruh item dan menghitung margin % dari total.
- Variance unit bisnis = cost MO − planned RAB cost.
- Planned RAB cost per unit hanya dihitung dari RAB `approved` yang itemnya sudah dipetakan.

## Business Dashboard

- Route `/business`, hanya untuk role `bod` dan `admin`, read-only.
- Menampilkan revenue, cost, margin, margin %, jumlah item, planned RAB, dan variance per unit bisnis.
- Filter: semua umbrella, satu group, atau proyek standalone; periode semua, bulan ini, atau 3 bulan terakhir.
- Hanya Admin dan BOD yang dapat membuka dashboard; role lain diarahkan ke landing page masing-masing.
- Data komersial diambil dari MO non-cancelled dan RAB approved; tidak ada aksi edit dari dashboard.

## Audit

Perubahan MO/RAB dicatat lewat `recordProjectEvent`:

- `media_order.created`
- `media_order.updated`
- `media_order.item_changed`
- `media_order.deleted`

Metadata menyimpan `orderId`, `itemId`, nilai `before`, dan `after`, termasuk unit bisnis.
