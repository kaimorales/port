# Quiet Personal Site Implementation Plan

**Goal:** Turn the approved white, painting-led preview into the real GitHub Pages portfolio, with content opened on demand.

**Architecture:** Standalone static HTML pages share one stylesheet and native links. Every section and project has its own URL, works without JavaScript, and uses native browser history. A small script on the homepage redirects the previous site's section hashes to the new pages.

**Tech stack:** HTML, CSS, a small legacy-link script; Python standard-library site checks and Node's built-in test runner. No runtime packages or build step.

## Approved design

- White background, centered 490px content column, Georgia reading type, small sans serif utility text.
- Keep the original banner painting at 162px high on desktop, 125px on narrow screens. No portrait.
- Homepage title: Kai Morales.
- Role: Applied AI Intern at Tesla.
- Interests: I’m interested in AI eng, evals, and optimization.
- Underlined, lowercase projects, experience, about, contact links.
- Small GitHub, LinkedIn, and X icons. X points to https://x.com/kmurakmi.
- Harlen stays in the project and experience content, with no mention in the homepage introduction.
- Preserve the existing project descriptions, links, dates, and professional history, updating the Tesla title consistently.

## Implementation

- [x] Establish failing navigation checks: home links open real section pages, project entries open detail pages, all internal links/assets resolve, and static content has accessible page structure.
- [x] Build index.html, projects.html, experience.html, about.html, contact.html, and six pages under projects/. Preserve banner.jpg and CNAME.
- [x] Replace styles.css with the approved layout, responsive wrapping, readable contrast, visible focus, and usable touch targets. Content is visible by default.
- [x] Replace app.js with legacy hash redirection and verify supported hashes, unknown hashes, root deployment, and repository subpath deployment.
- [x] Document local serving and checks in README.md. Run the static checks and redirect tests.
- [x] Inspect the homepage and representative inner pages in a browser at desktop and mobile sizes. Verify native Back, direct reload, keyboard focus, and no overflow.
- [x] Request an independent read-only code review, address material issues, and verify the final diff.
- [x] Put the completed files on codex/quiet-personal-site in the local repository and provide a local preview. Publication is a separate step.

## Verification commands

```sh
python3 -B -m unittest discover -s tests -p 'test_*.py' -v
node --test tests/legacy-links.test.cjs
git diff --check
python3 -m http.server 8765 --bind 127.0.0.1
```

Static checks validate navigation and local assets without executing JavaScript. Browser inspection verifies the final layout and navigation. No automated claim will be made for unvisited external destinations.
