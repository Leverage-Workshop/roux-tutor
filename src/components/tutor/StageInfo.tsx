"use client";
// The info bubble next to the stage name: what each Roux stage is for, with a
// tab per stage (the current one open). The corners tab also switches between
// the beginner's two algorithms and full CMLL (see corners.ts).
import type { ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Tabs } from "@base-ui/react/tabs";
import type { CmllMethod } from "@/lib/tutor/corners";
import { ROUX_STAGES, type RouxStageId } from "@/lib/tutor/lesson";

const STAGE_INFO: Record<RouxStageId, { title: string; body: ReactNode }> = {
  fb: {
    title: "First Block",
    body: (
      <>
        <p>
          Build a 1×2×3 block on the left: the blue center, the white-blue edge under it, and two corner-edge pairs (front
          and back).
        </p>
        <p>
          This part is intuitive: nothing to memorize. Each pair&apos;s corner and edge are joined first, then slotted in
          together.
        </p>
      </>
    ),
  },
  sb: {
    title: "Second Block",
    body: (
      <>
        <p>Build the matching block on the right (green), with the same idea: the bottom edge, then two pairs.</p>
        <p>
          Only R, r, U and M are turned, so the first block is never touched. Still intuitive: nothing to memorize.
        </p>
      </>
    ),
  },
  cmll: {
    title: "Corners (CMLL)",
    body: (
      <>
        <p>
          With both blocks built, only the top layer and the middle slice are left. CMLL (corners of the last layer,
          ignoring the middle slice) puts the four top corners in place with memorized algorithms.
        </p>
        <p>
          The algorithms may mix up the top edges and the centers. That&apos;s fine: they&apos;re solved in the last
          stage.
        </p>
      </>
    ),
  },
  lse: {
    title: "Last Six Edges",
    body: (
      <>
        <p>Only M and U are turned now, so the blocks never move. Three steps:</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            <strong>Orient edges:</strong> make every edge good (yellow or white sticker up or down) with patterns like
            M&apos; U M&apos;. Worked out, not memorized.
          </li>
          <li>
            <strong>Place UL and UR:</strong> the yellow-blue and yellow-green edges go to the top left and right.
            Also worked out.
          </li>
          <li>
            <strong>Solve the middle slice:</strong> the last four edges and the centers, with one short algorithm: a
            3-cycle like M&apos; U2 M U2, or a swap like M2 U2 M2.
          </li>
        </ol>
        <p>
          M turns move the centers, which is why white leaves the bottom during the solve. They go back in this last
          step.
        </p>
      </>
    ),
  },
};

const CORNER_OPTIONS: { value: CmllMethod; label: string; text: string }[] = [
  {
    value: "beginner",
    label: "Beginner: two algorithms",
    text: "First twist all four corners yellow side up (7 algorithms, one per pattern: Sune, Anti-Sune, H, Pi, U, T, L), then swap them into place (2 algorithms). 9 to learn, about 9 more moves.",
  },
  {
    value: "full",
    label: "Full CMLL: one algorithm",
    text: "Recognize which of 42 cases you have and solve it in one go, usually 7 to 11 moves. Switch once the beginner way feels easy.",
  },
];

export function StageInfo({
  current,
  corners,
  onCornersChange,
  switching = false,
}: {
  /** The stage being played; null when the cube is solved. */
  current: RouxStageId | null;
  /** How this lesson solves the corners; absent for hand-made lessons (no switch then). */
  corners?: CmllMethod;
  onCornersChange?: (corners: CmllMethod) => void;
  /** A switch is on its way: the solve is being worked out again. */
  switching?: boolean;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label="About the Roux stages"
        className="-my-3 flex size-11 shrink-0 items-center justify-center rounded-full text-zinc-600 active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-zinc-800"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 11v6" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="0.6" fill="currentColor" />
        </svg>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="top" align="start" sideOffset={8} collisionPadding={16} className="z-30">
          <Popover.Popup
            initialFocus={false}
            className="flex max-h-[min(var(--available-height),34rem)] w-[min(calc(100vw-2rem),24rem)] flex-col gap-3 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-800 shadow-xl outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <div className="flex items-start justify-between gap-2">
              <Popover.Title className="text-base font-semibold text-foreground">The Roux method</Popover.Title>
              <Popover.Close
                aria-label="Close"
                className="-mt-2 -mr-2 flex size-11 shrink-0 items-center justify-center rounded-full text-zinc-600 active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-zinc-800"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </Popover.Close>
            </div>
            <Popover.Description className="-mt-2">
              Four stages: two blocks built by thinking it through, then the top corners and the last six edges with a
              few memorized moves.
            </Popover.Description>
            <Tabs.Root defaultValue={current ?? "fb"} className="flex flex-col gap-3">
              <Tabs.List aria-label="Roux stages" className="grid grid-cols-4 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                {ROUX_STAGES.map((s) => (
                  <Tabs.Tab
                    key={s.id}
                    value={s.id}
                    className="flex min-h-9 items-center justify-center rounded-lg text-xs font-semibold text-zinc-600 data-active:bg-white data-active:text-foreground data-active:shadow-sm dark:text-zinc-400 dark:data-active:bg-zinc-950"
                  >
                    {s.short}
                    {s.id === current && <span className="sr-only"> (current)</span>}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
              {ROUX_STAGES.map((s) => (
                <Tabs.Panel key={s.id} value={s.id} className="flex flex-col gap-2 outline-none">
                  <h3 className="font-semibold text-foreground">{STAGE_INFO[s.id].title}</h3>
                  {STAGE_INFO[s.id].body}
                  {s.id === "cmll" && corners && onCornersChange && (
                    <CornersChoice value={corners} onChange={onCornersChange} switching={switching} />
                  )}
                </Tabs.Panel>
              ))}
            </Tabs.Root>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function CornersChoice({
  value,
  onChange,
  switching,
}: {
  value: CmllMethod;
  onChange: (corners: CmllMethod) => void;
  switching: boolean;
}) {
  return (
    <div className="mt-1 flex flex-col gap-2">
      <p id="corners-choice" className="font-semibold text-foreground">
        How this tutor solves the corners
      </p>
      <RadioGroup
        aria-labelledby="corners-choice"
        value={value}
        onValueChange={(v) => onChange(v as CmllMethod)}
        disabled={switching}
        className="flex flex-col gap-2"
      >
        {CORNER_OPTIONS.map((o) => (
          <label
            key={o.value}
            className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 p-3 has-data-checked:border-foreground dark:border-zinc-700"
          >
            <Radio.Root
              value={o.value}
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-zinc-400 data-checked:border-foreground data-checked:bg-foreground dark:border-zinc-500"
            >
              <Radio.Indicator className="size-2 rounded-full bg-background data-unchecked:hidden" />
            </Radio.Root>
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold text-foreground">{o.label}</span>
              <span className="text-zinc-600 dark:text-zinc-400">{o.text}</span>
            </span>
          </label>
        ))}
      </RadioGroup>
      <p aria-live="polite" className="text-xs text-zinc-600 dark:text-zinc-400">
        {switching ? "Working out the solve again…" : "The blocks don't change. If you're past them, you go back to the start of the corners."}
      </p>
    </div>
  );
}
