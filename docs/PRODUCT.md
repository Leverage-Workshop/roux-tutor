# Product Requirements Document (PRD): Roux Tutor

## 1. Project Overview & Objectives
**Roux Tutor** is a mobile-first, web-based interactive training application designed to teach users how to solve a Rubik's Cube using the **Roux Method**. Instead of relying on raw algorithmic optimizations that look random to a human, this application focuses on conceptual block-building and slice-turn intuition.

The core loop allows a user to scan their physical scrambled cube with the phone camera, instantly reconstruct its internal state in a web browser, and walk through a guided solve where every single move is explained by its tactical purpose.

## 2. Target Production Infrastructure & Reference
* **Repository:** `https://github.com/Leverage-Workshop/roux-tutor.git`
* **Production URL:** `rouxtutor.leverageworkshop.com`
* **Hosting Platform:** Vercel
* **DNS Provider:** Cloudflare
* **Database & Backend:** Supabase (Auth, User Progress tracking, Saved Scrambles)

## 3. Technology Stack Architecture
### Frontend Core
* **Framework:** Next.js (React)
* **State Management:** Zustand (High-performance state engine optimized for synchronized rendering between 3D layers and HTML UI)
* **Styling & UI Components:** Tailwind CSS combined with Base UI (its Drawer for touch-native bottom sheets). Vaul, the earlier choice, is no longer maintained

### 3D Graphics Engine
* **Renderer:** React Three Fiber (R3F) wrapper for Three.js
* **Utilities:** `@react-three/drei` (Specifically leveraging `<OrbitControls>` built for mobile touch event abstraction)

### Vision & Logic Layer
* **Computer Vision:** Client-side frame analysis in plain TypeScript on small canvas snapshots of the camera video (grid fit and color sampling, `src/lib/scan/`). OpenCV.js was the original plan for perspective correction of corner photos; the live, face-at-a-time scan below does not need it
* **State Logic Solver:** `cube.js` or equivalent mathematical matrix array mapped to a custom sub-stage step generator (FB, SB, CMLL, LSE).

## 4. Key Functional Requirements

### A. Live State Extraction (The Scanner)
* **Capture Mechanic:** A mobile web camera view (rear camera) with a square guide. The user holds the cube up and turns it freely, showing each of the six sides in any order. A side is captured automatically once it is held steady inside the guide; a progress row shows each captured side and lets the user tap one to scan it again. Showing a side that is already captured does nothing.
* **Grid Detection:** Each analyzed frame fits a 3x3 grid inside the guide (position, size and a small tilt), rejects frames where the stickers are not uniform (mid-turn, hands in the way, no cube), and samples each sticker's color. Frame-to-frame 3D tracking of the cube is out of scope.
* **Face Identity and Orientation:** The center sticker identifies each side (standard color scheme: white opposite yellow, green opposite blue, red opposite orange). The six centers, as seen under the user's lighting, are the color reference for every other sticker, and each color is used exactly 9 times. A single side does not show which way up it was held, so the scanner tries every rotation of every side and keeps the one that makes a legal cube; stickers it still cannot be sure of are left blank.
* **Manual Calibration Fallback:** The scan opens the manual facelet editor with its guesses, where the user taps to correct misread colors before solving. The editor is also the fallback when there is no camera or access is denied.

### B. The Human-Teachable Roux Engine
* **Solver Constraint:** The solving algorithm must not output Kociemba/two-phase shortest paths. It must parse operations strictly into Roux stages:
  1. **First Block (FB):** Left-side 1x2x3 block construction.
  2. **Second Block (SB):** Right-side 1x2x3 block construction utilizing R, r, and U layers.
  3. **CMLL:** Simultaneous orientation and permutation of top-layer corners.
  4. **Last Six Edges (LSE):** Solving remaining elements solely via U and M-slice manipulations.
* **Semantic Translators:** Every execution node in the move array must hook into a contextual dictionary to pull descriptive user strings explaining *why* the turn is occurring.

### C. Unified Mobile UI/UX Viewport
* **Top Screen Zone (60% Height Canvas):** Interactive 3D webGL canvas hosting the 27 structural cubelets. Swiping outside a cubelet triggers camera rotation; interactions on the cube trigger visual layer rotations.
* **Bottom Screen Zone (40% Height Drawer):** Touch-accessible persistent bottom sheet. Displays large format notation font, stage indicators, step progress counters, and explicit contextual tutorial text.
* **Control Targets:** Large layout touch targets for "Next Move" and "Back" optimized for single-thumb operations on mobile devices.

## 5. Security & Edge Delivery
* Cloudflare is DNS only (no proxy): a CNAME points the production URL at Vercel, and Vercel's edge network handles caching, TLS and protection.
* Supabase Row Level Security (RLS) policies guard historical scramble captures and learning path milestones uniquely linked to user authentication records.
