import { API_VERSION, BLUEPRINT_KIND, sectionKinds, tasteProfiles } from "./types.js";

const hexColorPattern = "^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$";

const sectionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind"],
  properties: {
    kind: { enum: sectionKinds },
    variant: { type: "string" },
    ref: { type: "string" },
    title: { type: "string" },
    eyebrow: { type: "string" },
    text: { type: "string" },
    cta: {
      type: "object",
      additionalProperties: false,
      required: ["label", "url"],
      properties: {
        label: { type: "string" },
        url: { type: "string" }
      }
    },
    image: {
      type: "object",
      additionalProperties: false,
      properties: {
        src: { type: "string" },
        alt: { type: "string" }
      }
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: {
          title: { type: "string" },
          text: { type: "string" }
        }
      }
    },
    query: {
      type: "object",
      additionalProperties: false,
      properties: {
        perPage: { type: "integer", minimum: 1, maximum: 24 },
        order: { enum: ["asc", "desc"] },
        orderBy: { enum: ["date", "title", "menu_order"] },
        postType: { enum: ["post", "page"] }
      }
    }
  }
} as const;

const templateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["sections"],
  properties: {
    title: { type: "string" },
    sections: {
      type: "array",
      minItems: 1,
      items: sectionSchema
    }
  }
} as const;

export const blueprintSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://blocksmith.io/schemas/block-theme-blueprint.v0.1.json",
  title: "Blocksmith Block Theme Blueprint",
  type: "object",
  additionalProperties: false,
  required: ["apiVersion", "kind", "target", "metadata", "tokens", "templates"],
  properties: {
    $schema: { type: "string" },
    apiVersion: { const: API_VERSION },
    kind: { const: BLUEPRINT_KIND },
    target: {
      type: "object",
      additionalProperties: false,
      required: ["wordpress", "themeJson", "php", "blockProfile"],
      properties: {
        wordpress: { type: "string" },
        themeJson: { const: 3 },
        php: { type: "string" },
        blockProfile: { const: "core-stable" }
      }
    },
    metadata: {
      type: "object",
      additionalProperties: false,
      required: ["name"],
      properties: {
        name: { type: "string", minLength: 1 },
        slug: { type: "string", pattern: "^[a-z0-9-]+$" },
        description: { type: "string" },
        author: { type: "string" },
        version: { type: "string" },
        textDomain: { type: "string" },
        license: { type: "string" },
        requiresAtLeast: { type: "string" },
        requiresPhp: { type: "string" }
      }
    },
    tasteProfile: { enum: tasteProfiles },
    policy: {
      type: "object",
      additionalProperties: false,
      required: ["profile"],
      properties: {
        profile: { const: "wporg-block-theme-v1" },
        allowRawCode: { const: false },
        allowRemoteAssets: { const: false }
      }
    },
    tokens: {
      type: "object",
      additionalProperties: false,
      required: ["color", "typography", "spacing", "layout"],
      properties: {
        color: {
          type: "object",
          additionalProperties: { type: "string" },
          required: ["base", "contrast", "primary"],
          properties: {
            base: { type: "string", pattern: hexColorPattern },
            contrast: { type: "string", pattern: hexColorPattern },
            primary: { type: "string", pattern: hexColorPattern },
            secondary: { type: "string", pattern: hexColorPattern },
            muted: { type: "string", pattern: hexColorPattern },
            surface: { type: "string", pattern: hexColorPattern },
            surfaceAlt: { type: "string", pattern: hexColorPattern },
            border: { type: "string", pattern: hexColorPattern },
            link: { type: "string", pattern: hexColorPattern },
            buttonBg: { type: "string", pattern: hexColorPattern },
            buttonText: { type: "string", pattern: hexColorPattern },
            focus: { type: "string", pattern: hexColorPattern }
          }
        },
        typography: {
          type: "object",
          additionalProperties: false,
          required: ["bodyFont", "headingFont"],
          properties: {
            bodyFont: { type: "string" },
            headingFont: { type: "string" },
            scale: {
              type: "object",
              additionalProperties: false,
              properties: {
                small: { type: "string" },
                base: { type: "string" },
                medium: { type: "string" },
                large: { type: "string" },
                xlarge: { type: "string" },
                huge: { type: "string" }
              }
            }
          }
        },
        spacing: {
          type: "object",
          additionalProperties: false,
          required: ["md", "lg"],
          properties: {
            xs: { type: "string" },
            sm: { type: "string" },
            md: { type: "string" },
            lg: { type: "string" },
            xl: { type: "string" },
            xxl: { type: "string" }
          }
        },
        layout: {
          type: "object",
          additionalProperties: false,
          required: ["contentSize", "wideSize"],
          properties: {
            contentSize: { type: "string" },
            wideSize: { type: "string" }
          }
        },
        radius: {
          type: "object",
          additionalProperties: false,
          properties: {
            sm: { type: "string" },
            md: { type: "string" },
            lg: { type: "string" }
          }
        },
        shadow: {
          type: "object",
          additionalProperties: false,
          properties: {
            sm: { type: "string" },
            md: { type: "string" },
            lg: { type: "string" }
          }
        }
      }
    },
    assets: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["path", "source", "license"],
        properties: {
          path: { type: "string" },
          source: { type: "string" },
          license: { type: "string" },
          role: { enum: ["hero", "texture", "content", "reference"] },
          author: { type: "string" },
          copyright: { type: "string" },
          generated: { type: "boolean" }
        }
      }
    },
    parts: {
      type: "object",
      additionalProperties: templateSchema
    },
    templates: {
      type: "object",
      minProperties: 1,
      additionalProperties: templateSchema
    },
    patterns: {
      type: "object",
      additionalProperties: templateSchema
    },
    styleVariations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: {
          title: { type: "string" },
          slug: { type: "string", pattern: "^[a-z0-9-]+$" },
          tasteProfile: { enum: tasteProfiles },
          tokens: { type: "object" }
        }
      }
    }
  }
} as const;
