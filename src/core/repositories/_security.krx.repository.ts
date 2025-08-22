import iconv from "iconv-lite";
import { parse, ParseResult } from "papaparse";
import { Security } from "@/core/entities/security.entity";

const OTP_URL = "http://data.krx.co.kr/comm/fileDn/GenerateOTP/generate.cmd";
const DOWNLOAD_URL = "http://data.krx.co.kr/comm/fileDn/download_csv/download.cmd";

/**
 * KRX에서 받은 CSV 데이터 한 행의 타입을 정의합니다.
 */
interface KrxCsvRow {
  종목코드: string;
  종목명: string;
  시장구분: string;
  종가: string;
  대비: string;
  등락률: string;
  시가총액: string;
  거래량: string;
  [key: string]: string; // 그 외 예상치 못한 컬럼이 있을 수 있음을 명시
}

/**
 * KRX 서버에 OTP 생성을 요청합니다.
 */
async function generateOtp(marketId: string): Promise<string> {
  const otpResponse = await fetch(OTP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
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
    throw new Error(`Failed to generate OTP: ${otpResponse.statusText}`);
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

/**
 * 발급받은 OTP를 사용하여 CSV 데이터를 다운로드하고 표준 형식으로 파싱합니다.
 */
async function downloadAndParseSecurities(otp: string, market: "KOSPI" | "KOSDAQ"): Promise<Partial<Security>[]> {
  const downloadResponse = await fetch(`${DOWNLOAD_URL}?code=${otp}`);

  if (!downloadResponse.ok) {
    throw new Error(`Failed to download CSV: ${downloadResponse.statusText}`);
  }

  const buffer = await downloadResponse.arrayBuffer();
  const decodedCsv = iconv.decode(Buffer.from(buffer), "euc-kr");

  const parsed: ParseResult<KrxCsvRow> = parse<KrxCsvRow>(decodedCsv, {
    header: true,
    skipEmptyLines: true,
  });

  return parsed.data.map((row) => ({
    symbol: `${row["종목코드"]}.KS`,
    shortName: row["종목명"],
    market: market,
    regularMarketPrice: safeParseFloat(row["종가"]),
    regularMarketChange: safeParseFloat(row["대비"]),
    regularMarketChangePercent: safeParseFloat(row["등락률"]),
    marketCap: safeParseFloat(row["시가총액"]),
    regularMarketVolume: safeParseFloat(row["거래량"]),
  }));
}

/**
 * KRX 데이터 시스템에서 종목 목록을 가져오는 리포지토리 구현체
 */
export const KrxSecurityRepository = {
  /**
   * KOSPI 또는 KOSDAQ 시장의 전체 종목 목록을 조회합니다.
   */
  async getMarketSecurities(market: "KOSPI" | "KOSDAQ"): Promise<Partial<Security>[]> {
    try {
      const marketId = market === "KOSPI" ? "STK" : "KSQ";
      const otp = await generateOtp(marketId);
      return await downloadAndParseSecurities(otp, market);
    } catch (error) {
      console.error("[KrxSecurityRepository] Failed to get market securities:", error);
      // 에러 발생 시 빈 배열을 반환하여, 전체 시스템의 장애로 이어지지 않도록 합니다.
      return [];
    }
  },
};
