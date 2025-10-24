/**
 * @fileoverview 뉴스 워크플로우 내부 타입 정의
 */

import { NewsArticle } from "@/core/entities/news.entity";

/**
 * RPM 상태 관리
 */
export interface RPMState {
  requestCount: number;
  windowStartTime: number;
}

/**
 * 처리 결과
 */
export interface ProcessingResults {
  processedArticles: NewsArticle[];
  errors: Array<{ url: string; error: string }>;
}

/**
 * 뉴스 수집 워크플로우 결과
 */
export interface NewsCollectionResult {
  success: boolean;
  collectedCount: number;
  skippedCount: number;
  errors: Array<{ url: string; error: string }>;
  message: string;
}
