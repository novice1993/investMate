/* eslint-disable */
//
// --- 자동 생성된 파일입니다. 직접 수정하지 마세요. ---
//
// 이 파일은 build:tokens 스크립트에 의해 생성되었습니다.
// 토큰을 변경하려면 krds.json 또는 토큰 매퍼 스크립트를 수정하세요.
//

const responsiveUtilities = {
  ".mobile-only": {
    "@media (min-width: 768px)": {
      display: "none",
    },
  },
  ".desktop-only": {
    display: "none",
    "@media (min-width: 768px)": {
      display: "block",
    },
  },
  ".tablet-only": {
    display: "none",
    "@media (min-width: 640px)": {
      display: "block",
    },
    "@media (min-width: 1024px)": {
      display: "none",
    },
  },
  ".tablet-up": {
    display: "none",
    "@media (min-width: 640px)": {
      display: "block",
    },
  },
};

/**
 * 반응형 유틸리티 클래스를 생성하는 Tailwind 플러그인
 */
export const responsivePlugin = function ({ addUtilities }) {
  addUtilities(responsiveUtilities);
};
