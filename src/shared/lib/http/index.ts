/**
 * index.ts (barrel file)
 * ---
 * http 모듈의 public API를 설정합니다.
 * 외부에서는 이 파일을 통해 모듈의 기능들을 import 합니다.
 */

import { httpClient } from "./client";

export { createHttpClient } from "./factory";
export * from "./types";

export default httpClient;
