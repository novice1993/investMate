// KIS API 응답에 대한 타입을 정의하여 코드 안정성을 높입니다.
export interface KisTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  access_token_token_expired: string;
  error_code?: string;
  error_message?: string;
}

export interface KisRevokeResponse {
  code: number;
  message: string;
}

/**
 * KIS Approval Key 응답 타입 (WebSocket 인증용)
 */
export interface KisApprovalResponse {
  approval_key: string;
  error_code?: string;
  error_message?: string;
}

/**
 * KIS 토큰 타입
 * - access: REST API용 토큰
 * - approval: WebSocket용 토큰
 */
export type KisTokenType = "access" | "approval";

/**
 * DB에 저장된 KIS 토큰 레코드
 */
export interface KisTokenRecord {
  id: string;
  type: KisTokenType;
  token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}
