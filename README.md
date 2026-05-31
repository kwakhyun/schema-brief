# schema-brief

Compact JSON Schema into LLM-ready instructions, extract JSON from model output, and validate the response with the same contract.

`schema-brief` is designed for TypeScript AI applications that need structured output without adding a heavy validation or prompt-engineering dependency. It supports the most common JSON Schema subset used for model outputs: objects, arrays, primitives, `required`, `enum`, `const`, string/number bounds, array bounds, and `additionalProperties`.

## Why this exists

Recent JavaScript ecosystem signals point toward three strong open-source opportunities:

- TypeScript-first libraries keep gaining share across web and AI tooling.
- AI applications increasingly need reliable structured output contracts.
- Teams want small, auditable packages at LLM boundaries instead of framework lock-in.

This package sits at that boundary: one schema becomes prompt instructions, validation, and retry guidance.

## How It Is Different

`schema-brief` is intentionally smaller than an AI framework and more LLM-focused than a general JSON Schema validator.

| Alternative | Best for | Difference |
| --- | --- | --- |
| LangChain structured output | Agent pipelines and retries inside LangChain | `schema-brief` is framework-neutral and has no provider/runtime dependency. |
| Vercel AI SDK structured output | Full-stack apps already using AI SDK | `schema-brief` can be used before or after any model call, including local models and custom SDKs. |
| AJV and JSON Schema validators | Full JSON Schema compliance and high-throughput validation | `schema-brief` optimizes for the common LLM-output subset and also generates prompt/repair text. |
| JSON extraction utilities | Pulling JSON out of messy model text | `schema-brief` couples extraction with schema prompt generation and validation feedback. |
| Zod/Valibot-based helpers | TypeScript schema-first apps | `schema-brief` starts from portable JSON Schema, which fits OpenAPI, MCP, and provider-native structured outputs. |

## Install

```sh
npm install schema-brief
```

## Quick Start

```js
import { brief, parseStructured, repairPrompt } from "schema-brief";

const schema = {
  title: "IssueTriage",
  type: "object",
  required: ["severity", "summary", "labels"],
  additionalProperties: false,
  properties: {
    severity: { enum: ["low", "medium", "high"] },
    summary: {
      type: "string",
      maxLength: 140,
      description: "A concise human-readable issue summary"
    },
    labels: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string" }
    }
  }
};

const systemPrompt = brief(schema);
// Send systemPrompt to your model.

const result = parseStructured(modelText, schema);

if (!result.ok) {
  const retryPrompt = repairPrompt(schema, result.issues);
  // Send retryPrompt with the invalid JSON.
}
```

## API

### `brief(schema, options?)`

Returns compact prompt text for a JSON Schema subset.

Options:

- `title`: override schema title in the prompt.
- `includeDescriptions`: include field descriptions. Defaults to `true`.
- `examples`: include valid JSON examples.
- `maxDepth`: limit prompt rendering depth. Defaults to `8`.

### `extractJson(text)`

Extracts and parses the first complete JSON object or array from raw text or markdown fences.

### `validate(schema, value)`

Validates a value against the supported JSON Schema subset.

Returns:

```ts
{ ok: true, value }
// or
{ ok: false, issues: [{ path, code, message }] }
```

### `parseStructured(text, schema)`

Combines `extractJson` and `validate`.

### `repairPrompt(schema, issues)`

Creates a concise prompt asking a model to repair invalid JSON.

## Supported Schema Keywords

- `type`
- `title`
- `description`
- `enum`
- `const`
- `properties`
- `required`
- `additionalProperties`
- `items`
- `minItems`
- `maxItems`
- `minLength`
- `maxLength`
- `pattern`
- `format` for prompt output only
- `minimum`
- `maximum`

## Product Roadmap

- Zod adapter: `briefFromZod(schema)`
- Standard Schema adapter
- OpenAI, Anthropic, and Vercel AI SDK helpers
- Token-budgeted schema compression
- Browser bundle size CI
- JSON repair suggestions with deterministic patches

## Development

```sh
npm test
npm run check
```

## License

MIT
