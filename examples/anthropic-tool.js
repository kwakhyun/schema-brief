import Anthropic from "@anthropic-ai/sdk";
import { createContract } from "schema-brief";

const anthropic = new Anthropic();

const issueSchema = {
  title: "IssueTriage",
  type: "object",
  required: ["severity", "summary", "labels"],
  additionalProperties: false,
  properties: {
    severity: { enum: ["low", "medium", "high"] },
    summary: { type: "string", maxLength: 140 },
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

const message = await anthropic.messages.create({
  model: "claude-sonnet-4-20250514",
  max_tokens: 512,
  messages: [{ role: "user", content: "The checkout page is failing for Safari users after login." }],
  tools: [contract.toAnthropicTool({ name: "save_issue" })]
});

console.log(message.content);
