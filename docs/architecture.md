# Architecture

Blocksmith has one central rule: LLMs author constrained intent; trusted compiler code emits WordPress files.

## Pipeline

1. Parse canonical JSON or optional YAML.
2. Validate against the Block Theme Blueprint schema.
3. Normalize slugs, defaults, taste profile, and policy.
4. Lower semantic sections into a typed block-theme representation.
5. Emit normal WordPress files.
6. Validate generated files.
7. Score taste.
8. Package reports and optional Playground preview scaffolds.

## Output

Generated themes are ordinary block themes:

- `style.css`
- `readme.txt`
- `theme.json`
- `templates/*.html`
- `parts/*.html`
- `patterns/*.php`
- `styles/*.json`
- `resources.json`
- `blocksmith.lock`

No runtime plugin is required for the generated theme to work.

## Policy

The default v1 policy is `wporg-block-theme-v1`.

It forbids arbitrary PHP, arbitrary JavaScript, custom blocks, plugin-territory features, remote asset fetching, and automatic publication. Generated themes are drafts until a human accepts visual quality, accessibility, security, and licensing.

