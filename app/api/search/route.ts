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

function extractPriceFromText(text: string): number {
  if (!text) return 0
  const matches = text.match(/\$[\d,]+/g)
  if (!matches) return 0
  const numbers = matches
    .map((m) => Number(m.replace(/[$,]/g, "")))
    .filter((n) => n > 200)
    .filter((n) => !(n >= 1900 && n <= 2099))
  return numbers.length ? Math.max(...numbers) : 0
}

function detectSellerPressure(text: string): { sellerPressure: boolean; pressureSignals: string[] } {
  const t = text.toLowerCase()
  const signals: string[] = []
  if (/need.{0,5}gone|must sell|moving|relocat/.test(t)) signals.push("Must sell")
  if (/make offer|obo|or best offer/.test(t))            signals.push("OBO")
  if (/price.{0,10}reduc|price.{0,10}drop|reduced/.test(t)) signals.push("Price reduced")
  if (/motivated|serious.{0,10}sell/.test(t))            signals.push("Motivated seller")
  if (/today|asap|quick sale/.test(t))                   signals.push("Wants quick sale")
  return { sellerPressure: signals.length > 0, pressureSignals: signals }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { query, buyRegion, city } = body

    if (!query) {
      return Response.json({ error: "Missing search query" }, { status: 400 })
    }

    const serpKey = process.env.SERPAPI_KEY
    if (!serpKey) {
      return Response.json({ error: "Missing SERPAPI_KEY" }, { status: 500 })
    }

    const region = buyRegion || "intermountain west"
    const transportCost = estimateTransport(region)
    const queryWords = query.toLowerCase().split(" ").filter((w: string) => w.length > 2)
    const locationStr = city ? `${city} ${region}` : region

    // Search 1 — Utah comps via KSL
    const utahQuery = `${query} for sale site:ksl.com -dealer -dealership`
    const utahUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(utahQuery)}&num=15&api_key=${serpKey}`
    const utahRes = await fetch(utahUrl)
    const utahData = await utahRes.json()

    const utahPrices: number[] = (utahData.organic_results || [])
      .map((item: any) => extractPriceFromText(`${item.title} ${item.snippet}`))
      .filter((p: number) => p > 500 && p < 75000)

    const minUtah = utahPrices.length ? Math.min(...utahPrices) : 0
    const filteredUtahPrices = minUtah > 0
      ? utahPrices.filter((p: number) => p <= minUtah * 3)
      : utahPrices

    const utahAvg = filteredUtahPrices.length
      ? Math.round(filteredUtahPrices.reduce((a: number, b: number) => a + b, 0) / filteredUtahPrices.length)
      : 0
    const utahLow  = filteredUtahPrices.length ? Math.min(...filteredUtahPrices) : 0
    const utahHigh = filteredUtahPrices.length ? Math.max(...filteredUtahPrices) : 0

    const utahComps = {
      avg: utahAvg,
      low: utahLow,
      high: utahHigh,
      samples: filteredUtahPrices.length,
      priceList: filteredUtahPrices,
    }

    let spreadScore = 0
    if (filteredUtahPrices.length > 1 && utahAvg > 0) {
      const spreadPct = (utahHigh - utahLow) / utahAvg
      spreadScore = spreadPct < 0.2 ? 100 : spreadPct < 0.4 ? 70 : spreadPct < 0.6 ? 40 : 20
    }

    // Search 2 — KSL buy region (direct links that work)
    const buyQuery = `${query} for sale ${locationStr} site:ksl.com`
    const buyUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(buyQuery)}&num=20&api_key=${serpKey}`
    const buyRes = await fetch(buyUrl)
    const buyData = await buyRes.json()

    const listings = (buyData.organic_results || [])
      .filter((item: any) => {
        const title = (item.title || "").toLowerCase()
        const snippet = (item.snippet || "").toLowerCase()
        const combined = `${title} ${snippet}`
        if (/wanted|looking for|guide|review|parts only/.test(title)) return false
        if (!combined.includes("$")) return false
        return queryWords.some((w: string) => title.includes(w))
      })
      .slice(0, 15)
      .map((item: any) => {
        const title = item.title || ""
        const description = item.snippet || ""
        const price = extractPriceFromText(`${title} ${description}`)
        const { sellerPressure, pressureSignals } = detectSellerPressure(`${title} ${description}`)
        return {
          title,
          price,
          description,
          url: item.link || "",
          location: city || region,
          daysListed: null,
          previousPrice: null,
          sellerPressure,
          pressureSignals,
          utahAvg,
          utahLow,
          utahHigh,
          utahSamples: filteredUtahPrices.length,
          spreadScore,
          transportCost,
        }
      })
      .filter((l: any) => l.price > 200)

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
