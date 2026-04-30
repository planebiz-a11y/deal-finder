import { NextResponse } from "next/server"

type Listing = {
  title?: string
  price?: number | string
  location?: string
  url?: string
  description?: string
  daysListed?: number | null
  previousPrice?: number | null
  sellerPressure?: boolean
  pressureSignals?: string[]
  utahAvg?: number
  utahLow?: number
  utahHigh?: number
  utahSamples?: number
  spreadScore?: number
  transportCost?: number
}

type Condition = {
  needsWork: boolean
  notRunning: boolean
  salvage: boolean
  noTitle: boolean
  lowHours: boolean
  clean: boolean
}

type ExtractedData = {
  price: number
  year: number | null
  hours: number | null
  mileage: number | null
  condition: Condition
}

function extractPrice(text: string): number {
  if (!text) return 0
  const matches = text.match(/\$[\d,]+/g)
  if (!matches) return 0
  const numbers = matches
    .map((m) => Number(m.replace(/[$,]/g, "")))
    .filter((n) => n > 200)
    .filter((n) => !(n >= 1900 && n <= 2099))
  return numbers.length ? Math.max(...numbers) : 0
}

function cleanPrice(price: any): number {
  if (typeof price === "number") return price
  if (!price) return 0
  const n = Number(String(price).replace(/[^0-9]/g, "")) || 0
  if (n >= 1900 && n <= 2099) return 0
  return n
}

function extractYear(text: string): number | null {
  const match = text.match(/\b(19[5-9]\d|20[0-2]\d)\b/)
  return match ? parseInt(match[0]) : null
}

function extractHours(text: string): number | null {
  const match = text.match(/(\d{1,4}(?:\.\d)?)\s*(?:k\s*)?(?:hours?|hrs?)\b/i)
  if (!match) return null
  let val = parseFloat(match[1])
  if (/k/i.test(match[0])) val *= 1000
  return val > 0 && val < 30000 ? Math.round(val) : null
}

function extractMileage(text: string): number | null {
  const match = text.match(/(\d{1,3}(?:,\d{3})?|\d+k)\s*(?:miles?|mi)\b/i)
  if (!match) return null
  const raw = match[1].replace(/,/g, "")
  let val = /k/i.test(raw) ? parseFloat(raw) * 1000 : parseFloat(raw)
  return val > 0 && val < 500000 ? Math.round(val) : null
}

function detectCondition(title: string, description: string): Condition {
  const text = `${title} ${description}`.toLowerCase()
  return {
    needsWork:  /needs work|project unit|mechanic special|fixer|rough shape/.test(text),
    notRunning: /not running|doesn.t run|doesn.t start|no start|blown|seized/.test(text),
    salvage:    /salvage/.test(text),
    noTitle:    /no title/.test(text),
    lowHours:   /low hours|low hrs/.test(text),
    clean:      /clean title|one owner|well maintained|garage kept|like new/.test(text),
  }
}

function resolveAll(listing: Listing): ExtractedData {
  const title = listing.title || ""
  const description = listing.description || ""
  const combined = `${title} ${description}`
  const price =
    cleanPrice(listing.price) ||
    extractPrice(title) ||
    extractPrice(description)
  const year = extractYear(combined)
  const hours = extractHours(combined)
  const mileage = extractMileage(combined)
  const condition = detectCondition(title, description)
  return { price, year, hours, mileage, condition }
}

function getUtahResaleValue(
  title: string,
  year: number | null,
  condition: Condition,
  hours: number | null
): number {
  const t = title.toLowerCase()
  const currentYear = new Date().getFullYear()
  const age = year ? currentYear - year : 5
  let base = 0

  if (/rzr|polaris rzr/.test(t)) {
    if (age <= 1)       base = 28000
    else if (age <= 3)  base = 22000
    else if (age <= 5)  base = 17000
    else if (age <= 8)  base = 12000
    else if (age <= 12) base = 9000
    else                base = 6500
  } else if (/can-am|canam/.test(t)) {
    if (age <= 1)       base = 26000
    else if (age <= 3)  base = 20000
    else if (age <= 5)  base = 15000
    else if (age <= 8)  base = 11000
    else                base = 7000
  } else if (/dump trailer/.test(t)) {
    base = 6800
  } else if (/equipment trailer|flatbed trailer/.test(t)) {
    base = 5500
  } else if (/utility trailer/.test(t)) {
    base = 3200
  } else if (/skid steer/.test(t)) {
    if (age <= 3)       base = 35000
    else if (age <= 6)  base = 24000
    else if (age <= 10) base = 17000
    else                base = 12000
  } else if (/excavator|mini ex/.test(t)) {
    if (age <= 3)       base = 30000
    else if (age <= 6)  base = 22000
    else if (age <= 10) base = 15000
    else                base = 10000
  } else if (/kubota|john deere|bobcat/.test(t)) {
    if (age <= 5)       base = 26000
    else if (age <= 10) base = 18000
    else                base = 11000
  } else if (/tractor/.test(t)) {
    if (age <= 5)       base = 22000
    else if (age <= 10) base = 14000
    else                base = 9000
  } else {
    return 0
  }

  if (condition.notRunning)     base = Math.round(base * 0.75)
  else if (condition.needsWork) base = Math.round(base * 0.85)
  if (condition.salvage)        base = Math.round(base * 0.80)
  if (condition.noTitle)        base = Math.round(base * 0.85)
  if (condition.clean)          base = Math.round(base * 1.05)
  if (hours !== null && hours > 3000)     base = Math.round(base * 0.88)
  else if (hours !== null && hours < 300) base = Math.round(base * 1.05)

  return base
}

function estimateCosts(
  condition: Condition,
  title: string,
  description: string,
  hours: number | null
): number {
  const text = `${title} ${description}`.toLowerCase()
  let cost = 200 // base: time + listing fee
  if (condition.notRunning)     cost += 2800
  else if (condition.needsWork) cost += 1200
  if (condition.salvage)        cost += 1800
  if (condition.noTitle)        cost += 600
  if (/leak/.test(text))               cost += 750
  if (/tires|tracks/.test(text))       cost += 600
  if (/transmission/.test(text))       cost += 1200
  if (/engine/.test(text))             cost += 1500
  if (/as.?is/.test(text))             cost += 400
  if (/flood|water damage/.test(text)) cost += 2000
  if (hours !== null && hours > 3000)      cost += 800
  else if (hours !== null && hours > 1500) cost += 400
  return cost
}

function getRiskFlags(
  condition: Condition,
  title: string,
  description: string,
  year: number | null,
  hours: number | null,
  mileage: number | null,
): string[] {
  const text = `${title} ${description}`.toLowerCase()
  const flags: string[] = []
  if (condition.notRunning)            flags.push("Not running")
  if (condition.needsWork)             flags.push("Needs work")
  if (condition.salvage)               flags.push("Salvage title")
  if (condition.noTitle)               flags.push("No title")
  if (/mechanic special/.test(text))   flags.push("Mechanic special")
  if (/as.?is/.test(text))             flags.push("As-is")
  if (/flood|water damage/.test(text)) flags.push("Water damage")
  if (/lien/.test(text))               flags.push("Possible lien")
  if (hours !== null && hours > 3000)        flags.push("High hours")
  if (mileage !== null && mileage > 15000)   flags.push("High mileage")
  if (year !== null && new Date().getFullYear() - year > 15) flags.push("Older unit")
  const hasInfo = year !== null || hours !== null || mileage !== null
  if (!hasInfo) flags.push("Limited info — ask seller")
  return flags
}

function getSellerFlags(listing: Listing): string[] {
  const flags: string[] = []
  if (listing.sellerPressure) {
    const signals = listing.pressureSignals || []
    signals.forEach(s => flags.push(s))
  }
  if (listing.previousPrice && listing.price) {
    const drop = listing.previousPrice - cleanPrice(listing.price)
    if (drop > 0) flags.push(`Price dropped $${drop.toLocaleString()}`)
  }
  if (listing.daysListed && listing.daysListed > 14) {
    flags.push(`Listed ${listing.daysListed} days`)
  }
  return flags
}

function getNegotiationStrategy(
  sellerPressure: boolean,
  daysListed: number | null,
  previousPrice: number | null,
  mao: number,
  price: number
): { strategy: string; reason: string } {
  if (sellerPressure || (daysListed && daysListed > 21)) {
    return {
      strategy: "Aggressive",
      reason: sellerPressure ? "Seller shows motivation signals" : `Listed ${daysListed} days — seller likely flexible`
    }
  }
  if (previousPrice && previousPrice > price) {
    return {
      strategy: "Moderate",
      reason: "Already dropped price — anchor at MAO"
    }
  }
  if (price > mao) {
    return {
      strategy: "Anchor Low",
      reason: "Asking above MAO — start well below and negotiate up"
    }
  }
  return {
    strategy: "Moderate",
    reason: "Standard negotiation — offer MAO, hold firm"
  }
}

function getSeasonalityBonus(title: string): number {
  const t = title.toLowerCase()
  const month = new Date().getMonth()
  const isUTV = /rzr|can-am|polaris|utv|atv/.test(t)
  const isTrailer = /trailer/.test(t)
  const isHeavy = /skid steer|excavator|kubota|tractor|bobcat/.test(t)

  if (isUTV) {
    if (month >= 2 && month <= 7) return 1
    if (month >= 10 || month <= 0) return -1
  }
  if (isTrailer) {
    if (month >= 2 && month <= 5) return 1
  }
  if (isHeavy) {
    if (month >= 2 && month <= 9) return 1
    if (month >= 11 || month <= 1) return -1
  }
  return 0
}

function getConfidenceScore(
  utahSamples: number,
  spreadScore: number,
  riskFlags: string[],
  profit: number,
  price: number
): number {
  let score = 0
  if (utahSamples >= 8)      score += 40
  else if (utahSamples >= 5) score += 30
  else if (utahSamples >= 3) score += 20
  else if (utahSamples >= 1) score += 10
  score += Math.round(spreadScore * 0.25)
  const hardRisks = riskFlags.filter(f =>
    !["Limited info — ask seller", "Older unit"].includes(f)
  ).length
  score += Math.max(0, 20 - hardRisks * 5)
  const roi = profit / price
  if (roi > 0.3)      score += 15
  else if (roi > 0.2) score += 10
  else if (roi > 0.1) score += 5
  return Math.min(100, Math.max(0, score))
}

function getLiquidityScore(title: string, utahSamples: number): { score: number; label: string } {
  const t = title.toLowerCase()
  let score = 50
  if (/rzr|polaris|can-am/.test(t))    score += 30
  else if (/dump trailer/.test(t))      score += 20
  else if (/skid steer|bobcat/.test(t)) score += 15
  else if (/excavator/.test(t))         score += 10
  if (utahSamples >= 8)      score += 20
  else if (utahSamples >= 5) score += 10
  else if (utahSamples <= 2) score -= 10
  const final = Math.min(100, Math.max(0, score))
  const label = final >= 75 ? "Fast (< 2 weeks)"
              : final >= 50 ? "Medium (2-4 weeks)"
              : "Slow (1-2 months)"
  return { score: final, label }
}

function getUnderpricedAlert(price: number, resaleValue: number): string | null {
  if (!resaleValue || !price) return null
  const gap = resaleValue - price
  if (gap <= 0) return null
  const pct = Math.round((gap / resaleValue) * 100)
  if (pct >= 30) return `🔥 ${pct}% under market — move fast`
  if (pct >= 15) return `⚡ $${gap.toLocaleString()} under market value`
  return null
}

function scoreDeal(profit: number, price: number, riskFlags: string[], title: string): number {
  if (!price || price < 200) return 0
  const roi = profit / price
  let score = 5
  if (roi > 0.5)       score += 3
  else if (roi > 0.35) score += 2
  else if (roi > 0.20) score += 1
  else if (roi < 0.05) score -= 2
  else if (roi < 0)    score -= 3
  if (profit < 500)       score -= 2
  else if (profit < 1000) score -= 1
  const hardRiskCount = riskFlags.filter(
    f => !["Limited info — ask seller", "Older unit"].includes(f)
  ).length
  score -= hardRiskCount * 0.75
  if (riskFlags.includes("Limited info — ask seller")) score -= 0.25
  score += getSeasonalityBonus(title)
  return Math.max(1, Math.min(10, Math.round(score)))
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

    const analyzedDeals = listings
      .map((listing) => {
        const title = listing.title || "Untitled listing"
        const description = listing.description || ""
        const { price, year, hours, mileage, condition } = resolveAll(listing)

        if (!price || price < 200) return null

        const utahAvg     = listing.utahAvg    || 0
        const utahLow     = listing.utahLow    || 0
        const utahSamples = listing.utahSamples || 0
        const spreadScore = listing.spreadScore || 0
        const transportCost = listing.transportCost || 50

        // Use KSL avg if available, else hardcoded table
        const tableResale = getUtahResaleValue(title, year, condition, hours)
        const estimatedResaleValue = utahAvg > 0
          ? utahAvg
          : tableResale > 0
          ? Math.min(tableResale, Math.round(price * 1.35))
          : Math.round(price * 1.15)

        const repairCosts = estimateCosts(condition, title, description, hours)
        const sellingFees = Math.round(estimatedResaleValue * 0.03) // KSL fee ~3%
        const totalCosts  = repairCosts + transportCost + sellingFees
        const estimatedProfit = estimatedResaleValue - price - totalCosts

        const mao = Math.min(
          Math.round(estimatedResaleValue - totalCosts - 1500),
          Math.round(price * 0.92)
        )
        const recommendedOffer = Math.min(
          Math.round(mao * 0.9),
          Math.round(price * 0.82)
        )

        if (estimatedProfit < 1000) return null

        const riskFlags   = getRiskFlags(condition, title, description, year, hours, mileage)
        const sellerFlags = getSellerFlags(listing)
        const dealScore   = scoreDeal(estimatedProfit, price, riskFlags, title)
        const confidenceScore = getConfidenceScore(utahSamples, spreadScore, riskFlags, estimatedProfit, price)
        const liquidity   = getLiquidityScore(title, utahSamples)
        const underpricedAlert = getUnderpricedAlert(price, estimatedResaleValue)
        const negotiation = getNegotiationStrategy(
          listing.sellerPressure || false,
          listing.daysListed || null,
          listing.previousPrice || null,
          mao,
          price
        )

        const offerMessage = `Hi, I saw your ${title} listed for $${price.toLocaleString()}. I can pay cash and pick up today. Would you take $${recommendedOffer.toLocaleString()}?`

        return {
          ...listing,
          title,
          price,
          year,
          hours,
          mileage,
          estimatedResaleValue,
          repairCosts,
          transportCost,
          sellingFees,
          totalCosts,
          estimatedProfit,
          mao,
          recommendedOffer,
          score: dealScore,
          recommendation: recommendation(dealScore),
          confidenceScore,
          liquidityScore: liquidity.score,
          liquidityLabel: liquidity.label,
          underpricedAlert,
          riskFlags,
          sellerFlags,
          negotiation,
          offerMessage,
          condition,
        }
      })
      .filter(Boolean)
      .filter((deal: any) => deal.price > 0)
      .sort((a: any, b: any) => b.confidenceScore - a.confidenceScore)

    return NextResponse.json({
      deals: analyzedDeals,
      topDeal: analyzedDeals[0] || null,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to analyze deals" }, { status: 500 })
  }
}
