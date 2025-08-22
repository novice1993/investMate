import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ES Module에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// krds.json 파일 경로 설정 (스크립트 위치 기준)
const TOKENS_PATH = join(__dirname, "../tokens/krds.json");

/**
 * 객체의 모든 중첩된 키를 하이픈(-)으로 연결된 단일 키로 변환합니다.
 * 예: { a: { b: { c: { value: 1 } } } } -> { 'a-b-c': 1 }
 * @param {object} obj - 변환할 객체
 * @param {string} [prefix=''] - 재귀 호출 시 사용될 접두사
 * @returns {object} - 평탄화된 객체
 */
const flattenObject = (obj, prefix = "") => {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + "-" : "";
    if (typeof obj[k] === "object" && obj[k] !== null && obj[k].value === undefined) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k].value;
    }
    return acc;
  }, {});
};

/**
 * krds.json 토큰을 읽고 각 포맷에 맞는 평탄화된 객체로 변환합니다.
 * 이 함수는 나중에 시맨틱 토큰 매핑 로직을 추가하여 확장할 수 있습니다.
 * @returns {{colors: object, spacing: object, typography: object}} - 평탄화된 토큰 객체
 */
export const mapTokens = () => {
  const rawTokens = JSON.parse(readFileSync(TOKENS_PATH, "utf8"));
  const tokenData = rawTokens["primitive/value-set"];

  // --- 원시 토큰 (Primitive Tokens) ---
  // 현재는 원시 토큰을 그대로 평탄화하여 사용합니다.
  // 예: light.primary.50 -> 'light-primary-50'
  const primitiveColors = flattenObject(tokenData.color);
  const primitiveSpacing = flattenObject(tokenData.number);
  const primitiveTypography = {
    ...flattenObject(tokenData.typo["font-weight"]),
    "font-family-base": tokenData.typo.font.type.value,
  };

  // --- 시맨틱 토큰 (Semantic고, ㅇㅖ Tokens) ---
  // TODO: 향후 이 영역에 시맨틱 토큰을 정의합니다.
  // 예: const semanticColors = { 'button-primary-bg': primitiveColors['light-primary-50'], ... };
  // 지금은 원시 토큰을 그대로 사용합니다.
  const semanticColors = { ...primitiveColors };
  const semanticSpacing = { ...primitiveSpacing };
  const semanticTypography = { ...primitiveTypography };

  return {
    colors: semanticColors,
    spacing: semanticSpacing,
    typography: semanticTypography,
  };
};

// ES Module에서는 export 구문으로 이미 내보냄
