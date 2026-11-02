export type RabDocument = {
  id: string;
  type: string;
  name: string;
  url: string;
  mimeType: string | null;
  size: number | null;
  uploadedAt: string;
};

export type RabWorkDetail = {
  id: string;
  name: string;
  volume: number | null;
  unit: string | null;
  rabUnitPrice: number | null;
  rabTotalPrice: number | null;
  rapUnitPrice?: number | null;
  rapTotalPrice?: number | null;
  sortOrder: number;
};

export type RabWorkGroup = {
  id: string;
  name: string;
  sortOrder: number;
  rabTotal: number;
  rapTotal?: number;
  details: RabWorkDetail[];
};

export type RabWorkItem = {
  id: string;
  name: string;
  rabAmount: number | null;
  rapAmount?: number | null;
  marginAmount?: number;
  derivedFromDetails: boolean;
  rapDerivedFromDetails?: boolean;
  rapUseDetails?: boolean;
  rapOnly?: boolean;
  useDetails: boolean;
  sortOrder: number;
  groups: RabWorkGroup[];
};

export type RabOverview = {
  id: string;
  projectId: string;
  canViewRap: boolean;
  conversionDate: string | null;
  latestUploadDate: string | null;
  budget: {
    totalBudget: number;
    actualCost: number;
    remaining: number;
    usedPercent: number;
  };
  documents: RabDocument[];
  workItems: RabWorkItem[];
};

export type RabItemMutationInput = {
  name: string;
  rapOnly?: boolean;
  rapUseDetails?: boolean;
  rapAmount?: number | string | null;
  rabAmount?: number | string | null;
  useDetails?: boolean;
  sortOrder?: number;
  groups?: Array<{
    name: string;
    sortOrder?: number;
    details?: Array<{
      name: string;
      volume?: number | string | null;
      unit?: string | null;
      rabUnitPrice?: number | string | null;
      rabTotalPrice?: number | string | null;
      rapUnitPrice?: number | string | null;
      rapTotalPrice?: number | string | null;
      sortOrder?: number;
    }>;
  }>;
};

export type RabDocumentType = "RAP" | "RAB";

export type RabDocumentMutationInput = {
  type: RabDocumentType;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
};

export type RabGroupMutationInput = {
  name?: string;
  sortOrder?: number;
};

export type RabGroupCreateInput = {
  name: string;
  sortOrder?: number;
};

export type RabDetailMutationInput = {
  name?: string;
  volume?: number | string | null;
  unit?: string | null;
  rabUnitPrice?: number | string | null;
  rabTotalPrice?: number | string | null;
  rapUnitPrice?: number | string | null;
  rapTotalPrice?: number | string | null;
  sortOrder?: number;
};

export type RabDetailCreateInput = Required<Pick<RabDetailMutationInput, "name">> &
  RabDetailMutationInput;
