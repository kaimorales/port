# ASCII tree entrance

**Goal:** Add the approved short, windswept ASCII tree entrance to the existing white portfolio, with a small replay tree in the footer.

**Architecture:** Original procedural geometry in `tree-model.mjs`; canvas drawing and accessible dialog lifecycle in `tree-intro.mjs`; isolated styles in `tree-intro.css`. No dependencies, build step, remote assets, or server code.

**Constraints:** Keep the painting and existing navigation. Grow for 1.7 seconds, hold briefly, fade into the homepage. Automatically play only once per tab session. Click or keypress skips. Reduced motion skips automatic playback and makes manual replay static. Failure must leave the homepage usable.

## Steps

- [x] Test seeded variation, bounded geometry, and progressive growth in `tests/tree-model.test.mjs`.
- [x] Implement branching trunk, irregular foliage, and cell-based ASCII rendering. Use charcoal `#454a40`, olive `#738064`, pale olive `#a5ad96`, white `#ffffff`; retain Georgia for the site and monospace for the tree.
- [x] Integrate an early fail-open entrance gate and module into `index.html`, plus a footer replay button that appears only when JavaScript is working.
- [x] Verify first arrival, reload, replay, skip, keyboard focus restoration, reduced motion, unavailable storage, no JavaScript, mobile width, and existing site tests. Inspect the actual visual result in the browser.

The tree is an entrance, not a progress meter. Manual replay creates another seed. No live publication is part of this preview request.

## Verification

12 focused tests passed (tree geometry and entrance gating, legacy navigation, static site links). Browser inspection confirmed first arrival, no replay on reload, manual replay, Escape focus restoration, pointer skip, and no horizontal overflow at 390 CSS pixels. Reduced-motion and unavailable-storage entrance policies were checked by executing the real head script in the tests. Manual replay holds the finished tree until dismissed; automatic entrance finishes in about 2.25 seconds.

## Detail revision

The user requested the richer detail of the asciiFlowers reference. Replaced direct glyph branches with original curved tree geometry and a separate `tree-renderer.mjs`: shaded, tapering limbs with bark ridges, roots, and 8,499 leaves are painted to a 168-by-95 offscreen raster, then mapped to colored ASCII glyphs. Overlapping foliage sprays supply canopy depth. Manual replay continues a gentle breeze at a 30 fps render cap; closing the dialog cancels animation. The automatic entrance remains short and skippable.

Validation: 13 focused tests passed, including new geometry attachment, supported-foliage growth ordering, reproducibility, and composition bounds across 40 seeds. Browser checks confirmed keyboard focus restoration, mobile canvas and control fit at 390 CSS pixels, no horizontal overflow, and no console errors. Preview remains local.

## Dispersal transition

Approved: the grown tree's characters drift upward and outward while the homepage appears beneath. `tree-motion.mjs` supplies deterministic per-glyph motion; the renderer retains the exact last glyph frame for continuity. After 1.7 seconds of growth and a 250 ms hold, a 600 ms dispersal clears the white dialog background. The finished manual replay uses the same transition when clicked. Escape, reduced motion, hidden-tab handling, and the deadline all close immediately and cancel pending animation. The corner tree retains its muted palette; full-screen leaves use richer green.

Verification: 16 focused tests passed. Browser checks verified the automatic first-visit reveal, intermediate transparent-background states, manual replay, and Escape during active dispersal restoring focus to the replay button. No browser warnings/errors. Recorded the actual transition as a GIF in the chat outputs directory.
