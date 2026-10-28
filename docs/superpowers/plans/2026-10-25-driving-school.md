# Driving school prototype

User approved the proposed pretrained driver with live adaptation and an original-attempt ghost. This local prototype stays off the homepage pending review.

- [x] Implement a small neural policy and fixed driving simulation. Inputs: lateral position, heading sine/cosine, speed and four local road bearings. Outputs: steering and target speed.
- [x] Train 134 weights offline from 48,000 examples across 80 generated circuits using behavioral cloning of a conservative geometric teacher. Include reproducible scripts.
- [x] Test held-out completion, actual weight-dependent behavior, collisions and elitist evolution. Measure improvement on separate circuits.
- [x] Implement browser-worker learning, 16 mutations per generation, 60 generations per practice run, pause/resume, first-attempt ghost and replay.
- [x] Build a quiet standalone page with freehand loop input, accessible preset alternatives, model disclosure and local training chart.
- [x] Verify actual browser learning, drawing, cancellation, mobile layout and final regression suite. Browser baseline improved from 17.60s to 10.40s in 60 generations; keyboard-drawn circuit reset correctly; all 17 regression tests passed.

Limitations: no camera input or realistic tire physics; local geometry is supplied. Generated training circuits are simple. Arbitrary drawn tracks may fail. Improvement is searched, never scripted. No deployed changes.
