/**
 * Deterministic local audio fixtures, generated in memory (no binary files).
 *
 * Each frame is a valid MPEG-1 Layer III frame — 128 kbps, 44.1 kHz, mono —
 * with zeroed side info and main data, which every decoder renders as
 * silence. 1152 samples per frame ≈ 26.1 ms, 417 bytes per frame.
 */
const FRAME_BYTES = 417; // floor(144 * 128000 / 44100), no padding
const HEADER = [0xff, 0xfb, 0x90, 0xc0]; // sync · MPEG-1 · Layer III · no CRC · 128k · 44.1k · mono
const FRAMES_PER_SECOND = 44100 / 1152;

export function silentMp3(seconds: number): Buffer {
  const frames = Math.ceil(seconds * FRAMES_PER_SECOND);
  const buf = Buffer.alloc(frames * FRAME_BYTES);
  for (let i = 0; i < frames; i++) buf.set(HEADER, i * FRAME_BYTES);
  return buf;
}

/** A small VOD HLS playlist of packed-MP3 segments (hls.js demuxes these via MSE). */
export const HLS_SEGMENT_SECONDS = 4;
export const HLS_SEGMENTS = 6;

export function hlsPlaylist(): string {
  const lines = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    `#EXT-X-TARGETDURATION:${HLS_SEGMENT_SECONDS}`,
    '#EXT-X-MEDIA-SEQUENCE:0',
  ];
  for (let i = 0; i < HLS_SEGMENTS; i++) lines.push(`#EXTINF:${HLS_SEGMENT_SECONDS}.0,`, `seg${i}.mp3`);
  lines.push('#EXT-X-ENDLIST', '');
  return lines.join('\n');
}
