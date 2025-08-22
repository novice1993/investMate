import yahooFinance from "yahoo-finance2";
import { Security } from "@/core/entities/security.entity";
import { SecurityRepository } from "./security.repository";

/**
 * Yahoo Finance API를 사용하여 Security 데이터를 조회하고 변환합니다.
 */
export const YfinanceSecurityRepository: SecurityRepository = {
  findBySymbol: async (symbol: string): Promise<Security | null> => {
    try {
      const quote = await yahooFinance.quote(symbol);

      if (!quote) {
        return null;
      }

      // Yahoo Finance 응답 데이터를 Security 엔티티로 변환
      const security: Security = {
        symbol: quote.symbol ?? "",
        shortName: quote.shortName || quote.longName || "",
        longName: quote.longName,
        currency: quote.currency ?? "",
        regularMarketPrice: quote.regularMarketPrice ?? 0,
        regularMarketChange: quote.regularMarketChange ?? 0,
        regularMarketChangePercent: quote.regularMarketChangePercent ?? 0,
        regularMarketPreviousClose: quote.regularMarketPreviousClose ?? 0,
        regularMarketOpen: quote.regularMarketOpen ?? 0,
        regularMarketDayHigh: quote.regularMarketDayHigh ?? 0,
        regularMarketDayLow: quote.regularMarketDayLow ?? 0,
        regularMarketVolume: quote.regularMarketVolume ?? 0,
        marketCap: quote.marketCap ?? 0,
        trailingPE: quote.trailingPE,
        forwardPE: quote.forwardPE,
        epsTrailingTwelveMonths: quote.epsTrailingTwelveMonths,
        priceToBook: quote.priceToBook,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? 0,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? 0,
        averageDailyVolume3Month: quote.averageDailyVolume3Month ?? 0,
        regularMarketTime: new Date((Number(quote.regularMarketTime) || 0) * 1000), // Unix timestamp를 Date 객체로 변환, 유효하지 않은 값은 0으로 처리
      };

      return security;
    } catch (error) {
      console.error(`Error fetching security data for ${symbol} from Yahoo Finance:`, error);
      return null;
    }
  },
};
