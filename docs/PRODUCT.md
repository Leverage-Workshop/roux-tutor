# Product Requirements Document (PRD): Roux Tutor

## 1. Project Overview & Objectives
**Roux Tutor** is a mobile-first, web-based interactive training application designed to teach users how to solve a Rubik's Cube using the **Roux Method**. Instead of relying on raw algorithmic optimizations that look random to a human, this application focuses on conceptual block-building and slice-turn intuition.

The core loop allows a user to photograph their physical scrambled cube, instantly reconstruct its internal state in a web browser, and walk through a guided solve where every single move is explained by its tactical purpose.

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
* **Styling & UI Components:** Tailwind CSS combined with Ant Design Mobile (or Vaul for touch-native drawer sheets)

### 3D Graphics Engine
* **Renderer:** React Three Fiber (R3F) wrapper for Three.js
* **Utilities:** `@react-three/drei` (Specifically leveraging `<OrbitControls>` built for mobile touch event abstraction)

### Vision & Logic Layer
* **Computer Vision:** OpenCV.js (Client-side browser execution for color space sampling)
* **State Logic Solver:** `cube.js` or equivalent mathematical matrix array mapped to a custom sub-stage step generator (FB, SB, CMLL, LSE).

## 4. Key Functional Requirements

### A. Isometric State Extraction (The Scanner)
* **Capture Mechanic:** Use a mobile web camera interface prompting exactly 2 or 3 isometric photos (capturing corner views that expose 3 sides simultaneously).
* **Grid Calibration:** UI overlay displaying alignment templates. OpenCV.js corrects perspective distortion, isolates facelet matrices, and samples RGB/HSV vectors.
* **Manual Calibration Fallback:** A mandatory interactive grid matrix UI allowing the user to override and tap-to-correct misidentified facelet colors before state validation.

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
