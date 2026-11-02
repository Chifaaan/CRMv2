/** Shape of GET /api/projects/:id after backend enrichment (tasks + maintenance counts). */
export type ProjectDetailPayload = {
  id: string;
  name: string;
  code: string;
  status: string;
  phase: string | null;
  priority: string | null;
  progress: number | null;
  coverColor: string | null;
  coverImageUrl: string | null;
  tags: string[];
  clientId: string | null;
  parentId: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: unknown;
  actualCost: unknown;
  description: string | null;
  actualEndDate: string | null;
  client: {
    id: string;
    companyName: string;
    industry: string | null;
    website: string | null;
    address: string | null;
    contactPerson: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    logo: string | null;
  } | null;
  parent: { id: string; name: string; code: string } | null;
  createdBy: { id: string; name: string; image: string | null };
  members: {
    projectRole: string;
    user: { id: string; name: string; image: string | null; role: string };
  }[];
  taskDone: number;
  taskTotal: number;
  pipelineCompleted?: number;
  pipelineTotal?: number;
  allTotal?: number;
  statusBreakdown?: Record<string, number>;
  maintenanceOpen: number;
};
