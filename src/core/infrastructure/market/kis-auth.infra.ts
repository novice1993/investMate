import { getSupabaseClient } from "@/core/infrastructure/common/supabase.infra";
import { jsonHttpClient } from "@/shared/lib/http";
import { KisTokenResponse, KisRevokeResponse, KisApprovalResponse, KisTokenType, KisTokenRecord } from "./auth.type";

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

/**
 * @description 한국투자증권 WebSocket 접속키(Approval Key) 발급
 * @returns 286자 길이의 approval_key
 */
export const issueApprovalKey = async (): Promise<string> => {
  if (!KIS_BASE_URL || !APP_KEY || !APP_SECRET) {
    throw new Error("KIS 관련 환경변수(URL, APP_KEY, APP_SECRET)가 설정되지 않았습니다.");
  }

  const body = {
    grant_type: "client_credentials",
    appkey: APP_KEY,
    secretkey: APP_SECRET,
  };

  const response = await jsonHttpClient.post<KisApprovalResponse, typeof body>(`${KIS_BASE_URL}/oauth2/Approval`, body);

  if (!response || !response.approval_key) {
    throw new Error("Invalid response from KIS approval API.");
  }

  return response.approval_key;
};

/**
 * @description DB에서 KIS 토큰 조회
 * @param type 토큰 타입 ('access' 또는 'approval')
 * @returns 토큰 레코드 또는 null
 */
export const getKisTokenFromDB = async (type: KisTokenType): Promise<KisTokenRecord | null> => {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("kis_tokens").select("*").eq("type", type).single();

  if (error) {
    // PGRST116: 레코드가 없는 경우
    if (error.code === "PGRST116") {
      return null;
    }
    console.error(`[KIS Auth] DB 조회 실패 (type: ${type}):`, error);
    throw new Error(`KIS 토큰 조회 실패: ${error.message}`);
  }

  return data as KisTokenRecord;
};

/**
 * @description DB에 KIS 토큰 저장 (upsert)
 * @param type 토큰 타입
 * @param token 토큰 문자열
 * @param expiresAt 만료 시간
 */
export const saveKisTokenToDB = async (type: KisTokenType, token: string, expiresAt: Date): Promise<void> => {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("kis_tokens").upsert(
    {
      type,
      token,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "type",
    }
  );

  if (error) {
    console.error(`[KIS Auth] DB 저장 실패 (type: ${type}):`, error);
    throw new Error(`KIS 토큰 저장 실패: ${error.message}`);
  }

  console.log(`[KIS Auth] 토큰 저장 완료 (type: ${type}, expires: ${expiresAt.toISOString()})`);
};

/**
 * @description 토큰이 유효한지 확인
 * @param token 토큰 레코드
 * @returns 유효하면 true, 그렇지 않으면 false
 */
function isTokenValid(token: KisTokenRecord | null): boolean {
  if (!token) {
    return false;
  }
  return new Date(token.expires_at) > new Date();
}

/**
 * @description KIS API에서 새 Access Token 발급 후 DB에 저장
 * @returns 발급된 Access Token
 */
async function issueAndSaveNewAccessToken(): Promise<string> {
  console.log("[KIS Auth] 새 Access Token 발급 중...");

  const tokenResponse = await issueKisToken();

  if (!tokenResponse || !tokenResponse.access_token) {
    throw new Error("Invalid response from KIS token API.");
  }

  // 만료 시간 계산 (6시간 후)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 6);

  // DB에 저장
  await saveKisTokenToDB("access", tokenResponse.access_token, expiresAt);

  console.log(`[KIS Auth] Access Token 발급 완료 (expires: ${expiresAt.toISOString()})`);

  return tokenResponse.access_token;
}

/**
 * @description KIS API에서 새 Approval Key 발급 후 DB에 저장
 * @returns 발급된 Approval Key
 */
async function issueAndSaveNewApprovalKey(): Promise<string> {
  console.log("[KIS Auth] 새 Approval Key 발급 중...");

  const approvalKey = await issueApprovalKey();

  // Approval Key는 24시간 유효
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // DB에 저장
  await saveKisTokenToDB("approval", approvalKey, expiresAt);

  console.log(`[KIS Auth] Approval Key 발급 완료 (expires: ${expiresAt.toISOString()})`);

  return approvalKey;
}

/**
 * @description DB에서 유효한 Access Token을 가져오거나, 없으면 새로 발급
 *
 * 동작 순서:
 * 1. DB에서 토큰 조회
 * 2. 유효하면 반환
 * 3. 없거나 만료되었으면 새로 발급 후 저장
 *
 * @returns 유효한 Access Token
 */
export async function getOrRefreshKisToken(): Promise<string> {
  // 1. DB에서 기존 토큰 조회
  const dbToken = await getKisTokenFromDB("access");

  // 2. 유효성 확인
  if (isTokenValid(dbToken)) {
    console.log(`[KIS Auth] 기존 Access Token 사용 (만료: ${dbToken!.expires_at})`);
    return dbToken!.token;
  }

  // 3. 없거나 만료됨 → 새로 발급
  return await issueAndSaveNewAccessToken();
}

/**
 * @description DB에서 유효한 Approval Key를 가져오거나, 없으면 새로 발급
 *
 * 동작 순서:
 * 1. DB에서 Approval Key 조회
 * 2. 유효하면 반환
 * 3. 없거나 만료되었으면 새로 발급 후 저장
 *
 * @returns 유효한 Approval Key (WebSocket 인증용)
 */
export async function getOrRefreshApprovalKey(): Promise<string> {
  // 1. DB에서 기존 Approval Key 조회
  const dbToken = await getKisTokenFromDB("approval");

  // 2. 유효성 확인
  if (isTokenValid(dbToken)) {
    console.log(`[KIS Auth] 기존 Approval Key 사용 (만료: ${dbToken!.expires_at})`);
    return dbToken!.token;
  }

  // 3. 없거나 만료됨 → 새로 발급
  return await issueAndSaveNewApprovalKey();
}
