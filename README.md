# Kai Morales

A small static personal site, hosted on GitHub Pages at [kmurakami.com](https://kmurakami.com).

## Preview locally

From this directory:

```sh
python3 -m http.server 8765 --bind 127.0.0.1
```

Open http://127.0.0.1:8765/. No installation or build is needed.

## Editing

- `index.html`: painting, introduction, interests, and section navigation.
- `projects.html`: the project index. Each writeup lives in `projects/`.
- `experience.html`, `about.html`, `contact.html`: standalone section pages.
- `styles.css`: shared light theme, typography, layout, and responsive styles.
- `app.js`: redirects legacy homepage hashes such as `/#projects` to the new pages. The rest of the site works without JavaScript.
- `banner.jpg`: original homepage painting. `CNAME` retains the custom domain.

The small social footer is repeated in each HTML page; update all pages when changing profile links. Use relative internal links so previews also work under a GitHub Pages repository subpath.

## Verify

Python 3.9+ and Node.js 18+ are only needed for these development checks:

```sh
python3 -B -m unittest discover -s tests -p 'test_*.py' -v
node --test tests/legacy-links.test.cjs
```

The checks validate static navigation, detail-page access, local assets, document structure, and legacy redirects. Also inspect the site at desktop and phone widths and test keyboard navigation before publishing.

## Publish

Serve the checked-in files directly with the repository's GitHub Pages configuration. There is no generated output directory. Review local changes before pushing the branch used by Pages.

## Pit wall

`pit-wall.html` is a standalone interactive race-strategy experiment. `pit-model.mjs` contains the deterministic toy model; `pit-wall.mjs` handles playback and controls. No external data or dependencies. The model exhaustively evaluates 368 one-stop strategies under the same forecast. Its assumptions are documented on the page. Reduced-motion mode goes directly to results.

Run model tests with `node --test tests/pit-model.test.mjs`.

## Driving school

Open `driving-school.html` through the local server. The homepage links to it as **game**. The pretrained 14→24→2 neural network uses local track geometry, speed and six curvature previews, then neuroevolution searches weight variations in a browser worker. It outputs steering and a signed acceleration/brake pedal. A combined tire-force budget limits turning and longitudinal acceleration, so excessive corner-entry speed can run wide. It is a toy dynamics model, not camera-based autonomous driving.

Run tests: `node --test tests/drive-core.test.mjs`. Reproduce the starter weights with `node driving-training/make-data.mjs`, then `python3 driving-training/train.py` (NumPy required for training only). The generated examples are ignored; the small learned model is stored in `driving-seed.json`. Browser inference and practice have no external dependencies.

The swarm shows all 16 mutated drivers plus the incumbent. Each immutable generation is replayed before its winner is committed; speed changes playback only. Pause freezes the round. Reshape track offers 12 pointer/keyboard handles; applying the edit reuses the last selected weights on the new geometry. Cancel restores the original session. New circuits and starting-model changes reset the model.

Follow a driver (or choose Best driver under options) to inspect its sampled pedal commands: rust for braking, gray for coasting and green for acceleration. These are recorded control outputs, not a precomputed racing line. Seed files declare a physics version; incompatible models are rejected.

The grip-v2 starter uses 410 parameters, trained on 90,110 examples from 80 circuits. Run `node driving-training/evaluate.mjs` to reproduce the saved held-out/optimization report in `driving-training/evaluation-grip-v2.json`. It completed 10/10 unseen seeds from the same procedural family. At 40 generations, default-circuit time changed from 15.13s to 11.83s with recorded braking and wider trajectories. These are toy-physics results, not proof of an optimal or real-world racing line.
