import { ScrapedArticle } from "../entities/scraped-article.entity";
import { generateLLMResponse } from "../infrastructure/llm.infra";

/**
 * Takes an article and returns a summary.
 * @param article The article object with title and body.
 * @returns The summarized text, or null if summarization fails.
 */
export async function summarizeArticle(article: ScrapedArticle): Promise<string | null> {
  const prompt = `
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
제목: ${article.title}
본문: ${article.body}

출력:
`.trim();

  try {
    const summary = await generateLLMResponse(prompt);
    return summary.trim();
  } catch (error) {
    console.error("[LLM Service] Error summarizing article:", error);
    return null;
  }
}
