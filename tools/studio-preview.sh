#!/bin/bash
# 카드 미리보기(works/studio-gl/preview/<id>.mp4 · .jpg, 854×480, 30초)를 뽑는다. GPU 렌더 큐는 하나씩.
#   bash tools/studio-preview.sh <id> [<id> ...]
cd "$(dirname "$0")/.."
T=${TMPDIR:-/tmp}
for id in "$@"; do
  [ -f "works/studio-gl/preview/$id.mp4" ] && continue
  node tools/render-gl-video.mjs "http://localhost:4737/works/studio-gl/view.html?work=$id&capture=1&w=960&h=540&aa=1&sub=4&fps=24" "$T/pv-$id.mp4" 720 24 | tail -1
  ffmpeg -v error -y -i "$T/pv-$id.mp4" -an -vf scale=854:480:flags=lanczos -c:v libx264 -crf 30 -preset slow -pix_fmt yuv420p -movflags +faststart "works/studio-gl/preview/$id.mp4" &&
  ffmpeg -v error -y -ss 12 -i "works/studio-gl/preview/$id.mp4" -frames:v 1 -q:v 4 "works/studio-gl/preview/$id.jpg" && echo "preview $id"
  rm -f "$T/pv-$id.mp4"
done
