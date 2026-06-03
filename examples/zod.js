import * as z from "zod";
import { createContractFromZod } from "schema-brief";

const Issue = z.object({
  severity: z.enum(["low", "medium", "high"]),
  summary: z.string().max(140),
  reporterEmail: z.email()
});

const contract = createContractFromZod(Issue, {
  toJSONSchema: z.toJSONSchema,
  validation: { formats: true }
});

console.log(contract.instructions);
console.log(contract.parse("{\"severity\":\"high\",\"summary\":\"Checkout fails\",\"reporterEmail\":\"ops@example.com\"}"));
