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
        model: "claude-sonnet-4-6",
        max_tokens: 3000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [
          {
            role: "user",
            content: `You are a buying intelligence system for an equipment flipper based in Utah.

Search KSL.com and Facebook Marketplace for "${query}" in Utah. Find private seller prices only, no dealers.

Then search Craigslist and Facebook Marketplace for "${query}" in ${locationFilter}. Find private seller listings only.

Respond with ONLY this JSON — no other text, no markdown, just the JSON object:
{"utahComps":{"avg":11000,"low":8500,"high":14000,"samples":6,"priceList":[8500,9500,11000,12000,13500,14000]},"listings":[{"title":"2019 Polaris RZR XP 1000","price":8900,"description":"runs great low miles","url":"https://craigslist.org/abc","location":"Casper WY","daysListed":5,"previousPrice":null,"sellerPressure":false,"pressureSignals":[]}]}

Replace the example values with real data you find. Keep exact same JSON structure.`
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

    // Try to extract JSON from response
    const jsonMatch = allText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return Response.json({
        error: "No JSON found",
        allText: allText.slice(0, 2000),
      }, { status: 500 })
    }

    let result: any = {}
    try {
      result = JSON.parse(jsonMatch[0])
    } catch {
      // Try to find just the outer object if nested JSON is malformed
      const lines = jsonMatch[0].split('\n')
      const cleaned = lines.filter((l: string) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
      try {
        result = JSON.parse(cleaned)
      } catch {
        return Response.json({
          error: "Failed to parse response",
          raw: jsonMatch[0].slice(0, 1000),
        }, { status: 500 })
      }
    }

    const utahComps = result.utahComps || { avg: 0, low: 0, high: 0, samples: 0, priceList: [] }

    const priceList: number[] = utahComps.priceList || []
    let spreadScore = 0
    if (priceList.length > 1) {
      const spread = utahComps.high - utahComps.low
      const spreadPct = spread / (utahComps.avg || 1)
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
