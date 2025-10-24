/**
 * @fileoverview Cron job 환경별 실행 제어 유틸리티
 */

/**
 * 환경 변수 기반으로 cron job 실행 여부 판단
 * @param jobName Cron job 이름 (예: "news-collection")
 * @param envKey 환경 변수 키 (예: "ENABLE_NEWS_COLLECTION_CRON")
 * @returns true면 실행 가능, false면 스킵
 */
export function shouldRunCronJob(jobName: string, envKey: string): boolean {
  const isEnabled = process.env[envKey] !== "false";

  if (!isEnabled) {
    console.log(`[Cron ${jobName}] Disabled by environment variable (${envKey}=false)`);
  }

  return isEnabled;
}
