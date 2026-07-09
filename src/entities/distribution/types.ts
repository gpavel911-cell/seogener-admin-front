export type DistributionSummaryDto = {
  totalOrders: number;
  confirmedCount: number;
  holdCount: number;
  confirmedFeeAmount: number;
};

export type DistributionTotalsDto = {
  orderAmount: number;
  feeAmount: number;
};

export type DistributionOrderRowDto = {
  partnerOrderId: string;
  createdAt: string;
  clid: string | null;
  affiliateVid: string | null;
  state: string;
  city: string | null;
  sourcePlatform: string | null;
  orderAmount: number;
  feeAmount: number;
  feePercent: number | null;
};

export type DistributionOrdersResponseDto = {
  summary: DistributionSummaryDto;
  orders: DistributionOrderRowDto[];
  totals: DistributionTotalsDto;
};

export type DistributionOrdersRequest = {
  dateFrom: string;
  dateTo: string;
};
