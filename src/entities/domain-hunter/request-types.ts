export type DomainHunterRunRequest = {
  niche: string;
  tlds?: string;
  keywords: string;
  maxResults?: number;
};

export type DomainHunterResultsListRequest = {
  pageNumber: number;
  pageSize: number;
};
