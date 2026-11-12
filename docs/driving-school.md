# Driving school

Open `driving-school.html` through the local server. The homepage links to it as **game**. The pretrained 14→24→2 neural network uses local track geometry, speed and six curvature previews, then neuroevolution searches weight variations in a browser worker. It outputs steering and a signed acceleration/brake pedal. A combined tire-force budget limits turning and longitudinal acceleration, so excessive corner-entry speed can run wide. It is a toy dynamics model, not camera-based autonomous driving.

Run tests: `node --test tests/drive-core.test.mjs`. Reproduce the starter weights with `node tools/driving/make-data.mjs`, then `python3 tools/driving/train.py` (NumPy required for training only). The generated examples are ignored; the small learned model is stored in `assets/driving/seed.json`. Browser inference and practice have no external dependencies.

The swarm shows all 16 mutated drivers plus the incumbent. Each immutable generation is replayed before its winner is committed; speed changes playback only. Pause freezes the round. Reshape track offers 12 pointer/keyboard handles; applying the edit reuses the last selected weights on the new geometry. Cancel restores the original session. New circuits and starting-model changes reset the model.

Follow a driver (or choose Best driver under options) to inspect its sampled pedal commands: rust for braking, gray for coasting and green for acceleration. These are recorded control outputs, not a precomputed racing line. Seed files declare a physics version; incompatible models are rejected.

The grip-v2 starter uses 410 parameters, trained on 90,110 examples from 80 circuits. Run `node tools/driving/evaluate.mjs` to reproduce the saved held-out/optimization report in `tools/driving/evaluation-grip-v2.json`. It completed 10/10 unseen seeds from the same procedural family. At 40 generations, default-circuit time changed from 15.13s to 11.83s with recorded braking and wider trajectories. These are toy-physics results, not proof of an optimal or real-world racing line.
