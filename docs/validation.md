# Validation

Blocksmith separates validation into layers.

## Static gates

- Blueprint JSON Schema.
- Required block-theme files.
- `theme.json` version and shape.
- WordPress block parser smoke checks.
- Remote URL scan.

## Runtime gates

The planned compatibility gate is `wp-env`:

- activate generated theme
- seed deterministic content
- run Theme Check
- inspect debug logs
- capture front-end and Site Editor screenshots

## Theme Check

When a WordPress root is available, run:

```bash
blocksmith verify theme.blueprint.yaml --wp-path /path/to/wordpress
```

The command installs and activates the Theme Check plugin, then runs:

```bash
wp theme-check run <theme-slug> --format=json
```

The output is stored in `validation-report.json` under `wordpressTools`.

## Create Block Theme

The same `--wp-path` workflow installs and activates Create Block Theme. Blocksmith uses it as a handoff tool for Site Editor export, theme.json inspection, saving editor changes into theme files, and style variation workflows.

For browser previews:

```bash
blocksmith preview theme.blueprint.yaml --with-wp-tools
```

This writes a Playground blueprint that installs `theme-check` and `create-block-theme` from WordPress.org plugins. Networking is enabled for that preview scaffold because Playground must fetch the plugins.

## Screenshots

`blocksmith verify --screenshot-url <url>` captures desktop and mobile screenshots from an already running WordPress URL using Playwright.

