export const NOTIFICATION_TYPE_OPTIONS = [
  { value: "task", label: "Tugas" },
  { value: "sprint", label: "Sprint" },
  { value: "project", label: "Proyek" },
  { value: "meeting", label: "Rapat" },
  { value: "meeting_agenda_item", label: "Agenda rapat" },
  { value: "meeting_notulensi_attachment", label: "Lampiran notulensi" },
  { value: "letter", label: "Surat" },
  { value: "budget", label: "Anggaran" },
  { value: "discussion", label: "Diskusi" },
  { value: "discussion_reply", label: "Balasan diskusi" },
  { value: "discussion_attachment", label: "Lampiran diskusi" },
  { value: "maintenance", label: "Maintenance" },
  { value: "maintenance_attachment", label: "Lampiran maintenance" },
];

export const NOTIFICATION_DATE_PRESETS = [
  { value: "7d", label: "7 hari" },
  { value: "30d", label: "30 hari" },
  { value: "month", label: "Bulan ini" },
];

const toInputDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

export const resolveNotificationDatePreset = (preset: string) => {
  const today = new Date();
  if (preset === "month") {
    return {
      dateFrom: toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)),
      dateTo: toInputDate(today),
    };
  }
  const days = preset === "7d" ? 6 : 29;
  const from = new Date(today);
  from.setDate(from.getDate() - days);
  return { dateFrom: toInputDate(from), dateTo: toInputDate(today) };
};

export const notificationTypeLabel = (value: string) =>
  NOTIFICATION_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
  value;
