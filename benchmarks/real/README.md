# Real regression cases

These are executable regressions, not a static example. The default dataset is intentionally small: it contains only incidents that this repository has evidence for.

Run:

```bash
npm run benchmark:real
npm run benchmark:real:validate
```

Each case must include:

- `id`, `source`, `skill`, `change`, `expected`, `notes`;
- `before` and `after` observations;
- `run`: a CLI command and expected exit code.

The runner substitutes `{root}` and `{tmp}` placeholders, runs the command and compares the exit code. A case without an executable `run` is not proof and should not be counted.

## Rule

Do not anonymise away the evidence. Remove credentials and private business data, but keep the observable failure and state transition. Do not invent partner incidents or issue URLs.

## Run specs

Three kinds of executable spec are supported. A case must use one of them; there is no "documentation only" case.

- `cli` — runs `bin/skillcanary.js` with `args` (the default shape);
- `node` — runs `node <script>` with `args`, for checks that assert repository invariants;
- `npm` — runs `npm run <script>`, for demos and builders that must keep working.

`{root}` and `{tmp}` are substituted inside `args` and `cwd`.
