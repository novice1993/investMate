import { NextRequest, NextResponse } from "next/server";
import { summarizeArticle } from "@/core/services/llm.service";
import { scrapeArticle } from "@/core/services/scrape.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const urlToScrape = searchParams.get("url");

  if (!urlToScrape) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  try {
    const scrapedData = await scrapeArticle(urlToScrape);

    // Call the summarization service
    const summary = await summarizeArticle(scrapedData);

    // Return both the scraped data and the summary
    return NextResponse.json({ summary });
  } catch (error) {
    console.error(`[API /api/scrape] Failed to scrape URL: ${urlToScrape}`, error);
    const message = error instanceof Error ? error.message : "Failed to scrape content or summarize.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
