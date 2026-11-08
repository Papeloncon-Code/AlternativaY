#!/usr/bin/env bash
# Genera el vídeo de prueba PROPIO del proyecto (patrón de prueba + tono), sin contenido de terceros.
# 30 s, 640x360, H.264 + AAC, keyframe cada 2 s y "faststart" para empezar a reproducir antes de descargarlo entero.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p fixtures
if [ ! -s fixtures/test-video.mp4 ]; then
  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "testsrc2=size=640x360:rate=30:duration=30" \
    -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=30" \
    -c:v libx264 -preset veryfast -pix_fmt yuv420p -g 60 -keyint_min 60 -b:v 1500k \
    -c:a aac -b:a 96k -movflags +faststart -shortest fixtures/test-video.mp4
fi
# Misma prueba en WebM (VP9 + Opus): códecs libres, para navegadores sin H.264 (p. ej. el Chromium de las pruebas).
if [ ! -s fixtures/test-video.webm ]; then
  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "testsrc2=size=640x360:rate=30:duration=30" \
    -f lavfi -i "sine=frequency=440:sample_rate=48000:duration=30" \
    -c:v libvpx-vp9 -b:v 800k -deadline realtime -cpu-used 8 -g 60 -c:a libopus -b:a 64k -shortest fixtures/test-video.webm
fi
# DASH (manifiesto + un archivo por pista con rangos de bytes): así Shaka pide cada trozo con fetch + Range, como el reproductor real.
if [ ! -s fixtures/test-dash.mpd ]; then
  ffmpeg -hide_banner -loglevel error -y -i fixtures/test-video.mp4 -map 0:v -map 0:a -c copy -f dash \
    -single_file 1 -single_file_name 'dash-$RepresentationID$.mp4' -use_template 0 -use_timeline 0 fixtures/test-dash.mpd
fi
ls -l fixtures/
sha256sum fixtures/*
