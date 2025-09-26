import { NextRequest, NextResponse } from "next/server";
import { scrapeArticle } from "@/core/services/scrape.service";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const urlToScrape = searchParams.get("url");

  if (!urlToScrape) {
    return NextResponse.json({ error: "URL parameter is required" }, { status: 400 });
  }

  try {
    const scrapedData = await scrapeArticle(urlToScrape);
    console.log(scrapedData);

    // return NextResponse.json(scrapedData);
  } catch (error) {
    console.error(`[API /api/scrape] Failed to scrape URL: ${urlToScrape}`, error);
    const message = error instanceof Error ? error.message : "Failed to scrape content.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
