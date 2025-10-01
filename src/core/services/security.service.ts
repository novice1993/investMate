import { Security } from "@/core/entities/security.entity";
import { securityRepository, SecurityRepository } from "@/core/infrastructure/security.infra";

/**
 * 금융 상품 관련 비즈니스 로직을 처리하는 서비스 인터페이스입니다.
 * 리포지토리를 통해 데이터를 조회하고 가공하는 역할을 수행합니다.
 */
export interface SecurityService {
  /**
   * 주어진 종목 코드를 사용하여 금융 상품 정보를 조회합니다.
   * @param symbol 조회할 종목 코드 (예: 'AAPL', '005930.KS')
   * @returns Security 객체 또는 null
   */
  getSecurityBySymbol(symbol: string): Promise<Security | null>;

  // 향후 추가될 메서드들 (예: getHistoricalData, getTrendingSecurities 등)
}

/**
 * SecurityService 인터페이스의 구현체입니다.
 * securityRepository를 사용하여 데이터를 조회합니다.
 */
export const securityService: SecurityService = {
  getSecurityBySymbol: async (symbol: string): Promise<Security | null> => {
    // 여기에서 추가적인 비즈니스 로직 (예: 캐싱, 데이터 유효성 검사 등)을 구현할 수 있습니다.
    const security = await securityRepository.findBySymbol(symbol);
    return security;
  },
};
