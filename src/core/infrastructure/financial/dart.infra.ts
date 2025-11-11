import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import { HttpError } from "@/shared/lib/http";
import { DartCorp, RawDartCorpXml } from "./dart.type";

const DART_APP_KEY = process.env.DART_APP_KEY;
const CORP_CODE_URL = "https://opendart.fss.or.kr/api/corpCode.xml";

// ============================================================================
// Public API
// ============================================================================

/**
 * DART에서 전체 기업 고유번호 목록을 조회합니다.
 * ZIP 파일을 다운로드하고 압축을 해제한 후 XML을 파싱합니다.
 * @returns DartCorp 배열
 */
export async function getAllDartCorpCodes(): Promise<DartCorp[]> {
  try {
    if (!DART_APP_KEY) {
      throw new Error("DART_APP_KEY environment variable is not set");
    }

    // 1. ZIP 파일 다운로드
    const zipBuffer = await downloadCorpCodeZip(DART_APP_KEY);

    // 2. ZIP 압축 해제 및 XML 추출
    const xmlContent = extractXmlFromZip(zipBuffer);

    // 3. XML 파싱
    const corpCodes = parseCorpCodeXml(xmlContent);

    console.log(`[DART] Successfully fetched ${corpCodes.length} corporations`);
    return corpCodes;
  } catch (error) {
    console.error("[DART] Failed to get corp codes:", error);
    return [];
  }
}

/**
 * DART에서 특정 종목코드와 매칭되는 기업만 조회합니다 (메모리 최적화).
 *
 * 114k+ 전체 기업을 메모리에 올리지 않고, 필터링하면서 매칭되는 것만 저장합니다.
 *
 * @param targetStockCodes 조회할 종목코드 Set (예: KOSPI 958개)
 * @returns 매칭된 DartCorp 배열
 */
export async function getFilteredDartCorpCodes(targetStockCodes: Set<string>): Promise<DartCorp[]> {
  try {
    if (!DART_APP_KEY) {
      throw new Error("DART_APP_KEY environment variable is not set");
    }

    // 1. ZIP 파일 다운로드
    const zipBuffer = await downloadCorpCodeZip(DART_APP_KEY);

    // 2. ZIP 압축 해제 및 XML 추출
    const xmlContent = extractXmlFromZip(zipBuffer);

    // 3. XML 파싱하면서 필터링 (메모리 최적화)
    const corpCodes = parseCorpCodeXmlWithFilter(xmlContent, targetStockCodes);

    console.log(`[DART] Successfully fetched ${corpCodes.length} corporations (filtered from 114k+)`);
    return corpCodes;
  } catch (error) {
    console.error("[DART] Failed to get filtered corp codes:", error);
    return [];
  }
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * DART API에서 ZIP 파일을 다운로드합니다.
 */
async function downloadCorpCodeZip(apiKey: string): Promise<Buffer> {
  const url = `${CORP_CODE_URL}?crtfc_key=${apiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    // HttpError로 일관된 에러 형식 사용
    throw new HttpError(response, { message: `Failed to download corp codes: ${response.statusText}` });
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * ZIP 파일에서 XML 내용을 추출합니다.
 */
function extractXmlFromZip(zipBuffer: Buffer): string {
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();

  // ZIP 파일 내 첫 번째 파일을 XML로 가정
  if (zipEntries.length === 0) {
    throw new Error("No files found in ZIP archive");
  }

  const xmlEntry = zipEntries[0];
  return xmlEntry.getData().toString("utf-8");
}

/**
 * XML 문자열을 파싱하여 DartCorp 배열로 변환합니다.
 *
 * 타입 보장:
 * - XML 파싱 라이브러리가 자동으로 타입 추론을 수행하므로 (예: stockCode를 number로 파싱)
 * - Infrastructure 레이어에서 명시적으로 string 타입으로 변환하여 타입 안정성 보장
 */
function parseCorpCodeXml(xmlContent: string): DartCorp[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseTagValue: false, // 숫자 자동 변환 방지 (corp_code의 앞 0 유지)
  });

  const parsed = parser.parse(xmlContent);

  // XML 구조: <result><list>...</list><list>...</list></result>
  const listData = parsed.result?.list;

  if (!listData) {
    throw new Error("Invalid XML structure: missing 'list' element");
  }

  // list가 단일 객체인 경우 배열로 변환
  const items: RawDartCorpXml[] = Array.isArray(listData) ? listData : [listData];

  return items.map((item) => ({
    corpCode: String(item.corp_code || ""),
    corpName: String(item.corp_name || ""),
    stockCode: String(item.stock_code || ""),
    modifyDate: String(item.modify_date || ""),
  }));
}

/**
 * XML 문자열을 파싱하면서 필터링하여 DartCorp 배열로 변환합니다 (메모리 최적화).
 *
 * 114k 전체를 메모리에 올리지 않고, 매칭되는 것만 배열에 저장합니다.
 *
 * @param xmlContent XML 문자열
 * @param targetStockCodes 필터링할 종목코드 Set
 * @returns 매칭된 DartCorp 배열
 */
function parseCorpCodeXmlWithFilter(xmlContent: string, targetStockCodes: Set<string>): DartCorp[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseTagValue: false,
  });

  const parsed = parser.parse(xmlContent);

  const listData = parsed.result?.list;

  if (!listData) {
    throw new Error("Invalid XML structure: missing 'list' element");
  }

  const items: RawDartCorpXml[] = Array.isArray(listData) ? listData : [listData];

  // 필터링: 매칭되는 것만 배열에 추가 (메모리 절약)
  const filtered: DartCorp[] = [];

  for (const item of items) {
    const stockCode = String(item.stock_code || "");

    // stockCode를 6자리로 정규화하여 비교
    const normalizedStockCode = stockCode.padStart(6, "0");

    if (targetStockCodes.has(normalizedStockCode)) {
      filtered.push({
        corpCode: String(item.corp_code || ""),
        corpName: String(item.corp_name || ""),
        stockCode,
        modifyDate: String(item.modify_date || ""),
      });
    }
  }

  return filtered;
}
