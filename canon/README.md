# 사이트 캐논 (정본)

이 폴더는 **오늘은 봄날 사이트가 무엇을 말해야 하는지**를 한 곳에 모아둔 것이다.
사이트 문구·메타태그·스키마·llms.txt는 전부 `canon.json`을 근거로 한다.

## 왜 만들었나

페이지가 늘어나면 같은 사실이 여러 파일에 흩어진다. 한 곳만 고치면 나머지가 옛말을 하고,
사람이 보는 화면과 AI가 읽는 `llms.txt`가 서로 다른 회사를 소개하게 된다.
실제로 이 사이트도 그런 상태였다 — 페이지는 "미디어파사드 설치·LED 패널"로 옮겨왔는데
`llms.txt`는 아직 "미디어박스 하드웨어 + SaaS"를 소개하고 있었다.

캐논은 그 어긋남을 막는다. **사실은 `canon.json`에만 있고, 나머지 파일은 그 사본이다.**

## 고칠 때 지켜야 할 순서

```
① canon/canon.json 을 먼저 고친다
② 그 사실이 들어가는 파일을 고친다 (아래 표)
③ node tools/check-canon.mjs 로 어긋난 곳이 없는지 확인한다
④ 통과하면 커밋한다
```

**②를 먼저 하고 ①을 잊는 것이 가장 흔한 사고다.** 검증기가 잡아준다.

## 무엇이 어디에 반영되는가

| canon.json의 항목 | 반영되는 곳 |
|---|---|
| `pages[].title` `.description` | 각 HTML의 `<title>`, `<meta name="description">`, og:title, og:description |
| `pages[]` 전체 | `sitemap.xml`, `llms.txt`의 주요 페이지 목록 |
| `identity` | 전 페이지 푸터, index.html의 Organization 스키마, `llms.txt` |
| `business.scopes` | index.html 사업영역 카드, 각 사업영역 페이지, Service 스키마, `llms.txt` |
| `business.method` | `/media-facade-content` 페이지, `llms.txt` |
| `signageTypes` | `/showcase` 페이지 카드, `llms.txt` |
| `keywords` | 각 페이지 `<meta name="keywords">`, 본문 문구 |
| `noindex` `crawlers` | `robots.txt` (그룹마다 반복해서 적어야 한다) |
| `artworks` | `/showcase`, index.html 새 작품 미리보기 |
| `terminology` | 표기 통일 (검증기가 경고를 낸다) |

## 도구

```bash
node tools/check-canon.mjs    # 캐논과 실제 파일이 어긋나는지 검사. 커밋 전에 항상.
node tools/build-works.mjs    # works/_source/ 원본 → works/ 고객 공개본 다시 생성
```

`check-canon.mjs`가 보는 것:

- 페이지마다 title·description·canonical이 캐논과 같은가
- og 태그가 다 있는가, h1이 정확히 하나인가
- JSON-LD가 파싱되는가, 갱신일이 있는가, 조직 노드를 참조하는가
- `sitemap.xml`이 캐논 페이지와 1:1인가 (빠진 것도, 캐논에 없는 것도 잡는다)
- `robots.txt`의 **모든** User-agent 그룹에 차단 목록이 반복돼 있는가
- `llms.txt`에 핵심 키워드와 모든 페이지 링크가 있는가
- 핵심 키워드가 실제 페이지 본문에 존재하는가
- 금지 표현이 없는가, 표기가 통일돼 있는가
- 작품 공개본이 보호 규칙(noindex·protect.js·주석 제거)을 지키는가

## 작품 코드 보호

`policies.codeProtection`에 규칙이 적혀 있다. 요약하면:

- 원본은 `works/_source/`에 두고 `.vercelignore`로 **배포에서 뺀다**. 깃에는 남고 웹에는 안 올라간다.
- 공개본 `works/*.html`은 `tools/build-works.mjs`가 만든다. **손으로 고치지 말 것.** 원본을 고치고 다시 빌드한다.
- 공개본은 `/showcase` 안에 iframe으로만 싣는다.
- `works/` 전체에 `X-Robots-Tag: noindex`와 `frame-ancestors 'self'`를 건다 (`vercel.json`).
- `works/protect.js`가 우클릭·드래그·소스보기 단축키를 막는다.

**한계를 분명히 해 둔다.** 브라우저로 보낸 코드는 원리상 완전히 감출 수 없다.
위 조치는 손쉬운 반출을 막는 데까지다. 완전한 보호가 필요한 작품은
코드를 보내지 말고 **4K 영상(mp4)만 납품**한다.

## 새 페이지를 더할 때

1. `canon.json`의 `pages[]`에 항목을 넣는다 (path, file, title, description, h1, primaryKeywords, sitemap).
2. HTML을 만든다. 기존 사업영역 페이지(`media-facade.html`)를 본으로 삼으면 된다.
   - head: title / description / canonical / og 4종 / JSON-LD
   - JSON-LD: WebPage + BreadcrumbList + (Service 또는 ItemList) + FAQPage + Organization 참조
   - 본문 첫 문단은 **정의부터** 쓴다. AI 검색은 문단 단위로 뽑아간다.
   - 소제목은 가급적 질문형으로 쓴다.
   - 검증 가능한 수치를 최소 2개 넣는다 (인증번호, 리드타임, 지역, 실적).
3. `sitemap.xml`과 `llms.txt`를 갱신한다.
4. `node tools/check-canon.mjs` 통과 확인.

## 사실을 바꿀 때 주의

`business.claimRules`에 적어 둔 대로, **캐논에 없는 수치·실적·사양은 페이지에 쓰지 않는다.**
특히 실적 표기는 `business.proof.referenceNote`를 지킨다 —
오늘은 봄날 명의의 납품 실적과 상상연필과 함께한 현장 레퍼런스는 구분해서 적는다.
이 구분을 지우면 공공 입찰에서 문제가 된다.
