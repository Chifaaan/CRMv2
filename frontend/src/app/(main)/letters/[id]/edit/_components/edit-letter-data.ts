import type { LetterDetail, LetterMutationInput } from "../../../types";

export type EditLetterFormValues = LetterMutationInput & {
  number: string;
  createdBy: string;
};

export const buildEditLetterInitialValues = (
  letter: LetterDetail,
): EditLetterFormValues => ({
  number: letter.number,
  category: letter.category,
  letterType: letter.letterType,
  security: letter.security,
  unit: letter.unit,
  letterDate: letter.letterDate.slice(0, 10),
  requesterId: letter.requesterId,
  subject: letter.subject,
  internalNote: letter.internalNote ?? "",
  createdBy: letter.createdBy.name,
  recipientMode: letter.recipientMode,
  recipient: letter.recipient,
  location: letter.location ?? "",
  cc: letter.cc ?? "",
  body: letter.body,
  approvalUserIds: letter.approvals.map((step) => step.userId),
});
