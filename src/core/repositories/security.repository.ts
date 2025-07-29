import { Security } from "@/core/entities/security.entity";
import { YfinanceSecurityRepository } from "./_security.yfinance.repository";

/**
 * 금융 상품 데이터에 접근하기 위한 리포지토리 인터페이스입니다.
 * 특정 데이터 소스에 의존하지 않는 계약을 정의합니다.
 */
export interface SecurityRepository {
  /**
   * 주어진 종목 코드를 사용하여 금융 상품 정보를 조회합니다.
   * @param symbol 조회할 종목 코드 (예: 'AAPL', '005930.KS')
   * @returns Security 객체 또는 null
   */
  findBySymbol(symbol: string): Promise<Security | null>;

  // 향후 추가될 메서드들 (예: findHistoricalData, searchSecurities 등)
}

// 기본 YfinanceSecurityRepository 구현체를 사용하는 인스턴스
// 이 인스턴스를 통해 외부에서는 SecurityRepository 인터페이스만 바라보게 됩니다.
export const securityRepository: SecurityRepository = YfinanceSecurityRepository;
