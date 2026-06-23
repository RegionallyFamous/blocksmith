# Block Theme Blueprint v0.1

The canonical format is JSON. YAML is accepted for humans and parsed into the same AST.

Required top-level fields:

- `apiVersion`
- `kind`
- `target`
- `metadata`
- `tokens`
- `templates`

Recommended defaults:

```yaml
apiVersion: blocksmith.io/v0.1
kind: BlockTheme
target:
  wordpress: ">=6.6"
  themeJson: 3
  php: ">=8.1"
  blockProfile: core-stable
policy:
  profile: wporg-block-theme-v1
  allowRawCode: false
  allowRemoteAssets: false
```

## Taste

Set `tasteProfile` to one of:

- `editorial-clean`
- `portfolio-bold`
- `small-business-trustworthy`
- `magazine-dense`
- `nonprofit-warm`

## V1 section kinds

- `part`
- `header`
- `footer`
- `hero`
- `intro`
- `mediaText`
- `featureGrid`
- `ctaBand`
- `postGrid`
- `archiveHeader`
- `postHeader`
- `featuredImage`
- `postContent`
- `comments`
- `pagination`
- `searchResults`
- `notFound`

