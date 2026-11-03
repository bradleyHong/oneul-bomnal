// 녹화한 영상을 끊김 없는 반복 영상으로 만든다 (끝 F초를 처음 F초에 겹쳐 녹인다).
//   node tools/loop-clip.mjs <입력.mp4> <출력.mp4> [겹칠 초=2] [가로 최대=0(그대로)]
// 22초를 녹화해 2초를 겹치면 20초 반복 영상이 된다. 마지막 장이 입력의 F초 장면이라
// 다시 처음(입력 F초)으로 돌아갈 때 이음매가 없다. CRF(기본 23)로 크기를 맞춘다.
import { execFileSync } from "node:child_process";
const [inp, out, fArg, wArg] = process.argv.slice(2);
const F = +(fArg || 2), MAXW = +(wArg || 0);
const L = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", inp]).toString().trim();
const scale = MAXW ? `,scale='min(${MAXW},iw)':-2` : ",scale=trunc(iw/2)*2:trunc(ih/2)*2";
const fc = `[0:v]split[a][b];[a]trim=start=${F},setpts=PTS-STARTPTS[m];[b]trim=0:${F},setpts=PTS-STARTPTS[h];` +
  `[m][h]xfade=transition=fade:duration=${F}:offset=${(L - 2 * F).toFixed(3)}${scale},format=yuv420p[v]`;
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", inp, "-filter_complex", fc, "-map", "[v]",
  "-c:v", "libx264", "-preset", "slow", "-crf", process.env.CRF || "23", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out], { stdio: "inherit" });
console.log("loop", out, (L - F).toFixed(2) + "s");
