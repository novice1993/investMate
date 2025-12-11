import AdmZip from "adm-zip";
import * as cheerio from "cheerio";
import { jsonHttpClient } from "@/shared/lib/http";

/**
 * @fileoverview DART 공시 목록 조회 및 원본 다운로드 Infrastructure
 *
 * DART Open API를 통해 공시 목록을 조회하고 원본 문서를 다운로드합니다.
 */

const DART_APP_KEY = process.env.DART_APP_KEY;
const DISCLOSURE_LIST_URL = "https://opendart.fss.or.kr/api/list.json";
const DOCUMENT_URL = "https://opendart.fss.or.kr/api/document.xml";

// ============================================================================
// Types
// ============================================================================

/** 공시유형 */
export type DisclosureType = "A" | "B" | "C" | "D" | "";
// A: 정기공시, B: 주요사항보고, C: 발행공시, D: 지분공시

/** 공시 목록 조회 파라미터 */
export interface DisclosureListParams {
  /** 기업 고유번호 (8자리) - 없으면 전체 조회 (3개월 제한) */
  corpCode?: string;
  /** 시작일 (YYYYMMDD) */
  startDate?: string;
  /** 종료일 (YYYYMMDD) */
  endDate?: string;
  /** 공시유형 */
  type?: DisclosureType;
  /** 페이지 번호 (기본값: 1) */
  pageNo?: number;
  /** 페이지당 건수 (기본값: 10, 최대: 100) */
  pageCount?: number;
}

/** DART API 공시 목록 응답 */
interface DartDisclosureListResponse {
  status: string;
  message: string;
  page_no: number;
  page_count: number;
  total_count: number;
  total_page: number;
  list?: DartDisclosureItem[];
}

/** DART API 공시 항목 */
interface DartDisclosureItem {
  corp_code: string;
  corp_name: string;
  stock_code: string;
  corp_cls: string;
  report_nm: string;
  rcept_no: string;
  flr_nm: string;
  rcept_dt: string;
  rm: string;
}

/** 공시 항목 (정제된 형태) */
export interface DisclosureItem {
  /** 기업 고유번호 */
  corpCode: string;
  /** 기업명 */
  corpName: string;
  /** 종목코드 */
  stockCode: string;
  /** 법인구분 (Y:유가, K:코스닥, N:코넥스, E:기타) */
  corpClass: string;
  /** 보고서명 */
  reportName: string;
  /** 접수번호 (공시 고유 ID) */
  receiptNo: string;
  /** 공시 제출인명 */
  filerName: string;
  /** 접수일자 (YYYYMMDD) */
  receiptDate: string;
  /** 비고 */
  remark: string;
}

/** 공시 목록 조회 결과 */
export interface DisclosureListResult {
  items: DisclosureItem[];
  totalCount: number;
  totalPage: number;
  currentPage: number;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * DART 공시 목록을 조회합니다.
 *
 * @param params 조회 파라미터
 * @returns 공시 목록 결과
 */
export async function getDisclosureList(params: DisclosureListParams = {}): Promise<DisclosureListResult> {
  if (!DART_APP_KEY) {
    throw new Error("DART_APP_KEY environment variable is not set");
  }

  const { corpCode, startDate, endDate, type = "", pageNo = 1, pageCount = 10 } = params;

  // 기본 날짜 범위: 최근 1년
  const defaultEndDate = formatDateToYYYYMMDD(new Date());
  const defaultStartDate = formatDateToYYYYMMDD(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));

  const url = new URL(DISCLOSURE_LIST_URL);
  url.searchParams.append("crtfc_key", DART_APP_KEY);

  if (corpCode) {
    url.searchParams.append("corp_code", corpCode);
  }

  // 날짜 범위 설정 (기본값 적용)
  url.searchParams.append("bgn_de", startDate || defaultStartDate);
  url.searchParams.append("end_de", endDate || defaultEndDate);

  if (type) {
    url.searchParams.append("pblntf_ty", type);
  }
  url.searchParams.append("page_no", String(pageNo));
  url.searchParams.append("page_count", String(pageCount));

  try {
    const response = await jsonHttpClient.get<DartDisclosureListResponse>(url.toString());

    if (response.status !== "000") {
      console.warn(`[DART Disclosure] API warning: ${response.status} - ${response.message}`);
      return { items: [], totalCount: 0, totalPage: 0, currentPage: pageNo };
    }

    const items = (response.list || []).map(mapToDisclosureItem);

    return {
      items,
      totalCount: response.total_count,
      totalPage: response.total_page,
      currentPage: response.page_no,
    };
  } catch (error) {
    console.error("[DART Disclosure] Failed to fetch disclosure list:", error);
    throw error;
  }
}

/**
 * 공시 원본 문서를 다운로드합니다.
 *
 * @param receiptNo 접수번호
 * @returns ZIP 파일 Buffer
 */
export async function downloadDisclosureDocument(receiptNo: string): Promise<Buffer> {
  if (!DART_APP_KEY) {
    throw new Error("DART_APP_KEY environment variable is not set");
  }

  const url = `${DOCUMENT_URL}?crtfc_key=${DART_APP_KEY}&rcept_no=${receiptNo}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("[DART Disclosure] Failed to download document:", error);
    throw error;
  }
}

/**
 * 공시 원본 문서에서 본문 텍스트를 추출합니다.
 *
 * @param receiptNo 접수번호
 * @returns 공시 본문 텍스트
 */
export async function extractDisclosureContent(receiptNo: string): Promise<string> {
  try {
    // 1. ZIP 파일 다운로드
    const zipBuffer = await downloadDisclosureDocument(receiptNo);

    // 2. ZIP에서 문서 파일 추출
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();

    // HTML 파일 먼저 찾기
    let mainEntry = entries.find((entry) => {
      const name = entry.entryName.toLowerCase();
      return name.endsWith(".htm") || name.endsWith(".html");
    });

    // HTML이 없으면 XML 파일 찾기
    if (!mainEntry) {
      mainEntry = entries.find((entry) => {
        const name = entry.entryName.toLowerCase();
        return name.endsWith(".xml");
      });
    }

    if (!mainEntry) {
      console.warn("[DART Disclosure] No HTML/XML file found in ZIP");
      return "";
    }

    // 3. 문서에서 텍스트 추출
    const content = mainEntry.getData().toString("utf-8");
    const text = extractTextFromMarkup(content);

    return text;
  } catch (error) {
    console.error("[DART Disclosure] Failed to extract content:", error);
    throw error;
  }
}

/**
 * 공시 정보와 본문을 함께 조회합니다.
 *
 * @param receiptNo 접수번호
 * @returns 공시 상세 정보
 */
export async function getDisclosureDetail(receiptNo: string): Promise<{
  content: string;
  truncated: boolean;
}> {
  const content = await extractDisclosureContent(receiptNo);

  // LLM 토큰 제한을 위해 최대 길이 제한 (약 8000자)
  const MAX_CONTENT_LENGTH = 8000;
  const truncated = content.length > MAX_CONTENT_LENGTH;

  return {
    content: truncated ? content.slice(0, MAX_CONTENT_LENGTH) + "..." : content,
    truncated,
  };
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * HTML/XML 마크업에서 텍스트만 추출합니다.
 */
function extractTextFromMarkup(content: string): string {
  const $ = cheerio.load(content, { xmlMode: content.includes("<?xml") });

  // 스크립트, 스타일 태그 제거
  $("script, style").remove();

  // 본문 텍스트 추출 (HTML은 body, XML은 BODY 또는 루트)
  let text = $("body").text() || $("BODY").text() || $.root().text();

  // 연속 공백/줄바꿈 정리
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

function mapToDisclosureItem(item: DartDisclosureItem): DisclosureItem {
  return {
    corpCode: item.corp_code,
    corpName: item.corp_name,
    stockCode: item.stock_code || "",
    corpClass: item.corp_cls,
    reportName: item.report_nm,
    receiptNo: item.rcept_no,
    filerName: item.flr_nm,
    receiptDate: item.rcept_dt,
    remark: item.rm || "",
  };
}

function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
