export interface RSSSource {
  id: string;
  name: string;
  url: string;
  category: "경제일반" | "증권" | "부동산" | "글로벌";
  priority: number;
  active: boolean;
}

export const RSS_SOURCES: RSSSource[] = [
  {
    id: "mk-stock",
    name: "매일경제 증권",
    url: "https://mk.co.kr/rss/50200011/",
    category: "증권",
    priority: 1,
    active: true,
  },
  {
    id: "hankyung-economy",
    name: "한국경제 경제",
    url: "https://www.hankyung.com/feed/economy",
    category: "경제일반",
    priority: 1,
    active: true,
  },
  {
    id: "hankyung-finance",
    name: "한국경제 증권",
    url: "https://www.hankyung.com/feed/finance",
    category: "증권",
    priority: 1,
    active: true,
  },
  {
    id: "chosun",
    name: "조선비즈",
    url: "https://biz.chosun.com/rss/biz.xml",
    category: "경제일반",
    priority: 2,
    active: true,
  },
];

export function getRSSSourceById(id: string): RSSSource | undefined {
  return RSS_SOURCES.find((source) => source.id === id);
}

export function getActiveRSSSources(): RSSSource[] {
  return RSS_SOURCES.filter((source) => source.active);
}
