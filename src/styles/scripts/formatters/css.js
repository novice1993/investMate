import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ES Module에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TARGET_PATH = join(__dirname, "../../variables.css");

/**
 * 토큰 객체를 CSS 변수 파일 내용으로 변환합니다.
 * @param {object} tokens - mapTokens()로부터 반환된 토큰 객체
 */
export const generateCssVariables = (tokens) => {
  let cssContent = `/*
 * --- 자동 생성된 파일입니다. 직접 수정하지 마세요. ---
 *
 * 이 파일은 build:tokens 스크립트에 의해 생성되었습니다.
 * 토큰을 변경하려면 krds.json 또는 토큰 매퍼 스크립트를 수정하세요.
 */

:root {
`;

  // Colors
  for (const [key, value] of Object.entries(tokens.colors)) {
    cssContent += `  --color-${key}: ${value};
`;
  }
  // Spacing
  for (const [key, value] of Object.entries(tokens.spacing)) {
    cssContent += `  --spacing-${key}: ${value};
`;
  }
  // Typography
  for (const [key, value] of Object.entries(tokens.typography)) {
    cssContent += `  --typo-${key}: ${value};
`;
  }

  cssContent += `}
`;

  writeFileSync(TARGET_PATH, cssContent, "utf8");
  console.log(`✅ CSS 변수 파일 생성 완료: ${TARGET_PATH}`);
};
