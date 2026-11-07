import type { Payout } from "./types";

export const CURRENCIES = ["USD", "NGN", "GBP", "EUR", "CAD", "KES", "GHS"];

export const COUNTRIES = [
  { name: "Nigeria", currency: "NGN" },
  { name: "United Kingdom", currency: "GBP" },
  { name: "Canada", currency: "CAD" },
  { name: "Kenya", currency: "KES" },
  { name: "Ghana", currency: "GHS" },
  { name: "Germany", currency: "EUR" },
];

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export const seedPayouts: Payout[] = [
  { id: "demo-1", reference: "BF-8K2M9Q", recipient: "Amara Okafor", country: "Nigeria", sourceCurrency: "USD", destinationCurrency: "NGN", sourceAmount: 1250, exchangeRate: 1580, fee: 20.75, recipientAmount: 1942335, status: "completed", createdAt: daysAgo(1), updatedAt: daysAgo(1) },
  { id: "demo-2", reference: "BF-4J7P3N", recipient: "Kwame Mensah", country: "Ghana", sourceCurrency: "USD", destinationCurrency: "GHS", sourceAmount: 680, exchangeRate: 15.6, fee: 11.2, recipientAmount: 10433.28, status: "processing", createdAt: daysAgo(2), updatedAt: daysAgo(1) },
  { id: "demo-3", reference: "BF-6R1T5X", recipient: "Olivia Bennett", country: "United Kingdom", sourceCurrency: "EUR", destinationCurrency: "GBP", sourceAmount: 940, exchangeRate: 0.84, fee: 15.1, recipientAmount: 776.32, status: "initiated", createdAt: daysAgo(3), updatedAt: daysAgo(3) },
  { id: "demo-4", reference: "BF-2W9C8L", recipient: "Noah Williams", country: "Canada", sourceCurrency: "USD", destinationCurrency: "CAD", sourceAmount: 520, exchangeRate: 1.39, fee: 8.8, recipientAmount: 710.57, status: "failed", createdAt: daysAgo(6), updatedAt: daysAgo(5) },
];
