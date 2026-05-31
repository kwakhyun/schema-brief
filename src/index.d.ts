export type JsonTypeName =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null"
  | "array"
  | "object";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export interface JsonSchema {
  type?: JsonTypeName | JsonTypeName[];
  title?: string;
  description?: string;
  enum?: readonly JsonValue[];
  const?: JsonValue;
  properties?: Record<string, JsonSchema>;
  required?: readonly string[];
  additionalProperties?: boolean | JsonSchema;
  items?: JsonSchema | readonly JsonSchema[];
  allOf?: readonly JsonSchema[];
  anyOf?: readonly JsonSchema[];
  oneOf?: readonly JsonSchema[];
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
}

export interface BriefOptions {
  title?: string;
  includeDescriptions?: boolean;
  examples?: readonly JsonValue[];
  maxDepth?: number;
}

export interface ValidationIssue {
  path: string;
  code: string;
  message: string;
}

export type ValidationResult<T = unknown> =
  | { ok: true; value: T }
  | { ok: false; issues: ValidationIssue[] };

export type ParseResult<T = unknown> = ValidationResult<T>;

export function brief(schema: JsonSchema, options?: BriefOptions): string;
export function extractJson(text: string): unknown;
export function validate<T = unknown>(schema: JsonSchema, value: unknown): ValidationResult<T>;
export function parseStructured<T = unknown>(text: string, schema: JsonSchema): ParseResult<T>;
export function repairPrompt(schema: JsonSchema, issues: readonly ValidationIssue[]): string;
