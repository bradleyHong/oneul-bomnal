/**
 * 오늘은 봄날 TV 작품 목록.
 *
 * 한 줄이 한 작품이다. tools/tv-upload.py 가 비메오에 올린 뒤 붙일 줄을 찍어 준다.
 *
 *   vimeo  비메오 영상 번호. publicbloom.art 에서만 재생되도록 잠가 둔 영상이어야 한다
 *   file   또는 우리 사이트에 둔 mp4 (/assets/tv/). 비메오 없이 TV가 바로 튼다. 1080p · 15초 루프
 *   id     ?w=<id> 로 그 작품을 바로 틀어 볼 때 쓰는 이름 (시험·시연용)
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
  // 2026-10-23 · 클링 15초 루프, 사이트 파일로
  { id: "light-jellyfish", file: "/assets/tv/light-jellyfish.mp4", title: "빛의 해파리", kind: "ai", ratio: "16:9" },
  { id: "glass-hand", file: "/assets/tv/glass-hand.mp4", title: "유리 너머의 봄 · 손", kind: "ai", ratio: "16:9" },
  { id: "sea-window", file: "/assets/tv/sea-window.mp4", title: "바다로 난 창", kind: "ai", ratio: "16:9" },
  { id: "glass-bird", file: "/assets/tv/glass-bird.mp4", title: "유리 너머의 봄 · 새", kind: "ai", ratio: "16:9" },
  { id: "moon-theater", file: "/assets/tv/moon-theater.mp4", title: "달의 극장", kind: "ai", ratio: "16:9" },
  { id: "glass-fish", file: "/assets/tv/glass-fish.mp4", title: "유리 너머의 봄 · 물고기", kind: "ai", ratio: "16:9" },
  { id: "room-of-eyes", file: "/assets/tv/room-of-eyes.mp4", title: "눈의 방", kind: "ai", ratio: "16:9" },
  { id: "glass-vine", file: "/assets/tv/glass-vine.mp4", title: "유리 너머의 봄 · 덩굴", kind: "ai", ratio: "16:9" },
  { id: "sunken-city", file: "/assets/tv/sunken-city.mp4", title: "가라앉은 도시", kind: "ai", ratio: "16:9" },
  { id: "glass-leaf", file: "/assets/tv/glass-leaf.mp4", title: "유리 너머의 봄 · 잎", kind: "ai", ratio: "16:9" },
  { id: "thermal-crowd", file: "/assets/tv/thermal-crowd.mp4", title: "열화상 군중", kind: "ai", ratio: "16:9" },
  { id: "xray-tulip", file: "/assets/tv/xray-tulip.mp4", title: "투시 튤립", kind: "ai", ratio: "16:9" },
];
