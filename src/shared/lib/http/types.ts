/**
 * types.ts
 * ---
 * http 클라이언트와 관련된 모든 타입 정의
 */

/**
 * HTTP 요청에서 에러가 발생했을 때 사용할 커스텀 에러 클래스입니다.
 */
export class HttpError extends Error {
  response: Response;
  data: { message: string };

  constructor(response: Response, data: { message: string }) {
    super(data.message || response.statusText);
    this.name = "HttpError";
    this.response = response;
    this.data = data;
  }
}

/** `fetch` 요청에 대한 옵션 타입. Next.js의 확장 옵션을 포함합니다. */
export interface HttpOptions extends RequestInit {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
}

/** 요청 인터셉터 함수의 타입 */
export type RequestInterceptor = (options: HttpOptions) => HttpOptions | Promise<HttpOptions>;

/** 응답 인터셉터 함수의 타입 */
export type ResponseInterceptor = (response: Response) => Response | Promise<Response>;

/** 최종 응답 객체를 원하는 데이터 형태로 변환하는 파서 함수의 타입 */
export type ResponseParser = <T>(response: Response) => Promise<T>;
