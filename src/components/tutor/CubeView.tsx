"use client";
// The tutor's cube view: the 3D cube when the browser has WebGL, otherwise the
// flat net. three.js is loaded only in the browser, after the page shows, and
// a failure there (no GPU, lost connection) falls back to the net too.
import dynamic from "next/dynamic";
import { Component, useSyncExternalStore, type ReactNode } from "react";
import { CubeNet } from "./CubeNet";

// `caption` (e.g. how to hold the cube) shows in a row under the cube.
const Cube3D = dynamic(() => import("@/components/cube3d/Cube3D").then((m) => m.Cube3D), {
  ssr: false,
  loading: () => <CubeLoading />,
});

let webglSupport: boolean | undefined;

/** Whether this browser can create a WebGL context (checked once). */
function hasWebGL(): boolean {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      webglSupport = gl !== null;
      // Release the test context; browsers allow only a few at once.
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}

const subscribeNever = () => () => {};

export function CubeView({ caption }: { caption?: ReactNode }) {
  // null on the server and during hydration, where WebGL can't be checked.
  const webgl = useSyncExternalStore(subscribeNever, hasWebGL, () => null);
  if (webgl === null) return <CubeLoading />;
  if (!webgl) return <FlatCube caption={caption} />;
  return (
    <FallbackOnError fallback={<FlatCube caption={caption} />}>
      <Cube3D caption={caption} />
    </FallbackOnError>
  );
}

function FlatCube({ caption }: { caption?: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-2">
        <CubeNet />
      </div>
      {caption && <div className="flex px-4 pb-1">{caption}</div>}
    </div>
  );
}

function CubeLoading() {
  return (
    <div role="status" className="flex h-full items-center justify-center text-sm text-zinc-500">
      Loading cube…
    </div>
  );
}

class FallbackOnError extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("3D cube failed to load; showing the flat view instead.", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
