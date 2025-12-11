import { generateLLMResponse } from "@/core/infrastructure/common/llm.infra";
import { getDisclosureDetail, type DisclosureItem } from "@/core/infrastructure/financial/dart-disclosure.infra";

/**
 * @fileoverview 공시 요약 서비스
 *
 * DART 공시 본문을 Groq LLM을 사용하여 요약합니다.
 */

// ============================================================================
// Types
// ============================================================================

export interface DisclosureSummary {
  /** 접수번호 */
  receiptNo: string;
  /** 요약 내용 */
  summary: string;
  /** 본문이 잘렸는지 여부 */
  truncated: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const SUMMARY_PROMPT_TEMPLATE = `한국 기업 공시 문서를 요약하세요.

규칙:
- 3-5문장으로 핵심만 요약
- 서두 없이 바로 요약 내용만 출력 (예: "다음은...", "요약하면..." 등 금지)
- 주요 사안, 금액/수치, 투자자 영향 중심
- 한국어로 작성

공시 내용:
{content}`;

// ============================================================================
// Public API
// ============================================================================

/**
 * 공시 본문을 요약합니다.
 *
 * @param receiptNo 접수번호
 * @returns 요약 결과
 */
export async function summarizeDisclosure(receiptNo: string): Promise<DisclosureSummary> {
  try {
    // 1. 공시 본문 추출
    const { content, truncated } = await getDisclosureDetail(receiptNo);

    if (!content) {
      return {
        receiptNo,
        summary: "공시 본문을 추출할 수 없습니다.",
        truncated: false,
      };
    }

    // 2. LLM 요약
    const prompt = SUMMARY_PROMPT_TEMPLATE.replace("{content}", content);
    const summary = await generateLLMResponse(prompt);

    return {
      receiptNo,
      summary,
      truncated,
    };
  } catch (error) {
    console.error("[Disclosure Summarizer] Failed to summarize:", error);
    throw error;
  }
}

/**
 * 공시 목록과 함께 요약을 반환합니다.
 *
 * @param disclosure 공시 항목
 * @returns 공시 정보 + 요약
 */
export async function getDisclosureWithSummary(disclosure: DisclosureItem): Promise<DisclosureItem & DisclosureSummary> {
  const summaryResult = await summarizeDisclosure(disclosure.receiptNo);

  return {
    ...disclosure,
    ...summaryResult,
  };
}
