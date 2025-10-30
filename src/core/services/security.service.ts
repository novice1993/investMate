import { Security } from "@/core/entities/security.entity";
import { findSecurityBySymbol } from "@/core/infrastructure/security-yfinance.infra";

/**
 * 주어진 종목 코드를 사용하여 금융 상품 정보를 조회합니다.
 * @param symbol 조회할 종목 코드 (예: 'AAPL', '005930.KS')
 * @returns Security 객체 또는 null
 */
export async function getSecurityBySymbol(symbol: string): Promise<Security | null> {
  // 여기에서 추가적인 비즈니스 로직 (예: 캐싱, 데이터 유효성 검사 등)을 구현할 수 있습니다.
  const security = await findSecurityBySymbol(symbol);
  return security;
}
