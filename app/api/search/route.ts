export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { query, buyRegion } = body

    if (!query) {
      return Response.json({ error: "Missing search query" }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 })
    }

    const region = buyRegion || "anywhere in the US outside Utah"

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 3000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [
          {
            role: "user",
            content: `You are a buying intelligence system for an equipment flipper based in Utah.

Do two things in one response:

1. Search KSL.com for "${query}" currently for sale in Utah. Get real asking prices to establish the Utah sell market.

2. Search Craigslist and Facebook Marketplace for "${query}" for sale in ${region}. Find real current listings outside Utah to buy from.

Return ONLY this raw JSON object, no explanation, no markdown, no code fences:

{
  "utahAvgPrice": number,
  "utahLowPrice": number,
  "utahHighPrice": number,
  "listings": [
    {
      "title": string,
      "price": number,
      "description": string,
      "url": string,
      "location": string
    }
  ]
}

All prices are numbers only, no $ signs. listings should have 5-10 real results from the buy region.`
          }
        ]
      })
    })

    const data = await response.json()

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 })
    }

    const textBlock = data.content?.find((b: any) => b.type === "text")?.text || ""
    const cleaned = textBlock.replace(/```json|```/g, "").trim()

    let result: any = {}
    try {
      // Try direct parse first
      result = JSON.parse(cleaned)
    } catch {
      // Try to extract JSON object from anywhere in the text
      const jsonMatch = textBlock.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0])
        } catch {
          return Response.json({ error: "Failed to parse response" }, { status: 500 })
        }
      } else {
        return Response.json({ error: "Failed to parse response" }, { status: 500 })
      }
    }

    const listings = (result.listings || []).map((l: any) => ({
      ...l,
      utahAvgPrice: result.utahAvgPrice || 0,
      utahLowPrice: result.utahLowPrice || 0,
      utahHighPrice: result.utahHighPrice || 0,
    }))

    return Response.json({
      listings,
      utahComps: {
        utahAvgPrice: result.utahAvgPrice || 0,
        utahLowPrice: result.utahLowPrice || 0,
        utahHighPrice: result.utahHighPrice || 0,
      }
    })

  } catch (err) {
    return Response.json({ error: "Search failed" }, { status: 500 })
  }
}
