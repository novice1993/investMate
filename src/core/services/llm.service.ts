import { ScrapedArticle } from "../entities/scraped-article.entity";
import { generateLLMResponse } from "../infrastructure/llm.infra";

/**
 * Takes an article and returns a summary.
 * @param article The article object with title and body.
 * @returns The summarized text.
 */
export async function summarizeArticle(article: ScrapedArticle): Promise<string> {
  const prompt = `
다음 형식으로 기사를 요약하세요. "요약:", "정리:" 같은 접두어 없이 바로 내용만 작성하고, 문장 어미는 "~습니다", "~했습니다" 등 정중한 형태로 종결하세요.

예시 1:
기사 제목: "한국은행, 기준금리 0.25%p 인하... 3.25%로 조정"
기사 본문: "한국은행 금융통화위원회가 15일 기준금리를 기존 3.5%에서 3.25%로 0.25%포인트 인하했다. 최근 소비자물가 상승률이 2%대로 안정되고 경기 둔화 우려가 커지면서 통화정책 기조를 완화했다. 이번 결정으로 시중은행 대출금리 인하가 예상되며, 부동산 시장에도 긍정적 영향을 미칠 전망이다."

• 한국은행이 기준금리를 0.25%p 인하해 3.25%로 조정했습니다
• 물가 안정화(2%대)와 경기 둔화 우려가 주요 배경입니다
• 시중 대출금리 하락과 부동산 시장 반등이 예상됩니다

예시 2:
기사 제목: "삼성전자, 1분기 영업이익 6.5조원... 전년比 30% 증가"
기사 본문: "삼성전자가 2025년 1분기 잠정 실적을 발표했다. 영업이익은 6.5조원으로 전년 동기 대비 30% 증가했다. 메모리 반도체 가격 상승과 AI 서버용 HBM(고대역폭메모리) 수요 급증이 실적 개선을 이끌었다. 애널리스트들은 2분기에도 메모리 슈퍼사이클이 지속되며 실적 개선세가 이어질 것으로 전망했다."

• 삼성전자가 1분기 영업이익 6.5조원으로 전년 대비 30% 증가를 기록했습니다
• 메모리 반도체 가격 상승과 AI용 HBM 수요 급증이 주요 원인입니다
• 2분기에도 메모리 슈퍼사이클 지속으로 실적 개선이 전망됩니다

요약할 기사:
기사 제목: ${article.title}
기사 본문: ${article.body}
`.trim();

  try {
    const summary = await generateLLMResponse(prompt);
    return summary.trim();
  } catch (error) {
    console.error("[LLM Service] Error summarizing article:", error);
    return "기사 요약에 실패했습니다.";
  }
}
