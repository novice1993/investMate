import iconv from "iconv-lite";
import Papa from "papaparse";
import { Security } from "@/core/entities/security.entity";
import { HttpError } from "@/shared/lib/http";
import { getCached, setCache } from "@/shared/lib/utils/cache";
import { RawKrxRow } from "./krx-market.types";

const OTP_URL = "http://data.krx.co.kr/comm/fileDn/GenerateOTP/generate.cmd";
const DOWNLOAD_URL = "http://data.krx.co.kr/comm/fileDn/download_csv/download.cmd";

// ============================================================================
// Public API
// ============================================================================

/**
 * KOSPI 또는 KOSDAQ 시장의 전체 종목 목록을 Security 엔티티 형태로 반환합니다.
 */
export async function getMarketSecurities(market: "KOSPI" | "KOSDAQ"): Promise<Partial<Security>[]> {
  const rawData = await fetchAndCacheKrxRawData(market);

  return rawData.map((row) => ({
    symbol: row["종목코드"],
    name: row["종목명"],
    price: safeParseFloat(row["종가"]),
    change: safeParseFloat(row["대비"]),
    changePercent: safeParseFloat(row["등락률"]),
    market: market,
    currency: "KRW",
    country: "KR",
    source: "KRX",
    volume: safeParseFloat(row["거래량"]),
    marketCap: safeParseFloat(row["시가총액"]),
  }));
}

/**
 * KOSPI 또는 KOSDAQ 시장의 종목 코드와 이름만 반환합니다.
 * DART 등 다른 시스템과의 매칭에 사용됩니다.
 */
export async function getMarketStockCodes(market: "KOSPI" | "KOSDAQ"): Promise<{ symbol: string; name: string }[]> {
  const rawData = await fetchAndCacheKrxRawData(market);

  return rawData
    .map((row) => ({
      symbol: row["종목코드"],
      name: row["종목명"],
    }))
    .filter((item) => item.symbol && item.name);
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * KRX API에서 원본 CSV 데이터를 가져와서 캐싱합니다.
 * 이 함수는 내부적으로만 사용되며, KRX API 호출을 최소화하기 위해 캐싱을 수행합니다.
 */
async function fetchAndCacheKrxRawData(market: "KOSPI" | "KOSDAQ"): Promise<RawKrxRow[]> {
  const cacheKey = `krx-raw-${market}`;

  // 1. 캐시 확인
  const cached = getCached<RawKrxRow[]>(cacheKey);
  if (cached) {
    console.log(`[KRX] Using cached raw data for ${market}`);
    return cached;
  }

  // 2. KRX API 호출
  console.log(`[KRX] Fetching raw data from KRX API for ${market}`);
  try {
    const marketId = market === "KOSPI" ? "STK" : "KSQ";
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    console.log(`[KRX] Requesting data for date: ${today}, marketId: ${marketId}`);

    const otp = await generateOtp(marketId);
    console.log(`[KRX] OTP generated: ${otp.substring(0, 20)}...`);

    const downloadResponse = await fetch(`${DOWNLOAD_URL}?code=${otp}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "http://data.krx.co.kr/",
      },
    });

    if (!downloadResponse.ok) {
      throw new HttpError(downloadResponse, { message: `Failed to download CSV: ${downloadResponse.statusText}` });
    }

    const buffer = await downloadResponse.arrayBuffer();
    console.log(`[KRX] Downloaded ${buffer.byteLength} bytes`);

    const decodedCsv = iconv.decode(Buffer.from(buffer), "euc-kr");
    console.log(`[KRX] Decoded CSV length: ${decodedCsv.length} characters`);

    const parsed: Papa.ParseResult<RawKrxRow> = Papa.parse<RawKrxRow>(decodedCsv, {
      header: true,
      skipEmptyLines: true,
    });

    console.log(`[KRX] Parsed ${parsed.data.length} rows, errors: ${parsed.errors.length}`);

    if (parsed.errors.length > 0) {
      console.warn(`[KRX] Parse errors:`, parsed.errors.slice(0, 5));
    }

    if (parsed.data.length === 0) {
      console.error(`[KRX] ⚠️ WARNING: Parsed 0 rows from KRX API. CSV preview:`, decodedCsv.substring(0, 500));
    }

    // 3. 원본 데이터 캐싱
    setCache(cacheKey, parsed.data);
    console.log(`[KRX] Successfully fetched and cached ${parsed.data.length} rows for ${market}`);
    return parsed.data;
  } catch (error) {
    console.error(`[KRX] ❌ Failed to fetch raw data for ${market}:`, error);
    if (error instanceof Error) {
      console.error(`[KRX] Error details:`, {
        message: error.message,
        stack: error.stack?.split("\n").slice(0, 3).join("\n"),
      });
    }
    return [];
  }
}

/**
 * KRX 서버에 OTP 생성을 요청합니다.
 */
async function generateOtp(marketId: string): Promise<string> {
  const otpResponse = await fetch(OTP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Referer: "http://data.krx.co.kr/",
    },
    body: new URLSearchParams({
      mktId: marketId,
      trdDd: new Date().toISOString().slice(0, 10).replace(/-/g, ""), // YYYYMMDD 형식
      money: "1",
      csvxls_isNo: "false",
      name: "fileDown",
      url: "dbms/MDC/STAT/standard/MDCSTAT01501",
    }),
  });

  if (!otpResponse.ok) {
    // HttpError로 일관된 에러 형식 사용
    throw new HttpError(otpResponse, { message: `Failed to generate OTP: ${otpResponse.statusText}` });
  }
  return otpResponse.text();
}

/**
 * CSV의 문자열 값을 숫자로 변환하는 헬퍼 함수.
 */
function safeParseFloat(value: string): number {
  if (!value) return 0;
  return parseFloat(value.replace(/,/g, "")) || 0;
}
