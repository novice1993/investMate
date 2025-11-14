import * as cheerio from "cheerio";
import { ScrapedArticle } from "@/core/entities/scraped-article.entity";
import { fetchArticleHtml } from "@/core/infrastructure/news/scraper.infra";

/**
 * 기사 스크래핑을 위한 파싱 설정
 */
export interface ArticleSelectors {
  /** 제목 파싱 규칙 */
  title: string;
  /** 본문 컨테이너 파싱 규칙 */
  bodyContainer: string;
  /** 본문 단락 파싱 규칙 (선택적, 기본값: 'p') */
  bodyParagraph?: string;
}

/**
 * 매경(MK) 기사 파싱 설정
 */
export const MK_ARTICLE_SELECTORS: ArticleSelectors = {
  title: "h2.news_ttl",
  bodyContainer: "div.news_detail_body_group",
  bodyParagraph: "p",
};

/**
 * HTML에서 신문 게재일을 추출합니다.
 * @returns paper_date 값 (YYYY-MM-DD) 또는 null
 */
function extractPaperDate(htmlContent: string): string | null {
  const paperDateMatch = htmlContent.match(/'paper_date':\s*'([^']+)'/);
  return paperDateMatch?.[1] || null;
}

/**
 * 주어진 URL의 기사에서 제목과 본문을 스크래핑합니다.
 *
 * @returns 신문 게재 기사인 경우 ScrapedArticle, 웹 전용 기사인 경우 null
 */
export async function scrapeArticle(url: string, selectors: ArticleSelectors = MK_ARTICLE_SELECTORS): Promise<ScrapedArticle | null> {
  const htmlContent = await fetchArticleHtml(url);

  // 1. paper_date 먼저 체크
  const paperDate = extractPaperDate(htmlContent);
  if (!paperDate) {
    return null; // 웹 전용 기사는 스킵
  }

  // 2. 신문 기사만 body 파싱
  const $ = cheerio.load(htmlContent);

  // 파싱 규칙을 사용해 제목 추출
  const title = $(selectors.title).text().trim();

  // 파싱 규칙을 사용해 본문 추출
  const bodyParagraphs: string[] = [];
  const paragraphSelector = selectors.bodyParagraph || "p";
  const fullBodySelector = `${selectors.bodyContainer} ${paragraphSelector}`;

  $(fullBodySelector).each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      bodyParagraphs.push(text);
    }
  });

  const body = bodyParagraphs.join("\n\n");

  if (!title && !body) {
    throw new Error("Failed to scrape title and body from the article.");
  }

  return { url, title, body, paper_date: paperDate };
}
