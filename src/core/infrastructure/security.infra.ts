import { Security } from "@/core/entities/security.entity";
import { KrxSecurityRepository } from "./_security.krx.infra";
import { YfinanceSecurityRepository } from "./_security.yfinance.infra";

/**
 * 금융 상품 데이터에 접근하기 위한 리포지토리 인터페이스입니다.
 * 특정 데이터 소스에 의존하지 않는 계약을 정의합니다.
 */
export interface SecurityRepository {
  /**
   * 주어진 종목 코드를 사용하여 개별 금융 상품의 상세 정보를 조회합니다.
   * @param symbol 조회할 종목 코드 (예: 'AAPL', '005930.KS')
   * @returns Security 객체 또는 null
   */
  findBySymbol(symbol: string): Promise<Security | null>;

  /**
   * 특정 시장의 전체 종목 목록 및 개요 정보를 조회합니다.
   * @param market 조회할 시장 (예: 'KOSPI', 'KOSDAQ')
   * @returns 지정된 시장의 Security 객체 일부 정보를 담은 배열
   */
  findManyByMarket(market: "KOSPI" | "KOSDAQ"): Promise<Partial<Security>[]>;
}

// 실제 구현체들을 조합하여 SecurityRepository 인터페이스를 만족하는 단일 객체를 생성합니다.
// 이를 통해 외부에서는 데이터 소스가 무엇인지 알 필요 없이 일관된 방식으로 데이터에 접근할 수 있습니다.
export const securityRepository: SecurityRepository = {
  /**
   * 개별 종목 상세 정보는 yfinance에서 가져옵니다.
   */
  findBySymbol: YfinanceSecurityRepository.findBySymbol,

  /**
   * 시장 전체 목록은 KRX에서 가져옵니다.
   */
  findManyByMarket: KrxSecurityRepository.getMarketSecurities,
};
