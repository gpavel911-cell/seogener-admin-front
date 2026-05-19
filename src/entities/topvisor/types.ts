export type TopvisorSyncStatus = "SUCCESS" | "PARTIAL" | "EMPTY";

export type TopvisorPositionRowDto = {
  projectId: number;
  domain: string;
  top10: number;
  top10Dynamics: number;
  top1130: number;
  top1130Dynamics: number;
  top3150: number;
  top3150Dynamics: number;
  top51100: number;
  top51100Dynamics: number;
  top101: number;
  top101Dynamics: number;
  date: string;
};

export type TopvisorSyncResponse = {
  status: TopvisorSyncStatus;
  rows: TopvisorPositionRowDto[];
  warnings: string[];
};
