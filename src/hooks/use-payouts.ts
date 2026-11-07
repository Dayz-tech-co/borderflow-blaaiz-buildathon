"use client";

import { useEffect, useState } from "react";
import { seedPayouts } from "@/lib/demo-data";
import type { Payout, PayoutStatus } from "@/lib/types";

const STORAGE_KEY = "borderflow.demo.payouts.v1";

export function usePayouts() {
  const [payouts, setPayouts] = useState<Payout[]>(seedPayouts);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPayouts(JSON.parse(stored) as Payout[]);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(payouts));
  }, [payouts, ready]);

  const addPayout = (payout: Payout) => setPayouts((current) => [payout, ...current]);
  const updateStatus = (id: string, status: PayoutStatus) => setPayouts((current) => current.map((p) => p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p));
  const reset = () => { setPayouts(seedPayouts); localStorage.setItem(STORAGE_KEY, JSON.stringify(seedPayouts)); };

  return { payouts, ready, addPayout, updateStatus, reset };
}
