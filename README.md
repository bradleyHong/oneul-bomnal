# 오늘은 봄날

대구 여성기업 오늘은 봄날의 미디어아트 하드웨어·콘텐츠 공급 사이트입니다.

정적 HTML/CSS/JavaScript로 구성되어 있으며, 대구 날씨와 미세먼지 데이터를 활용한 공개 미디어아트 자료를 포함합니다. Vercel에 배포되고 로그인·문의 접수만 서버리스 함수(`api/`)로 처리합니다.

## 사이트 캐논 (문구·SEO의 정본)

회사 소개 문구, 사업영역, 키워드, 페이지 목록, 작품 보호 규칙은 모두
[`canon/canon.json`](canon/canon.json) 한 곳에 있습니다. 페이지 문구를 고칠 때는
**캐논을 먼저 고치고** 그 다음 파일을 맞춘 뒤 검증기를 돌립니다.

```bash
node tools/check-canon.mjs    # 캐논과 실제 파일이 어긋나는지 검사 (커밋 전 필수)
node tools/build-works.mjs    # 작품 원본 → 고객 공개본 다시 생성
node tools/build-deck.js      # 캐논 → 영업용 회사소개서 (docs/오늘은봄날_회사소개서.pptx)
```

회사소개서도 같은 캐논에서 나옵니다. 회사 정보나 사업영역이 바뀌면 캐논을 고치고
`node tools/build-deck.js`로 다시 뽑으면 홈페이지와 소개서가 어긋나지 않습니다.
(PDF가 필요하면 파워포인트에서 내보내기 하시면 됩니다.)

자세한 사용법은 [`canon/README.md`](canon/README.md)에 있습니다.

## 작품 코드 보호

작품 원본은 `works/_source/`에 두고 `.vercelignore`로 배포에서 제외합니다.
웹에 올라가는 것은 주석을 걷어내고 조작 패널을 감춘 공개본(`works/*.html`)뿐이며,
`/showcase` 페이지 안에 iframe으로만 실립니다. `works/` 전체에 `noindex`와
`frame-ancestors 'self'`가 걸려 있어 검색에 잡히지도, 외부 사이트에 퍼가지지도 않습니다.

다만 **브라우저로 보낸 코드는 원리상 완전히 감출 수 없습니다.** 위 조치는 손쉬운 반출을
막는 데까지입니다. 완전한 보호가 필요한 작품은 코드를 보내지 말고 4K 영상(mp4)만 납품합니다.

## 문의 접수 경로

담당자가 "보냈다"고 생각했는데 아무 데도 도착하지 않는 상황을 막기 위해 세 겹으로 받습니다.

1. `inquiry.js`가 `/api/inquiry`로 보냅니다.
2. 그게 실패하면 폼을 원래 주소(formsubmit.co)로 그대로 제출합니다.
3. 그것도 막히면 메일 앱을 열어 내용을 채워 줍니다.

`/api/inquiry`는 **메일 발송에 실패하더라도 접수 내용을 항상 서버 로그에 남깁니다.**
Vercel 대시보드 → 프로젝트 → Logs 에서 `[inquiry]`로 검색하면 언제 누가 무엇을
보냈는지 복구할 수 있습니다. 자바스크립트가 꺼진 브라우저는 폼의 `action`대로
formsubmit.co에 직접 제출되므로 그대로 동작합니다.

### 환경변수

하나도 설정하지 않아도 동작합니다. 기본값은 formsubmit.co로 전달하는 것입니다.

| 변수 | 용도 |
|---|---|
| `RESEND_API_KEY` | 있으면 [Resend](https://resend.com)로 직접 발송합니다. 아래 둘과 함께 설정해야 동작합니다. |
| `INQUIRY_FROM` | 발신 주소. Resend에서 인증한 도메인의 주소여야 합니다. 예: `noreply@publicbloom.art` |
| `INQUIRY_TO` | 수신 주소. 예: `studio@publicbloom.art` |
| `INQUIRY_FORWARD_URL` | Resend를 쓰지 않을 때 전달할 주소. 기본값은 formsubmit.co의 AJAX 엔드포인트입니다. |
| `AUTH_SECRET` `ADMIN_ID` `ADMIN_PW_HASH` | 관제 프로그램 로그인용 (`tools/hash-password.mjs`로 해시 생성) |

**formsubmit.co를 쓰는 경우 최초 1회 활성화가 필요합니다.** 첫 제출이 들어가면
수신 주소로 확인 메일이 오는데, 그 안의 링크를 눌러야 그때부터 전달이 시작됩니다.
누르지 않으면 접수는 되지만 메일은 오지 않습니다(로그에는 남습니다).

## 로컬에서 보기

정적 파일만 확인할 때:

```bash
python3 -m http.server 8000
```

문의 접수까지 확인하려면 서버리스 함수가 필요하므로 `vercel dev`를 씁니다.
