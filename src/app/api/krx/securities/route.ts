import { NextResponse } from "next/server";
import { getMarketSecurities } from "@/core/infrastructure/market/krx.infra";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const market = searchParams.get("market");

  if (market !== "KOSPI" && market !== "KOSDAQ") {
    return NextResponse.json({ error: "Query parameter 'market' must be either 'KOSPI' or 'KOSDAQ'." }, { status: 400 });
  }

  try {
    const securities = await getMarketSecurities(market);
    return NextResponse.json(securities);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error(`[API Route Error] /api/krx/securities: ${message}`);
    return NextResponse.json({ error: "Failed to fetch securities from data source.", details: message }, { status: 500 });
  }
}
