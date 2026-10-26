// Minimal types for the parts of cubejs we use. The package ships no types.
declare module "cubejs" {
  export interface CubeState {
    center: number[];
    cp: number[];
    co: number[];
    ep: number[];
    eo: number[];
  }

  export default class Cube {
    constructor(state?: Cube | CubeState);
    static fromString(facelets: string): Cube;
    static random(): Cube;
    static inverse(algorithm: string): string;
    init(state: CubeState): void;
    identity(): void;
    toJSON(): CubeState;
    asString(): string;
    clone(): Cube;
    randomize(): void;
    isSolved(): boolean;
    move(algorithm: string): Cube;
  }
}
