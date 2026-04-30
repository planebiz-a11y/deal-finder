import OpenAI from "openai"

export async function POST(req: Request) {
  const { text } = await req.json()

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is missing" },
      { status: 500 }
    )
  }

  const openai = new OpenAI({
    apiKey,
  })

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `
You are an expert equipment flipping and valuation assistant for Utah resale.

Analyze listings for:
- UTVs / side-by-sides
- trailers
- skid steers
- excavators
- farm equipment
- industrial equipment

Return ONLY valid JSON.

Use conservative resale assumptions.
Estimate Utah fast-flip resale value (not dealer retail).
Assume at least $1,000 desired profit.

Return this JSON structure:

{
  "title": "",
  "category": "",
  "year": null,
  "make": "",
  "model": "",
  "hours": null,
  "miles": null,
  "askingPrice": null,
  "conditionScore": 0,
  "riskLevel": "Low | Medium | High",
  "riskFlags": [],
  "positiveSignals": [],
  "estimatedUtahFastFlipValueLow": 0,
  "estimatedUtahFastFlipValueHigh": 0,
  "recommendedFastFlipValue": 0,
  "transportEstimate": 300,
  "repairRiskBuffer": 500,
  "minimumProfitTarget": 1000,
  "safeMAO": 0,
  "aggressiveMAO": 0,
  "recommendedOpeningOffer": 0,
  "walkAwayPrice": 0,
  "estimatedProfitAtAsking": 0,
  "estimatedProfitAtRecommendedOffer": 0,
  "expectedSellTime": "",
  "dealRating": "BUY NOW | NEGOTIATE | PASS",
  "dealScore": 0,
  "recommendation": "",
  "cashOfferMessage": ""
}
        `,
      },
      {
        role: "user",
        content: text,
      },
    ],
  })

    const content = completion.choices[0].message.content

  if (!content) {
    return Response.json(
      { error: "No response from AI" },
      { status: 500 }
    )
  }

  return Response.json(JSON.parse(content))
}
