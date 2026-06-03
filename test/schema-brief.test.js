import assert from "node:assert/strict";
import test from "node:test";
import {
  brief,
  createContract,
  createContractFromValibot,
  createContractFromZod,
  extractJson,
  extractJsonValues,
  jsonSchemaFromValibot,
  jsonSchemaFromZod,
  parseManyStructured,
  parseStructured,
  repairJsonText,
  repairPrompt,
  splitJson,
  toAnthropicTool,
  toOpenAIResponseFormat,
  toOpenAITool,
  validate
} from "../src/index.js";

const taskSchema = {
  title: "TaskSummary",
  type: "object",
  required: ["title", "priority", "tags"],
  additionalProperties: false,
  properties: {
    title: {
      type: "string",
      minLength: 3,
      description: "Short human-readable task title"
    },
    priority: {
      enum: ["low", "medium", "high"]
    },
    tags: {
      type: "array",
      minItems: 1,
      maxItems: 3,
      items: { type: "string" }
    }
  }
};

test("brief compiles JSON Schema into concise prompt text", () => {
  const text = brief(taskSchema);

  assert.match(text, /Return JSON for TaskSummary/);
  assert.match(text, /title: string/);
  assert.match(text, /priority: "low" \| "medium" \| "high"/);
  assert.match(text, /no extra properties/);
  assert.match(text, /\$\.title: Short human-readable task title/);
});

test("brief includes supported validation constraints in prompt text", () => {
  const text = brief({
    type: "object",
    minProperties: 1,
    maxProperties: 2,
    additionalProperties: false,
    properties: {
      score: {
        type: "number",
        exclusiveMinimum: 0,
        exclusiveMaximum: 10,
        multipleOf: 0.5
      },
      tags: {
        type: "array",
        uniqueItems: true,
        minItems: 1,
        items: { type: "string" }
      }
    }
  });

  assert.match(text, /1-2 properties/);
  assert.match(text, /no extra properties/);
  assert.match(text, />0/);
  assert.match(text, /<10/);
  assert.match(text, /multiple of 0.5/);
  assert.match(text, /unique items/);
});

test("extractJson handles markdown fences and surrounding prose", () => {
  assert.deepEqual(extractJson("```json\n{\"ok\":true}\n```"), { ok: true });
  assert.deepEqual(extractJson("Here is the payload: {\"ok\":[1,2,3]} thanks"), { ok: [1, 2, 3] });
});

test("extractJson skips non-json fenced text before a JSON payload", () => {
  const text = "```text\nnot json\n```\nThen:\n```json\n{\"ok\":true}\n```";

  assert.deepEqual(extractJson(text), { ok: true });
});

test("extractJsonValues returns every JSON value in model text", () => {
  const values = extractJsonValues("First {\"a\":1} second [true,false] done.");

  assert.deepEqual(values, [{ a: 1 }, [true, false]]);
});

test("extractJsonValues preserves duplicate JSON payloads", () => {
  const values = extractJsonValues("{\"a\":1}\n{\"a\":1}");

  assert.deepEqual(values, [{ a: 1 }, { a: 1 }]);
});

test("extractJsonValues preserves order across fenced and inline JSON", () => {
  const values = extractJsonValues("{\"a\":1}\n```json\n{\"b\":2}\n```\n{\"c\":3}");

  assert.deepEqual(values, [{ a: 1 }, { b: 2 }, { c: 3 }]);
});

test("splitJson separates prose from JSON payloads", () => {
  const result = splitJson("Before {\"a\":1} after [2,3] done");

  assert.deepEqual(result.text, ["Before", "after", "done"]);
  assert.deepEqual(result.json, [{ a: 1 }, [2, 3]]);
});

test("splitJson removes markdown fence wrappers from surrounding text", () => {
  const result = splitJson("Before ```json\n{\"a\":1}\n``` after");

  assert.deepEqual(result.text, ["Before", "after"]);
  assert.deepEqual(result.json, [{ a: 1 }]);
});

test("repairJsonText and extractJson handle common LLM JSON glitches", () => {
  const repaired = repairJsonText("{\n// comment\n\"a\": 1,\n}");

  assert.equal(repaired, "{\n\n\"a\": 1\n}");
  assert.deepEqual(extractJson("{\n// comment\n\"a\": 1,\n}"), { a: 1 });
});

test("repairJsonText preserves comma-brace text inside strings", () => {
  const repaired = repairJsonText("{\"text\":\",}\",}");

  assert.equal(repaired, "{\"text\":\",}\"}");
  assert.deepEqual(extractJson("{\"text\":\",}\",}"), { text: ",}" });
});

test("validate accepts matching objects", () => {
  const result = validate(taskSchema, {
    title: "Ship API",
    priority: "high",
    tags: ["api", "release"]
  });

  assert.equal(result.ok, true);
});

test("validate treats integers as valid JSON Schema numbers", () => {
  const result = validate({ type: "number", minimum: 1 }, 1);

  assert.equal(result.ok, true);
});

test("validate reports required, enum, length, and extra property errors", () => {
  const result = validate(taskSchema, {
    title: "No",
    priority: "urgent",
    tags: [],
    extra: true
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((item) => item.code).sort(),
    ["additional_property", "enum", "min_items", "min_length"]
  );
});

test("validate reports invalid regex patterns instead of throwing", () => {
  const result = validate({ type: "string", pattern: "[" }, "abc");

  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, "invalid_pattern");
});

test("validate can opt into built-in format validators", () => {
  const schema = {
    type: "object",
    properties: {
      email: { type: "string", format: "email" },
      website: { type: "string", format: "url" },
      id: { type: "string", format: "uuid" }
    }
  };

  assert.equal(
    validate(
      schema,
      {
        email: "user@example.com",
        website: "https://example.com",
        id: "123e4567-e89b-12d3-a456-426614174000"
      },
      { formats: true }
    ).ok,
    true
  );

  const result = validate(schema, { email: "nope", website: "ftp://example.com", id: "x" }, { formats: true });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((item) => item.path).sort(),
    ["$.email", "$.id", "$.website"]
  );
});

test("validate can use custom format validators", () => {
  const result = validate(
    { type: "string", format: "slug" },
    "Not a slug",
    { formats: { slug: (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) } }
  );

  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, "format");
});

test("validate supports tuple items and uniqueItems", () => {
  const schema = {
    type: "array",
    uniqueItems: true,
    items: [{ type: "string" }, { type: "integer" }]
  };

  assert.equal(validate(schema, ["ok", 1]).ok, true);

  const result = validate(schema, ["ok", "nope", "ok"]);
  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((item) => item.code).sort(),
    ["type", "unique_items"]
  );
});

test("validate supports object, number, and composition constraints", () => {
  const result = validate(
    {
      allOf: [
        {
          type: "object",
          minProperties: 2,
          maxProperties: 2,
          required: ["count"],
          properties: {
            count: {
              type: "integer",
              exclusiveMinimum: 0,
              maximum: 10,
              multipleOf: 2
            }
          }
        },
        {
          type: "object",
          properties: {
            status: { anyOf: [{ const: "ready" }, { const: "queued" }] }
          }
        }
      ]
    },
    { count: 4, status: "ready" }
  );

  assert.equal(result.ok, true);
});

test("validate reports object and number constraint failures", () => {
  const result = validate(
    {
      type: "object",
      minProperties: 2,
      maxProperties: 2,
      properties: {
        count: {
          type: "number",
          exclusiveMinimum: 0,
          exclusiveMaximum: 10,
          multipleOf: 2
        }
      }
    },
    { count: 11, extra: true, third: true }
  );

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((item) => item.code).sort(),
    ["exclusive_maximum", "max_properties", "multiple_of"]
  );
});

test("validate reports oneOf mismatches", () => {
  const result = validate({ oneOf: [{ type: "string" }, { type: "integer" }] }, true);

  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, "one_of");
});

test("parseStructured extracts and validates model output", () => {
  const result = parseStructured(
    "Sure:\n```json\n{\"title\":\"Review PR\",\"priority\":\"medium\",\"tags\":[\"code\"]}\n```",
    taskSchema
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    title: "Review PR",
    priority: "medium",
    tags: ["code"]
  });
});

test("parseManyStructured validates every extracted JSON payload", () => {
  const result = parseManyStructured("{\"title\":\"A good task\",\"priority\":\"low\",\"tags\":[\"ops\"]}\n{\"title\":\"No\",\"priority\":\"low\",\"tags\":[\"ops\"]}", taskSchema);

  assert.equal(result.ok, false);
  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].ok, true);
  assert.equal(result.results[1].ok, false);
  assert.equal(result.issues[0].path, "$.title");
});

test("createContract bundles prompt, parse, validate, repair, and provider helpers", () => {
  const contract = createContract(taskSchema);
  const parsed = contract.parse("{\"title\":\"Review PR\",\"priority\":\"high\",\"tags\":[\"code\"]}");

  assert.match(contract.prompt, /TaskSummary/);
  assert.equal(parsed.ok, true);
  assert.equal(contract.parseMany("{\"title\":\"Review PR\",\"priority\":\"high\",\"tags\":[\"code\"]}").ok, true);
  assert.equal(contract.validate(parsed.value).ok, true);
  assert.match(contract.repairPrompt([{ path: "$.priority", code: "enum", message: "Expected priority" }]), /priority/);
  assert.equal(contract.toOpenAIResponseFormat().json_schema.name, "TaskSummary");
});

test("Zod and Valibot adapters use injected JSON Schema converters", () => {
  const zodSchema = { kind: "zod" };
  const valibotSchema = { kind: "valibot" };
  const zodConverter = (schema) => ({
    title: schema.kind,
    type: "object",
    required: ["name"],
    properties: { name: { type: "string" } }
  });
  const valibotConverter = (schema) => ({
    title: schema.kind,
    type: "object",
    required: ["ok"],
    properties: { ok: { type: "boolean" } }
  });

  assert.equal(jsonSchemaFromZod(zodSchema, { toJSONSchema: zodConverter }).title, "zod");
  assert.match(createContractFromZod(zodSchema, { toJSONSchema: zodConverter }).prompt, /zod/);
  assert.equal(jsonSchemaFromValibot(valibotSchema, { toJsonSchema: valibotConverter }).title, "valibot");
  assert.equal(createContractFromValibot(valibotSchema, { toJsonSchema: valibotConverter }).validate({ ok: true }).ok, true);
});

test("provider helpers produce OpenAI and Anthropic schema shapes", () => {
  assert.deepEqual(toOpenAIResponseFormat(taskSchema).type, "json_schema");
  assert.deepEqual(toOpenAITool(taskSchema).function.parameters, taskSchema);
  assert.deepEqual(toAnthropicTool(taskSchema).input_schema, taskSchema);
});

test("repairPrompt includes schema and validation issues", () => {
  const result = validate(taskSchema, { title: "Fix", priority: "later", tags: ["ops"] });
  assert.equal(result.ok, false);

  const prompt = repairPrompt(taskSchema, result.issues);
  assert.match(prompt, /Fix the JSON/);
  assert.match(prompt, /\$\.priority/);
});
