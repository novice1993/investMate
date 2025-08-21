/**
 * client.ts
 * ---
 * 기본 httpClient 인스턴스 생성
 */

import { createHttpClient } from "./factory";

/**
 * 인터셉터가 없는 기본 HTTP 클라이언트입니다.
 */
export const httpClient = createHttpClient();
