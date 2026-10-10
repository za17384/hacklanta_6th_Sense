import type { FrameSource } from "./types";

/** Live camera. Frames stay in this <video> element; nothing is uploaded or recorded. */
export class CameraSource implements FrameSource {
  readonly kind = "camera" as const;
  private stream: MediaStream | null = null;
  constructor(private facingMode: "user" | "environment" = "user") {}

  async start(video: HTMLVideoElement) {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Camera needs HTTPS (or localhost). Open the https:// site or use video-file mode.");
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: this.facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    video.srcObject = this.stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
  }

  stop() {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}

/** Uploaded clip, processed locally through the same pipeline (pull-up demos, repeatable tests). */
export class VideoFileSource implements FrameSource {
  readonly kind = "video_file" as const;
  private url: string | null = null;
  private video: HTMLVideoElement | null = null;
  constructor(private file: File) {}

  async start(video: HTMLVideoElement) {
    this.url = URL.createObjectURL(this.file);
    this.video = video;
    video.srcObject = null;
    video.src = this.url;
    video.muted = true;
    video.playsInline = true;
    video.loop = false;
    await video.play();
  }

  ended() { return !!this.video?.ended; }

  stop() {
    this.video?.pause();
    if (this.video) this.video.removeAttribute("src");
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
  }
}
