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

// Maps region/city input to Craigslist site codes
function getCraigslistSite(region: string, city: string): string {
  const s = `${region} ${city}`.toLowerCase()
  if (/wyoming|cheyenne|casper/.test(s))          return "wyoming"
  if (/idaho|boise|pocatello/.test(s))            return "boise"
  if (/montana|billings|missoula/.test(s))        return "montana"
  if (/nevada|reno|lasvegas|las vegas/.test(s))   return "reno"
  if (/colorado|denver|colorado springs/.test(s)) return "denver"
  if (/arizona|phoenix|tucson/.test(s))           return "phoenix"
  if (/oregon|portland|eugene/.test(s))           return "portland"
  if (/washington|seattle|spokane/.test(s))       return "seattle"
  if (/california|sacramento|fresno/.test(s))     return "sacramento"
  if (/texas|dallas|houston|austin/.test(s))      return "dallas"
  if (/kansas|wichita/.test(s))                   return "wichita"
  if (/nebraska|omaha/.test(s))                   return "omaha"
  if (/iowa|des moines/.test(s))                  return "desmoines"
  if (/missouri|kansas city|st louis/.test(s))    return "kansascity"
  if (/illinois|chicago/.test(s))                 return "chicago"
  if (/indiana|indianapolis/.test(s))             return "indianapolis"
  if (/ohio|columbus|cleveland/.test(s))          return "cleveland"
  if (/minnesota|minneapolis/.test(s))            return "minneapolis"
  if (/wisconsin|milwaukee/.test(s))              return "milwaukee"
  if (/michigan|detroit/.test(s))                 return "detroit"
  if (/north dakota|bismarck/.test(s))            return "bismarck"
  if (/south dakota|sioux falls/.test(s))         return "siouxfalls"
  if (/georgia|atlanta/.test(s))                  return "atlanta"
  if (/florida|orlando|miami|tampa/.test(s))      return "orlando"
  if (/tennessee|nashville/.test(s))              return "nashville"
  if (/alabama|birmingham/.test(s))               return "birmingham"
  if (/new york|nyc/.test(s))                     return "newyork"
  if (/pennsylvania|philadelphia|pittsburgh/.test(s)) return "philadelphia"
  if (/virginia|richmond/.test(s))                return "richmond"
  return "denver" // default
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
    const { query, buyRegion, city, radius } = body

    if (!query) {
      return Response.json({ error: "Missing search query" }, { status: 400 })
    }

    const serpKey = process.env.SERPAPI_KEY
    if (!serpKey) {
      return Response.json({ error: "Missing SERPAPI_KEY" }, { status: 500 })
    }

    const region = buyRegion || "denver"
    const transportCost = estimateTransport(region)
    const clSite = getCraigslistSite(region, city || "")

    // Search 1 — Utah comps via KSL Google search
    const utahQuery = `${query} for sale by owner site:ksl.com -dealer -dealership`
    const utahUrl = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(utahQuery)}&api_key=${serpKey}`
    const utahRes = await fetch(utahUrl)
    const utahData = await utahRes.json()

    const utahPrices: number[] = (utahData.organic_results || [])
      .slice(0, 15)
      .map((item: any) => extractPriceFromText(`${item.title} ${item.snippet}`))
      .filter((p: number) => p > 500)

    const utahAvg = utahPrices.length
      ? Math.round(utahPrices.reduce((a: number, b: number) => a + b, 0) / utahPrices.length)
      : 0
    const utahLow  = utahPrices.length ? Math.min(...utahPrices) : 0
    const utahHigh = utahPrices.length ? Math.max(...utahPrices) : 0

    const utahComps = {
      avg: utahAvg,
      low: utahLow,
      high: utahHigh,
      samples: utahPrices.length,
      priceList: utahPrices,
    }

    let spreadScore = 0
    if (utahPrices.length > 1 && utahAvg > 0) {
      const spreadPct = (utahHigh - utahLow) / utahAvg
      spreadScore = spreadPct < 0.2 ? 100 : spreadPct < 0.4 ? 70 : spreadPct < 0.6 ? 40 : 20
    }

    // Search 2 — Craigslist direct search
    const clUrl = `https://serpapi.com/search.json?engine=craigslist&query=${encodeURIComponent(query)}&site=${clSite}&category=sss&api_key=${serpKey}`
    const clRes = await fetch(clUrl)
    const clData = await clRes.json()

    const listings = (clData.organic_results || clData.ads || clData.results || [])
      .slice(0, 20)
      .map((item: any) => {
        const title = item.title || item.name || ""
        const description = item.snippet || item.description || ""
        const price = item.price
          ? Number(String(item.price).replace(/[^0-9]/g, ""))
          : extractPriceFromText(`${title} ${description}`)
        const { sellerPressure, pressureSignals } = detectSellerPressure(`${title} ${description}`)
        return {
          title,
          price,
          description,
          url: item.link || item.url || "",
          location: item.location || `${city || region}`,
          daysListed: null,
          previousPrice: null,
          sellerPressure,
          pressureSignals,
          utahAvg,
          utahLow,
          utahHigh,
          utahSamples: utahPrices.length,
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
