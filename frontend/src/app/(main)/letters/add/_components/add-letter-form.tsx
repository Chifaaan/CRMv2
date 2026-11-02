"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Form, Formik } from "formik";
import * as Yup from "yup";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapLink from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  CloudUpload,
  Italic,
  LinkIcon,
  List,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LETTER_CATEGORY_OPTIONS,
  LETTER_SECURITY_OPTIONS,
  LETTER_TYPE_OPTIONS,
} from "@/lib/letter-constants";
import type { LetterMeta, LetterUser } from "../../types";
import {
  addLetterAttachment,
  finalizeAddLetter,
  saveAddLetterDraft,
  uploadLetterFile,
} from "../action";
import {
  ADD_LETTER_INITIAL_VALUES,
  type AddLetterFormValues,
} from "./add-letter-data";

const validationSchema = Yup.object({
  category: Yup.string().required("Kategori wajib diisi"),
  number: Yup.string().when("category", {
    is: "external",
    then: (schema) =>
      schema
        .trim()
        .required("Nomor surat wajib diisi untuk kategori eksternal"),
    otherwise: (schema) => schema.notRequired(),
  }),
  letterType: Yup.string().required("Jenis surat wajib diisi"),
  security: Yup.string().required("Keamanan wajib diisi"),
  unit: Yup.string().required("Unit wajib diisi"),
  letterDate: Yup.string().required("Tanggal wajib diisi"),
  requesterId: Yup.string().required("Requester wajib diisi"),
  subject: Yup.string().required("Perihal wajib diisi"),
  recipient: Yup.string().required("Penerima wajib diisi"),
  body: Yup.string().required("Isi surat wajib diisi"),
  approvalUserIds: Yup.array().min(1, "Minimal satu approver wajib dipilih"),
});

const fieldClassName =
  "w-full rounded-lg border border-input bg-background px-4 py-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/50";

const disabledFieldClassName =
  "w-full cursor-not-allowed rounded-lg border border-input bg-muted px-4 py-3 text-sm text-muted-foreground";

const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-2xl border bg-card p-6 shadow-sm">
    <div className="mb-6">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
    {children}
  </section>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
    {children}
  </label>
);

const SelectField = ({
  name,
  options,
}: {
  name: keyof AddLetterFormValues;
  options: readonly { value: string; label: string }[];
}) => (
  <Field as="select" name={name} className={fieldClassName}>
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </Field>
);

const AddUnitCombobox = ({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const filteredOptions = useMemo(() => {
    const keyword = value.trim().toLowerCase();
    if (!keyword) return options;
    return options.filter((option) => option.toLowerCase().includes(keyword));
  }, [options, value]);

  return (
    <div className="relative">
      <input
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder="Cari atau ketik unit..."
        className={fieldClassName}
      />
      {open ? (
        <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {option}
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Unit baru akan memakai teks yang diketik.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

const AddApprovalCombobox = ({
  selectedUserIds,
  options,
  onAdd,
  onRemove,
}: {
  selectedUserIds: string[];
  options: LetterUser[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const availableOptions = useMemo(
    () => options.filter((option) => !selectedUserIds.includes(option.id)),
    [options, selectedUserIds],
  );
  const filteredOptions = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return availableOptions;
    return availableOptions.filter((option) =>
      `${option.name} ${option.email}`.toLowerCase().includes(keyword),
    );
  }, [availableOptions, query]);

  const selectUser = (user: LetterUser) => {
    onAdd(user.id);
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          placeholder="Cari user approver..."
          className={fieldClassName}
        />
        {open ? (
          <div className="absolute z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-popover p-1 text-popover-foreground shadow-md">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectUser(option)}
                  className="flex w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  <span>
                    <span className="block font-medium">{option.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {option.position ?? option.email}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Semua user cocok sudah dipilih.
              </div>
            )}
          </div>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {selectedUserIds.length > 0 ? (
          selectedUserIds.map((userId, index) => {
            const user = options.find((item) => item.id === userId);
            return (
            <span
              key={userId}
              className="inline-flex items-center gap-2 rounded-full border bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
            >
              {index + 1}. {user?.name ?? userId}
              <button
                type="button"
                onClick={() => onRemove(userId)}
                className="rounded-full p-0.5 hover:bg-primary/10"
                aria-label={`Hapus ${user?.name ?? userId}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            Belum ada approver dipilih.
          </p>
        )}
      </div>
    </div>
  );
};

const EditorToolbarButton = ({
  active,
  title,
  onClick,
  children,
}: {
  active?: boolean;
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    type="button"
    title={title}
    onMouseDown={(event) => {
      event.preventDefault();
      onClick();
    }}
    className={cn(
      "inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors",
      active
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-background hover:text-foreground",
    )}
  >
    {children}
  </button>
);

const AddLetterBodyEditor = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) => {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
      }),
      TiptapLink.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-primary underline",
          rel: "noopener noreferrer",
          target: "_blank",
        },
      }),
      Placeholder.configure({
        placeholder: "Tuliskan isi surat di sini...",
      }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "min-h-72 px-5 py-4 text-sm outline-none " +
          "[&_p]:my-2 [&_p]:leading-relaxed " +
          "[&_ul]:my-2 [&_ul]:pl-5 [&_ul>li]:list-disc " +
          "[&_ol]:my-2 [&_ol]:pl-5 [&_ol>li]:list-decimal " +
          "[&_a]:text-primary [&_a]:underline",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL tautan:", previousUrl ?? "https://");
    if (url === null) return;
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="flex flex-wrap gap-1 border-b bg-muted/50 p-2">
        {editor ? (
          <>
            <EditorToolbarButton
              title="Bold"
              active={editor.isActive("bold")}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </EditorToolbarButton>
            <EditorToolbarButton
              title="Italic"
              active={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </EditorToolbarButton>
            <EditorToolbarButton
              title="Bullet list"
              active={editor.isActive("bulletList")}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            >
              <List className="h-4 w-4" />
            </EditorToolbarButton>
            <EditorToolbarButton
              title="Link"
              active={editor.isActive("link")}
              onClick={setLink}
            >
              <LinkIcon className="h-4 w-4" />
            </EditorToolbarButton>
          </>
        ) : null}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
};

export const AddLetterForm = ({ meta }: { meta: LetterMeta }) => {
  const router = useRouter();
  const [submitMode, setSubmitMode] = useState<"draft" | "finalize">("draft");
  const [error, setError] = useState("");
  const createdLetterId = useRef<string | null>(null);

  return (
    <Formik
      initialValues={ADD_LETTER_INITIAL_VALUES}
      validationSchema={validationSchema}
      onSubmit={async (values, helpers) => {
        setError("");
        try {
          const draft =
            createdLetterId.current !== null
              ? { id: createdLetterId.current }
              : await saveAddLetterDraft({
            number: values.category === "external" ? values.number : undefined,
            unit: values.unit,
            category: values.category,
            letterType: values.letterType,
            security: values.security,
            letterDate: values.letterDate,
            requesterId: values.requesterId,
            subject: values.subject,
            internalNote: values.internalNote,
            recipientMode: values.recipientMode,
            recipient: values.recipient,
            location: values.location,
            cc: values.cc,
            body: values.body,
            approvalUserIds: values.approvalUserIds,
          });
          createdLetterId.current = draft.id;

          const gagal: string[] = [];
          for (const file of values.attachments) {
            try {
              const formData = new FormData();
              formData.append("file", file);
              const uploaded = await uploadLetterFile(formData);
              await addLetterAttachment(draft.id, uploaded);
            } catch {
              gagal.push(file.name);
            }
          }
          if (gagal.length > 0) {
            setError(
              `Surat tersimpan, tetapi lampiran gagal diunggah: ${gagal.join(", ")}. Unggah ulang dari halaman detail surat.`,
            );
            helpers.setSubmitting(false);
            return;
          }

          if (submitMode === "finalize") await finalizeAddLetter(draft.id);
          router.push(`/letters/${draft.id}`);
        } catch {
          setError(
            createdLetterId.current
              ? "Surat sudah tersimpan, tetapi langkah berikutnya gagal. Coba lagi tanpa membuat surat baru."
              : "Surat gagal disimpan. Periksa data lalu coba lagi.",
          );
        } finally {
          helpers.setSubmitting(false);
        }
      }}
    >
    {({ values, setFieldValue, isSubmitting, submitForm, errors, touched }) => {
      const requester = meta.users.find((user) => user.id === values.requesterId);

      return (
      <Form className="space-y-6">
        {error ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <Section
          title="Informasi Surat"
          description="Detail identitas dan klasifikasi surat resmi."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <FieldLabel>Nomor Surat</FieldLabel>
              {values.category === "external" ? (
                <>
                  <Field
                    name="number"
                    placeholder="Nomor dari pihak eksternal"
                    className={fieldClassName}
                  />
                  {touched.number && errors.number ? (
                    <p className="mt-1 text-xs text-destructive">
                      {errors.number}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Kategori eksternal tidak memakai penomoran otomatis.
                    </p>
                  )}
                </>
              ) : (
                <Field
                  name="number"
                  readOnly
                  placeholder="Dibuat otomatis saat disimpan"
                  className={disabledFieldClassName}
                />
              )}
            </div>
            <div>
              <FieldLabel>Kategori Surat</FieldLabel>
              <SelectField name="category" options={LETTER_CATEGORY_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Jenis Surat</FieldLabel>
              <SelectField name="letterType" options={LETTER_TYPE_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Derajat Keamanan</FieldLabel>
              <SelectField name="security" options={LETTER_SECURITY_OPTIONS} />
            </div>
            <div>
              <FieldLabel>Unit</FieldLabel>
              <AddUnitCombobox
                value={values.unit}
                options={meta.units}
                onChange={(value) => setFieldValue("unit", value)}
              />
              {touched.unit && errors.unit ? (
                <p className="mt-1 text-xs text-destructive">{errors.unit}</p>
              ) : null}
            </div>
            <div>
              <FieldLabel>Tanggal Surat</FieldLabel>
              <Field name="letterDate" type="date" className={fieldClassName} />
            </div>
          </div>
        </Section>

        <Section
          title="Informasi Permintaan"
          description="Data pemohon dan maksud pembuatan surat."
        >
          <div className="space-y-4">
            <div>
              <FieldLabel>Requester / Pemohon</FieldLabel>
              <div className="flex items-center gap-4 rounded-lg border p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                  {requester?.name
                    .split(/\s+/)
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() ?? "?"}
                </div>
                <div className="flex-1">
                  <select
                    value={values.requesterId}
                    onChange={(event) =>
                      setFieldValue("requesterId", event.target.value)
                    }
                    className={fieldClassName}
                    aria-label="Pilih requester"
                  >
                    <option value="">Pilih requester...</option>
                    {meta.users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.position ?? user.email}
                      </option>
                    ))}
                  </select>
                  {requester ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {requester.position ?? requester.email}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
            <div>
              <FieldLabel>Perihal / Subjek</FieldLabel>
              <Field
                name="subject"
                placeholder="Masukkan perihal surat..."
                className={fieldClassName}
              />
            </div>
            <div>
              <FieldLabel>Catatan Internal</FieldLabel>
              <Field
                as="textarea"
                name="internalNote"
                rows={3}
                placeholder="Tambahkan catatan khusus (opsional)..."
                className={fieldClassName}
              />
            </div>
            <div className="max-w-sm">
              <FieldLabel>Dibuat Oleh</FieldLabel>
              <Field name="createdBy" readOnly className={disabledFieldClassName} />
            </div>
          </div>
        </Section>

        <Section
          title="Informasi Penerima"
          description="Kepada siapa surat ini ditujukan."
        >
          <div className="mb-4 inline-flex rounded-lg bg-muted p-1">
            {[
              ["internal", "Internal"],
              ["external", "Eksternal"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFieldValue("recipientMode", value)}
                className={
                  values.recipientMode === value
                    ? "rounded-md bg-background px-4 py-2 text-sm font-semibold shadow-sm"
                    : "px-4 py-2 text-sm text-muted-foreground"
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel>Nama Penerima / Unit Kerja</FieldLabel>
              <Field
                name="recipient"
                placeholder="Cari atau masukkan nama unit..."
                className={fieldClassName}
              />
            </div>
            <div>
              <FieldLabel>Lokasi</FieldLabel>
              <Field name="location" placeholder="Contoh: Jakarta Pusat" className={fieldClassName} />
            </div>
            <div>
              <FieldLabel>Tembusan (CC)</FieldLabel>
              <Field name="cc" placeholder="Penerima salinan..." className={fieldClassName} />
            </div>
          </div>
        </Section>

        <Section
          title="Alur Approval"
          description="Pilih user yang akan melakukan approval surat."
        >
          <AddApprovalCombobox
            selectedUserIds={values.approvalUserIds}
            options={meta.users}
            onAdd={(user) =>
              setFieldValue("approvalUserIds", [...values.approvalUserIds, user])
            }
            onRemove={(user) =>
              setFieldValue(
                "approvalUserIds",
                values.approvalUserIds.filter((item) => item !== user),
              )
            }
          />
          {touched.approvalUserIds && errors.approvalUserIds ? (
            <p className="mt-2 text-xs text-destructive">
              {String(errors.approvalUserIds)}
            </p>
          ) : null}
        </Section>

        <Section title="Isi Surat" description="Gunakan editor untuk menyusun narasi surat.">
          <AddLetterBodyEditor
            value={values.body}
            onChange={(value) => setFieldValue("body", value)}
          />
        </Section>

        <Section title="Lampiran" description="Unggah dokumen pendukung (PDF, DOC, JPG).">
          <label
            htmlFor="letter-attachments"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-muted/30 p-10 text-center transition-colors hover:border-primary/50 hover:bg-muted/50"
          >
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-background text-primary">
              <CloudUpload className="h-8 w-8" />
            </div>
            <p className="font-semibold">Pilih berkas atau seret ke sini</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Maksimal 10MB per berkas. Lampiran terunggah otomatis setelah
              surat tersimpan.
            </p>
          </label>
          <input
            id="letter-attachments"
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => {
              const picked = Array.from(event.target.files ?? []);
              if (picked.length === 0) return;
              setFieldValue("attachments", [
                ...values.attachments,
                ...picked,
              ]);
              event.target.value = "";
            }}
          />
          {values.attachments.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {values.attachments.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <span className="truncate">
                    {file.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFieldValue(
                        "attachments",
                        values.attachments.filter((_, i) => i !== index),
                      )
                    }
                  >
                    Hapus
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => {
              setSubmitMode("draft");
              void submitForm();
            }}
          >
            Simpan Draft
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={() => {
              setSubmitMode("finalize");
              void submitForm();
            }}
          >
            Finalisasi
          </Button>
        </div>
      </Form>
      );
    }}
  </Formik>
  );
};
