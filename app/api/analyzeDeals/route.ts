export async function POST(req: Request) {
  const { listings } = await req.json()

  if (!listings || !Array.isArray(listings)) {
    return Response.json(
      { error: "Listings array required" },
      { status: 400 }
    )
  }

  try {
    const analyzedDeals = await Promise.all(
      listings.map(async (listing: any) => {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/parse`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: `${listing.title}\n${listing.snippet}`,
          }),
        })

        const data = await res.json()

        return {
          ...listing,
          ...data,
        }
      })
    )

    // filter bad deals
    const filtered = analyzedDeals.filter((deal) => {
      return deal.dealScore >= 60 && deal.dealRating !== "PASS"
    })

    // sort best → worst
    const sorted = filtered.sort((a, b) => b.dealScore - a.dealScore)

    return Response.json({
      deals: sorted,
      topDeal: sorted[0] || null,
    })

  } catch (err) {
    return Response.json(
      { error: "Failed to analyze deals" },
      { status: 500 }
    )
  }
}
