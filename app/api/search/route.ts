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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { query, buyRegion, city, radius } = body

    if (!query) {
      return Response.json({ error: "Missing search query" }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 })
    }

    const region = buyRegion || "anywhere in the US outside Utah"
    const locationFilter = city ? `within ${radius || 100} miles of ${city}` : region
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
        max_tokens: 5000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [
          {
            role: "user",
            content: `You are a buying intelligence system for an equipment flipper based in Utah.

TASK 1: Search KSL.com and Facebook Marketplace for "${query}" currently for sale in Utah. Find 5-10 real listings. Extract real asking prices only. Do NOT include MachineryTrader or dealer listings.

TASK 2: Search Craigslist and Facebook Marketplace for "${query}" for sale ${locationFilter}. Find 5-10 real current private seller listings outside Utah.

For each buy listing also detect:
- seller pressure signals: "need gone", "moving", "make offer", "OBO", "price reduced", "motivated"
- how long it has been listed if mentioned
- any price drop mentioned

CRITICAL: Your entire response must be ONLY the JSON object below. Start your response with { and end with }. No text before or after. No explanation. No "Based on my search". Just the raw JSON:
{
  "utahComps": {
    "avg": number,
    "low": number,
    "high": number,
    "samples": number,
    "priceList": [number]
  },
  "listings": [
    {
      "title": string,
      "price": number,
      "description": string,
      "url": string,
      "location": string,
      "daysListed": number or null,
      "previousPrice": number or null,
      "sellerPressure": boolean,
      "pressureSignals": [string]
    }
  ]
}`
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
      }, { status: 500 })
    }

    let result: any = {}
    try {
      result = JSON.parse(jsonMatch[0])
    } catch {
      return Response.json({ error: "Failed to parse response" }, { status: 500 })
    }

    const utahComps = result.utahComps || { avg: 0, low: 0, high: 0, samples: 0, priceList: [] }

    const priceList: number[] = utahComps.priceList || []
    let spreadScore = 0
    if (priceList.length > 1) {
      const spread = utahComps.high - utahComps.low
      const spreadPct = spread / utahComps.avg
      spreadScore = spreadPct < 0.2 ? 100 : spreadPct < 0.4 ? 70 : spreadPct < 0.6 ? 40 : 20
    }

    const listings = (result.listings || []).map((l: any) => ({
      ...l,
      utahAvg: utahComps.avg,
      utahLow: utahComps.low,
      utahHigh: utahComps.high,
      utahSamples: utahComps.samples,
      spreadScore,
      transportCost,
    }))

    return Response.json({
      listings,
      utahComps,
      spreadScore,
      transportCost,
    })

  } catch {
    return Response.json({ error: "Search failed" }, { status: 500 })
  }
}
