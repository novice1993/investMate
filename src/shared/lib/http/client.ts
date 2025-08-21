/**
 * client.ts
 * ---
 * 사전 정의된 특정 목적의 http 클라이언트 인스턴스
 */

import { createHttpClient } from "./factory";
import { HttpError } from "./types";
import type { ResponseParser } from "./types";

// 1. JSON 파서 정의
const jsonResponseParser: ResponseParser = async (response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      console.warn("[http] Failed to parse JSON response. Falling back to statusText.", e);
      errorData = { message: response.statusText };
    }
    throw new HttpError(response, errorData);
  }
  if (response.status === 204) return null;
  // response.json()의 반환 타입은 any이므로, 제네릭 T에 할당 가능합니다.
  return response.json();
};

// 2. Text 파서 정의
const textResponseParser: ResponseParser = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new HttpError(response, {
      message: `Request failed with status ${response.status}`,
    });
  }
  // response.text()는 string을 반환하므로, "어떤 T 타입이든 가능하다"는 계약을 위해
  // T 타입으로 단언(as T)해주는 실용적인 절충안을 사용합니다.
  return (await response.text()) as T;
};

// 3. 특화된 클라이언트 생성

/**
 * JSON 응답을 처리하는 기본 HTTP 클라이언트입니다.
 */
export const jsonHttpClient = createHttpClient({
  responseParser: jsonResponseParser,
});

/**
 * Text 응답을 처리하는 HTTP 클라이언트입니다.
 */
export const textHttpClient = createHttpClient({
  responseParser: textResponseParser,
});
