# Tree into homepage prototype

Approved scope: preserve the conversation mockup, remove its permanent tree, and make the startup tree's characters form the website. Remains local and uses explicitly labeled sample chat replies.

## Implementation

- `tree-morph-model.mjs`: deterministic spatial pairing and smooth paths. Every source and target is represented; paths begin and end at their exact coordinates.
- `page-glyphs.mjs`: rasterizes the local painting, real DOM text positions and wrapping, input, rules, and SVG icons. Converts that scene to ASCII destinations without remote rendering services.
- `tree-renderer.mjs`: exposes a copied snapshot of the current tree's glyphs.
- `tree-morph-intro.mjs` and `tree-morph.css`: 1.5 seconds of growth, a short hold, and 1.15 seconds of movement. The final 170 ms of movement overlaps a gentle 700 ms reveal with a small top-to-bottom offset. The real page stays fully rendered beneath an opaque ASCII canvas; a compositing mask uncovers it without a contrast dip or a final visual swap. The white top margin stays fixed, and settled glyphs are cached to reduce work during the reveal.
- `conversation-study.html/css/mjs`: removes the permanent tree and its motion loop, keeps the chat design and behavior, and adds a plain replay control. The new intro plays once per tab session. No API integration or deployment.

## Recovery and accessibility

Skip and keyboard Escape work during growth or morph. Reduced motion, unavailable storage, and deep links bypass autoplay. Resize and hidden-tab changes end playback. Deadlines release the page if rendering stalls. The modal is removed from interaction after the handoff; manual playback restores focus.

## Validation

After simplifying the chat page, fixed the DOM snapshot to exclude collapsed disclosure bodies even when their Range bounds remain nonzero. Expanded disclosures are included. The field uses its live value color and border styling, and the obsolete suggestion-row selector was removed. Two regression tests cover closed/open disclosure snapshots. Twelve focused snapshot, morph, and entrance tests pass. Recorded the complete simplified-page transition at 368px and verified replay at 1100px with expanded details and entered text; current state survives the handoff. Updated recording: `tree-current-page.gif`.

24 focused tests passed across morph geometry, continuous reveal and final opacity, tree geometry, entrance gating, legacy navigation, and static links/assets. Browser verification captured the complete revised transition and inspected its final frames. At 390 CSS pixels the finished page had no horizontal overflow. Skip during morph restored the controls and replay-button focus. The sample chat responded after the completed mobile handoff. No console errors or warnings. Recorded the revised prototype as `tree-to-homepage-refined.gif` in the chat outputs directory.
