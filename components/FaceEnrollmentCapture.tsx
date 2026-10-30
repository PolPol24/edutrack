"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, CircleCheck, LoaderCircle } from "lucide-react";

export type FaceCapture = {
  face_images: string[];
  face_real: number;
  face_live: number;
  blink_confirmed: boolean;
};

const captureFrameCount = 5;

function captureFrame(video: HTMLVideoElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context || canvas.width === 0 || canvas.height === 0) {
    throw new Error("Camera frame is unavailable. Check your camera and try again.");
  }
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.88);
}

export default function FaceEnrollmentCapture({ onCapture, buttonLabel = "Start face capture" }: { onCapture: (value: FaceCapture | null) => void; buttonLabel?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureRef = useRef(onCapture);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Center your face in the frame, then blink when prompted.");
  const [captured, setCaptured] = useState(false);

  useEffect(() => { captureRef.current = onCapture; }, [onCapture]);
  useEffect(() => () => { (videoRef.current?.srcObject as MediaStream | null)?.getTracks().forEach((track) => track.stop()); }, []);

  async function stop() {
    setRunning(false);
    const video = videoRef.current;
    if (video?.srcObject) (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
    if (video) video.srcObject = null;
  }

  async function start() {
    setLoading(true);
    setStatus("Loading the on-device liveness check…");
    let stream: MediaStream | undefined;
    try {
      const { default: Human } = await import("@vladmandic/human-browser");
      const human = new Human({
        modelBasePath: "/models/",
        warmup: "none",
        face: {
          enabled: true,
          detector: { rotation: true, maxDetected: 2 },
          mesh: { enabled: true },
          description: { enabled: false },
          iris: { enabled: true },
          emotion: { enabled: false },
          antispoof: { enabled: true },
          liveness: { enabled: true },
        },
        body: { enabled: false },
        hand: { enabled: false },
        object: { enabled: false },
        segmentation: { enabled: false },
        gesture: { enabled: true },
      });
      await human.load();
      await human.warmup();
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      const video = videoRef.current;
      if (!video) throw new Error("Camera preview is unavailable.");
      video.srcObject = stream;
      await video.play();
      setRunning(true);
      setStatus("Hold still, look at the camera, and blink once.");
      setLoading(false);
      let blinkConfirmed = false;
      const images: string[] = [];
      const quality: { real: number; live: number }[] = [];
      while (videoRef.current && videoRef.current.srcObject === stream) {
        const result = await human.detect(videoRef.current);
        const face = result.face?.[0];
        const blinkDetected = result.gesture?.some((gesture) => gesture.gesture.startsWith("blink ")) ?? false;
        if (!face || result.face.length !== 1) {
          images.length = 0;
          quality.length = 0;
          setStatus("Show one face, centered in the frame.");
        } else if ((face.real ?? 0) < 0.6 || (face.live ?? 0) < 0.6) {
          images.length = 0;
          quality.length = 0;
          setStatus("Face check is unclear. Improve the lighting and try again.");
        } else if (blinkDetected) {
          blinkConfirmed = true;
          images.length = 0;
          quality.length = 0;
          setStatus("Blink confirmed. Open your eyes and hold still for matching.");
        } else if (!blinkConfirmed) setStatus("Face detected. Blink once to confirm you are here.");
        else {
          images.push(captureFrame(videoRef.current));
          quality.push({ real: face.real ?? 0, live: face.live ?? 0 });
          if (images.length >= captureFrameCount) {
            captureRef.current({
              face_images: images,
              face_real: quality.reduce((sum, sample) => sum + sample.real, 0) / quality.length,
              face_live: quality.reduce((sum, sample) => sum + sample.live, 0) / quality.length,
              blink_confirmed: true,
            });
            setCaptured(true);
            setStatus("Face images captured for the local CompreFace service.");
            await stop();
            break;
          }
          setStatus(`Blink confirmed. Hold still for matching (${images.length}/${captureFrameCount}).`);
        }
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      setRunning(false);
      setStatus(error instanceof Error ? error.message : "Camera or face model could not start.");
      setLoading(false);
    }
  }

  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <video ref={videoRef} muted playsInline className={`${running ? "mb-3 block" : "hidden"} aspect-video w-full rounded-lg bg-slate-950 object-cover`} aria-label="Face enrollment camera" />
    <p className="text-sm text-slate-600">{status}</p>
    {captured ? <div className="mt-3 flex items-center gap-2 text-sm font-medium text-emerald-700"><CircleCheck size={17}/>Face enrollment ready</div> : <div className="mt-3 flex gap-2"><button type="button" disabled={loading || running} onClick={() => void start()} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{loading ? <><LoaderCircle size={16} className="animate-spin"/>Preparing camera…</> : <><Camera size={16}/>{buttonLabel}</>}</button>{running&&<button type="button" onClick={()=>{void stop();setStatus("Face capture stopped.");}} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">Stop camera</button>}</div>}
  </div>;
}
