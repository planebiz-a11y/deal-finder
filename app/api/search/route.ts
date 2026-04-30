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

    // Step 1 — Get Utah comps (sell side)
    const compsResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [
          {
            role: "user",
            content: `Search KSL.com and Craigslist Salt Lake City for current listings of "${query}" for sale in Utah. Find 5-10 real current listings. Return ONLY a raw JSON object with this shape, no explanation, no markdown:
{"utahAvgPrice": number, "utahLowPrice": number, "utahHighPrice": number, "sampleCount": number}
Base it on real asking prices you find. Numbers only, no $ signs.`
          }
        ]
      })
    })

    const compsData = await compsResponse.json()
    const compsText = compsData.content?.find((b: any) => b.type === "text")?.text || ""
    const compsClean = compsText.replace(/```json|```/g, "").trim()

    let utahComps = { utahAvgPrice: 0, utahLowPrice: 0, utahHighPrice: 0, sampleCount: 0 }
    try {
      utahComps = JSON.parse(compsClean)
    } catch {
      // comps failed, continue without them
    }

    // Step 2 — Search buy region
    const region = buyRegion || "nationwide"
    const searchResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 2000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [
          {
            role: "user",
            content: `Search Craigslist, Facebook Marketplace, and local listing sites for "${query}" for sale in ${region}. Find real current for-sale listings outside of Utah. Return ONLY a raw JSON array, no explanation, no markdown, no code fences. Each object must have:
- title: string
- price: number (digits only, no $ sign)
- description: string (condition, hours, mileage, any issues mentioned)
- url: string (actual listing URL)
- location: string (city and state)`
          }
        ]
      })
    })

    const searchData = await searchResponse.json()
    const searchText = searchData.content?.find((b: any) => b.type === "text")?.text || ""
    const searchClean = searchText.replace(/```json|```/g, "").trim()

    let listings: any[] = []
    try {
      listings = JSON.parse(searchClean)
      if (!Array.isArray(listings)) listings = []
    } catch {
      return Response.json({ error: "Failed to parse listings" }, { status: 500 })
    }

    // Attach Utah comps to each listing so analyzer can use them
    listings = listings.map((l: any) => ({
      ...l,
      utahAvgPrice: utahComps.utahAvgPrice,
      utahLowPrice: utahComps.utahLowPrice,
      utahHighPrice: utahComps.utahHighPrice,
    }))

    return Response.json({ listings, utahComps })

  } catch (err) {
    return Response.json({ error: "Search failed" }, { status: 500 })
  }
}
