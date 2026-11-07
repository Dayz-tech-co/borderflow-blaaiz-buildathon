export type PayoutStatus = "initiated" | "processing" | "completed" | "failed";

export interface Payout {
  id: string;
  reference: string;
  recipient: string;
  country: string;
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
  exchangeRate: number;
  fee: number;
  recipientAmount: number;
  status: PayoutStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CalculatorValues {
  sourceCurrency: string;
  destinationCurrency: string;
  amount: number;
  exchangeRate: number;
  feePercent: number;
  flatFee: number;
}
