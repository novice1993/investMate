import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";
import { DartCorp, RawDartCorpXml } from "@/core/types/dart.type";
import { HttpError } from "@/shared/lib/http";

const DART_APP_KEY = process.env.DART_APP_KEY;
const CORP_CODE_URL = "https://opendart.fss.or.kr/api/corpCode.xml";

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
 */
function parseCorpCodeXml(xmlContent: string): DartCorp[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
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
    corpCode: item.corp_code || "",
    corpName: item.corp_name || "",
    stockCode: item.stock_code || "",
    modifyDate: item.modify_date || "",
  }));
}
