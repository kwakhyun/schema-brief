# Competitive Analysis

Research date: 2026-06-01

## Decision

Proceed with an open-source release.

The structured-output space is active, but `schema-brief` has a defensible wedge: a tiny, provider-neutral package that turns JSON Schema into compact LLM instructions, extracts JSON, validates the result, and creates repair prompts without runtime dependencies.

## Direct and Adjacent Competitors

| Project | Category | Strength | Gap `schema-brief` Targets |
| --- | --- | --- | --- |
| LangChain structured output | AI framework | Agent integration, provider/tool strategies, retries | Heavy dependency surface for teams that only need prompt/parse/validate helpers. |
| Vercel AI SDK structured output | AI app SDK | Strong TypeScript DX inside Vercel/AI SDK workflows | Coupled to an SDK workflow; less useful as a tiny standalone boundary utility. |
| `@solvers-hub/llm-json` | JSON extraction | Extracts multiple JSON values and attempts correction | Focuses more on extraction/correction than JSON Schema prompt compilation. |
| `ai-validator` | LLM validation helper | Generates prompts from Zod and parses model output | Low current download signal, older OpenAI examples, Zod-oriented rather than JSON Schema-first. |
| `@firefliesai/schema-forge` | Schema conversion | Converts classes and JSON Schema into provider formats | More about schema generation/conversion than post-output validation and repair prompts. |
| AJV / json-schema-library | JSON Schema tooling | Mature, broad JSON Schema support | Not LLM-specific and does not generate compact prompts or repair instructions. |
| TypeChat | Type-driven structured output | Strong TypeScript interface workflow and repair loop | Uses TypeScript source/interface workflow; `schema-brief` starts from portable JSON Schema. |

## Positioning

One sentence:

> `schema-brief` is a zero-dependency JSON Schema boundary kit for LLM structured outputs: prompt, parse, validate, repair.

## Competitive Advantages

- JSON Schema-first: works with OpenAPI, MCP, provider structured-output APIs, and generated schemas.
- Provider-neutral: no OpenAI, Anthropic, LangChain, or Vercel dependency.
- Small package: current dry-run tarball is under 7 kB.
- Practical workflow: one schema produces prompt instructions, validation issues, and retry prompts.
- Plain ESM plus `.d.ts`: easy to adopt from JavaScript or TypeScript without a build step.

## Risks

- Full JSON Schema compliance is out of scope for v0.1.0, so the README must stay explicit about supported keywords.
- Large frameworks can copy the idea, so distribution should emphasize the tiny standalone use case.
- The package needs adapters quickly after launch: Zod, Standard Schema, and provider examples will improve discoverability.

## Release Recommendation

Release `0.1.0` to npm as soon as npm authentication and a public repository are available. The package name `schema-brief` was checked against the npm registry and returned `404 Not Found`, so it appears available at the time of research.
