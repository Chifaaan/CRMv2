/** Selaras dengan backend `TASK_TYPES` — slug disimpan di kolom `Task.type`. */
export const TASK_TYPE_VALUES = [
  "story",
  "task",
  "bug",
  "enhancement",
  "epic",
  "new_feature",
  "adjustment",
  "troubleshooting",
  "inject_data",
  "data_update",
] as const;

export type TaskTypeSlug = (typeof TASK_TYPE_VALUES)[number];

export const TASK_TYPE_OPTIONS: { value: TaskTypeSlug; label: string }[] = [
  { value: "story", label: "Story" },
  { value: "task", label: "Task" },
  { value: "bug", label: "Bug" },
  { value: "enhancement", label: "Enhancement" },
  { value: "epic", label: "Epic" },
  { value: "new_feature", label: "New Feature" },
  { value: "adjustment", label: "Adjustment" },
  { value: "troubleshooting", label: "Troubleshooting" },
  { value: "inject_data", label: "Inject Data" },
  { value: "data_update", label: "Data Update" },
];

const LABEL_MAP: Record<string, string> = Object.fromEntries(
  TASK_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

export function taskTypeLabel(type: string): string {
  return LABEL_MAP[type] ?? type;
}
