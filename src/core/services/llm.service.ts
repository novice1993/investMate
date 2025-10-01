import { ScrapedArticle } from "../entities/scraped-article.entity";
import { generateLLMResponse } from "../infrastructure/llm.infra";

/**
 * Takes an article and returns a summary.
 * @param article The article object with title and body.
 * @returns The summarized text.
 */
export async function summarizeArticle(article: ScrapedArticle): Promise<string> {
  // Basic prompt for now
  const prompt = `다음 기사를 세 문장으로 요약해줘.\n\n제목: ${article.title}\n본문: ${article.body}`;

  try {
    const summary = await generateLLMResponse(prompt);
    return summary;
  } catch (error) {
    console.error("[LLM Service] Error summarizing article:", error);
    // Don't re-throw, just return a user-friendly error message
    return "기사 요약에 실패했습니다.";
  }
}
