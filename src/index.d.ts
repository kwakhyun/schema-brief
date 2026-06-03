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

export type FormatValidator = (value: string) => boolean;

export interface ValidationOptions {
  formats?: boolean | readonly string[] | Record<string, FormatValidator>;
}

export interface ContractOptions extends BriefOptions {
  validation?: ValidationOptions;
}

export type SchemaConverter = (schema: unknown, options?: unknown) => unknown;

export interface ZodAdapterOptions extends ContractOptions {
  toJSONSchema: SchemaConverter;
  converterOptions?: unknown;
}

export interface ValibotAdapterOptions extends ContractOptions {
  toJsonSchema: SchemaConverter;
  converterOptions?: unknown;
}

export interface SplitJsonResult {
  text: string[];
  json: unknown[];
}

export interface ProviderFormatOptions {
  name?: string;
  description?: string;
  strict?: boolean;
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

export type ParseManyResult<T = unknown> =
  | { ok: true; values: T[]; results: Array<{ ok: true; value: T }> }
  | { ok: false; issues: ValidationIssue[]; results: ParseResult<T>[] };

export interface OpenAIResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    strict: boolean;
    schema: JsonSchema;
    description?: string;
  };
}

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JsonSchema;
    strict: boolean;
  };
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: JsonSchema;
}

export interface OutputContract<T = unknown> {
  schema: JsonSchema;
  prompt: string;
  instructions: string;
  parse(text: string, options?: ValidationOptions): ParseResult<T>;
  parseMany(text: string, options?: ValidationOptions): ParseManyResult<T>;
  validate(value: unknown, options?: ValidationOptions): ValidationResult<T>;
  repairPrompt(issues: readonly ValidationIssue[]): string;
  toOpenAIResponseFormat(options?: ProviderFormatOptions): OpenAIResponseFormat;
  toOpenAITool(options?: ProviderFormatOptions): OpenAITool;
  toAnthropicTool(options?: ProviderFormatOptions): AnthropicTool;
}

export function brief(schema: JsonSchema, options?: BriefOptions): string;
export function extractJson(text: string): unknown;
export function extractJsonValues(text: string): unknown[];
export function splitJson(text: string): SplitJsonResult;
export function repairJsonText(text: string): string;
export function validate<T = unknown>(
  schema: JsonSchema,
  value: unknown,
  options?: ValidationOptions
): ValidationResult<T>;
export function parseStructured<T = unknown>(
  text: string,
  schema: JsonSchema,
  options?: ValidationOptions
): ParseResult<T>;
export function parseManyStructured<T = unknown>(
  text: string,
  schema: JsonSchema,
  options?: ValidationOptions
): ParseManyResult<T>;
export function createContract<T = unknown>(schema: JsonSchema, options?: ContractOptions): OutputContract<T>;
export function jsonSchemaFromZod(schema: unknown, options: ZodAdapterOptions): JsonSchema;
export function briefFromZod(schema: unknown, options: ZodAdapterOptions): string;
export function createContractFromZod<T = unknown>(schema: unknown, options: ZodAdapterOptions): OutputContract<T>;
export function jsonSchemaFromValibot(schema: unknown, options: ValibotAdapterOptions): JsonSchema;
export function briefFromValibot(schema: unknown, options: ValibotAdapterOptions): string;
export function createContractFromValibot<T = unknown>(schema: unknown, options: ValibotAdapterOptions): OutputContract<T>;
export function repairPrompt(schema: JsonSchema, issues: readonly ValidationIssue[]): string;
export function toOpenAIResponseFormat(schema: JsonSchema, options?: ProviderFormatOptions): OpenAIResponseFormat;
export function toOpenAITool(schema: JsonSchema, options?: ProviderFormatOptions): OpenAITool;
export function toAnthropicTool(schema: JsonSchema, options?: ProviderFormatOptions): AnthropicTool;
