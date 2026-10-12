/**
 * 오늘은 봄날 TV 작품 목록.
 *
 * 한 줄이 한 작품이다. tools/tv-upload.py 가 비메오에 올린 뒤 붙일 줄을 찍어 준다.
 *
 *   vimeo  비메오 영상 번호. publicbloom.art 에서만 재생되도록 잠가 둔 영상이어야 한다
 *   title  화면 구석에 아주 작게, 진단 화면에 크게 나오는 이름
 *   kind   "code" 코드로 그린 작품 · "ai" AI 로 만든 영상
 *          스튜디오에 "코드로 직접 그렸다"고 적어 둔 만큼 AI 영상은 따로 표시한다
 *   ratio  "16:9" 가로 · "9:16" 세로. 손님 화면 방향에 맞는 것만 고른다
 *
 * 순서가 곧 편성표다. 날짜마다 다음 줄로 넘어가고, 끝에 닿으면 처음으로 돈다.
 * 작품을 빼면 그 뒤 날짜의 편성이 하루씩 당겨진다. 바꾸고 싶으면 맨 끝에 붙인다.
 */
export const LIBRARY = [
  { vimeo: "1234918142", title: "永流 Eternal Flow", kind: "code", ratio: "16:9" },
  { vimeo: "1234918711", title: "노을 비단", kind: "code", ratio: "16:9" },
  { vimeo: "1234918739", title: "금빛 나선", kind: "code", ratio: "16:9" },
  { vimeo: "1234918760", title: "흰 민들레", kind: "code", ratio: "16:9" },
  { vimeo: "1234918778", title: "빛의 붓결", kind: "code", ratio: "16:9" },
];
