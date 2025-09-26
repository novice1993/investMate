/**
 * Date 객체를 한국 시간 기준의 특정 문자열 포맷으로 변환합니다.
 * @param date - 변환할 Date 객체 또는 날짜 문자열
 * @returns 'YYYY. MM. DD (요일)' 형식의 문자열 (예: '2025. 09. 26 (금)')
 */
export function formatDateToKorean(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  // Intl.DateTimeFormat을 사용하여 한국 시간 기준으로 포맷팅
  // 'ko-KR' 로케일은 'YYYY. MM. DD. (요일)' 형식을 기본으로 하므로, 마지막 '.'을 제거합니다.
  return dateObj
    .toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    })
    .replace(/\.$/, ""); // 마지막에 오는 점(.) 제거
}
