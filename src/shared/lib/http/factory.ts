/**
 * factory.ts
 * ---
 * httpClient 객체를 생성하는 팩토리 함수와 관련 로직
 */

import type { HttpOptions, RequestInterceptor, ResponseInterceptor, ResponseParser } from "./types";

// --- 헬퍼 함수 (관심사 분리) ---

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

async function applyResponseInterceptors(response: Response, interceptors: ResponseInterceptor[]): Promise<Response> {
  let interceptedResponse = response;

  for (const interceptor of interceptors) {
    interceptedResponse = await interceptor(interceptedResponse);
  }

  return interceptedResponse;
}

// --- 클라이언트 생성자 (팩토리 함수) ---

/**
 * 설정에 따라 특정 타입의 응답을 전문적으로 처리하는 HTTP 클라이언트를 생성합니다.
 */
export function createHttpClient(config: { requestInterceptors?: RequestInterceptor[]; responseInterceptors?: ResponseInterceptor[]; responseParser: ResponseParser }) {
  const { requestInterceptors = [], responseInterceptors = [], responseParser } = config;

  async function executeRequest<T>(url: string, options: HttpOptions): Promise<T> {
    const interceptedOptions = await applyRequestInterceptors(options, requestInterceptors);
    const response = await fetch(url, interceptedOptions);
    const interceptedResponse = await applyResponseInterceptors(response, responseInterceptors);
    return responseParser<T>(interceptedResponse);
  }

  return {
    get: <TData>(url: string, options: HttpOptions = {}): Promise<TData> => {
      return executeRequest<TData>(url, { ...options, method: "GET" });
    },
    post: <TData, TBody>(url: string, body: TBody, options: HttpOptions = {}): Promise<TData> => {
      return executeRequest<TData>(url, {
        ...options,
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    put: <TData, TBody>(url: string, body: TBody, options: HttpOptions = {}): Promise<TData> => {
      return executeRequest<TData>(url, {
        ...options,
        method: "PUT",
        body: JSON.stringify(body),
      });
    },
    delete: <TData>(url: string, options: HttpOptions = {}): Promise<TData> => {
      return executeRequest<TData>(url, { ...options, method: "DELETE" });
    },
    patch: <TData, TBody = unknown>(url: string, body?: TBody, options: HttpOptions = {}): Promise<TData> => {
      return executeRequest<TData>(url, {
        ...options,
        method: "PATCH",
        body: body ? JSON.stringify(body) : undefined,
      });
    },
  };
}
