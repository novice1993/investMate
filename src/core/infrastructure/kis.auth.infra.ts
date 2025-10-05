import { KisTokenResponse, KisRevokeResponse } from "@/core/types/auth.type";
import { jsonHttpClient } from "@/shared/lib/http";

const KIS_BASE_URL = process.env.KIS_BASE_URL;
const APP_KEY = process.env.KIS_APP_KEY;
const APP_SECRET = process.env.KIS_APP_SECRET;

/**
 * @description 한국투자증권 접근 토큰 발급
 */
export const issueKisToken = async () => {
  if (!KIS_BASE_URL || !APP_KEY || !APP_SECRET) {
    throw new Error("KIS 관련 환경변수(URL, APP_KEY, APP_SECRET)가 설정되지 않았습니다.");
  }

  const body = {
    grant_type: "client_credentials",
    appkey: APP_KEY,
    appsecret: APP_SECRET,
  };

  return jsonHttpClient.post<KisTokenResponse, typeof body>(`${KIS_BASE_URL}/oauth2/tokenP`, body);
};

/**
 * @description 한국투자증권 접근 토큰 폐기
 * @param token 폐기할 토큰
 */
export const revokeKisToken = async (token: string) => {
  if (!KIS_BASE_URL || !APP_KEY || !APP_SECRET) {
    throw new Error("KIS 관련 환경변수(URL, APP_KEY, APP_SECRET)가 설정되지 않았습니다.");
  }

  const body = {
    appkey: APP_KEY,
    appsecret: APP_SECRET,
    token: token,
  };

  return jsonHttpClient.post<KisRevokeResponse, typeof body>(`${KIS_BASE_URL}/oauth2/revokeP`, body);
};
