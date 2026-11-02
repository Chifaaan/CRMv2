export type RabAddDetailItem = {
  id: string;
  name: string;
  volume: string;
  unit: string;
  rabUnitPrice: string;
  rabTotalPrice: string;
  rapUnitPrice: string;
  rapTotalPrice: string;
};

export type RabAddDetailGroup = {
  id: string;
  name: string;
  items: RabAddDetailItem[];
};

export type RabAddMetric = {
  label: string;
  value: string;
  barClassName: string;
  valueClassName?: string;
};

export const RAB_ADD_UNITS = [
  { value: "meter", label: "Meter" },
  { value: "unit", label: "Unit" },
  { value: "lot", label: "Lot" },
] as const;

export const RAB_ADD_DETAIL_ITEMS: RabAddDetailItem[] = [
  {
    id: "1",
    name: "Pemasangan Kabel",
    volume: "500",
    unit: "meter",
    rabUnitPrice: "150.000",
    rabTotalPrice: "75.000.000",
    rapUnitPrice: "",
    rapTotalPrice: "",
  },
  {
    id: "2",
    name: "Panel Listrik",
    volume: "5",
    unit: "unit",
    rabUnitPrice: "25.000.000",
    rabTotalPrice: "125.000.000",
    rapUnitPrice: "",
    rapTotalPrice: "",
  },
  {
    id: "3",
    name: "Tenaga Kerja Pemasangan",
    volume: "1",
    unit: "lot",
    rabUnitPrice: "75.500.000",
    rabTotalPrice: "75.500.000",
    rapUnitPrice: "",
    rapTotalPrice: "",
  },
];

export const RAB_ADD_DETAIL_GROUPS: RabAddDetailGroup[] = [
  {
    id: "group-1",
    name: "Pekerjaan Elektrikal",
    items: RAB_ADD_DETAIL_ITEMS,
  },
];

export const cloneRabAddDetailGroups = () =>
  RAB_ADD_DETAIL_GROUPS.map((group) => ({
    ...group,
    items: group.items.map((item) => ({ ...item })),
  }));

export const RAB_ADD_METRICS: RabAddMetric[] = [
  {
    label: "Nilai RAP",
    value: "Rp 250M",
    barClassName: "w-[90%] bg-zinc-400",
  },
  {
    label: "Nilai RAB",
    value: "Rp 275.5M",
    barClassName: "w-full bg-blue-600",
    valueClassName: "font-bold text-blue-700",
  },
];

export const RAB_ADD_TOTAL_CONVERSION = "Rp 275.500.000";
