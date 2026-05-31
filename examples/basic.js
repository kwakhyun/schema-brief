import { brief, parseStructured, repairPrompt } from "schema-brief";

const schema = {
  title: "ReleaseNote",
  type: "object",
  required: ["summary", "risk", "actions"],
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      maxLength: 160,
      description: "One sentence summary for an engineering changelog"
    },
    risk: {
      enum: ["low", "medium", "high"]
    },
    actions: {
      type: "array",
      minItems: 1,
      items: { type: "string" }
    }
  }
};

const prompt = brief(schema);
console.log(prompt);

const modelOutput = `{"summary":"Adds OAuth callback validation.","risk":"low","actions":["Deploy API","Watch auth errors"]}`;
const parsed = parseStructured(modelOutput, schema);

if (!parsed.ok) {
  console.log(repairPrompt(schema, parsed.issues));
} else {
  console.log(parsed.value);
}
