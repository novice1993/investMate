export interface ScrapedArticle {
  url: string;
  title: string;
  body: string;
  paper_date: string; // 신문 게재일 (YYYY-MM-DD 형식)
}
