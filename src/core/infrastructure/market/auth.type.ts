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
