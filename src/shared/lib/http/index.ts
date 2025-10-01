/**
 * index.ts (barrel file)
 * ---
 * http 모듈의 public API를 설정합니다.
 * 외부에서는 이 파일을 통해 모듈의 기능들을 import 합니다.
 */

// 미리 정의된 클라이언트들을 export 합니다.
export { jsonHttpClient, textHttpClient } from "./client";

// 클라이언트를 직접 만들 수 있는 factory와 타입도 export 합니다.
export { createHttpClient } from "./factory";
export * from "./types";
