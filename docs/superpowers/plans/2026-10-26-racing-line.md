# Grip and learned racing-line experiment

User approved direct acceleration/braking, grip limits, farther road observations, and selected-path braking/acceleration colors. Preserve the minimal white portfolio UI and static GitHub Pages compatibility.

- [x] Replace target-speed dynamics with direct signed pedal control and grip-limited turning; add meaningful braking and force-limit tests before implementation.
- [x] Add sufficient lookahead observations; retrain the starter against the new physics and export versioned weights with reproducible scripts. Check held-out completion without relaxing acceptance to hide failure.
- [x] Expose actual control telemetry in every recorded trace. Highlight a followed path by braking/coasting/acceleration and provide a best-driver selection, with a small legend only while inspecting.
- [x] Update model disclosure/provenance and reject incompatible seed files. Keep the worker and all compute local to the browser.
- [x] Measure actual lap-time, braking and path changes over deterministic evolution on unseen circuits. Treat any racing-line emergence as an observation, never a scripted or guaranteed optimum.
- [x] Verify regressions and real browser learning, follow controls, reshape/retained weights, responsive layout, and final screenshot. Keep changes local.

Verification: 24 regression tests passed (20 Node, 4 Python), clean diff check and independent read-only code review. Starter completed 10/10 held-out circuits from the same procedural family. Seed2 improved 15.13s to11.83s in40 deterministic generations, with sampled braking fraction27.09% to15.21%; actual browser also reached11.83s. Other held-out evaluations and caveats are saved in driving-training/evaluation-grip-v2.json. Browser verified best-driver pedal colors, real evolving laps, keyboard reshape with retained weights, and390px layout without horizontal overflow. All work remains local.
