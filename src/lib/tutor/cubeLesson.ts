// Which lesson /tutor plays for its `?cube=` value: the demo when there is
// none, the Roux solve of the cube when it is a legal cube, or why not.
// Server only (it runs the solver).
import { checkFacelets, parseDraft } from "@/lib/cube/validate";
import { demoLesson } from "./demoLesson";
import type { Lesson } from "./lesson";
import { rouxLessonFromState } from "./rouxLesson";

export type CubeLesson =
  | { lesson: Lesson }
  | { error: string; /** Where to fix the cube: the editor, with the draft when it is readable. */ editHref: string };

export function lessonForCube(cube: string | string[] | undefined): CubeLesson {
  if (cube === undefined) return { lesson: demoLesson() };
  const draft = parseDraft(typeof cube === "string" ? cube : undefined);
  if (!draft) return { error: "The link doesn't describe a cube.", editHref: "/enter" };
  const check = checkFacelets(draft);
  if (!check.state) {
    return {
      error: check.problems[0]?.message ?? "Some stickers have no color yet.",
      editHref: `/enter?cube=${draft}`,
    };
  }
  return { lesson: rouxLessonFromState(check.state) };
}
