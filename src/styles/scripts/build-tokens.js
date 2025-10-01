import { generateCssVariables } from "./formatters/css.js";
import { generateJsTokens } from "./formatters/javascript.js";
import { generateTailwindTheme } from "./formatters/tailwind.js";
import { mapTokens } from "./token-mapper.js";

const main = () => {
  console.log("🎨 디자인 토큰 빌드를 시작합니다...");

  // 1. 토큰을 읽고 매핑합니다.
  const tokens = mapTokens();

  // 2. 각 포맷에 맞게 파일을 생성합니다.
  generateJsTokens(tokens);
  generateCssVariables(tokens);
  generateTailwindTheme(tokens);

  console.log("✨ 디자인 토큰 빌드가 성공적으로 완료되었습니다!");
};

main();
