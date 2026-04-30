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

    // Transport cost by region (to Utah)
    function estimateTransport(r: string): number {
      const s = r.toLowerCase()
      if (/wyoming|idaho|nevada|colorado|arizona/.test(s))       return 300
      if (/california|oregon|washington|montana/.test(s))        return 600
      if (/texas|new mexico|kansas|nebraska/.test(s))            return 800
      if (/midwest|iowa|missouri|illinois|indiana|ohio/.test(s)) return 1000
      if (/minnesota|wisconsin|michigan|dakota/.test(s))         return 1100
      if (/southeast|georgia|florida|alabama|tennessee/.test(s)) return 1200
      if (/northeast|new york|pennsylvania|virginia/.test(s))    return 1400
      return 800
    }

    const transportCost = estimateTransport(region)

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
    } catch {
      return Response.json({ error: "Failed to parse response" }, { status: 500 })
    }

    const listings = (result.listings || []).map((l: any) => ({
      ...l,
      utahAvgPrice: result.utahAvgPrice || 0,
      utahLowPrice: result.utahLowPrice || 0,
      utahHighPrice: result.utahHighPrice || 0,
      transportCost,
    }))

    return Response.json({
      listings,
      utahComps: {
        utahAvgPrice: result.utahAvgPrice || 0,
        utahLowPrice: result.utahLowPrice || 0,
        utahHighPrice: result.utahHighPrice || 0,
      },
      transportCost,
    })

  } catch {
    return Response.json({ error: "Search failed" }, { status: 500 })
  }
}
