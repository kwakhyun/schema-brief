# Contributing

Thanks for helping improve `schema-brief`.

## Development

```sh
npm test
npm run check
```

The package intentionally has no runtime dependencies. Please avoid adding dependencies unless they unlock a core use case that cannot be implemented clearly in a small amount of code.

## Scope

Good first contributions:

- More JSON Schema keyword support.
- Better validation issue messages.
- Provider examples for OpenAI, Anthropic, Vercel AI SDK, and local models.
- Adapters for Zod and Standard Schema.
- Edge cases for JSON extraction.

Out of scope for now:

- Becoming a full JSON Schema validator.
- Owning model calls or SDK orchestration.
- Provider-specific lock-in.

## Pull Requests

Please include tests for behavior changes and keep public API changes documented in `README.md`.
