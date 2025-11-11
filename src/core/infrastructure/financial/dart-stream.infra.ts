import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import sax from "sax";

const DART_APP_KEY = process.env.DART_APP_KEY;
const CORP_CODE_URL = "https://opendart.fss.or.kr/api/corpCode.xml";

export interface KospiCorpMapping {
  corpCode: string;
  corpName: string;
  stockCode: string;
  market: "KOSPI";
  generatedAt: string;
}

/**
 * KOSPI Corp Mapping JSON 파일을 읽습니다.
 *
 * @returns KOSPI 기업 매핑 데이터 배열
 * @throws kospi_corp_mapping.json 파일이 존재하지 않으면 에러 발생
 */
export async function readKospiCorpMappingJson(): Promise<KospiCorpMapping[]> {
  const filePath = path.join(process.cwd(), "data", "kospi_corp_mapping.json");

  try {
    const fileContent = await fs.promises.readFile(filePath, "utf-8");
    const mappings: KospiCorpMapping[] = JSON.parse(fileContent);
    console.log(`[DART Stream] Loaded ${mappings.length} corp mappings from ${filePath} (${mappings[0]?.generatedAt})`);
    return mappings;
  } catch (error) {
    console.error(`[DART Stream] Failed to load kospi_corp_mapping.json:`, error);
    throw new Error("kospi_corp_mapping.json not found. Run kospi-mapping-sync cron job first.");
  }
}

/**
 * DART Corp XML을 스트리밍 파싱하여 JSON 파일에 직접 씁니다.
 * 메모리에 전체 배열을 담지 않음 (메모리 최적화: ~70MB 사용)
 *
 * @param targetStockCodes 필터링할 종목코드 Set
 * @param outputPath 출력 JSON 파일 경로
 * @returns 매칭된 기업 수
 */
export async function streamDartCorpToJson(targetStockCodes: Set<string>, outputPath: string): Promise<{ count: number }> {
  if (!DART_APP_KEY) {
    throw new Error("DART_APP_KEY not set");
  }

  console.log("[DART Stream] Downloading ZIP...");

  // 1. ZIP 다운로드
  const zipUrl = `${CORP_CODE_URL}?crtfc_key=${DART_APP_KEY}`;
  const response = await fetch(zipUrl);
  const arrayBuffer = await response.arrayBuffer();
  const zipBuffer = Buffer.from(arrayBuffer);

  console.log("[DART Stream] Extracting XML...");

  // 2. ZIP 압축 해제
  const zip = new AdmZip(zipBuffer);
  const zipEntries = zip.getEntries();
  if (zipEntries.length === 0) {
    throw new Error("Empty ZIP");
  }

  const xmlContent = zipEntries[0].getData().toString("utf-8");

  console.log("[DART Stream] Streaming parse & filter (memory optimized)...");

  // 3. 출력 파일 준비
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  const writeStream = fs.createWriteStream(outputPath);

  writeStream.write("[\n"); // JSON 배열 시작

  let matchCount = 0;
  let currentItem: Record<string, string> = {};
  let currentTag = "";
  let isFirstItem = true;

  // 4. SAX 파서 생성 (스트리밍 - 메모리에 전체 로드 안 함)
  const parser = sax.createStream(true, {});

  parser.on("opentag", (node) => {
    currentTag = node.name;
    if (node.name === "list") {
      currentItem = {};
    }
  });

  parser.on("text", (text) => {
    const trimmed = text.trim();
    if (trimmed && currentTag) {
      currentItem[currentTag] = trimmed;
    }
  });

  parser.on("closetag", (tagName) => {
    if (tagName === "list") {
      // list 태그 닫힘 = 1개 기업 완성
      const stockCode = (currentItem.stock_code || "").padStart(6, "0");

      if (targetStockCodes.has(stockCode)) {
        // 매칭! 즉시 파일에 쓰기 (메모리에 누적 안 함)
        const mapping: KospiCorpMapping = {
          corpCode: currentItem.corp_code || "",
          corpName: currentItem.corp_name || "",
          stockCode: currentItem.stock_code || "",
          market: "KOSPI",
          generatedAt: new Date().toISOString(),
        };

        if (!isFirstItem) {
          writeStream.write(",\n");
        }
        writeStream.write("  " + JSON.stringify(mapping));

        matchCount++;
        isFirstItem = false;
      }

      // currentItem 초기화 (메모리 해제)
      currentItem = {};
    }
    currentTag = "";
  });

  // 5. XML 스트리밍 파싱 실행
  return new Promise((resolve, reject) => {
    parser.on("end", () => {
      writeStream.write("\n]"); // JSON 배열 종료
      writeStream.end();

      console.log(`[DART Stream] ✓ Matched ${matchCount} corporations (saved to ${outputPath})`);
      resolve({ count: matchCount });
    });

    parser.on("error", (err) => {
      writeStream.end();
      reject(err);
    });

    // XML 문자열을 파서에 전달
    parser.write(xmlContent);
    parser.end();
  });
}
