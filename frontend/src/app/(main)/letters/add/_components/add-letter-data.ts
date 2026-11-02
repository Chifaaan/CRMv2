import type { LetterMutationInput } from "../../types";

export type AddLetterFormValues = LetterMutationInput & {
  number: string;
  createdBy: string;
  attachments: File[];
};

export const ADD_LETTER_INITIAL_VALUES: AddLetterFormValues = {
  number: "",
  category: "internal",
  letterType: "decision",
  security: "normal",
  unit: "",
  letterDate: new Date().toISOString().slice(0, 10),
  requesterId: "",
  subject: "",
  internalNote: "",
  createdBy: "User aktif",
  recipientMode: "internal",
  recipient: "",
  location: "",
  cc: "",
  body: "",
  approvalUserIds: [],
  attachments: [],
};
