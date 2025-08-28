import type { Config } from "tailwindcss";
import tailwindTheme from "./src/styles/tailwind.theme.js";

const config: Config = {
  // Tailwind가 스타일을 적용할 파일들의 경로를 지정합니다.
  content: ["./src/pages/**/*.{js,ts,jsx,tsx,mdx}", "./src/components/**/*.{js,ts,jsx,tsx,mdx}", "./src/app/**/*.{js,ts,jsx,tsx,mdx}"],
  // 테마를 설정합니다.
  theme: {
    // Tailwind의 기본 테마를 확장(extend)하는 방식으로 커스텀 테마를 적용합니다.
    extend: {
      ...tailwindTheme,
      colors: {
        ...tailwindTheme.colors,
      },
    },
  },
  plugins: [],
};
export default config;
