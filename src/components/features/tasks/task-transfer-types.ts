export type TransferTargetProject = {
  id: string;
  name: string;
  code: string;
  status: string;
};

export type TransferTasksResponse = {
  ok: boolean;
  transferred: number;
  sourceProjectId: string;
  targetProjectId: string;
};
