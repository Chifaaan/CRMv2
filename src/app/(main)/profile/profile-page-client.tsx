"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient, useSession } from "@/lib/auth-client";
import { api } from "@/lib/api/client";
import { uploadFile } from "@/lib/upload";
import { ImageDropZone } from "@/components/ui/image-drop-zone";
import {
  FormGroup,
  FormRow,
  FormSectionTitle,
} from "@/components/features/crud/form-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type UserMe = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  status: string;
  image: string | null;
  phoneNumber: string | null;
  company: string | null;
  department: string | null;
  position: string | null;
  campus?: string | null;
  faculty?: string | null;
  major?: string | null;
  angkatan?: string | null;
  yearsOfExperience?: string | null;
  bio?: string | null;
  linkedin?: string | null;
  github?: string | null;
  createdAt: string;
};

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

function displayOrDash(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}


export function ProfilePageClient() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: session, refetch: refetchSession } = useSession();
  const userId = session?.user?.id;

  const q = useQuery({
    queryKey: ["user", "me", userId],
    queryFn: async () => {
      const res = await api.get<UserMe>(`/api/users/${userId}`);
      return res.data;
    },
    enabled: Boolean(userId),
  });

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [campus, setCampus] = useState("");
  const [faculty, setFaculty] = useState("");
  const [major, setMajor] = useState("");
  const [angkatan, setAngkatan] = useState("");
  const [bio, setBio] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    const u = q.data;
    setName(u.name ?? "");
    setUsername((u.username ?? "").trim());
    setEmail(u.email ?? "");
    setPhoneNumber(u.phoneNumber ?? "");
    setPassword("");
    setConfirmPassword("");
    setCampus(u.campus ?? "");
    setFaculty(u.faculty ?? "");
    setMajor(u.major ?? "");
    setAngkatan(u.angkatan ?? "");
    setBio(u.bio ?? "");
    setLinkedin(u.linkedin ?? "");
    setGithub(u.github ?? "");
    setAvatarFile(null);
    setRemoveAvatar(false);
    setAvatarPreview(u.image);
  }, [q.data]);

  function onAvatarChange(f: File | null) {
    setAvatarFile(f);
    setRemoveAvatar(false);
    if (f) {
      setAvatarPreview(URL.createObjectURL(f));
    } else if (q.data?.image && !removeAvatar) {
      setAvatarPreview(q.data.image);
    } else {
      setAvatarPreview(null);
    }
  }

  const saveM = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not signed in");
      const n = name.trim();
      const un = username.trim().toLowerCase();
      const em = email.trim();
      if (!n) throw new Error("Full name is required");
      if (!un) throw new Error("Username is required");
      if (!/^[a-z0-9_.-]{3,30}$/i.test(un)) {
        throw new Error("Username: 3–30 chars, letters, numbers, _ . - only");
      }
      if (!em) throw new Error("Email is required");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
        throw new Error("Invalid email");
      }
      if (password && password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      if (password && password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const patchBody: Record<string, unknown> = {
        name: n,
        username: un,
        email: em,
        phoneNumber: phoneNumber.trim() || undefined,
        campus: campus.trim() || undefined,
        faculty: faculty.trim() || undefined,
        major: major.trim() || undefined,
        angkatan: angkatan.trim() || undefined,
        bio: bio.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        github: github.trim() || undefined,
      };

      let nextImage: string | null | undefined;
      if (avatarFile) {
        const { url } = await uploadFile(avatarFile, "avatars");
        patchBody.image = url;
        nextImage = url;
      } else if (removeAvatar) {
        patchBody.image = "";
        nextImage = null;
      }

      const nameChanged = n !== (q.data?.name ?? "");
      const imageChanged = nextImage !== undefined;

      await api.patch(`/api/users/${userId}`, patchBody);
      if (password) {
        await api.patch(`/api/users/${userId}/password`, { password });
      }

      return { name: n, nameChanged, image: nextImage, imageChanged };
    },
    onSuccess: async ({ name: savedName, nameChanged, image, imageChanged }) => {
      toast.success("Profil disimpan");

      if (nameChanged || imageChanged) {
        const sessionPayload: { name?: string; image?: string } = {};
        if (nameChanged) sessionPayload.name = savedName;
        if (imageChanged) sessionPayload.image = image ?? "";
        await authClient.updateUser(sessionPayload);
      }

      qc.setQueryData<UserMe>(["user", "me", userId], (old) => {
        if (!old) return old;
        return {
          ...old,
          ...(nameChanged ? { name: savedName } : {}),
          ...(imageChanged ? { image: image ?? null } : {}),
        };
      });

      if (imageChanged) {
        setAvatarPreview(image ?? null);
      }

      await qc.invalidateQueries({ queryKey: ["user", "me", userId] });
      await refetchSession();
      router.refresh();
      setPassword("");
      setConfirmPassword("");
      setAvatarFile(null);
      setRemoveAvatar(false);
    },
    onError: (e: Error) => toast.error(e.message || "Gagal menyimpan"),
  });

  if (!userId) {
    return <p className="text-sm text-zinc-600">Memuat sesi…</p>;
  }

  if (q.isPending) {
    return <Skeleton className="h-[720px] w-full max-w-2xl" />;
  }

  if (q.isError || !q.data) {
    return (
      <p className="text-sm text-red-600">
        Tidak dapat memuat profil. Pastikan Anda sudah masuk.
      </p>
    );
  }

  const u = q.data;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Profil</h2>
        <p className="text-sm text-zinc-600">
          Sama seperti formulir anggota tim: perbarui data diri, avatar, dan
          kata sandi. Peran dan status akun hanya dapat diubah oleh admin.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Ringkasan akun</CardTitle>
          <CardDescription>
            <span className="font-mono text-xs">
              @{u.username?.trim() || "—"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <FormSectionTitle>Identity</FormSectionTitle>
            <FormRow>
              <FormGroup>
                <Label htmlFor="pf-name">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pf-name"
                  placeholder="e.g. Budi Santoso"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="pf-user">Username</Label>
                <Input
                  id="pf-user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  spellCheck={false}
                  autoComplete="username"
                />
                <p className="text-muted-foreground text-xs">
                  Untuk masuk; 3–30 karakter (huruf, angka, _ . -). Harus unik.
                </p>
              </FormGroup>
            </FormRow>
            <FormRow className="mt-4">
              <FormGroup>
                <Label htmlFor="pf-email">
                  Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pf-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="pf-phone">Phone Number</Label>
                <Input
                  id="pf-phone"
                  type="tel"
                  placeholder="e.g. +62 812 3456 7890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                />
              </FormGroup>
            </FormRow>
          </div>

          <div>
            <FormSectionTitle>
              Password{" "}
              <span className="text-muted-foreground font-normal normal-case">
                (Leave blank to keep current)
              </span>
            </FormSectionTitle>
            <FormRow>
              <FormGroup>
                <Label htmlFor="pf-pass">New password</Label>
                <div className="relative">
                  <Input
                    id="pf-pass"
                    type={showPass ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                <Label htmlFor="pf-pass2">Confirm password</Label>
                <Input
                  id="pf-pass2"
                  type={showPass ? "text" : "password"}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </FormGroup>
            </FormRow>
          </div>

          <div>
            <FormSectionTitle>Organisasi</FormSectionTitle>
            <FormRow>
              <FormGroup>
                <Label htmlFor="pf-co">Company</Label>
                <Input
                  id="pf-co"
                  value={displayOrDash(u.company)}
                  disabled
                  readOnly
                  className="bg-muted/50"
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="pf-dept">Department</Label>
                <Input
                  id="pf-dept"
                  value={displayOrDash(u.department)}
                  disabled
                  readOnly
                  className="bg-muted/50"
                />
              </FormGroup>
            </FormRow>
            <FormRow className="mt-4">
              <FormGroup>
                <Label htmlFor="pf-pos">Position / Job Title</Label>
                <Input
                  id="pf-pos"
                  value={displayOrDash(u.position)}
                  disabled
                  readOnly
                  className="bg-muted/50"
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="pf-yoe">Years of experience (YoE)</Label>
                <Input
                  id="pf-yoe"
                  value={displayOrDash(u.yearsOfExperience)}
                  disabled
                  readOnly
                  className="bg-muted/50"
                />
              </FormGroup>
            </FormRow>
            <p className="text-muted-foreground mt-3 text-xs">
              Informasi ini dikelola oleh admin. Hubungi admin untuk melakukan
              perubahan.
            </p>
            <FormSectionTitle className="mt-6">Akademik (opsional)</FormSectionTitle>
            <FormRow>
              <FormGroup>
                <Label htmlFor="pf-campus">Kampus</Label>
                <Input
                  id="pf-campus"
                  placeholder="Nama kampus / universitas"
                  value={campus}
                  onChange={(e) => setCampus(e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="pf-faculty">Fakultas</Label>
                <Input
                  id="pf-faculty"
                  placeholder="Nama fakultas"
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                />
              </FormGroup>
            </FormRow>
            <FormRow className="mt-4">
              <FormGroup>
                <Label htmlFor="pf-major">Jurusan</Label>
                <Input
                  id="pf-major"
                  placeholder="Program studi / jurusan"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="pf-angkatan">Angkatan</Label>
                <Input
                  id="pf-angkatan"
                  placeholder="mis. 2022"
                  value={angkatan}
                  onChange={(e) => setAngkatan(e.target.value)}
                />
              </FormGroup>
            </FormRow>
            <FormGroup className="mt-4">
              <Label htmlFor="pf-bio">Bio</Label>
              <Textarea
                id="pf-bio"
                rows={2}
                placeholder="A short profile description…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </FormGroup>
          </div>

          <div>
            <FormSectionTitle>Social Links</FormSectionTitle>
            <FormRow>
              <FormGroup>
                <Label htmlFor="pf-li">LinkedIn</Label>
                <Input
                  id="pf-li"
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                />
              </FormGroup>
              <FormGroup>
                <Label htmlFor="pf-gh">GitHub</Label>
                <Input
                  id="pf-gh"
                  type="url"
                  placeholder="https://github.com/username"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                />
              </FormGroup>
            </FormRow>
          </div>

          <div>
            <FormSectionTitle>Avatar</FormSectionTitle>
            <ImageDropZone
              preview={avatarPreview}
              initials={initials(name || "?")}
              label="foto"
              hint="JPG, PNG, atau WebP. Ditampilkan sebagai avatar."
              size={80}
              shape="circle"
              onFile={(f) => onAvatarChange(f)}
              canRemove={!!(u.image || avatarFile)}
              onRemove={() => {
                setAvatarFile(null);
                setRemoveAvatar(true);
                setAvatarPreview(null);
              }}
            />
          </div>

          <div className="flex justify-end border-t pt-4">
            <Button
              type="button"
              disabled={saveM.isPending}
              onClick={() => saveM.mutate()}
              className="gap-2"
            >
              <Save className="size-4" />
              {saveM.isPending ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
