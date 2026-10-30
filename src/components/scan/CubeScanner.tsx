"use client";
// Live cube scan: the user turns the cube in front of the rear camera, and
// each side is captured on its own once it is held steady inside the guide
// square. When all six are in, the scan opens the facelet editor with its
// guesses, for the user to check and correct (see src/lib/scan/).
import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { assembleCube } from "@/lib/scan/assemble";
import { rgbCss } from "@/lib/scan/color";
import { readFrame, GUIDE_IN_VIEW, SNAPSHOT_IN_VIEW } from "@/lib/scan/frame";
import { SNAPSHOT_SIZE, type FaceRead, type Point } from "@/lib/scan/grid";
import { ScanTracker, type CapturedSide, type TrackerEvent } from "@/lib/scan/tracker";

/** Time between analyzed frames. */
const FRAME_MS = 160;

type Camera = "starting" | "live" | "blocked" | "unavailable";

export function CubeScanner() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tracker] = useState(() => new ScanTracker());
  const [camera, setCamera] = useState<Camera>("starting");
  const [mirrored, setMirrored] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sides, setSides] = useState<CapturedSide[]>([]);
  const [read, setRead] = useState<FaceRead | null>(null);
  const [event, setEvent] = useState<TrackerEvent>({ kind: "searching" });
  /** The side captured during the current steady view, so it reads "Got it", not "already". */
  const [latest, setLatest] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  const finish = useEffectEvent((all: CapturedSide[]) => {
    setDone(true);
    const { draft } = assembleCube(all.map((s) => s.lab));
    router.push(`/enter?cube=${draft}`);
  });

  useEffect(() => {
    if (done) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (stopped || !video || !canvas) return;
      const frame = readFrame(video, canvas);
      const next = tracker.push(frame);
      setRead(frame);
      setEvent(next);
      if (next.kind === "searching" || (next.kind === "steadying" && next.steady < 1)) setLatest(null);
      if (next.kind === "captured") {
        navigator.vibrate?.(30);
        setLatest(next.side.id);
        const all = [...tracker.sides];
        setSides(all);
        if (all.length === 6) {
          stopped = true;
          finish(all);
          return;
        }
      }
      timer = setTimeout(tick, FRAME_MS);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamera("unavailable");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
        });
      } catch (error) {
        const name = error instanceof Error ? error.name : "";
        setCamera(name === "NotAllowedError" || name === "SecurityError" ? "blocked" : "unavailable");
        return;
      }
      if (stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      setMirrored(stream.getVideoTracks()[0]?.getSettings().facingMode === "user");
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          // Autoplay of a muted inline video is allowed; if it still fails, the frames stay empty.
        }
      }
      setCamera("live");
      timer = setTimeout(tick, FRAME_MS);
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [attempt, done, tracker]);

  const rescan = (id: number) => {
    tracker.remove(id);
    setSides([...tracker.sides]);
    setLatest(null);
  };

  const already = event.kind === "already" && event.id !== latest ? event.id : null;
  const status = done
    ? "All 6 sides scanned. Opening them for you to check…"
    : camera === "starting"
      ? "Starting the camera…"
      : event.kind === "captured" || (event.kind === "already" && event.id === latest)
        ? sides.length === 6
          ? "Got all 6 sides!"
          : `Got it! ${sides.length} of 6. Turn the cube to show another side.`
        : already !== null
          ? "You already scanned this side. Show another one."
          : event.kind === "steadying"
            ? "Hold still…"
            : sides.length === 0
              ? "Hold one side of the cube inside the square."
              : `${sides.length} of 6 sides scanned. Show the next side.`;

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pt-2 [@media(max-height:640px)]:gap-2"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <header className="flex min-h-12 items-center justify-between gap-2">
        <Link href="/" className="flex min-h-11 items-center font-semibold">
          Roux Tutor
        </Link>
        <h1 className="text-base font-semibold text-zinc-600 dark:text-zinc-400">Scan your cube</h1>
      </header>

      {camera === "blocked" || camera === "unavailable" ? (
        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">{camera === "blocked" ? "Camera access is off" : "No camera available"}</h2>
          <p className="text-zinc-700 dark:text-zinc-300">
            {camera === "blocked"
              ? "To scan your cube, allow this site to use the camera in your browser's settings, then try again. Or tap in the colors yourself."
              : "This browser or device can't open a camera here. You can tap in your cube's colors instead."}
          </p>
          {camera === "blocked" && (
            <button
              type="button"
              onClick={() => {
                setCamera("starting");
                setAttempt((a) => a + 1);
              }}
              className="h-12 rounded-2xl border border-zinc-300 font-semibold dark:border-zinc-700"
            >
              Try again
            </button>
          )}
          <Link
            href="/enter"
            className="flex h-12 items-center justify-center rounded-2xl bg-foreground font-semibold text-background"
          >
            Enter colors by hand
          </Link>
        </section>
      ) : (
        <>
          <div
            className="relative mx-auto aspect-square overflow-hidden rounded-2xl bg-zinc-900"
            style={{ width: "min(100%, 100dvh - 20.5rem)" }}
          >
            <div className={`absolute inset-0 ${mirrored ? "-scale-x-100" : ""}`}>
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                aria-label="Camera view"
                className="absolute inset-0 size-full object-cover"
              />
              <Overlay read={camera === "live" ? read : null} event={event} latest={latest} />
            </div>
          </div>
          <canvas ref={canvasRef} hidden />

          <p role="status" className="min-h-12 text-center text-base font-medium">
            {status}
          </p>

          <ol aria-label="Scanned sides" className="grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }, (_, k) => {
              const side = sides[k];
              if (!side) {
                return (
                  <li key={`empty-${k}`} aria-label={`Side ${k + 1}: not scanned yet`}>
                    <span className="block aspect-square rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-700" />
                  </li>
                );
              }
              const flash = side.id === already || side.id === latest;
              return (
                <li key={side.id}>
                  <button
                    type="button"
                    onClick={() => rescan(side.id)}
                    disabled={done}
                    aria-label={`Side ${k + 1}: scanned. Tap to scan it again`}
                    className={`grid aspect-square w-full grid-cols-3 gap-px rounded-lg bg-zinc-900 p-0.5 transition-shadow ${
                      flash ? "ring-4 ring-emerald-500" : ""
                    }`}
                  >
                    {side.rgb.map((c, i) => (
                      <span key={i} className="rounded-[2px]" style={{ backgroundColor: rgbCss(c) }} />
                    ))}
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
            Show the sides in any order, any way up. Tap a scanned side to redo it.
          </p>

          <div className="mt-auto">
            <Link
              href="/enter"
              className="flex h-12 items-center justify-center rounded-2xl border border-zinc-300 font-semibold dark:border-zinc-700"
            >
              Enter colors by hand
            </Link>
          </div>
        </>
      )}
    </main>
  );
}

const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** The guide square, and the grid found in the last frame with the colors read. */
function Overlay({ read, event, latest }: { read: FaceRead | null; event: TrackerEvent; latest: number | null }) {
  // The SVG covers the snapshot area, in snapshot pixels.
  const inset = `${((1 - SNAPSHOT_IN_VIEW) / 2) * 100}%`;
  const guide = (SNAPSHOT_SIZE * GUIDE_IN_VIEW) / SNAPSHOT_IN_VIEW;
  const g0 = (SNAPSHOT_SIZE - guide) / 2;
  const g1 = g0 + guide;
  const arm = guide * 0.16;
  const good = event.kind === "captured" || (event.kind === "already" && event.id === latest);
  const tone = good ? "#10b981" : event.kind === "steadying" ? "#fbbf24" : "#ffffff";
  const brackets = [
    `M${g0} ${g0 + arm}V${g0}H${g0 + arm}`,
    `M${g1 - arm} ${g0}H${g1}V${g0 + arm}`,
    `M${g1} ${g1 - arm}V${g1}H${g1 - arm}`,
    `M${g0 + arm} ${g1}H${g0}V${g1 - arm}`,
  ];
  let grid = null;
  if (read) {
    const [tl, tr, br, bl] = read.corners;
    const at = (u: number, v: number) => lerp(lerp(tl, tr, u), lerp(bl, br, u), v);
    const lines = [1 / 3, 2 / 3].flatMap((t) => [
      [at(t, 0), at(t, 1)],
      [at(0, t), at(1, t)],
    ]);
    grid = (
      <g>
        <polygon
          points={read.corners.map((p) => `${p.x},${p.y}`).join(" ")}
          fill="none"
          stroke={tone}
          strokeWidth={1.2}
        />
        {lines.map(([a, b], i) => (
          <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={tone} strokeWidth={0.6} strokeOpacity={0.7} />
        ))}
        {read.rgb.map((c, i) => {
          const p = at(((i % 3) + 0.5) / 3, (Math.floor(i / 3) + 0.5) / 3);
          return <circle key={i} cx={p.x} cy={p.y} r={3.2} fill={rgbCss(c)} stroke="#000" strokeWidth={0.6} />;
        })}
      </g>
    );
  }
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${SNAPSHOT_SIZE} ${SNAPSHOT_SIZE}`}
      className="absolute"
      style={{ inset }}
    >
      {brackets.map((d) => (
        <path key={d} d={d} fill="none" stroke={tone} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {grid}
    </svg>
  );
}
