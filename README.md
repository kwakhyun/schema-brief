# schema-brief

Compact JSON Schema into LLM-ready instructions, extract JSON from model output, and validate the response with the same contract.

`schema-brief` is designed for TypeScript AI applications that need structured output without adding a heavy validation or prompt-engineering dependency. It supports the most common JSON Schema subset used for model outputs, optional Zod/Valibot adapter helpers, and provider helper shapes for OpenAI and Anthropic.

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
| JSON extraction utilities | Pulling JSON out of messy model text | `schema-brief` extracts one or many JSON payloads and couples extraction with schema prompt generation, validation, repair text, and provider formats. |
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

You can also create a reusable contract object:

```js
import { createContract } from "schema-brief";

const contract = createContract(schema);

await model.generate({
  system: contract.instructions,
  response_format: contract.toOpenAIResponseFormat()
});

const parsed = contract.parse(modelText);
```

## Zod and Valibot

`schema-brief` stays zero-dependency. For Zod and Valibot, pass the official JSON Schema converter from your app:

```js
import * as z from "zod";
import { createContractFromZod } from "schema-brief";

const User = z.object({
  name: z.string(),
  email: z.email()
});

const contract = createContractFromZod(User, {
  toJSONSchema: z.toJSONSchema,
  validation: { formats: true }
});
```

```js
import * as v from "valibot";
import { toJsonSchema } from "@valibot/to-json-schema";
import { createContractFromValibot } from "schema-brief";

const User = v.object({
  name: v.string(),
  email: v.pipe(v.string(), v.email())
});

const contract = createContractFromValibot(User, {
  toJsonSchema,
  validation: { formats: true }
});
```

Zod exposes `z.toJSONSchema()`. Valibot exposes JSON Schema conversion through the official `@valibot/to-json-schema` package.

## Provider Examples

OpenAI Chat Completions response format:

```js
import { createContract } from "schema-brief";

const contract = createContract(schema);

await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: contract.instructions },
    { role: "user", content: "Summarize this issue." }
  ],
  response_format: contract.toOpenAIResponseFormat()
});
```

OpenAI tool:

```js
await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Extract the issue fields." }],
  tools: [contract.toOpenAITool({ name: "save_issue" })]
});
```

Anthropic tool:

```js
await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 512,
  messages: [{ role: "user", content: "Extract the issue fields." }],
  tools: [contract.toAnthropicTool({ name: "save_issue" })]
});
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

### `extractJsonValues(text)`

Extracts every complete JSON object or array from raw text.

### `splitJson(text)`

Returns `{ text, json }`, separating surrounding prose from parsed JSON payloads.

### `repairJsonText(text)`

Repairs common LLM JSON formatting mistakes before parsing, including trailing commas, JavaScript-style comments, and smart quotes. It does not evaluate code.

### `validate(schema, value)`

Validates a value against the supported JSON Schema subset.

By default, `format` is only included in prompt output. Pass `{ formats: true }` as the third argument to enable built-in format checks:

```js
validate(schema, value, { formats: true });
```

You can also provide custom format validators:

```js
validate(schema, value, {
  formats: {
    slug: (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  }
});
```

Returns:

```ts
{ ok: true, value }
// or
{ ok: false, issues: [{ path, code, message }] }
```

### `parseStructured(text, schema)`

Combines `extractJson` and `validate`.

Pass `{ formats: true }` as the third argument to enable built-in `format` checks for `email`, `url`/`uri`, `uuid`, `date`, `time`, and `date-time`.

### `parseManyStructured(text, schema)`

Extracts every JSON object or array from the text and validates each payload against the same schema.

Returns `{ ok: true, values, results }` when every payload is valid, or `{ ok: false, issues, results }` when one or more payloads fail validation.

### `createContract(schema, options?)`

Returns a reusable object with `instructions`, `parse`, `parseMany`, `validate`, `repairPrompt`, `toOpenAIResponseFormat`, `toOpenAITool`, and `toAnthropicTool`.

Pass `validation: { formats: true }` to enable format checks for every `parse`, `parseMany`, and `validate` call on the contract.

### `jsonSchemaFromZod(schema, options)`

Converts a Zod schema using an injected official converter, usually `{ toJSONSchema: z.toJSONSchema }`.

### `briefFromZod(schema, options)`

Converts a Zod schema and returns prompt text.

### `createContractFromZod(schema, options)`

Converts a Zod schema and returns a reusable contract.

### `jsonSchemaFromValibot(schema, options)`

Converts a Valibot schema using an injected official converter, usually `{ toJsonSchema }` from `@valibot/to-json-schema`.

### `briefFromValibot(schema, options)`

Converts a Valibot schema and returns prompt text.

### `createContractFromValibot(schema, options)`

Converts a Valibot schema and returns a reusable contract.

### `repairPrompt(schema, issues)`

Creates a concise prompt asking a model to repair invalid JSON.

### `toOpenAIResponseFormat(schema, options?)`

Creates an OpenAI `response_format` object using `type: "json_schema"`.

### `toOpenAITool(schema, options?)`

Creates an OpenAI tool/function definition from the schema.

### `toAnthropicTool(schema, options?)`

Creates an Anthropic tool definition from the schema.

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
- `allOf`
- `anyOf`
- `oneOf`
- `minItems`
- `maxItems`
- `uniqueItems`
- `minProperties`
- `maxProperties`
- `minLength`
- `maxLength`
- `pattern`
- `format` for prompt output, plus optional lightweight validation
- `minimum`
- `maximum`
- `exclusiveMinimum`
- `exclusiveMaximum`
- `multipleOf`

Unsupported JSON Schema keywords are ignored instead of fully evaluated. This library is not intended to replace a full JSON Schema validator such as AJV. Common unsupported keywords include `$ref`, `$defs`, `dependentRequired`, `dependentSchemas`, `if`/`then`/`else`, `contains`, `propertyNames`, `patternProperties`, `prefixItems`, and `unevaluatedProperties`.

## Size Budget

`schema-brief` is dependency-free and checks its browser-facing source size in CI:

```sh
npm run size
```

The current gzip budget is 16 kB.

## Product Roadmap

- Standard Schema adapter
- Token-budgeted schema compression
- Schema-aware JSON repair suggestions with deterministic patches

## Development

```sh
npm test
npm run check
```

## License

MIT
