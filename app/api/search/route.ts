export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")

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

  const searchQuery = `${query} for sale equipment trailer UTV skid steer excavator site:craigslist.org OR site:ksl.com OR site:facebook.com/marketplace`

  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(
    searchQuery
  )}&api_key=${apiKey}`

  const res = await fetch(url)
  const data = await res.json()

  const listings =
    data.organic_results?.slice(0, 8).map((item: any) => ({
      title: item.title || "",
      snippet: item.snippet || "",
      link: item.link || "",
      source: item.source || "",
    })) || []

  return Response.json({ listings })
}
