/**
 * 반응형 visibility 패턴 정의
 *
 * breakpoints.js에서 정의한 값을 참조하여 실제 CSS 규칙 생성
 * 이 패턴들은 Tailwind 플러그인을 통해 CSS 클래스로 생성됩니다.
 * 예: .mobile-only, .desktop-only 등
 *
 * 이 파일은 krds.json과 독립적으로 프로젝트별로 정의한 토큰입니다.
 */

import { breakpoints } from "./breakpoints.js";

export const responsive = {
  "mobile-only": {
    [`@media (min-width: ${breakpoints.md})`]: {
      display: "none",
    },
  },
  "desktop-only": {
    display: "none",
    [`@media (min-width: ${breakpoints.md})`]: {
      display: "block",
    },
  },
  "tablet-only": {
    display: "none",
    [`@media (min-width: ${breakpoints.sm})`]: {
      display: "block",
    },
    [`@media (min-width: ${breakpoints.lg})`]: {
      display: "none",
    },
  },
  "tablet-up": {
    display: "none",
    [`@media (min-width: ${breakpoints.sm})`]: {
      display: "block",
    },
  },
};
