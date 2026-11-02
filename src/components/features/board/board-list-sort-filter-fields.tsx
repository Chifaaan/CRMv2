"use client";

import {
  BOARD_LIST_SORT_DIR_ITEMS,
  BOARD_LIST_SORT_KEY_ITEMS,
  BOARD_STALE_PRESET_ITEMS,
  type ListSortKey,
  type StalePreset,
} from "@/components/features/board/board-task-utils";
import {
  filterSheetFieldClassName,
  filterSheetLabelClassName,
} from "@/components/ui/filter-sheet";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BoardListSortFilterFieldsProps = {
  sortKey: ListSortKey;
  sortDir: "asc" | "desc";
  stale: StalePreset;
  onSortKeyChange: (value: ListSortKey) => void;
  onSortDirChange: (value: "asc" | "desc") => void;
  onStaleChange: (value: StalePreset) => void;
};

export function BoardListSortFilterFields({
  sortKey,
  sortDir,
  stale,
  onSortKeyChange,
  onSortDirChange,
  onStaleChange,
}: BoardListSortFilterFieldsProps) {
  return (
    <>
      <div className={filterSheetFieldClassName}>
        <Label className={filterSheetLabelClassName}>Sort by</Label>
        <Select
          value={sortKey}
          onValueChange={(v) => onSortKeyChange(v as ListSortKey)}
          items={BOARD_LIST_SORT_KEY_ITEMS}
        >
          <SelectTrigger className="w-full min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOARD_LIST_SORT_KEY_ITEMS.map((it) => (
              <SelectItem key={it.value} value={it.value}>
                {it.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={filterSheetFieldClassName}>
        <Label className={filterSheetLabelClassName}>Direction</Label>
        <Select
          value={sortDir}
          onValueChange={(v) => onSortDirChange(v as "asc" | "desc")}
          items={BOARD_LIST_SORT_DIR_ITEMS}
        >
          <SelectTrigger className="w-full min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOARD_LIST_SORT_DIR_ITEMS.map((it) => (
              <SelectItem key={it.value} value={it.value}>
                {it.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className={filterSheetFieldClassName}>
        <Label className={filterSheetLabelClassName}>Stale &amp; aging</Label>
        <Select
          value={stale}
          onValueChange={(v) => onStaleChange(v as StalePreset)}
          items={BOARD_STALE_PRESET_ITEMS}
        >
          <SelectTrigger className="w-full min-w-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BOARD_STALE_PRESET_ITEMS.map((it) => (
              <SelectItem key={it.value} value={it.value}>
                {it.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
