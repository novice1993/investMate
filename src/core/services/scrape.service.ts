import * as cheerio from "cheerio";
import { ScrapedArticle } from "../entities/scraped-article.entity";
import { fetchArticleHtml } from "../infrastructure/scrape.infra";

/**
 * 주어진 URL의 기사에서 제목과 본문을 스크래핑합니다.
 * @param url 스크래핑할 기사 페이지의 URL
 * @returns 스크래핑된 URL, 제목, 본문을 담은 ScrapedArticle 객체
 */
export async function scrapeArticle(url: string): Promise<ScrapedArticle> {
  const htmlContent = await fetchArticleHtml(url);
  const $ = cheerio.load(htmlContent);

  const title = $("h2.news_ttl").text();
  const bodyParagraphs: string[] = [];
  $('div.news_cnt_detail_wrap[itemprop="articleBody"] p').each((_, el) => {
    bodyParagraphs.push($(el).text());
  });
  const body = bodyParagraphs.join("\n\n");

  if (!title && !body) {
    throw new Error("Failed to scrape title and body from the article.");
  }

  return { url, title, body };
}
