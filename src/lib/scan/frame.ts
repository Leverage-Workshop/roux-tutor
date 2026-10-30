// Reads one frame of the camera video: copies the middle of the picture
// (around the guide square) into a small canvas and looks for a side there.
import { findFace, SNAPSHOT_SIZE, type FaceRead } from "./grid";

/**
 * How much of the camera view the snapshot covers. The view shows the middle
 * square of the video (object-fit: cover); the snapshot is the middle 84% of
 * that, and the guide square the middle 70% (see GUIDE_IN_SNAPSHOT).
 */
export const SNAPSHOT_IN_VIEW = 0.84;
export const GUIDE_IN_VIEW = 0.7;

export function readFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): FaceRead | null {
  const width = video.videoWidth;
  const height = video.videoHeight;
  if (video.readyState < 2 || !width || !height) return null;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  canvas.width = SNAPSHOT_SIZE;
  canvas.height = SNAPSHOT_SIZE;
  const side = Math.min(width, height) * SNAPSHOT_IN_VIEW;
  ctx.drawImage(video, (width - side) / 2, (height - side) / 2, side, side, 0, 0, SNAPSHOT_SIZE, SNAPSHOT_SIZE);
  return findFace(ctx.getImageData(0, 0, SNAPSHOT_SIZE, SNAPSHOT_SIZE));
}
