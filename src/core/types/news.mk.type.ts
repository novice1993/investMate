// 매경 사이트맵 XML 파싱을 위한 타입 정의

// 1. 반복되는 url 요소에 대한 타입 정의
export interface MkSitemapUrl {
  loc: string;
  "news:news": {
    "news:publication": {
      "news:name": string;
      "news:language": string;
    };
    "news:publication_date": string;
    "news:title": string;
    "news:keywords": string;
  };
  "image:image"?: {
    "image:loc": string;
  };
}

// 2. 전체 사이트맵 구조에 대한 타입 정의
export interface MkSitemap {
  "?xml": string;
  urlset: {
    url: MkSitemapUrl[];
  };
}
