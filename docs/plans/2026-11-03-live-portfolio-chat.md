# Live portfolio chat implementation plan

> Implementation uses the subagent-driven-development skill for the independent backend, with frontend integration and verification in the parent session.

**Goal:** Simplify the approved tree-and-conversation page and replace sample responses with a real, inexpensive conversational guide to Kai's public portfolio.

**Architecture:** Keep the static GitHub Pages frontend. A separate Node/Vercel API calls OpenAI `gpt-6-luna` using a server-only key. No database, tools, browsing, private data, or model fallback. Conversation history lives only in browser memory and travels with each bounded request.

**Tech stack:** Existing HTML/CSS/ES modules, Web Request/Response APIs, native fetch, Node test runner.

## Constraints and decisions

- Keep the accepted tree intro, painting, identity, navigation, and social icons.
- Replace the large question heading and suggestion row with one field, placeholder `Ask about me…`, and a small AI disclosure.
- Show the latest question/answer as plain text, with follow-ups remembered and a clear-conversation control.
- The browser sends `{question, history}` to the configured endpoint and receives `{answer}`. Never accept model, system instructions, API endpoint, or credentials from browser input.
- Use fixed `gpt-6-luna` with reasoning effort `none` and a 400-token completion cap. Configure an OpenAI project hard spend limit and disable prepaid auto-reload for the $10/year budget; the in-process throttle is not a spend guarantee.
- Keep requests small, cap output, add server timeouts and best-effort in-process throttling. Provider account limits are shared; in-process limits are not a distributed security boundary.
- No chat transcript logging or persistence. The provider processes submitted messages; disclose this in the interface.
- Missing key or provider outage produces a clear unavailable state, never a canned answer represented as AI.
- Secrets stay in ignored backend settings. Local static serving must deny dotfiles, source/server directories, and traversal before a real local secret is added.

## Tasks

- [x] Backend: `chat-api/lib/chat.mjs`, `chat-api/lib/knowledge.mjs`, `chat-api/api/chat.mjs`, `chat-api/vercel.json`, `chat-api/package.json`, `chat-api/.env.example`, `tests/portfolio-chat.test.mjs`. Test CORS/method checks, strict request bounds, malformed JSON, fixed Luna routing, key absence, provider failure/timeout, successful replies, follow-up context, throttling, and no credential leakage. Build knowledge only from the public HTML pages.
- [x] Frontend: simplify `conversation-study.html/css`, replace canned routing in `conversation-study.mjs`, add `chat-client.mjs` and public `chat-config.mjs`. Test HTTP failures, invalid response shapes, abort, and payload bounds. Preserve keyboard behavior, pending state, conversation reset, and tree replay.
- [x] Local serving: add `scripts/preview-chat.mjs` to serve an explicit public asset allowlist plus `/api/chat`. Read optional `chat-api/.env.local`; never return it over HTTP. Test disallowed paths and the missing-key flow. Retain the established localhost URL.
- [x] Verify: run focused backend/client/tree/static tests, inspect the simplified UI at desktop and 390px, check the tree adapts to the new layout, and record a screenshot. Live model behavior remains unverified until an API key is configured.
- [x] Handoff: document the exact local secret and Vercel deployment steps. Do not push or deploy the homepage during this local iteration.

## Acceptance checks

`node --test tests/portfolio-chat.test.mjs tests/chat-client.test.mjs tests/tree-morph.test.mjs tests/tree-entrance.test.cjs`

`python3 -B -m unittest discover -s tests -p 'test_*.py' -v`

In-browser: submit without a key -> honest unavailable message; field still usable; clear -> empty state; replay -> simplified page; no horizontal overflow on mobile. Once configured, ask about projects and a follow-up; compare claims with the public pages.

## Verified result

30 focused Node tests and 4 static-site Python tests passed; git diff --check passed. Browser checks covered the simplified page at 1400px and 390px, the tree handoff, the honest missing-key state, and replies/follow-up context/Enter/clear against a separate explicitly stubbed provider server. The stub server was stopped. Independent code review approved the local implementation after fixing an incoming-body timeout.

On 2026-11-03, the user selected GPT-6 Luna. The backend, preview settings, tests, instructions, and on-page disclosure were updated from OpenRouter to OpenAI. The existing local secret file still has only the old OpenRouter setting; no live OpenAI request was made. Vercel deployment and production GitHub Pages integration remain pending a server-only OpenAI key and deployment. No homepage push or deployment was performed.
