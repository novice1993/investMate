/**
 * 재무제표 도메인 모델
 */

/**
 * 재무제표 데이터 (파싱된 결과)
 */
export interface FinancialStatement {
  /** 기업 고유번호 */
  corpCode: string;
  /** 종목 코드 (6자리) */
  stockCode?: string;
  /** 사업연도 */
  year: string;
  /** 분기 (1, 2, 3, 4) */
  quarter: number;

  // 재무상태표 (Balance Sheet)
  /** 자산총계 */
  totalAssets: number;
  /** 부채총계 */
  totalLiabilities: number;
  /** 자본총계 (자기자본) */
  totalEquity: number;

  // 손익계산서 (Income Statement)
  /** 매출액 */
  revenue: number;
  /** 영업이익 */
  operatingProfit: number;
  /** 당기순이익 */
  netIncome: number;
}

/**
 * 재무 비율 (계산된 지표)
 */
export interface FinancialRatios {
  /** 기업 고유번호 */
  corpCode: string;
  /** 종목 코드 */
  stockCode: string;
  /** 기업명 */
  corpName: string;
  /** 사업연도 */
  year: string;
  /** 분기 */
  quarter: number;

  /** ROE (자기자본이익률) = (당기순이익 / 자기자본) × 100 */
  roe: number;
  /** 부채비율 = (부채총계 / 자본총계) × 100 */
  debtRatio: number;
  /** 영업이익률 = (영업이익 / 매출액) × 100 */
  operatingMargin: number;
  /** 순이익률 = (당기순이익 / 매출액) × 100 */
  netMargin: number;
}

/**
 * YoY 성장률 데이터
 */
export interface YoYGrowth {
  /** 매출액 성장률 (%) */
  revenueGrowth: number;
  /** 영업이익 성장률 (%) */
  operatingProfitGrowth: number;
  /** 당기순이익 성장률 (%) */
  netIncomeGrowth: number;
}

/**
 * 스크리너용 종합 재무 데이터
 */
export interface CompanyFinancialData {
  /** 기업 고유번호 */
  corpCode: string;
  /** 종목 코드 */
  stockCode: string;
  /** 기업명 */
  corpName: string;

  /** 최신 재무제표 */
  latestStatement: FinancialStatement;
  /** 전년도 재무제표 (YoY 계산용) */
  previousStatement?: FinancialStatement;

  /** 재무 비율 */
  ratios: FinancialRatios;
  /** YoY 성장률 */
  yoyGrowth?: YoYGrowth;

  /** 마지막 업데이트 시각 */
  lastUpdated: Date;
}
