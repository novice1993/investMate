import yahooFinance from "yahoo-finance2";
import { Security } from "@/core/entities/security.entity";

/**
 * Yahoo Finance API를 사용하여 심볼로 Security 데이터를 조회합니다.
 */
export async function findSecurityBySymbol(symbol: string): Promise<Security | null> {
  try {
    const quote = await yahooFinance.quote(symbol);

    if (!quote) {
      return null;
    }

    const toMarket = (exchange?: string): Security["market"] => {
      const upperExchange = exchange?.toUpperCase();
      if (upperExchange === "NMS" || upperExchange === "NASDAQ") return "NASDAQ";
      if (upperExchange === "NYQ" || upperExchange === "NYSE") return "NYSE";
      if (upperExchange === "KOE") return "KOSDAQ";
      if (upperExchange === "KSC") return "KOSPI";
      if (upperExchange?.includes("ETF")) return "ETF";
      return "NASDAQ"; // Default
    };

    const toCurrency = (currency?: string): Security["currency"] => {
      if (currency === "KRW") return "KRW";
      return "USD"; // Default
    };

    // Yahoo Finance 응답 데이터를 Security 엔티티로 변환
    const security: Security = {
      symbol: quote.symbol ?? "",
      name: quote.shortName || quote.longName || "",
      price: quote.regularMarketPrice ?? 0,
      change: quote.regularMarketChange ?? 0,
      changePercent: quote.regularMarketChangePercent ?? 0,
      previousClose: quote.regularMarketPreviousClose,
      open: quote.regularMarketOpen,
      high: quote.regularMarketDayHigh,
      low: quote.regularMarketDayLow,
      volume: quote.regularMarketVolume,
      market: toMarket(quote.exchange),
      currency: toCurrency(quote.currency),
      country: toCurrency(quote.currency) === "KRW" ? "KR" : "US",
      marketCap: quote.marketCap,
      source: "yfinance",
    };

    return security;
  } catch (error) {
    console.error(`[YFinance] Error fetching security data for ${symbol}:`, error);
    return null;
  }
}
