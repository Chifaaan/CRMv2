"use client";

import { useEffect, useMemo, useState } from "react";
import { Building2, Filter, Search, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserProfileTrigger } from "@/components/features/users/UserProfileTrigger";
import {
  memberRoleBadgeVariant,
  memberRoleLabel,
} from "@/lib/user-status-badge";
import { cn } from "@/lib/utils";
import { APP_ROLES } from "@/lib/role-constants";

const EMPTY_COMPANY_VALUE = "__none__";
const SYSTEM_ROLES = APP_ROLES;

export type ProjectMemberPickerUser = {
  id: string;
  name: string;
  image: string | null;
  role: string;
  company: string | null;
  department: string | null;
  position?: string | null;
};

type MemberFilterState = {
  roles: string[];
  companies: string[];
  departments: string[];
};

const EMPTY_FILTERS: MemberFilterState = {
  roles: [],
  companies: [],
  departments: [],
};

function useDebouncedValue(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

function countActiveFilters(filters: MemberFilterState) {
  return (
    filters.roles.length + filters.companies.length + filters.departments.length
  );
}

function companyFilterValue(company: string | null | undefined) {
  const trimmed = company?.trim();
  return trimmed ? trimmed : EMPTY_COMPANY_VALUE;
}

function companyDisplayLabel(company: string | null | undefined) {
  const trimmed = company?.trim();
  return trimmed || "-";
}

function matchesMemberFilters(
  user: ProjectMemberPickerUser,
  search: string,
  filters: MemberFilterState,
) {
  const q = search.trim().toLowerCase();
  if (q && !user.name.toLowerCase().includes(q)) {
    return false;
  }
  if (
    filters.roles.length > 0 &&
    !filters.roles.includes(user.role.toLowerCase())
  ) {
    return false;
  }
  if (
    filters.companies.length > 0 &&
    !filters.companies.includes(companyFilterValue(user.company))
  ) {
    return false;
  }
  if (filters.departments.length > 0) {
    const dept = user.department?.trim() || EMPTY_COMPANY_VALUE;
    if (!filters.departments.includes(dept)) {
      return false;
    }
  }
  return true;
}

function FilterCheckboxSection({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string, checked: boolean) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 hover:bg-muted/60"
          >
            <Checkbox
              checked={selected.includes(opt.value)}
              onCheckedChange={(v) => onToggle(opt.value, Boolean(v))}
            />
            <span className="text-sm">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

type ProjectMemberPickerListProps = {
  users: ProjectMemberPickerUser[];
  selectedIds: string[];
  onCheckedChange: (userId: string, checked: boolean) => void;
  maxHeightClassName?: string;
  checkedRowClassName?: string;
  avatarFallbackClassName?: string;
};

export function ProjectMemberPickerList({
  users,
  selectedIds,
  onCheckedChange,
  maxHeightClassName = "max-h-56",
  checkedRowClassName = "bg-muted/50",
  avatarFallbackClassName,
}: ProjectMemberPickerListProps) {
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [filterOpen, setFilterOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] =
    useState<MemberFilterState>(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] =
    useState<MemberFilterState>(EMPTY_FILTERS);

  const activeFilterCount = countActiveFilters(appliedFilters);

  const companyOptions = useMemo(() => {
    const names = new Set<string>();
    let hasEmpty = false;
    for (const u of users) {
      const co = u.company?.trim();
      if (co) names.add(co);
      else hasEmpty = true;
    }
    const sorted = [...names].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    const options = sorted.map((name) => ({ value: name, label: name }));
    if (hasEmpty) {
      options.unshift({
        value: EMPTY_COMPANY_VALUE,
        label: "— Tanpa perusahaan",
      });
    }
    return options;
  }, [users]);

  const departmentOptions = useMemo(() => {
    const names = new Set<string>();
    let hasEmpty = false;
    for (const u of users) {
      const dept = u.department?.trim();
      if (dept) names.add(dept);
      else hasEmpty = true;
    }
    if (names.size === 0 && !hasEmpty) return [];
    const sorted = [...names].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
    const options = sorted.map((name) => ({ value: name, label: name }));
    if (hasEmpty) {
      options.unshift({
        value: EMPTY_COMPANY_VALUE,
        label: "— Tanpa departemen",
      });
    }
    return options;
  }, [users]);

  const roleOptions = useMemo(
    () =>
      SYSTEM_ROLES.map((role) => ({
        value: role,
        label: memberRoleLabel(role),
      })),
    [],
  );

  const displayUsers = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const selected = users.filter((u) => selectedSet.has(u.id));
    const rest = users.filter(
      (u) =>
        !selectedSet.has(u.id) &&
        matchesMemberFilters(u, debouncedSearch, appliedFilters),
    );
    return [...selected, ...rest];
  }, [users, selectedIds, debouncedSearch, appliedFilters]);

  function applyFilters() {
    setAppliedFilters(draftFilters);
    setFilterOpen(false);
  }

  function resetDraftFilters() {
    setDraftFilters(EMPTY_FILTERS);
  }

  function toggleDraftFilter(
    key: keyof MemberFilterState,
    value: string,
    checked: boolean,
  ) {
    setDraftFilters((prev) => {
      const list = prev[key];
      if (checked) {
        return list.includes(value)
          ? prev
          : { ...prev, [key]: [...list, value] };
      }
      return { ...prev, [key]: list.filter((v) => v !== value) };
    });
  }

  const listEmptyMessage =
    users.length === 0
      ? "Belum ada member tersedia"
      : displayUsers.length === 0
        ? "Tidak ada member yang sesuai"
        : null;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari member..."
            className="h-9 pr-8 pl-9 text-sm"
            autoComplete="off"
          />
          {searchInput ? (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Hapus pencarian"
              onClick={() => setSearchInput("")}
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        <Popover
          open={filterOpen}
          onOpenChange={(open) => {
            if (open) setDraftFilters(appliedFilters);
            setFilterOpen(open);
          }}
        >
          <PopoverTrigger
            type="button"
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
              />
            }
          >
            <Filter className="size-4" />
            Filter
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 gap-3 p-3">
            <FilterCheckboxSection
              title="Role"
              options={roleOptions}
              selected={draftFilters.roles}
              onToggle={(value, checked) =>
                toggleDraftFilter("roles", value, checked)
              }
            />
            <FilterCheckboxSection
              title="Company"
              options={companyOptions}
              selected={draftFilters.companies}
              onToggle={(value, checked) =>
                toggleDraftFilter("companies", value, checked)
              }
            />
            <FilterCheckboxSection
              title="Department"
              options={departmentOptions}
              selected={draftFilters.departments}
              onToggle={(value, checked) =>
                toggleDraftFilter("departments", value, checked)
              }
            />
            <div className="flex gap-2 border-t pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={resetDraftFilters}
              >
                Reset
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1"
                onClick={applyFilters}
              >
                Terapkan
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div
        className={cn(
          "space-y-1 overflow-y-auto rounded-md border p-1",
          maxHeightClassName,
        )}
      >
        {listEmptyMessage ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {listEmptyMessage}
          </p>
        ) : (
          displayUsers.map((u) => {
            const checked = selectedIds.includes(u.id);
            return (
              <div
                key={u.id}
                className={cn(
                  "flex flex-wrap items-center gap-2 rounded-md px-2 py-2 sm:flex-nowrap",
                  checked && checkedRowClassName,
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(v) => onCheckedChange(u.id, Boolean(v))}
                  className="shrink-0"
                />
                <UserProfileTrigger userId={u.id} className="shrink-0">
                  <Avatar className="size-8">
                    {u.image ? <AvatarImage src={u.image} alt="" /> : null}
                    <AvatarFallback
                      className={cn("text-[10px]", avatarFallbackClassName)}
                    >
                      {u.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </UserProfileTrigger>
                <div className="min-w-0 flex-1">
                  <UserProfileTrigger
                    userId={u.id}
                    className="block max-w-full rounded-sm"
                  >
                    <p className="truncate text-sm font-medium">{u.name}</p>
                  </UserProfileTrigger>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <Badge
                      variant={memberRoleBadgeVariant(u.role)}
                      className="h-5 px-1.5 text-[10px] font-medium"
                    >
                      {memberRoleLabel(u.role)}
                    </Badge>
                    <span className="inline-flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                      <Building2 className="size-3 shrink-0" aria-hidden />
                      <span className="truncate">
                        {companyDisplayLabel(u.company)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
