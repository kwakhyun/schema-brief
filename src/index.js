const DEFAULT_MAX_DEPTH = 8;

/**
 * Compile a JSON Schema subset into a compact, model-readable contract.
 *
 * @param {import("./index.d.ts").JsonSchema} schema
 * @param {import("./index.d.ts").BriefOptions} [options]
 * @returns {string}
 */
export function brief(schema, options = {}) {
  const lines = [];
  const title = typeof options.title === "string" ? options.title : schema.title;
  const lead = title ? `Return JSON for ${title}.` : "Return JSON that matches this schema.";

  lines.push(lead);
  lines.push("No markdown, comments, or extra text.");
  lines.push(`Shape: ${describeSchema(schema, { depth: 0, maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH })}`);

  if (options.includeDescriptions !== false) {
    const descriptions = collectDescriptions(schema);
    if (descriptions.length > 0) {
      lines.push("Field notes:");
      for (const note of descriptions) {
        lines.push(`- ${note.path}: ${note.description}`);
      }
    }
  }

  if (Array.isArray(options.examples) && options.examples.length > 0) {
    lines.push("Examples:");
    for (const example of options.examples) {
      lines.push(stableStringify(example));
    }
  }

  return lines.join("\n");
}

/**
 * Extract the first complete JSON value from text, including fenced markdown.
 *
 * @param {string} text
 * @returns {unknown}
 */
export function extractJson(text) {
  if (typeof text !== "string") {
    throw new TypeError("extractJson expected a string");
  }

  const candidates = jsonCandidates(text);
  let lastError;

  for (const source of candidates) {
    try {
      return JSON.parse(source);
    } catch (error) {
      lastError = error;
      const slice = firstJsonSlice(source);
      if (!slice) {
        continue;
      }

      try {
        return JSON.parse(slice);
      } catch (sliceError) {
        lastError = sliceError;
      }
    }
  }

  if (lastError instanceof SyntaxError) {
    throw lastError;
  }

  throw new SyntaxError("No JSON object or array found in text");
}

/**
 * Validate a value against the supported JSON Schema subset.
 *
 * @param {import("./index.d.ts").JsonSchema} schema
 * @param {unknown} value
 * @returns {import("./index.d.ts").ValidationResult}
 */
export function validate(schema, value) {
  const issues = [];
  visit(schema, value, "$", issues, 0);
  return issues.length === 0 ? { ok: true, value } : { ok: false, issues };
}

/**
 * Extract and validate structured model output in one call.
 *
 * @param {string} text
 * @param {import("./index.d.ts").JsonSchema} schema
 * @returns {import("./index.d.ts").ParseResult}
 */
export function parseStructured(text, schema) {
  try {
    const value = extractJson(text);
    const result = validate(schema, value);
    return result.ok ? { ok: true, value } : result;
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          path: "$",
          code: "invalid_json",
          message: error instanceof Error ? error.message : "Invalid JSON"
        }
      ]
    };
  }
}

/**
 * Create a concise repair prompt from validation issues.
 *
 * @param {import("./index.d.ts").JsonSchema} schema
 * @param {readonly import("./index.d.ts").ValidationIssue[]} issues
 * @returns {string}
 */
export function repairPrompt(schema, issues) {
  const bulletList = issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n");
  return [
    "Fix the JSON so it matches the schema.",
    "Return only the corrected JSON.",
    brief(schema, { includeDescriptions: true }),
    "Validation errors:",
    bulletList
  ].join("\n");
}

function describeSchema(schema, context) {
  if (context.depth > context.maxDepth) {
    return "...";
  }

  if ("const" in schema) {
    return JSON.stringify(schema.const);
  }

  if (Array.isArray(schema.enum)) {
    return schema.enum.map((item) => JSON.stringify(item)).join(" | ");
  }

  if (Array.isArray(schema.oneOf)) {
    return schema.oneOf.map((child) => describeSchema(child, nextContext(context))).join(" | ");
  }

  if (Array.isArray(schema.anyOf)) {
    return schema.anyOf.map((child) => describeSchema(child, nextContext(context))).join(" | ");
  }

  if (Array.isArray(schema.allOf)) {
    return schema.allOf.map((child) => describeSchema(child, nextContext(context))).join(" & ");
  }

  const type = normalizeType(schema);

  if (Array.isArray(type)) {
    return type.join(" | ");
  }

  if (type === "object" || schema.properties) {
    const required = new Set(Array.isArray(schema.required) ? schema.required : []);
    const props = Object.entries(schema.properties ?? {}).map(([key, child]) => {
      const suffix = required.has(key) ? "" : "?";
      return `${key}${suffix}: ${describeSchema(child, nextContext(context))}`;
    });

    if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      props.push(`[key: string]: ${describeSchema(schema.additionalProperties, nextContext(context))}`);
    } else if (schema.additionalProperties === true) {
      props.push("[key: string]: unknown");
    }

    return `{ ${props.join("; ")} }`;
  }

  if (type === "array" || schema.items) {
    const item = Array.isArray(schema.items)
      ? `[${schema.items.map((child) => describeSchema(child, nextContext(context))).join(", ")}]`
      : schema.items
      ? describeSchema(schema.items, nextContext(context))
      : "unknown";
    const range = formatRange(schema.minItems, schema.maxItems, "items");
    return `Array<${item}>${range}`;
  }

  if (type === "string") {
    const parts = ["string"];
    if (schema.format) parts.push(`format:${schema.format}`);
    if (schema.pattern) parts.push(`/${schema.pattern}/`);
    const range = formatRange(schema.minLength, schema.maxLength, "chars");
    return `${parts.join(" ")}${range}`;
  }

  if (type === "number" || type === "integer") {
    const range = formatRange(schema.minimum, schema.maximum, "");
    return `${type}${range}`;
  }

  return type ?? "unknown";
}

function collectDescriptions(schema, path = "$", notes = []) {
  if (typeof schema.description === "string" && schema.description.trim()) {
    notes.push({ path, description: schema.description.trim() });
  }

  if (schema.properties) {
    for (const [key, child] of Object.entries(schema.properties)) {
      collectDescriptions(child, `${path}.${key}`, notes);
    }
  }

  if (schema.items && !Array.isArray(schema.items)) {
    collectDescriptions(schema.items, `${path}[]`, notes);
  } else if (Array.isArray(schema.items)) {
    schema.items.forEach((child, index) => {
      collectDescriptions(child, `${path}[${index}]`, notes);
    });
  }

  if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
    collectDescriptions(schema.additionalProperties, `${path}.*`, notes);
  }

  return notes;
}

function visit(schema, value, path, issues, depth) {
  if (depth > DEFAULT_MAX_DEPTH * 4) {
    issues.push(issue(path, "max_depth", "Value is too deeply nested"));
    return;
  }

  if ("const" in schema && !sameJson(schema.const, value)) {
    issues.push(issue(path, "const", `Expected ${stableStringify(schema.const)}`));
    return;
  }

  if (Array.isArray(schema.enum) && !schema.enum.some((item) => sameJson(item, value))) {
    issues.push(issue(path, "enum", `Expected one of ${schema.enum.map(stableStringify).join(", ")}`));
    return;
  }

  if (!validateCompositions(schema, value, path, issues, depth)) {
    return;
  }

  const expected = normalizeType(schema);
  if (expected && !matchesType(expected, value)) {
    issues.push(issue(path, "type", `Expected ${Array.isArray(expected) ? expected.join(" or ") : expected}`));
    return;
  }

  const type = Array.isArray(expected) ? inferType(value) : expected ?? inferType(value);

  if (type === "object" && value !== null && !Array.isArray(value) && typeof value === "object") {
    validateObject(schema, value, path, issues, depth);
  }

  if (type === "array" && Array.isArray(value)) {
    validateArray(schema, value, path, issues, depth);
  }

  if (type === "string" && typeof value === "string") {
    validateString(schema, value, path, issues);
  }

  if ((type === "number" || type === "integer") && typeof value === "number") {
    validateNumber(schema, value, path, issues);
  }
}

function validateObject(schema, value, path, issues, depth) {
  const props = schema.properties ?? {};
  const required = Array.isArray(schema.required) ? schema.required : [];
  const keys = Object.keys(value);

  if (typeof schema.minProperties === "number" && keys.length < schema.minProperties) {
    issues.push(issue(path, "min_properties", `Expected at least ${schema.minProperties} properties`));
  }

  if (typeof schema.maxProperties === "number" && keys.length > schema.maxProperties) {
    issues.push(issue(path, "max_properties", `Expected at most ${schema.maxProperties} properties`));
  }

  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) {
      issues.push(issue(`${path}.${key}`, "required", "Required property is missing"));
    }
  }

  for (const [key, childValue] of Object.entries(value)) {
    if (props[key]) {
      visit(props[key], childValue, `${path}.${key}`, issues, depth + 1);
      continue;
    }

    if (schema.additionalProperties === false) {
      issues.push(issue(`${path}.${key}`, "additional_property", "Additional property is not allowed"));
    } else if (schema.additionalProperties && typeof schema.additionalProperties === "object") {
      visit(schema.additionalProperties, childValue, `${path}.${key}`, issues, depth + 1);
    }
  }
}

function validateArray(schema, value, path, issues, depth) {
  if (typeof schema.minItems === "number" && value.length < schema.minItems) {
    issues.push(issue(path, "min_items", `Expected at least ${schema.minItems} items`));
  }

  if (typeof schema.maxItems === "number" && value.length > schema.maxItems) {
    issues.push(issue(path, "max_items", `Expected at most ${schema.maxItems} items`));
  }

  if (schema.uniqueItems === true) {
    const seen = new Set();
    for (const itemValue of value) {
      const key = stableStringify(itemValue);
      if (seen.has(key)) {
        issues.push(issue(path, "unique_items", "Expected array items to be unique"));
        break;
      }
      seen.add(key);
    }
  }

  if (Array.isArray(schema.items)) {
    schema.items.forEach((itemSchema, index) => {
      if (index < value.length) {
        visit(itemSchema, value[index], `${path}[${index}]`, issues, depth + 1);
      }
    });
  } else if (schema.items) {
    value.forEach((itemValue, index) => {
      visit(schema.items, itemValue, `${path}[${index}]`, issues, depth + 1);
    });
  }
}

function validateString(schema, value, path, issues) {
  if (typeof schema.minLength === "number" && value.length < schema.minLength) {
    issues.push(issue(path, "min_length", `Expected at least ${schema.minLength} characters`));
  }

  if (typeof schema.maxLength === "number" && value.length > schema.maxLength) {
    issues.push(issue(path, "max_length", `Expected at most ${schema.maxLength} characters`));
  }

  if (typeof schema.pattern === "string") {
    const pattern = safeRegExp(schema.pattern, path, issues);
    if (!pattern) return;
    if (!pattern.test(value)) {
      issues.push(issue(path, "pattern", `Expected string to match /${schema.pattern}/`));
    }
  }
}

function validateNumber(schema, value, path, issues) {
  if (!Number.isFinite(value)) {
    issues.push(issue(path, "finite", "Expected a finite number"));
  }

  if (schema.type === "integer" && !Number.isInteger(value)) {
    issues.push(issue(path, "integer", "Expected an integer"));
  }

  if (typeof schema.minimum === "number" && value < schema.minimum) {
    issues.push(issue(path, "minimum", `Expected value >= ${schema.minimum}`));
  }

  if (typeof schema.maximum === "number" && value > schema.maximum) {
    issues.push(issue(path, "maximum", `Expected value <= ${schema.maximum}`));
  }

  if (typeof schema.exclusiveMinimum === "number" && value <= schema.exclusiveMinimum) {
    issues.push(issue(path, "exclusive_minimum", `Expected value > ${schema.exclusiveMinimum}`));
  }

  if (typeof schema.exclusiveMaximum === "number" && value >= schema.exclusiveMaximum) {
    issues.push(issue(path, "exclusive_maximum", `Expected value < ${schema.exclusiveMaximum}`));
  }

  if (typeof schema.multipleOf === "number" && schema.multipleOf > 0) {
    const quotient = value / schema.multipleOf;
    if (Math.abs(quotient - Math.round(quotient)) > Number.EPSILON * 100) {
      issues.push(issue(path, "multiple_of", `Expected a multiple of ${schema.multipleOf}`));
    }
  }
}

function validateCompositions(schema, value, path, issues, depth) {
  if (Array.isArray(schema.allOf)) {
    for (const child of schema.allOf) {
      visit(child, value, path, issues, depth + 1);
    }
  }

  if (Array.isArray(schema.anyOf)) {
    const matches = schema.anyOf.filter((child) => validate(child, value).ok);
    if (matches.length === 0) {
      issues.push(issue(path, "any_of", "Expected value to match at least one schema"));
      return false;
    }
  }

  if (Array.isArray(schema.oneOf)) {
    const matches = schema.oneOf.filter((child) => validate(child, value).ok);
    if (matches.length !== 1) {
      issues.push(issue(path, "one_of", `Expected value to match exactly one schema, matched ${matches.length}`));
      return false;
    }
  }

  return true;
}

function normalizeType(schema) {
  if (schema.type) return schema.type;
  if (schema.properties) return "object";
  if (schema.items) return "array";
  if (typeof schema.const === "string") return "string";
  if (typeof schema.const === "number") return Number.isInteger(schema.const) ? "integer" : "number";
  if (typeof schema.const === "boolean") return "boolean";
  if (schema.const === null) return "null";
  return undefined;
}

function matchesType(expected, value) {
  const actual = inferType(value);
  if (Array.isArray(expected)) {
    return expected.some((item) => matchesType(item, value));
  }
  return actual === expected || (expected === "number" && actual === "integer");
}

function inferType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function issue(path, code, message) {
  return { path, code, message };
}

function nextContext(context) {
  return { depth: context.depth + 1, maxDepth: context.maxDepth };
}

function formatRange(min, max, unit) {
  const label = unit ? ` ${unit}` : "";
  if (typeof min === "number" && typeof max === "number") return ` (${min}-${max}${label})`;
  if (typeof min === "number") return ` (>=${min}${label})`;
  if (typeof max === "number") return ` (<=${max}${label})`;
  return "";
}

function sameJson(a, b) {
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
  return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`).join(",")}}`;
}

function jsonCandidates(text) {
  const candidates = [];
  const jsonFences = [...text.matchAll(/```json\s*([\s\S]*?)```/gi)].map((match) => match[1].trim());
  const allFences = [...text.matchAll(/```[a-zA-Z0-9_-]*\s*([\s\S]*?)```/g)].map((match) => match[1].trim());

  candidates.push(...jsonFences);
  candidates.push(...allFences.filter((candidate) => !jsonFences.includes(candidate)));
  candidates.push(text.trim());

  return candidates.filter(Boolean);
}

function safeRegExp(pattern, path, issues) {
  try {
    return new RegExp(pattern);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Invalid regular expression";
    issues.push(issue(path, "invalid_pattern", detail));
    return null;
  }
}

function firstJsonSlice(source) {
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char !== "{" && char !== "[") continue;

    const close = char === "{" ? "}" : "]";
    const stack = [close];
    let inString = false;
    let escaped = false;

    for (let cursor = index + 1; cursor < source.length; cursor += 1) {
      const current = source[cursor];

      if (escaped) {
        escaped = false;
        continue;
      }

      if (current === "\\") {
        escaped = inString;
        continue;
      }

      if (current === "\"") {
        inString = !inString;
        continue;
      }

      if (inString) continue;

      if (current === "{" || current === "[") {
        stack.push(current === "{" ? "}" : "]");
      } else if (current === "}" || current === "]") {
        if (current !== stack.pop()) break;
        if (stack.length === 0) {
          return source.slice(index, cursor + 1);
        }
      }
    }
  }

  return "";
}
