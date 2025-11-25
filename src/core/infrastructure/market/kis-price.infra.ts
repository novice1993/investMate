import type { StockPrice } from "@/core/entities/stock-price.entity";
import { getCached } from "@/shared/lib/utils/cache";
import type { KisCurrentPriceOutput, KisPeriodPriceOutput, StockPriceBatchResult } from "./kis-price.types";

// Re-export types for convenience
export type { KisCurrentPriceOutput, KisPeriodPriceOutput, StockPriceBatchResult } from "./kis-price.types";

const KIS_BASE_URL = process.env.KIS_BASE_URL;
const APP_KEY = process.env.KIS_APP_KEY;
const APP_SECRET = process.env.KIS_APP_SECRET;
const KIS_TOKEN_KEY = "kis-auth-token";

/**
 * @description 메모리 캐시에서 KIS 토큰을 가져옵니다
 */
function getKisToken(): string {
  const token = getCached<string>(KIS_TOKEN_KEY);
  if (!token) {
    throw new Error("KIS 토큰이 초기화되지 않았습니다. instrumentation.ts에서 initializeKisToken()이 실행되었는지 확인하세요.");
  }
  return token;
}

/**
 * @description 주식 현재가 시세 조회 (실시간 가격 + PER, PBR, EPS 등)
 * @param stockCode 종목코드 (6자리, 예: "005930")
 */
export const getCurrentStockPrice = async (stockCode: string): Promise<KisCurrentPriceOutput> => {
  if (!KIS_BASE_URL || !APP_KEY || !APP_SECRET) {
    throw new Error("KIS 관련 환경변수(URL, APP_KEY, APP_SECRET)가 설정되지 않았습니다.");
  }

  const accessToken = getKisToken();

  const headers = {
    "content-type": "application/json; charset=utf-8",
    authorization: `Bearer ${accessToken}`,
    appkey: APP_KEY,
    appsecret: APP_SECRET,
    tr_id: "FHKST01010100", // 주식현재가 시세
  };

  const params = {
    FID_COND_MRKT_DIV_CODE: "J", // 시장 구분 (J: KRX/KOSPI)
    FID_INPUT_ISCD: stockCode, // 종목코드
  };

  const queryString = new URLSearchParams(params).toString();
  const url = `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?${queryString}`;

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[KIS Price] 현재가 조회 실패 (${stockCode}):`, errorText);
    throw new Error(`현재가 조회 실패: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.rt_cd !== "0") {
    console.error(`[KIS Price] 현재가 조회 API 에러 (${stockCode}):`, data.msg1);
    throw new Error(`KIS API 에러: ${data.msg1 || data.msg_cd || "알 수 없는 에러"}`);
  }

  return data.output;
};

/**
 * @description 주식 기간별 시세 조회 (최대 100일, 일/주/월/년 봉)
 * @param stockCode 종목코드 (6자리)
 * @param periodCode 기간 구분 (D: 일봉, W: 주봉, M: 월봉, Y: 년봉)
 * @param adjustedPrice 수정주가 여부 (0: 수정주가, 1: 원주가)
 */
export const getPeriodStockPrice = async (stockCode: string, periodCode: "D" | "W" | "M" | "Y" = "D", adjustedPrice: "0" | "1" = "0"): Promise<KisPeriodPriceOutput[]> => {
  if (!KIS_BASE_URL || !APP_KEY || !APP_SECRET) {
    throw new Error("KIS 관련 환경변수(URL, APP_KEY, APP_SECRET)가 설정되지 않았습니다.");
  }

  const accessToken = getKisToken();

  const headers = {
    "content-type": "application/json; charset=utf-8",
    authorization: `Bearer ${accessToken}`,
    appkey: APP_KEY,
    appsecret: APP_SECRET,
    tr_id: "FHKST03010100", // 국내주식기간별시세
  };

  // 날짜 범위 계산 (오늘부터 과거 100일)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 100);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}${month}${day}`;
  };

  const params = {
    FID_COND_MRKT_DIV_CODE: "J", // 시장 구분 (J: KRX/KOSPI)
    FID_INPUT_ISCD: stockCode, // 종목코드
    FID_INPUT_DATE_1: formatDate(startDate), // 조회 시작일자 (필수)
    FID_INPUT_DATE_2: formatDate(today), // 조회 종료일자 (필수)
    FID_PERIOD_DIV_CODE: periodCode, // 기간 구분
    FID_ORG_ADJ_PRC: adjustedPrice, // 수정주가 원주가
  };

  const queryString = new URLSearchParams(params).toString();
  const url = `${KIS_BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?${queryString}`;

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[KIS Price] 기간별 시세 조회 실패 (${stockCode}):`, errorText);
    throw new Error(`기간별 시세 조회 실패: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (data.rt_cd !== "0") {
    console.error(`[KIS Price] 기간별 시세 조회 API 에러 (${stockCode}):`, data.msg1);
    throw new Error(`KIS API 에러: ${data.msg1 || data.msg_cd || "알 수 없는 에러"}`);
  }

  return data.output2; // output2에 차트 데이터 배열이 담김
};

/**
 * @description Rate limit을 고려하여 여러 종목의 현재가를 배치 조회
 * 모의투자 환경: 초당 2건 제한
 * @param stockCodes 종목코드 배열
 * @param batchSize 배치 크기 (기본값: 3 - 2초당 3개 처리)
 * @param delayMs 배치 간 지연 시간 (기본값: 2000ms)
 */
export const fetchStockPricesBatch = async (stockCodes: string[], batchSize: number = 3, delayMs: number = 2000): Promise<StockPriceBatchResult[]> => {
  const results: StockPriceBatchResult[] = [];

  for (let i = 0; i < stockCodes.length; i += batchSize) {
    const batch = stockCodes.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(stockCodes.length / batchSize);

    console.log(`[KIS Price] Batch ${batchNumber}/${totalBatches} 처리 중... (${i + 1}~${i + batch.length}/${stockCodes.length})`);

    const batchPromises = batch.map(async (code) => {
      try {
        const data = await getCurrentStockPrice(code);
        return { stockCode: code, data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[KIS Price] ${code} 조회 실패:`, errorMessage);
        return { stockCode: code, data: null, error: errorMessage };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Rate limit 준수: 마지막 배치가 아니면 대기
    if (i + batchSize < stockCodes.length) {
      console.log(`[KIS Price] ${delayMs}ms 대기 중...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  const successCount = results.filter((r) => !r.error).length;
  const failCount = results.filter((r) => r.error).length;

  console.log(`[KIS Price] 배치 조회 완료 - 성공: ${successCount}, 실패: ${failCount}`);

  return results;
};

/**
 * KIS API 응답을 StockPrice 엔티티로 변환합니다
 *
 * @param stockCode 종목 코드
 * @param output KIS API 기간별 시세 응답
 * @returns StockPrice 엔티티
 */
export function toStockPriceEntity(stockCode: string, output: KisPeriodPriceOutput): StockPrice {
  return {
    stockCode,
    date: output.stck_bsop_date,
    openPrice: parseFloat(output.stck_oprc) || 0,
    highPrice: parseFloat(output.stck_hgpr) || 0,
    lowPrice: parseFloat(output.stck_lwpr) || 0,
    closePrice: parseFloat(output.stck_clpr) || 0,
    volume: parseFloat(output.acml_vol) || 0,
    change: parseFloat(output.prdy_vrss) || 0,
    changePercent: parseFloat(output.prdy_ctrt) || 0,
  };
}

/**
 * KIS API 응답 배열을 StockPrice 엔티티 배열로 변환합니다
 *
 * @param stockCode 종목 코드
 * @param outputs KIS API 기간별 시세 응답 배열
 * @returns StockPrice 엔티티 배열
 */
export function toStockPriceEntities(stockCode: string, outputs: KisPeriodPriceOutput[]): StockPrice[] {
  return outputs.map((output) => toStockPriceEntity(stockCode, output));
}
