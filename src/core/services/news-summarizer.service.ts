import { ScrapedArticle } from "@/core/entities/scraped-article.entity";
import { generateLLMResponse } from "@/core/infrastructure/common/llm.infra";

/**
 * 기본 기사 요약 프롬프트 템플릿
 */
export const DEFAULT_ARTICLE_SUMMARY_PROMPT = `
다음 기사를 7-10개의 불릿 포인트로 요약하세요.

규칙:
1. "•" 기호 사용, 각 포인트는 새로운 줄에 작성
2. 구체적 수치, 이름, 날짜 반드시 포함
3. 비교 데이터는 명확히 제시 (예: A 20%, B 10%)
4. "~습니다" 형태로 종결
5. 접두어 없이 바로 내용만 작성

예시:
제목: "서학개미 추격매수 손실, 외국인은 16% 수익"
본문: "23일 거래소에 따르면 10~20일 서학개미 상위 5종목 평균 8.52% 하락. 아이온큐 21.51%, 아이렌 13.28% 급락. 반면 외국인 상위 5종목은 평균 16.28% 상승. LG화학 39.6%, 한국전력 17.9% 급등."

출력:
• 10월 10~20일 서학개미 상위 5종목 평균 8.52% 하락했습니다
• 아이온큐 21.51% 급락, 아이렌 13.28% 하락했습니다
• 외국인 상위 5종목은 평균 16.28% 상승했습니다
• LG화학 39.6%, 한국전력 17.9% 급등을 기록했습니다

---

요약할 기사:
제목: {{title}}
본문: {{body}}

출력:
`.trim();

/**
 * 기사를 요약합니다.
 */
export async function summarizeArticle(article: ScrapedArticle, promptTemplate: string = DEFAULT_ARTICLE_SUMMARY_PROMPT): Promise<string | null> {
  // 프롬프트 템플릿에 실제 값 대입
  const prompt = promptTemplate.replace("{{title}}", article.title).replace("{{body}}", article.body);

  try {
    const summary = await generateLLMResponse(prompt);
    return summary.trim();
  } catch (error) {
    console.error("[News Summarizer] Error summarizing article:", error);
    return null;
  }
}
