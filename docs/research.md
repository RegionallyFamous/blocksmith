# Research Notes

Blocksmith does not claim to ingest every WordPress.org document. That would be noisy and brittle. The project tracks the primary docs that define the surfaces it compiles to and validates against.

## Current source set

- Theme structure: https://developer.wordpress.org/themes/core-concepts/theme-structure/
- Global settings and styles: https://developer.wordpress.org/themes/global-settings-and-styles/
- theme.json v3: https://developer.wordpress.org/block-editor/reference-guides/theme-json-reference/theme-json-living/
- Block markup representation: https://developer.wordpress.org/block-editor/getting-started/fundamentals/markup-representation-block/
- Block serialization parser: https://developer.wordpress.org/block-editor/reference-guides/packages/packages-block-serialization-default-parser/
- Patterns in templates: https://developer.wordpress.org/themes/patterns/usage-in-templates/
- Style variations: https://developer.wordpress.org/themes/global-settings-and-styles/style-variations/
- Playground Blueprints: https://wordpress.github.io/wordpress-playground/blueprints/
- wp-env: https://developer.wordpress.org/block-editor/getting-started/devenv/get-started-with-wp-env/
- Theme Review requirements: https://make.wordpress.org/themes/handbook/review/required/
- Theme Check plugin: https://github.com/WordPress/theme-check
- Create Block Theme plugin: https://wordpress.org/plugins/create-block-theme/

## Product stance

Blocksmith should keep reading deeper as features expand, but it should not turn WordPress docs into model memory soup. Each new compiler surface must cite the official docs that define it, add fixtures, and add validation evidence.
