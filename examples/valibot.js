import * as v from "valibot";
import { toJsonSchema } from "@valibot/to-json-schema";
import { createContractFromValibot } from "schema-brief";

const Issue = v.object({
  severity: v.picklist(["low", "medium", "high"]),
  summary: v.pipe(v.string(), v.maxLength(140)),
  reporterEmail: v.pipe(v.string(), v.email())
});

const contract = createContractFromValibot(Issue, {
  toJsonSchema,
  validation: { formats: true }
});

console.log(contract.instructions);
console.log(contract.parse("{\"severity\":\"high\",\"summary\":\"Checkout fails\",\"reporterEmail\":\"ops@example.com\"}"));
