# Cron Job Schedule

## 평일 (월-금) 스케줄

| 시간  | Job                | 설명                    | 환경변수                         |
| ----- | ------------------ | ----------------------- | -------------------------------- |
| 05:55 | kospi-mapping-sync | KOSPI 종목 매핑 동기화  | `ENABLE_KOSPI_MAPPING_SYNC_CRON` |
| 16:00 | stock-valuation    | PER/PBR 밸류에이션 수집 | `ENABLE_STOCK_VALUATION_CRON`    |
| 16:30 | daily-prices       | 일봉 데이터 수집        | `ENABLE_DAILY_PRICES_CRON`       |
| 17:00 | signal-screening   | 시그널 스크리닝         | `ENABLE_SIGNAL_SCREENING_CRON`   |

## 매일 스케줄

| 시간         | Job               | 설명           | 환경변수                        |
| ------------ | ----------------- | -------------- | ------------------------------- |
| 06:55, 18:55 | financial-metrics | 재무 지표 수집 | `ENABLE_FINANCIAL_METRICS_CRON` |
| 매시간 30분  | news-collection   | 뉴스 수집      | `ENABLE_NEWS_COLLECTION_CRON`   |

## Cron Expression 참고

| Job                | Schedule        | 설명              |
| ------------------ | --------------- | ----------------- |
| kospi-mapping-sync | `55 5 * * 1-5`  | 평일 05:55        |
| financial-metrics  | `55 6,18 * * *` | 매일 06:55, 18:55 |
| stock-valuation    | `0 16 * * 1-5`  | 평일 16:00        |
| daily-prices       | `30 16 * * 1-5` | 평일 16:30        |
| signal-screening   | `0 17 * * 1-5`  | 평일 17:00        |
| news-collection    | `30 * * * *`    | 매시간 30분       |

## 실행 순서 (평일 기준)

```
05:55  kospi-mapping-sync   ─┐
06:55  financial-metrics    ─┤ 장 시작 전 데이터 준비
                             │
       ... 장 운영 중 ...     │
                             │
16:00  stock-valuation      ─┤ 장 마감 후 데이터 수집
16:30  daily-prices         ─┤
17:00  signal-screening     ─┘ 스크리닝 실행
18:55  financial-metrics       재무 지표 2차 수집
```

## 환경변수로 개별 비활성화

`.env` 파일에서 특정 Job 비활성화 가능:

```bash
ENABLE_KOSPI_MAPPING_SYNC_CRON=false
ENABLE_FINANCIAL_METRICS_CRON=false
ENABLE_STOCK_VALUATION_CRON=false
ENABLE_DAILY_PRICES_CRON=false
ENABLE_SIGNAL_SCREENING_CRON=false
ENABLE_NEWS_COLLECTION_CRON=false
```

전체 Cron 비활성화:

```bash
CRON_ENABLED=false
```
