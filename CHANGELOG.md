# Changelog

## 0.2.0

- Add `extractJsonValues` for extracting multiple JSON payloads from one model response.
- Add `splitJson` for separating surrounding prose from parsed JSON payloads.
- Add `repairJsonText` for common non-eval JSON repair such as trailing commas, comments, and smart quotes.
- Add `createContract` as a reusable schema boundary object with prompt, parse, validate, repair, and provider helpers.
- Add `toOpenAIResponseFormat`, `toOpenAITool`, and `toAnthropicTool`.
- Update competitive positioning against structured-output frameworks and JSON extraction utilities.

## 0.1.1

- Improve JSON extraction when non-JSON markdown fences appear before the actual JSON payload.
- Report invalid schema `pattern` values as validation issues instead of throwing.
- Add validation support for `allOf`, `anyOf`, `oneOf`, tuple `items`, `uniqueItems`, `minProperties`, `maxProperties`, `exclusiveMinimum`, `exclusiveMaximum`, and `multipleOf`.
- Expand TypeScript declarations and README supported-keyword documentation.

## 0.1.0

- Initial release with prompt generation, JSON extraction, schema validation, and repair prompts.
