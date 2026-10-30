// Minimum-cost assignment (Hungarian algorithm, O(n^3)) for a square cost
// matrix. The scanner uses it to give each color to exactly 9 stickers.

/** For each row, the column it is assigned to, so the total cost is as small as possible. */
export function minCostAssignment(cost: readonly (readonly number[])[]): number[] {
  const n = cost.length;
  if (cost.some((row) => row.length !== n)) throw new RangeError("Cost matrix must be square");
  // Potentials and matching, 1-based with column 0 as a sentinel.
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(n + 1).fill(0);
  const rowOf = new Array<number>(n + 1).fill(0);
  const way = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    rowOf[0] = i;
    let j0 = 0;
    const minv = new Array<number>(n + 1).fill(Infinity);
    const used = new Array<boolean>(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = rowOf[j0];
      let delta = Infinity;
      let j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[rowOf[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }
      j0 = j1;
    } while (rowOf[j0] !== 0);
    do {
      const j1 = way[j0];
      rowOf[j0] = rowOf[j1];
      j0 = j1;
    } while (j0 !== 0);
  }
  const result = new Array<number>(n);
  for (let j = 1; j <= n; j++) if (rowOf[j] > 0) result[rowOf[j] - 1] = j - 1;
  return result;
}
