export async function POST(req: Request) {
  try {
    const body = await req.json()
    const query = body.query

    if (!query) {
      return Response.json({ error: "Missing search query" }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return Response.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 })
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: `You are a deal-finding assistant for equipment flippers in Utah.

Generate 10 realistic example listings for: "${query}"

These should look like real Craigslist/KSL listings — varied prices, conditions, years, and detail levels. Some should have lots of info (year, hours, mileage, condition). Some should have very little info, just like real listings. Mix of good deals and bad ones.

Return ONLY a raw JSON array. No explanation, no markdown, no code fences. Just the array.

Each object must have exactly these fields:
- title: string (e.g. "2019 Polaris RZR 1000 XP")
- price: number (just digits, no $ sign)
- description: string (condition notes, hours, issues — sometimes sparse, sometimes detailed)
- url: string (make up a plausible ksl.com or craigslist.org URL)
- location: string (a Utah city)`
          }
        ]
      })
    })

    const data = await response.json()

    if (data.error) {
      return Response.json({ error: data.error.message }, { status: 500 })
    }

    const textBlock = data.content?.find((b: any) => b.type === "text")
    const raw = textBlock?.text || ""
    const cleaned = raw.replace(/```json|```/g, "").trim()

    let listings: any[] = []
    try {
      listings = JSON.parse(cleaned)
      if (!Array.isArray(listings)) listings = []
    } catch {
      return Response.json({ error: "Failed to parse listings" }, { status: 500 })
    }

    return Response.json({ listings })
  } catch {
    return Response.json({ error: "Search failed" }, { status: 500 })
  }
}
