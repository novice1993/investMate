/**
 * factory.ts
 * ---
 * httpClient 객체를 생성하는 팩토리 함수와 관련 로직
 */

import type { HttpOptions, RequestInterceptor, ResponseInterceptor } from "./types";
import { HttpError } from "./types";

// --- 헬퍼 함수 (관심사 분리) ---

/** 요청 인터셉터들을 순차적으로 적용합니다. */
async function applyRequestInterceptors(options: HttpOptions, interceptors: RequestInterceptor[]): Promise<HttpOptions> {
  let interceptedOptions: HttpOptions = {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  };

  for (const interceptor of interceptors) {
    interceptedOptions = await interceptor(interceptedOptions);
  }

  return interceptedOptions;
}

/** 응답 인터셉터들을 순차적으로 적용합니다. */
async function applyResponseInterceptors(response: Response, interceptors: ResponseInterceptor[]): Promise<Response> {
  let interceptedResponse = response;

  for (const interceptor of interceptors) {
    interceptedResponse = await interceptor(interceptedResponse);
  }

  return interceptedResponse;
}

/** 최종 응답을 처리하여 데이터를 반환하거나 에러를 발생시킵니다. */
async function processResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      console.warn("[http.ts] Failed to parse JSON response. Falling back to statusText.", e);
      errorData = { message: response.statusText };
    }
    throw new HttpError(response, errorData);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// --- 클라이언트 생성자 (팩토리 함수) ---

/**
 * 인터셉터 기능이 포함된 HTTP 클라이언트를 생성하는 팩토리 함수입니다.
 */
export function createHttpClient(config?: { requestInterceptors?: RequestInterceptor[]; responseInterceptors?: ResponseInterceptor[] }) {
  const { requestInterceptors = [], responseInterceptors = [] } = config || {};

  async function request<T>(url: string, options: HttpOptions): Promise<T> {
    const interceptedOptions = await applyRequestInterceptors(options, requestInterceptors);
    const response = await fetch(url, interceptedOptions);
    const interceptedResponse = await applyResponseInterceptors(response, responseInterceptors);
    return processResponse<T>(interceptedResponse);
  }

  return {
    get: <TData>(url: string, options: HttpOptions = {}): Promise<TData> => {
      return request<TData>(url, { ...options, method: "GET" });
    },
    post: <TData, TBody>(url: string, body: TBody, options: HttpOptions = {}): Promise<TData> => {
      return request<TData>(url, { ...options, method: "POST", body: JSON.stringify(body) });
    },
    put: <TData, TBody>(url: string, body: TBody, options: HttpOptions = {}): Promise<TData> => {
      return request<TData>(url, { ...options, method: "PUT", body: JSON.stringify(body) });
    },
    delete: <TData>(url: string, options: HttpOptions = {}): Promise<TData> => {
      return request<TData>(url, { ...options, method: "DELETE" });
    },
  };
}
