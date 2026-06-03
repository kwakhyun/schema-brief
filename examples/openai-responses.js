import OpenAI from "openai";
import { createContract } from "schema-brief";

const client = new OpenAI();

const issueSchema = {
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
      uniqueItems: true,
      items: { type: "string" }
    }
  }
};

const contract = createContract(issueSchema);

const completion = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [
    { role: "system", content: contract.instructions },
    { role: "user", content: "The checkout page is failing for Safari users after login." }
  ],
  response_format: contract.toOpenAIResponseFormat()
});

const parsed = contract.parse(completion.choices[0].message.content ?? "");

if (!parsed.ok) {
  throw new Error(contract.repairPrompt(parsed.issues));
}

console.log(parsed.value);
