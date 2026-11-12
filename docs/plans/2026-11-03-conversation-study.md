# Tree and conversation study

Local, interactive mockup at `conversation-study.html`. Preserve the existing homepage while exploring a new composition.

The original painting becomes a shallow masthead. Identity and a substantial ASCII tree share the main row. The tree grows in place while the page is already usable. A question field below both opens one concise answer at a time, with public-source links and a suggested follow-up. Direct navigation and social icons stay available. There is no modal, blocking intro, dispersal, floating chat bubble, or corner tree.

`conversation-study.css` owns the responsive composition. `conversation-study.mjs` provides explicitly labeled local sample replies, form and suggestion interactions, reset, motion pause, reduced-motion handling, and offscreen/hidden-tab animation suspension. It reuses the original detailed tree model and renderer. No live AI requests, credentials, external data collection, or publication.

Verified: syntax check; four static-site tests; desktop and 390px mobile layout without horizontal overflow; sample question, follow-up, keyboard submission, source links, reset, unknown-question fallback, and motion pause/resume. Design context is documented in PRODUCT.md and DESIGN.md using the user's stated preferences.
