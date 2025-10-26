import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ES Module에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 프로젝트 root 디렉토리에 생성
const TARGET_PATH = join(__dirname, "../../tailwind.theme.js");

/**
 * 토큰 객체를 Tailwind CSS 테마 설정 파일 내용으로 변환합니다.
 * @param {object} tokens - mapTokens()로부터 반환된 토큰 객체
 */
export const generateTailwindTheme = (tokens) => {
  const theme = {
    colors: tokens.colors,
    spacing: tokens.spacing,
    screens: tokens.breakpoints,
    fontFamily: {
      sans: [tokens.typography["font-family-base"], "sans-serif"],
    },
    fontWeight: {
      regular: tokens.typography.regular,
      bold: tokens.typography.bold,
    },
    // 여기에 다른 Tailwind 테마 확장을 추가할 수 있습니다.
  };

  // responsive 패턴을 Tailwind 플러그인용 유틸리티로 변환
  const responsiveUtilities = Object.entries(tokens.responsive).reduce((acc, [className, styles]) => {
    acc[`.${className}`] = styles;
    return acc;
  }, {});

  const themeContent = `/* eslint-disable */
//
// --- 자동 생성된 파일입니다. 직접 수정하지 마세요. ---
//
// 이 파일은 build:tokens 스크립트에 의해 생성되었습니다.
// 토큰을 변경하려면 krds.json 또는 토큰 매퍼 스크립트를 수정하세요.
//

const tailwindTheme = ${JSON.stringify(theme, null, 2)};

export default tailwindTheme;
`;

  const pluginContent = `/* eslint-disable */
//
// --- 자동 생성된 파일입니다. 직접 수정하지 마세요. ---
//
// 이 파일은 build:tokens 스크립트에 의해 생성되었습니다.
// 토큰을 변경하려면 krds.json 또는 토큰 매퍼 스크립트를 수정하세요.
//

const responsiveUtilities = ${JSON.stringify(responsiveUtilities, null, 2)};

/**
 * 반응형 유틸리티 클래스를 생성하는 Tailwind 플러그인
 */
export const responsivePlugin = function({ addUtilities }) {
  addUtilities(responsiveUtilities);
};
`;

  const PLUGIN_PATH = join(__dirname, "../../tailwind.plugin.js");

  writeFileSync(TARGET_PATH, themeContent, "utf8");
  writeFileSync(PLUGIN_PATH, pluginContent, "utf8");
  console.log(`✅ Tailwind 테마 파일 생성 완료: ${TARGET_PATH}`);
  console.log(`✅ Tailwind 플러그인 파일 생성 완료: ${PLUGIN_PATH}`);
};
