import { NextResponse } from "next/server"

type Listing = {
  title?: string
  price?: number | string
  location?: string
  url?: string
  description?: string
}

function cleanPrice(price: any): number {
  if (typeof price === "number") return price
  if (!price) return 0
  return Number(String(price).replace(/[^0-9]/g, "")) || 0
}

function estimateResaleValue(title: string, price: number): number {
  const t = title.toLowerCase()

  let multiplier = 1.25

  if (t.includes("rzr") || t.includes("can-am") || t.includes("polaris")) {
    multiplier = 1.35
  }

  if (t.includes("dump trailer") || t.includes("equipment trailer")) {
    multiplier = 1.3
  }

  if (t.includes("skid steer") || t.includes("excavator") || t.includes("kubota")) {
    multiplier = 1.28
  }

  if (t.includes("needs work") || t.includes("project") || t.includes("not running")) {
    multiplier = 1.1
  }

  return Math.round(price * multiplier)
}

function estimateCosts(title: string, description = ""): number {
  const text = `${title} ${description}`.toLowerCase()

  let cost = 500

  if (text.includes("needs work")) cost += 1000
  if (text.includes("not running")) cost += 2500
  if (text.includes("salvage")) cost += 2000
  if (text.includes("leak")) cost += 750
  if (text.includes("hours")) cost += 300
  if (text.includes("tires")) cost += 500

  return cost
}

function getRiskFlags(title: string, description = ""): string[] {
  const text = `${title} ${description}`.toLowerCase()
  const flags: string[] = []

  if (text.includes("not running")) flags.push("Not running")
  if (text.includes("needs work")) flags.push("Needs work")
  if (text.includes("salvage")) flags.push("Salvage title")
  if (text.includes("no title")) flags.push("No title")
  if (text.includes("mechanic special")) flags.push("Mechanic special")
  if (text.includes("as is")) flags.push("As-is risk")

  return flags
}

function scoreDeal(profit: number, price: number, riskFlags: string[]): number {
  if (!price) return 0

  const roi = profit / price
  let score = 5

  if (roi > 0.5) score += 3
  else if (roi > 0.3) score += 2
  else if (roi > 0.15) score += 1
  else if (roi < 0.05) score -= 2

  score -= riskFlags.length

  return Math.max(1, Math.min(10, score))
}

function recommendation(score: number): string {
  if (score >= 8) return "BUY / CALL FAST"
  if (score >= 6) return "NEGOTIATE"
  if (score >= 4) return "ONLY IF CHEAP"
  return "PASS"
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const listings: Listing[] = body.listings || []

    const analyzedDeals = listings.map((listing) => {
      const title = listing.title || "Untitled listing"
      const price = cleanPrice(listing.price)
      const description = listing.description || ""

      const estimatedResaleValue = estimateResaleValue(title, price)
      const estimatedCosts = estimateCosts(title, description)
      const estimatedProfit = estimatedResaleValue - price - estimatedCosts
      const mao = Math.round((estimatedResaleValue - estimatedCosts) * 0.7)

      const riskFlags = getRiskFlags(title, description)
      const dealScore = scoreDeal(estimatedProfit, price, riskFlags)

      return {
        ...listing,
        title,
        price,
        estimatedResaleValue,
        estimatedCosts,
        estimatedProfit,
        mao,
        recommendedOffer: Math.round(mao * 0.9),
        walkAwayPrice: mao,
        score: dealScore,
        recommendation: recommendation(dealScore),
        riskFlags,
      }
    })

    analyzedDeals.sort((a, b) => b.score - a.score)

    return NextResponse.json({
      deals: analyzedDeals,
      topDeal: analyzedDeals[0] || null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to analyze deals" },
      { status: 500 }
    )
  }
}
