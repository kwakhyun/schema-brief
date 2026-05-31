import assert from "node:assert/strict";
import test from "node:test";
import { brief, extractJson, parseStructured, repairPrompt, validate } from "../src/index.js";

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
  assert.match(text, /\$\.title: Short human-readable task title/);
});

test("extractJson handles markdown fences and surrounding prose", () => {
  assert.deepEqual(extractJson("```json\n{\"ok\":true}\n```"), { ok: true });
  assert.deepEqual(extractJson("Here is the payload: {\"ok\":[1,2,3]} thanks"), { ok: [1, 2, 3] });
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

test("repairPrompt includes schema and validation issues", () => {
  const result = validate(taskSchema, { title: "Fix", priority: "later", tags: ["ops"] });
  assert.equal(result.ok, false);

  const prompt = repairPrompt(taskSchema, result.issues);
  assert.match(prompt, /Fix the JSON/);
  assert.match(prompt, /\$\.priority/);
});
