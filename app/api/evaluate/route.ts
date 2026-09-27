import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { z } from "zod";
import { db } from "@/app/db/index";
import { fleetProposals } from "@/db/schema";
import { eq } from "drizzle-orm";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  const { proposalId, companyName, fleetSize, kraPin } = await req.json();

  // Run structured AI actuary evaluation
  const { object } = await generateObject({
    model: groq("llama-3.3-70b-versatile"),
    schema: z.object({
      riskScore: z
        .number()
        .describe("Score from 1 to 100 where higher means riskier"),
      complianceStatus: z.enum(["Valid", "Flagged"]),
      recommendedAction: z.enum(["Approve", "Manual Review", "Decline"]),
      rationale: z
        .string()
        .describe(
          "Short 2-sentence underwriting rationale for Kenyan commercial fleet",
        ),
    }),
    prompt: `Analyze this commercial fleet insurance application for \({companyName} in Kenya. Fleet size:\){fleetSize} vehicles. KRA PIN: ${kraPin}. Evaluate tax compliance risk and fleet exposure.`,
  });

  // Update proposal in PostgreSQL via Drizzle
  await db
    .update(fleetProposals)
    .set({
      status: object.recommendedAction === "Approve" ? "Approved" : "Flagged",
      riskScore: object.riskScore,
      aiRationale: object.rationale,
    })
    .where(eq(fleetProposals.id, proposalId));

  return Response.json({ success: true, evaluation: object });
}
