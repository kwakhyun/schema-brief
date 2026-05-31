# Open Source Plan: schema-brief

## Positioning

`schema-brief` targets TypeScript AI engineers who need structured LLM outputs but do not want to commit their whole stack to one AI SDK or validation framework.

The wedge is intentionally narrow:

1. Compile JSON Schema into concise LLM instructions.
2. Extract JSON from model output.
3. Validate the value.
4. Generate a repair prompt from validation issues.

## Why It Can Travel Globally

- It is framework-neutral and works with any model provider.
- It has no runtime dependencies, which matters in security-sensitive AI supply chains.
- It speaks JSON Schema, a portable contract format already used by OpenAPI, MCP tools, function calling, and typed SDKs.
- It is TypeScript-friendly without forcing a TypeScript build step.

## Initial Audience

- AI app developers using TypeScript.
- Teams building agents, tool calls, extractors, and workflow automation.
- Developers who already have OpenAPI or JSON Schema contracts.

## Distribution Strategy

- Publish to npm under `schema-brief`.
- Add examples for OpenAI Responses API, Anthropic tool use, and Vercel AI SDK.
- Write launch posts around "one schema for prompt, parse, validate, repair".
- Submit integrations to JSON Schema, Zod, and AI SDK ecosystem lists after adapters exist.

## Success Metrics

- Week 1: 100 GitHub stars, 500 npm downloads.
- Month 1: first external issue or PR, 2,000 weekly npm downloads.
- Month 3: SDK adapters released, 10,000 weekly npm downloads.
