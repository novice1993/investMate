interface ApiResult<T> {
  data?: T;
  error?: string;
}

/**
 * 에러를 로깅하는 유틸리티 함수
 */
function logError(error: unknown, context: string = "") {
  const timestamp = new Date().toISOString();
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[${timestamp}] ${context}: ${message}`);

  // 개발 환경에서만 스택 추적
  if (process.env.NODE_ENV === "development" && error instanceof Error) {
    console.error(error.stack);
  }
}

/**
 * API 호출을 안전하게 래핑하고 에러를 로깅하는 함수
 */
export async function apiCallWithLogging<T>(apiFunction: () => Promise<T>, context: string = "API Call"): Promise<ApiResult<T>> {
  try {
    const data = await apiFunction();
    return { data };
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    logError(error, context); // 에러 로깅

    return { error: message };
  }
}
