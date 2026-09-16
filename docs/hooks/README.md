# Hook layer

`skillcanary hook <event>` is host-agnostic. It reads JSON from stdin and writes JSON to stdout.

Events:

- `doctor`: validate local hook rules before host integration.
- `session-start`: load active `warning` / `blocking` armor pieces.
- `pre-tool`: apply `.skillcanary/hook-rules.json`.
- `stop`: remind when `change.json` exists without `skillcanary-report.md`.
- `session-end`: append an outcome record to `.skillcanary/outcomes.jsonl`.

Example:

```bash
skillcanary hook doctor
echo '{"tool_name":"shell","command":"..."}' | skillcanary hook pre-tool
```

Rules are configured in `.skillcanary/hook-rules.json`:

```json
{
  "preTool": [
    {
      "id": "example-rule",
      "pattern": "replace-with-regex",
      "reason": "why this is blocked"
    }
  ]
}
```

The doctor fails on missing ids/reasons, duplicate ids and invalid regular expressions. A malformed guard must not silently become an allow.

Wiring is explicit and dry-run by default:

```bash
skillcanary hook install --host claude            # prints the block, writes nothing
skillcanary hook install --host claude --write    # backs the host file up, then merges
skillcanary hook install --host codex --write     # drops a dispatcher into ~/.codex/hooks/
```

`--write` never happens as a side effect of another command, and the merge is idempotent: an existing host entry is kept and a second run changes nothing. Codex host wiring stays host-owned (point your config at the dispatcher the way your other hooks are wired). Keep environment-specific rules in your local `.skillcanary/hook-rules.json`; do not put credentials or internal tool names in the public repository.
