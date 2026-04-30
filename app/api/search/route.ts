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
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [
          {
            role: "user",
            content: `You are a buying intelligence system for an equipment flipper based in Utah. Search KSL.com for "${query}" for sale in Utah to get Utah sell prices. Then search Craigslist and Facebook Marketplace for "${query}" for sale in ${region}. After searching, return ONLY a raw JSON object, no explanation, no markdown, no code fences: {"utahAvgPrice":12000,"utahLowPrice":9000,"utahHighPrice":15000,"listings":[{"title":"example","price":8500,"description":"runs great","url":"https://craigslist.org/example","location":"Casper, WY"}]}`
          }
        ]
      })
    })

    const data = await response.json()

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 })
    }

    // DEBUG — return everything so we can see what Claude sent
    const allText = (data.content || [])
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")

    const jsonMatch = allText.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return Response.json({
        error: "No JSON found",
        allText: allText.slice(0, 3000),
        contentTypes: (data.content || []).map((b: any) => b.type)
      }, { status: 500 })
    }

    let result: any = {}
    try {
      result = JSON.parse(jsonMatch[0])
    } catch (e) {
      return Response.json({
        error: "JSON parse failed",
        jsonMatch: jsonMatch[0].slice(0, 1000),
        allText: allText.slice(0, 2000)
      }, { status: 500 })
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
