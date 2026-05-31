# Changelog

## 0.1.1

- Improve JSON extraction when non-JSON markdown fences appear before the actual JSON payload.
- Report invalid schema `pattern` values as validation issues instead of throwing.
- Add validation support for `allOf`, `anyOf`, `oneOf`, tuple `items`, `uniqueItems`, `minProperties`, `maxProperties`, `exclusiveMinimum`, `exclusiveMaximum`, and `multipleOf`.
- Expand TypeScript declarations and README supported-keyword documentation.

## 0.1.0

- Initial release with prompt generation, JSON extraction, schema validation, and repair prompts.
