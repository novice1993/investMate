import { ScrapedArticle } from "../entities/scraped-article.entity";
import { generateLLMResponse } from "../infrastructure/llm.infra";

/**
 * Takes multiple articles and returns summaries as a map (title -> summary).
 * @param articles Array of article objects with title and body.
 * @returns Object mapping article titles to their summaries.
 */
export async function summarizeArticlesBatch(articles: ScrapedArticle[]): Promise<Record<string, string>> {
  if (articles.length === 0) return {};

  if (articles.length === 1) {
    const summary = await summarizeArticle(articles[0]);
    return { [articles[0].title]: summary };
  }

  const prompt = `
다음 ${articles.length}개의 기사를 각각 요약하여 JSON 객체로 반환하세요.

기사 목록:
${articles
  .map(
    (article, idx) => `
[기사 ${idx + 1}]
제목: ${article.title}
본문: ${article.body}
`
  )
  .join("\n")}

요약 규칙:
1. 각 요약은 "•" (불릿 포인트) 기호만 사용하세요
2. 각 불릿 포인트는 새로운 줄(\\n)로 구분하세요
3. 문장 어미는 "~습니다", "~했습니다" 등 정중한 형태로 종결하세요
4. 각 기사의 핵심 내용을 5개 이하의 포인트로 요약하세요

출력 형식 (반드시 유효한 JSON 객체로만 응답):
{
  "기사 제목 1": "• 요약 포인트 1\\n• 요약 포인트 2\\n• 요약 포인트 3",
  "기사 제목 2": "• 요약 포인트 1\\n• 요약 포인트 2\\n• 요약 포인트 3"
}

중요:
- 반드시 유효한 JSON 객체 형식으로만 응답하세요
- 기사 제목을 정확히 그대로 key로 사용하세요
- JSON 외 다른 텍스트는 절대 포함하지 마세요
`.trim();

  try {
    const response = await generateLLMResponse(prompt);
    const summariesMap = parseJsonBatchSummaries(response);
    return summariesMap;
  } catch (error) {
    console.error("[LLM Service] Error summarizing articles batch:", error);
    return {};
  }
}

/**
 * Parse JSON batch summary response
 * @private
 */
function parseJsonBatchSummaries(response: string): Record<string, string> {
  try {
    // JSON 앞뒤 공백/마크다운 코드블록 제거
    const cleaned = response.trim().replace(/^```json\s*|\s*```$/g, "");
    const summariesMap = JSON.parse(cleaned);

    if (typeof summariesMap !== "object" || Array.isArray(summariesMap)) {
      throw new Error("Response is not a valid object");
    }

    return summariesMap;
  } catch (error) {
    console.error("[LLM Service] Failed to parse JSON batch summaries:", error);
    console.error("[LLM Service] Raw response:", response);
    return {};
  }
}

/**
 * Takes an article and returns a summary.
 * @param article The article object with title and body.
 * @returns The summarized text.
 */
export async function summarizeArticle(article: ScrapedArticle): Promise<string> {
  const prompt = `
다음 규칙을 엄격하게 따라 기사를 요약하세요:

1. 반드시 "•" (불릿 포인트) 기호만 사용하세요. "*" (별표)는 절대 사용하지 마세요.
2. 각 불릿 포인트는 반드시 새로운 줄에 작성하세요.
3. 문장 어미는 "~습니다", "~했습니다" 등 정중한 형태로 종결하세요.
4. "요약:", "정리:" 같은 접두어 없이 바로 내용만 작성하세요.

예시 1:
기사 제목: "한국은행, 기준금리 0.25%p 인하... 3.25%로 조정"
기사 본문: "한국은행 금융통화위원회가 15일 기준금리를 기존 3.5%에서 3.25%로 0.25%포인트 인하했다. 최근 소비자물가 상승률이 2%대로 안정되고 경기 둔화 우려가 커지면서 통화정책 기조를 완화했다. 이번 결정으로 시중은행 대출금리 인하가 예상되며, 부동산 시장에도 긍정적 영향을 미칠 전망이다."

출력:
• 한국은행이 기준금리를 0.25%p 인하해 3.25%로 조정했습니다
• 물가 안정화(2%대)와 경기 둔화 우려가 주요 배경입니다
• 시중 대출금리 하락과 부동산 시장 반등이 예상됩니다

예시 2:
기사 제목: "삼성전자, 1분기 영업이익 6.5조원... 전년比 30% 증가"
기사 본문: "삼성전자가 2025년 1분기 잠정 실적을 발표했다. 영업이익은 6.5조원으로 전년 동기 대비 30% 증가했다. 메모리 반도체 가격 상승과 AI 서버용 HBM(고대역폭메모리) 수요 급증이 실적 개선을 이끌었다. 애널리스트들은 2분기에도 메모리 슈퍼사이클이 지속되며 실적 개선세가 이어질 것으로 전망했다."

출력:
• 삼성전자가 1분기 영업이익 6.5조원으로 전년 대비 30% 증가를 기록했습니다
• 메모리 반도체 가격 상승과 AI용 HBM 수요 급증이 주요 원인입니다
• 2분기에도 메모리 슈퍼사이클 지속으로 실적 개선이 전망됩니다

요약할 기사:
기사 제목: ${article.title}
기사 본문: ${article.body}

출력:
`.trim();

  try {
    const summary = await generateLLMResponse(prompt);
    return summary.trim();
  } catch (error) {
    console.error("[LLM Service] Error summarizing article:", error);
    return "기사 요약에 실패했습니다.";
  }
}
