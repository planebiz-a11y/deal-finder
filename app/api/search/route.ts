export async function POST(req: Request) {
  try {
    const body = await req.json()
    const query = body.query

    if (!query) {
      return Response.json(
        { error: "Missing search query" },
        { status: 400 }
      )
    }

    const apiKey = process.env.SERPAPI_KEY

    if (!apiKey) {
      return Response.json(
        { error: "Missing SERPAPI_KEY" },
        { status: 500 }
      )
    }

    const searchQuery = `${query} utah for sale $ (site:craigslist.org OR site:ksl.com OR site:facebook.com/marketplace)`

    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
      searchQuery
    )}&api_key=${apiKey}`

    const res = await fetch(url)
    const data = await res.json()

    const listings =
  data.organic_results
    ?.filter((item: any) => {
      const title = (item.title || "").toLowerCase()
      const snippet = (item.snippet || "").toLowerCase()

      // ❌ filter junk
      if (title.includes("wanted")) return false
      if (title.includes("looking for")) return false
      if (title.includes("guide")) return false
      if (title.includes("review")) return false
      if (title.includes("dealer")) return false

      // ❌ must have price signal
      if (!snippet.includes("$") && !title.includes("$")) return false

      return true
    })
    .slice(0, 8)
    .map((item: any) => ({
      title: item.title || "",
      description: item.snippet || "",
      url: item.link || "",
    })) || []
        title: item.title || "",
        description: item.snippet || "",
        url: item.link || "",
      })) || []

    return Response.json({ listings })
  } catch (err) {
    return Response.json(
      { error: "Search failed" },
      { status: 500 }
    )
  }
}
