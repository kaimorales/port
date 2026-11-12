# Portfolio consolidation implementation plan

Goal: organize the existing plain HTML/JS portfolio without changing its visual design, API behavior, model weights, or public page URLs. Work locally on codex/quiet-personal-site; do not commit or publish. Preserve all existing edits and do not read or print local API keys.

## File map
- Current conversation-study.html becomes index.html. conversation-study.html becomes a small redirect preserving query/hash, with a usable HTML fallback. index.html also loads legacy section redirects. Root section HTML and projects/*.html stay at existing URLs.
- styles.css -> assets/site/styles.css; app.js -> assets/site/legacy-links.js.
- conversation-study.css -> assets/home/styles.css; conversation-study.mjs -> assets/home/main.mjs.
- chat-client.mjs -> assets/chat/client.mjs; chat-config.mjs -> assets/chat/config.mjs.
- tree-model.mjs -> assets/tree/model.mjs; tree-renderer.mjs -> assets/tree/renderer.mjs; tree-morph-model.mjs -> assets/tree/morph.mjs; tree-morph-intro.mjs -> assets/tree/intro.mjs; page-glyphs.mjs -> assets/tree/page-glyphs.mjs; tree-morph.css -> assets/tree/styles.css.
- driving-school.mjs -> assets/driving/main.mjs; drive-core.mjs -> assets/driving/core.mjs; drive-worker.mjs -> assets/driving/worker.mjs; driving-school.css -> assets/driving/styles.css; driving-seed.json -> assets/driving/seed.json.
- pit-wall.mjs -> assets/pit-wall/main.mjs; pit-model.mjs -> assets/pit-wall/model.mjs; pit-wall.css -> assets/pit-wall/styles.css. pit-wall.html remains accessible but is not linked from homepage.
- banner.jpg/profile.jpg -> assets/images/ with same filenames and bytes.
- driving-training/* -> tools/driving/*; ignored local training data must be moved too. Update trainers to new core and seed paths, preserving weights.
- DESIGN.md/PRODUCT.md -> docs/design.md/docs/product.md; docs/superpowers/plans/* -> docs/plans/*, keeping historical content as snapshots.
- Previous index.html and tree-intro.mjs/css, tree-motion.mjs, old tree-renderer.mjs -> archive/tree-intro/ with README. Retired renderer/motion are preserved there; active renderer drops unused miniature/dispersal behavior and imports.
- tests/tree-motion.test.mjs -> archive/tree-intro/motion.test.mjs targeting archived motion; remove it from default test glob.
- chat-api/ stays in place, including private .env.local and user-authored context.md unchanged.
- scripts/preview-chat.mjs -> scripts/preview.mjs. It serves only root HTML, projects HTML and approved assets. Root / and conversation alias work. Keep private files unavailable, including symlinks into backend.

## Task 1: regression coverage (test worker)
Ownership: tests/ only, excluding the motion test move which the coordinator handles. Update imports to the exact new asset map. Keep existing meaningful assertions. Cover active index intro, legacy preview alias/section hashes and repository-prefix compatibility. Add filesystem traversal of relative JS imports/dynamic imports/new URL worker/data references under assets so missing moved dependencies fail tests. Preview tests should cover new assets and deny backend/context, archive/docs/tools/tests and a symlink to a private file. Exclude archived HTML from static site assertions; still cover all public root and project pages. Run baseline failing path check before moves if possible and full tests after files land. Write report to /private/tmp/portfolio-cleanup/tests-report.md. Do not change production files or commit.

## Task 2: organize runtime and development files (coordinator)
Move according to map; update relative URLs/imports and CSS selectors from study-* to home-* across active HTML/CSS/tree snapshots. Keep viewport sizes, crop and animation timing unchanged. Dynamic driving seed fetch must use new URL('./seed.json', import.meta.url). Archive previous prototypes before removing them from active runtime. Keep assets self-contained. Add zero-dependency package.json scripts for dev, test, test:site, test:js and training evaluation. Add _config.yml exclusions for chat-api, scripts, tests, tools, docs, archive, package manifests and README so Pages does not publish backend/support files. Keep existing CNAME and branch-root GitHub Pages layout. Update README and architecture/editing map; historical plan contents remain historical. Keep profile and key file unchanged.

## Task 3: verify and review
Run npm test (Node and Python), syntax checks on active modules/training scripts, git diff --check. Verify live intro and new homepage, preview redirect, one project/back link, and driving worker/model loading/reshape at desktop and phone widths. Confirm real chat through the relocated frontend once. Get read-only review of moved imports, runtime URLs, publishing exclusions, and preview file boundary. Fix material findings and rerun covering checks. Leave local server using npm run dev equivalent and show canonical index URL. Record outcomes in docs/plans/2026-11-03-codebase-consolidation.md.

## Completion — November 4, 2026

- Canonical homepage promoted to index.html; preview alias preserves query/hash and legacy section bookmarks preserve repository prefixes.
- All active browser modules/styles/data/images grouped under assets; backend and user-authored context left in chat-api; no key values inspected or copied.
- Prior tree intro, renderer and motion tests archived outside the published/preview surface. Active renderer now contains only current growth/snapshot behavior.
- Training scripts and ignored generated examples moved to tools/driving; seed model and original image bytes confirmed identical to HEAD.
- npm run dev and npm test documented; shared URL policy and Pages exclusions added. No deployment or push performed.
- Full checks: 60 JavaScript tests and 5 Python checks passed, including the document-relative-fetch regression guard. 21 active JavaScript files and the Python trainer passed syntax checks; git diff --check clean.
- Browser checks: old preview redirect, desktop and 390px layouts without overflow, full grow/morph/reveal sequence, project/detail/back navigation, worker/model loading, a running generation and keyboard track reshaping, plus a real Luna response from the relocated frontend.
- Independent review: no actionable findings; spec compliance and code quality passed. Hosted Pages/API deployment was not performed or claimed.
