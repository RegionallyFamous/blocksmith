# LLM Integration

LLM tools should generate blueprints, not raw WordPress theme files.

## Recommended loop

1. Generate `theme.blueprint.json` using the JSON Schema.
2. Run `blocksmith validate`.
3. If diagnostics exist, apply the suggested JSON Patch changes where available.
4. Run `blocksmith taste`.
5. Run `blocksmith verify`.
6. Present generated theme files, `validation-report.json`, and `taste-report.json`.

## Diagnostics

Diagnostics include:

- `code`
- `severity`
- `path`
- `message`
- `suggestion`
- optional `suggestedPatch`

Agents should repair the smallest field possible instead of regenerating the whole blueprint.

