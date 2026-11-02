"use client";
// 3D cube: 27 cubelets colored from the cube store, drag to look around
// (drei OrbitControls), an animated layer turn for each Next / Back, and a
// button that turns the view back to the starting angle.
// Loaded lazily by CubeView (three.js is large), browser only.
//
// The canvas only draws when something changes (frameloop="demand"): while a
// turn plays, useFrame keeps asking for the next frame; otherwise it idles.
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { useCubeStoreApi } from "@/lib/cube/CubeStoreProvider";
import {
  CUBELETS,
  STICKERS,
  isInTurn,
  turnAngle,
  turnSpec,
  type Axis,
  type Sticker,
  type Vec3,
} from "@/lib/cube/geometry";
import { FACES, FACE_COLOR, STICKER_HEX, type Face } from "@/lib/cube/model";
import type { CubeStoreApi } from "@/lib/cube/store";
import { DEFAULT_TURN_SECONDS, createTurnAnimator, followCubeStore } from "@/lib/cube/turnAnimator";

const CUBELET_SIZE = 0.96;
const STICKER_SIZE = 0.84;
const STICKER_OFFSET = CUBELET_SIZE / 2 + 0.002;
const FOV = 35;
/** Radius the camera keeps in view (cube corners reach about 1.5 * sqrt(3)). */
const FIT_RADIUS = 2.45;
/** Start looking at the U, F and R faces from slightly above. */
const CAMERA_DIRECTION = new THREE.Vector3(0.55, 0.6, 1).normalize();
/** The same direction as OrbitControls angles, for Reset view. */
const START_VIEW = new THREE.Spherical().setFromVector3(CAMERA_DIRECTION);
const RESET_SECONDS = 0.5;
/** Longest step a frame may advance a turn, so a stalled tab doesn't skip the animation. */
const MAX_FRAME_SECONDS = 1 / 20;

/** Rotation that turns a plane (facing +z) to face each way. */
const FACE_ROTATION: Record<Face, Vec3> = {
  U: [-Math.PI / 2, 0, 0],
  D: [Math.PI / 2, 0, 0],
  F: [0, 0, 0],
  B: [0, Math.PI, 0],
  R: [0, Math.PI / 2, 0],
  L: [0, -Math.PI / 2, 0],
};

/** Stickers on each cubelet, by index into CUBELETS. */
const CUBELET_STICKERS: Sticker[][] = CUBELETS.map((c) =>
  STICKERS.filter((s) => s.cubelet[0] === c[0] && s.cubelet[1] === c[1] && s.cubelet[2] === c[2]),
);

/** `caption` sits in the row under the cube, left of the Reset view button. */
export function Cube3D({ caption }: { caption?: ReactNode }) {
  const store = useCubeStoreApi();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);

  const resetAnimation = useRef(0);
  useEffect(() => () => cancelAnimationFrame(resetAnimation.current), []);

  // Swing the camera back to where it started over a moment (at once with
  // reduced motion). Dragging during the swing stops it.
  const resetView = () => {
    const c = controls.current;
    if (!c) return;
    cancelAnimationFrame(resetAnimation.current);
    const fromTheta = c.getAzimuthalAngle();
    const fromPhi = c.getPolarAngle();
    // Shortest way around.
    const dTheta = THREE.MathUtils.euclideanModulo(START_VIEW.theta - fromTheta + Math.PI, 2 * Math.PI) - Math.PI;
    const dPhi = START_VIEW.phi - fromPhi;
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const started = performance.now();
    let stopped = false;
    const stop = () => {
      stopped = true;
      c.removeEventListener("start", stop);
    };
    c.addEventListener("start", stop);
    const step = (now: number) => {
      if (stopped) return;
      const t = instant ? 1 : Math.min((now - started) / (RESET_SECONDS * 1000), 1);
      const eased = 1 - (1 - t) ** 3;
      // Without damping each angle is set exactly, and any leftover spin is dropped.
      c.enableDamping = false;
      c.setAzimuthalAngle(fromTheta + dTheta * eased);
      c.setPolarAngle(fromPhi + dPhi * eased);
      c.enableDamping = true;
      if (t < 1) resetAnimation.current = requestAnimationFrame(step);
      else stop();
    };
    resetAnimation.current = requestAnimationFrame(step);
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div role="img" aria-label="3D view of the cube. Drag to look around it." className="min-h-0 w-full flex-1 touch-none">
        <Canvas frameloop="demand" dpr={[1, 2]} flat camera={{ fov: FOV, position: [0, 0, 10] }}>
          <ambientLight intensity={1.6} />
          <directionalLight position={[3, 6, 5]} intensity={1.6} />
          <directionalLight position={[-4, -3, -5]} intensity={0.8} />
          <CubeModel store={store} />
          <FitCamera />
          <OrbitControls ref={controls} enablePan={false} enableZoom={false} enableDamping rotateSpeed={0.9} />
        </Canvas>
      </div>
      <div className="flex items-center justify-between gap-2 px-4 pb-2">
        {caption ?? <span />}
        <button
          type="button"
          onClick={resetView}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full border border-zinc-300 px-3 text-sm font-medium text-zinc-700 active:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:active:bg-zinc-800"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 3v6h6" />
          </svg>
          <span className="max-[359px]:sr-only">Reset view</span>
        </button>
      </div>
    </div>
  );
}

/** Keep the whole cube in view at any canvas shape, looking from the current direction. */
function FitCamera() {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const invalidate = useThree((s) => s.invalidate);
  const placed = useRef(false);

  useEffect(() => {
    if (width === 0 || height === 0) return;
    const vertical = THREE.MathUtils.degToRad(FOV);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * (width / height));
    const distance = FIT_RADIUS / Math.sin(Math.min(vertical, horizontal) / 2);
    if (!placed.current) {
      camera.position.copy(CAMERA_DIRECTION);
      placed.current = true;
    }
    camera.position.setLength(distance);
    camera.lookAt(0, 0, 0);
    invalidate();
  }, [camera, width, height, invalidate]);

  return null;
}

function useCubeParts() {
  const parts = useMemo(() => {
    const radius = 0.1;
    const half = STICKER_SIZE / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-half + radius, -half);
    shape.lineTo(half - radius, -half);
    shape.quadraticCurveTo(half, -half, half, -half + radius);
    shape.lineTo(half, half - radius);
    shape.quadraticCurveTo(half, half, half - radius, half);
    shape.lineTo(-half + radius, half);
    shape.quadraticCurveTo(-half, half, -half, half - radius);
    shape.lineTo(-half, -half + radius);
    shape.quadraticCurveTo(-half, -half, -half + radius, -half);

    return {
      body: new RoundedBoxGeometry(CUBELET_SIZE, CUBELET_SIZE, CUBELET_SIZE, 3, 0.09),
      bodyMaterial: new THREE.MeshStandardMaterial({ color: "#141414", roughness: 0.55 }),
      sticker: new THREE.ShapeGeometry(shape, 4),
      stickerMaterial: Object.fromEntries(
        FACES.map((face) => [
          face,
          new THREE.MeshStandardMaterial({ color: STICKER_HEX[FACE_COLOR[face]], roughness: 0.35 }),
        ]),
      ) as Record<Face, THREE.MeshStandardMaterial>,
    };
  }, []);

  useEffect(
    () => () => {
      parts.body.dispose();
      parts.bodyMaterial.dispose();
      parts.sticker.dispose();
      for (const material of Object.values(parts.stickerMaterial)) material.dispose();
    },
    [parts],
  );
  return parts;
}

type CubeParts = ReturnType<typeof useCubeParts>;

function setAxisRotation(group: THREE.Group, axis: Axis, angle: number) {
  group.rotation.set(0, 0, 0);
  group.rotation[axis] = angle;
}

function CubeModel({ store }: { store: CubeStoreApi }) {
  const parts = useCubeParts();
  const [animator] = useState(() => createTurnAnimator(store.getState().facelets));
  const frame = useSyncExternalStore(animator.subscribe, animator.getFrame, animator.getFrame);
  const turning = useRef<THREE.Group>(null);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => followCubeStore(store, animator), [store, animator]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => animator.setDuration(query.matches ? 0 : DEFAULT_TURN_SECONDS);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, [animator]);

  // Draw a frame whenever a turn starts or ends.
  useEffect(() => {
    invalidate();
  }, [frame, invalidate]);

  useFrame((_, delta) => {
    const group = turning.current;
    const fullTurn = () => {
      // The finished turn's layers stay at their end angle until React shows
      // the next state, which looks identical, so there's no flicker.
      if (group && frame.move) setAxisRotation(group, turnSpec(frame.move).axis, turnAngle(frame.move));
      invalidate();
    };
    if (animator.getFrame().key !== frame.key) return fullTurn();
    if (!animator.isAnimating()) return;
    const angle = animator.tick(Math.min(delta, MAX_FRAME_SECONDS));
    if (animator.getFrame().key !== frame.key) return fullTurn();
    if (group && frame.move) setAxisRotation(group, turnSpec(frame.move).axis, angle);
    invalidate();
  });

  const spec = frame.move ? turnSpec(frame.move) : null;
  const still: ReactNode[] = [];
  const moving: ReactNode[] = [];
  CUBELETS.forEach((position, i) => {
    const cubelet = (
      <Cubelet key={i} position={position} stickers={CUBELET_STICKERS[i]} facelets={frame.facelets} parts={parts} />
    );
    (spec && isInTurn(position, spec) ? moving : still).push(cubelet);
  });

  return (
    <>
      <group>{still}</group>
      {/* A fresh group per turn starts at angle 0. */}
      <group key={frame.key} ref={turning}>
        {moving}
      </group>
    </>
  );
}

function Cubelet({
  position,
  stickers,
  facelets,
  parts,
}: {
  position: Vec3;
  stickers: Sticker[];
  facelets: string;
  parts: CubeParts;
}) {
  return (
    <group position={position}>
      <mesh geometry={parts.body} material={parts.bodyMaterial} />
      {stickers.map((s) => (
        <mesh
          key={s.index}
          geometry={parts.sticker}
          material={parts.stickerMaterial[facelets[s.index] as Face]}
          position={[s.normal[0] * STICKER_OFFSET, s.normal[1] * STICKER_OFFSET, s.normal[2] * STICKER_OFFSET]}
          rotation={FACE_ROTATION[s.face]}
        />
      ))}
    </group>
  );
}
