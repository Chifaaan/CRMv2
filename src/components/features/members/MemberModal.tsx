"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Save, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  FormGroup,
  FormRow,
  FormSectionTitle,
} from "@/components/features/crud/form-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { uploadFile } from "@/lib/upload";
import {
  FormDraftKeys,
  clearFormDraft,
  loadFormDraftEnvelope,
} from "@/lib/form-draft-storage";
import { useDebouncedFormDraftSave } from "@/lib/hooks/use-debounced-form-draft-save";
import { ImageDropZone } from "@/components/ui/image-drop-zone";
import { toast } from "sonner";
import { ROLE_OPTIONS } from "@/lib/role-constants";
export type MemberRow = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
  status: string;
  image: string | null;
  phoneNumber: string | null;
  /** Set when role is client — master Client record */
  clientId?: string | null;
  company: string | null;
  department: string | null;
  position: string | null;
  yearsOfExperience?: string | null;
  campus?: string | null;
  faculty?: string | null;
  major?: string | null;
  angkatan?: string | null;
  bio?: string | null;
  linkedin?: string | null;
  github?: string | null;
  lastLogin?: string | null;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "invited", label: "Invited" },
] as const;

const ROLE_SELECT_ITEMS = ROLE_OPTIONS.map((r) => ({
  value: r.value,
  label: r.label,
}));
const STATUS_SELECT_ITEMS = STATUS_OPTIONS.map((s) => ({
  value: s.value,
  label: s.label,
}));
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}


const empty = {
  name: "",
  username: "",
  email: "",
  phoneNumber: "",
  password: "",
  confirmPassword: "",
  role: "developer",
  status: "active",
  clientId: "",
  company: "",
  department: "",
  position: "",
  campus: "",
  faculty: "",
  major: "",
  angkatan: "",
  yearsOfExperience: "",
  bio: "",
  linkedin: "",
  github: "",
};

type MemberModalProps = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  member: MemberRow | null;
};

type ClientPickerRow = { id: string; companyName: string };

export function MemberModal({ open, onOpenChange, member }: MemberModalProps) {
  const qc = useQueryClient();
  const isEdit = !!member;
  const [form, setForm] = useState(empty);

  const clientsQ = useQuery({
    queryKey: ["clients", "member-modal"],
    queryFn: async () => {
      const res = await api.get<ClientPickerRow[]>("/api/clients");
      return res.data;
    },
    enabled: open,
  });

  const companiesQ = useQuery({
    queryKey: ["companies", "names"],
    queryFn: async () => {
      const res = await api.get<string[]>("/api/companies/meta/names");
      return res.data;
    },
    enabled: open,
  });

  const clientCompanySelectItems = useMemo(
    () => [
      { value: "__pick__", label: "Choose a client…" },
      ...(clientsQ.data ?? []).map((c) => ({
        value: c.id,
        label: c.companyName,
      })),
    ],
    [clientsQ.data],
  );

  const companySelectItems = useMemo(
    () => [
      { value: "__none__", label: "— Tidak ada —" },
      ...(companiesQ.data ?? []).map((name) => ({
        value: name,
        label: name,
      })),
    ],
    [companiesQ.data],
  );

  const [showPass, setShowPass] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      const draftKey = member
        ? FormDraftKeys.memberEdit(member.id)
        : FormDraftKeys.memberCreate();
      const env = loadFormDraftEnvelope(draftKey)?.payload;

      function applyFromMember() {
        setShowPass(false);
        setAvatarFile(null);
        setRemoveAvatar(false);
        if (member) {
          setForm({
            name: member.name,
            username: member.username ?? "",
            email: member.email,
            phoneNumber: member.phoneNumber ?? "",
            password: "",
            confirmPassword: "",
            role: member.role,
            status: member.status,
            clientId: member.clientId ?? "",
            company: member.company ?? "",
            department: member.department ?? "",
            position: member.position ?? "",
            campus: member.campus ?? "",
            faculty: member.faculty ?? "",
            major: member.major ?? "",
            angkatan: member.angkatan ?? "",
            yearsOfExperience: member.yearsOfExperience ?? "",
            bio: member.bio ?? "",
            linkedin: member.linkedin ?? "",
            github: member.github ?? "",
          });
          setAvatarPreview(member.image);
        } else {
          setForm(empty);
          setAvatarPreview(null);
        }
      }

      if (env && typeof env === "object") {
        const raw = env as {
          form?: Partial<typeof empty>;
          showPass?: boolean;
          removeAvatar?: boolean;
        };
        if (raw.form && typeof raw.form === "object") {
          setShowPass(Boolean(raw.showPass));
          setAvatarFile(null);
          setRemoveAvatar(Boolean(raw.removeAvatar));
          const base =
            member != null
              ? {
                  name: member.name,
                  username: member.username ?? "",
                  email: member.email,
                  phoneNumber: member.phoneNumber ?? "",
                  password: "",
                  confirmPassword: "",
                  role: member.role,
                  status: member.status,
                  clientId: member.clientId ?? "",
                  company: member.company ?? "",
                  department: member.department ?? "",
                  position: member.position ?? "",
                  campus: member.campus ?? "",
                  faculty: member.faculty ?? "",
                  major: member.major ?? "",
                  angkatan: member.angkatan ?? "",
                  yearsOfExperience: member.yearsOfExperience ?? "",
                  bio: member.bio ?? "",
                  linkedin: member.linkedin ?? "",
                  github: member.github ?? "",
                }
              : { ...empty };
          setForm({
            ...base,
            ...raw.form,
            password: "",
            confirmPassword: "",
          });
          setAvatarPreview(raw.removeAvatar ? null : member?.image ?? null);
          return;
        }
      }
      applyFromMember();
    });
  }, [open, member]);

  const memberDraftKey = open
    ? member
      ? FormDraftKeys.memberEdit(member.id)
      : FormDraftKeys.memberCreate()
    : null;

  useDebouncedFormDraftSave(
    Boolean(memberDraftKey),
    memberDraftKey,
    () => {
      const stripped = Object.entries(form).some(
        ([k, v]) =>
          typeof v === "string" &&
          k !== "password" &&
          k !== "confirmPassword" &&
          v.trim().length > 0,
      );
      const hasPass = !!(form.password ?? "").trim().length;
      if (!stripped && !hasPass && !showPass && !removeAvatar)
        return undefined;
      return {
        form: { ...form, password: "", confirmPassword: "" },
        showPass,
        removeAvatar,
      };
    },
    [form, showPass, removeAvatar],
  );

  const saveM = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      const username = form.username.trim();
      const email = form.email.trim();
      if (!name) throw new Error("Full name is required");
      if (!username) throw new Error("Username is required");
      if (!/^[a-z0-9_.-]{3,30}$/i.test(username)) {
        throw new Error("Username: 3–30 chars, letters, numbers, _ . - only");
      }
      if (!email) throw new Error("Email is required");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Invalid email");
      }
      if (!isEdit) {
        if (!form.password) throw new Error("Password is required");
        if (form.password.length < 8) {
          throw new Error("Password must be at least 8 characters");
        }
      }
      if (form.password && form.password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      if (form.password && form.password !== form.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      if (form.role === "client" && !form.clientId.trim()) {
        throw new Error("Select a client company for the client role");
      }
      if (
        form.role !== "client" &&
        form.company.trim() &&
        !(companiesQ.data ?? []).some(
          (c) => c.toLowerCase() === form.company.trim().toLowerCase(),
        )
      ) {
        throw new Error(
          "Pilih company dari daftar. Kelola daftar company jika belum ada.",
        );
      }

      if (!isEdit) {
        const { data: created } = await api.post<MemberRow>("/api/users", {
          username,
          email,
          name,
          password: form.password,
          role: form.role,
          status: form.status,
          phoneNumber: form.phoneNumber.trim() || undefined,
          clientId:
            form.role === "client" ? form.clientId.trim() : undefined,
          company:
            form.role === "client"
              ? undefined
              : form.company.trim() || undefined,
          department: form.department.trim() || undefined,
          position: form.position.trim() || undefined,
          campus: form.campus.trim() || undefined,
          faculty: form.faculty.trim() || undefined,
          major: form.major.trim() || undefined,
          angkatan: form.angkatan.trim() || undefined,
          yearsOfExperience: form.yearsOfExperience.trim() || undefined,
          bio: form.bio.trim() || undefined,
          linkedin: form.linkedin.trim() || undefined,
          github: form.github.trim() || undefined,
        });
        if (avatarFile && created?.id) {
          const { url } = await uploadFile(avatarFile, "avatars");
          await api.patch(`/api/users/${created.id}`, { image: url });
        }
      } else {
        const patchBody: Record<string, unknown> = {
          username,
          name,
          email,
          phoneNumber: form.phoneNumber.trim() || undefined,
          company:
            form.role === "client"
              ? undefined
              : form.company.trim() || undefined,
          department: form.department.trim() || undefined,
          position: form.position.trim() || undefined,
          campus: form.campus.trim() || undefined,
          faculty: form.faculty.trim() || undefined,
          major: form.major.trim() || undefined,
          angkatan: form.angkatan.trim() || undefined,
          yearsOfExperience: form.yearsOfExperience.trim() || undefined,
          bio: form.bio.trim() || undefined,
          linkedin: form.linkedin.trim() || undefined,
          github: form.github.trim() || undefined,
          role: form.role,
          status: form.status,
          ...(form.role === "client"
            ? { clientId: form.clientId.trim() }
            : {}),
        };
        if (avatarFile) {
          const { url } = await uploadFile(avatarFile, "avatars");
          patchBody.image = url;
        } else if (removeAvatar) {
          patchBody.image = "";
        }
        await api.patch(`/api/users/${member!.id}`, patchBody);
        if (form.password) {
          await api.patch(`/api/users/${member!.id}/password`, {
            password: form.password,
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users", "admin-list"] });
      qc.invalidateQueries({ queryKey: ["users", "for-assets"] });
      clearFormDraft(
        member ? FormDraftKeys.memberEdit(member.id) : FormDraftKeys.memberCreate(),
      );
      onOpenChange(false);
      toast.success(isEdit ? "Member updated" : "Member added");
    },
    onError: (e: Error) => toast.error(e.message || "Save failed"),
  });

  function onAvatarChange(f: File | null) {
    setAvatarFile(f);
    setRemoveAvatar(false);
    if (f) {
      setAvatarPreview(URL.createObjectURL(f));
    } else if (member?.image && !removeAvatar) {
      setAvatarPreview(member.image);
    } else {
      setAvatarPreview(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="flex max-h-[min(92vh,880px)] w-full max-w-[calc(100%-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogHeader className="border-border shrink-0 border-b px-6 py-4">
          <DialogTitle>
            {isEdit ? "Edit Member" : "Add New Member"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update profile, role, and access. Leave password blank to keep the current one."
              : "Create a team account. The member can sign in with username and password."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <FormSectionTitle>Identity</FormSectionTitle>
          <FormRow>
            <FormGroup>
              <Label htmlFor="m-name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="m-name"
                placeholder="e.g. Budi Santoso"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="m-user">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="m-user"
                placeholder="e.g. budi.s"
                value={form.username}
                readOnly={isEdit}
                className={isEdit ? "bg-muted" : ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value }))
                }
                spellCheck={false}
              />
              {isEdit ? (
                <p className="text-muted-foreground text-xs">
                  Username cannot be changed after creation.
                </p>
              ) : null}
            </FormGroup>
          </FormRow>
          <FormRow className="mt-4">
            <FormGroup>
              <Label htmlFor="m-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="m-email"
                type="email"
                placeholder="e.g. budi@company.com"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="m-phone">Phone Number</Label>
              <Input
                id="m-phone"
                type="tel"
                placeholder="e.g. +62 812 3456 7890"
                value={form.phoneNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phoneNumber: e.target.value }))
                }
              />
            </FormGroup>
          </FormRow>

          <FormSectionTitle>
            Password{" "}
            {isEdit ? (
              <span className="text-muted-foreground font-normal normal-case">
                (Leave blank to keep current)
              </span>
            ) : null}
          </FormSectionTitle>
          <FormRow>
            <FormGroup>
              <Label htmlFor="m-pass">
                Password{" "}
                {!isEdit ? (
                  <span className="text-destructive">*</span>
                ) : null}
              </Label>
              <div className="relative">
                <Input
                  id="m-pass"
                  type={showPass ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, password: e.target.value }))
                  }
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  onClick={() => setShowPass((s) => !s)}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </Button>
              </div>
            </FormGroup>
            <FormGroup>
              <Label htmlFor="m-pass2">
                Confirm Password{" "}
                {!isEdit ? (
                  <span className="text-destructive">*</span>
                ) : null}
              </Label>
              <Input
                id="m-pass2"
                type={showPass ? "text" : "password"}
                placeholder="Re-enter password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, confirmPassword: e.target.value }))
                }
              />
            </FormGroup>
          </FormRow>

          <FormSectionTitle>Role &amp; Status</FormSectionTitle>
          <FormRow>
            <FormGroup>
              <Label>
                Role <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  v &&
                  setForm((f) => ({
                    ...f,
                    role: v,
                    ...(v !== "client" ? { clientId: "" } : {}),
                  }))
                }
                items={ROLE_SELECT_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_SELECT_ITEMS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormGroup>
            <FormGroup>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => v && setForm((f) => ({ ...f, status: v }))}
                items={STATUS_SELECT_ITEMS}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_SELECT_ITEMS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormGroup>
          </FormRow>

          <FormSectionTitle>Profile</FormSectionTitle>
          <FormRow>
            {form.role === "client" ? (
              <FormGroup>
                <Label>
                  Client company{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.clientId || "__pick__"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      clientId: v === "__pick__" ? "" : (v ?? ""),
                    }))
                  }
                  items={clientCompanySelectItems}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select registered client…" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientCompanySelectItems.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-muted-foreground text-xs">
                  Users in this company are added automatically to projects
                  linked to the same client (project role: client, view-only).
                </p>
              </FormGroup>
            ) : (
              <FormGroup>
                <Label htmlFor="m-co">Company</Label>
                <Select
                  value={form.company || "__none__"}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      company: v === "__none__" ? "" : (v ?? ""),
                    }))
                  }
                  items={companySelectItems}
                >
                  <SelectTrigger id="m-co">
                    <SelectValue placeholder="Pilih company…" />
                  </SelectTrigger>
                  <SelectContent>
                    {companySelectItems.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormGroup>
            )}
            <FormGroup>
              <Label htmlFor="m-dept">Department</Label>
              <Input
                id="m-dept"
                placeholder="e.g. Engineering"
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value }))
                }
              />
            </FormGroup>
          </FormRow>
          <FormRow className="mt-4">
            <FormGroup>
              <Label htmlFor="m-pos">Position / Job Title</Label>
              <Input
                id="m-pos"
                placeholder="e.g. Backend Developer"
                value={form.position}
                onChange={(e) =>
                  setForm((f) => ({ ...f, position: e.target.value }))
                }
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="m-yoe">Years of experience (YoE)</Label>
              <Input
                id="m-yoe"
                placeholder="e.g. 3 or 2.5"
                value={form.yearsOfExperience}
                onChange={(e) =>
                  setForm((f) => ({ ...f, yearsOfExperience: e.target.value }))
                }
              />
            </FormGroup>
          </FormRow>

          <FormSectionTitle>Akademik (opsional)</FormSectionTitle>
          <FormRow>
            <FormGroup>
              <Label htmlFor="m-campus">Kampus</Label>
              <Input
                id="m-campus"
                placeholder="e.g. Universitas …"
                value={form.campus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, campus: e.target.value }))
                }
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="m-faculty">Fakultas</Label>
              <Input
                id="m-faculty"
                placeholder="e.g. Fakultas …"
                value={form.faculty}
                onChange={(e) =>
                  setForm((f) => ({ ...f, faculty: e.target.value }))
                }
              />
            </FormGroup>
          </FormRow>
          <FormRow className="mt-4">
            <FormGroup>
              <Label htmlFor="m-major">Jurusan</Label>
              <Input
                id="m-major"
                placeholder="e.g. Teknik Informatika"
                value={form.major}
                onChange={(e) =>
                  setForm((f) => ({ ...f, major: e.target.value }))
                }
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="m-angkatan">Angkatan</Label>
              <Input
                id="m-angkatan"
                placeholder="e.g. 2022"
                value={form.angkatan}
                onChange={(e) =>
                  setForm((f) => ({ ...f, angkatan: e.target.value }))
                }
              />
            </FormGroup>
          </FormRow>

          <FormGroup className="mt-4">
            <Label htmlFor="m-bio">Bio</Label>
            <Textarea
              id="m-bio"
              rows={2}
              placeholder="A short profile description…"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </FormGroup>

          <FormSectionTitle>Social Links</FormSectionTitle>
          <FormRow>
            <FormGroup>
              <Label htmlFor="m-li">LinkedIn</Label>
              <Input
                id="m-li"
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={form.linkedin}
                onChange={(e) =>
                  setForm((f) => ({ ...f, linkedin: e.target.value }))
                }
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="m-gh">GitHub</Label>
              <Input
                id="m-gh"
                type="url"
                placeholder="https://github.com/username"
                value={form.github}
                onChange={(e) =>
                  setForm((f) => ({ ...f, github: e.target.value }))
                }
              />
            </FormGroup>
          </FormRow>

          <FormSectionTitle>Avatar</FormSectionTitle>
          <ImageDropZone
            preview={avatarPreview}
            initials={initials(form.name || "?")}
            label="foto"
            hint="JPG, PNG, atau WebP. Ditampilkan sebagai avatar."
            size={80}
            shape="circle"
            onFile={(f) => onAvatarChange(f)}
            canRemove={isEdit && !!(member?.image || avatarFile)}
            onRemove={() => {
              setAvatarFile(null);
              setRemoveAvatar(true);
              setAvatarPreview(null);
            }}
          />
        </div>

        <div className="bg-muted/40 flex shrink-0 justify-end gap-2 border-t px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saveM.isPending}
            onClick={() => saveM.mutate()}
            className="gap-2"
          >
            {isEdit ? (
              <Save className="size-4" />
            ) : (
              <UserPlus className="size-4" />
            )}
            {isEdit ? "Save Changes" : "Add Member"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
