"use client";

import { useQuery } from "@tanstack/react-query";
import { jsonHttpClient } from "@/shared/lib/http";

// ============================================================================
// Types
// ============================================================================

export interface DisclosureItem {
  corpCode: string;
  corpName: string;
  stockCode: string;
  corpClass: string;
  reportName: string;
  receiptNo: string;
  filerName: string;
  receiptDate: string;
  remark: string;
}

export interface DisclosureSummary {
  receiptNo: string;
  summary: string;
  truncated: boolean;
}

interface FetchDisclosuresResponse {
  success: boolean;
  data?: {
    items: DisclosureItem[];
    totalCount: number;
  };
  error?: string;
}

interface FetchSummaryResponse {
  success: boolean;
  data?: DisclosureSummary;
  error?: string;
}

// ============================================================================
// Fetchers
// ============================================================================

async function fetchDisclosures(corpCode: string): Promise<DisclosureItem[]> {
  const response = await jsonHttpClient.get<FetchDisclosuresResponse>(`/api/disclosures?corpCode=${corpCode}&limit=10`);

  if (!response.success || !response.data) {
    throw new Error(response.error || "공시 목록을 불러오는데 실패했습니다");
  }

  return response.data.items;
}

async function fetchDisclosureSummary(receiptNo: string): Promise<DisclosureSummary> {
  const response = await jsonHttpClient.get<FetchSummaryResponse>(`/api/disclosures/${receiptNo}/summary`);

  if (!response.success || !response.data) {
    throw new Error(response.error || "공시 요약을 불러오는데 실패했습니다");
  }

  return response.data;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * 공시 목록 조회 훅
 */
export function useDisclosures(corpCode: string | null) {
  return useQuery({
    queryKey: ["disclosures", corpCode],
    queryFn: () => fetchDisclosures(corpCode!),
    enabled: !!corpCode,
    staleTime: 5 * 60 * 1000, // 5분
  });
}

/**
 * 공시 요약 조회 훅
 */
export function useDisclosureSummary(receiptNo: string | null) {
  return useQuery({
    queryKey: ["disclosure-summary", receiptNo],
    queryFn: () => fetchDisclosureSummary(receiptNo!),
    enabled: !!receiptNo,
    staleTime: 30 * 60 * 1000, // 30분
  });
}
