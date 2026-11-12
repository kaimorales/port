# Architecture and file boundaries

The portfolio uses plain HTML, CSS, browser modules and a Node API. There is no frontend framework, bundler or runtime package dependency.

## Browser

The root HTML files and `projects/` are the public page URLs. `index.html` is the only homepage implementation; the former study URL is a compatibility redirect. `assets/site/legacy-links.js` preserves old section hashes, including repository-prefix hosting.

`assets/home/main.mjs` handles the question form and answer state. It imports `assets/chat/client.mjs` for bounded HTTP requests and lazily mounts `assets/tree/intro.mjs`. The tree module samples the current DOM, so the transition follows the current homepage content rather than a separately maintained screenshot. Geometry, rendering, interpolation and DOM sampling are separate files under `assets/tree/`.

The driving page loads `assets/driving/main.mjs`. Its worker and seed use URLs resolved against the module, so moving the page or hosting under a repository prefix does not break them. `core.mjs` is shared with the worker, tests and offline utilities. Training tools under `tools/driving/` write the same published seed file; runtime training data is not shipped.

The original pit-wall exhibit remains at its existing public URL but is not in homepage navigation. Its model and UI are grouped in `assets/pit-wall/`.

## Server

`chat-api/api/chat.mjs` adapts the platform request to `chat-api/lib/chat.mjs`. The handler owns origin/method checks, input bounds, best-effort per-process throttling, cancellation, upstream calls and safe responses. It always requests GPT-6 Luna; the visitor cannot supply a model or credentials.

`chat-api/lib/knowledge.mjs` combines stable role and prompt-protection instructions with three Markdown files, read on each request: `identity.md` for facts, `personality.md` for tendencies and preferences, and `voice.md` for response style. The files load in that explicit order and each must be nonempty; their combined content is limited to 32 KiB. The previous `context.md` is not read or bundled. The API key remains in local environment configuration or the deployment provider's secret store. The public endpoint URL in `assets/chat/config.mjs` is configuration, not a credential.

`scripts/preview.mjs` provides both static pages and `/api/chat` locally. `scripts/public-files.mjs` defines its public path boundary. Resolved symlink destinations must also be public paths. The preview never serves `chat-api/`, `docs/`, `tools/`, `tests/` or `archive/`.

## Hosting and history

GitHub Pages publishes the root HTML, `projects/` and `assets/` with the existing `CNAME`. `_config.yml` excludes support directories from its normal branch-root Jekyll build. The API requires a separate deployment. Repository visibility is separate from website publishing: prompt files must not contain secrets even when excluded from the static website.

`archive/tree-intro/` preserves the rejected corner/dissolve prototype, including its old renderer and motion tests. It is not an active runtime dependency. `docs/plans/` contains historical implementation snapshots; old filenames inside those plans describe the repository at that time. Use this file and the root README for current paths.
