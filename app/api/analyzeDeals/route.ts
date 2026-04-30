import { NextResponse } from "next/server"

type Listing = {
  title?: string
  price?: number | string
  location?: string
  url?: string
  description?: string
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

function estimateResaleValue(
  title: string,
  price: number,
  condition: Condition,
  year: number | null,
  hours: number | null,
  mileage: number | null
): number {
  const t = title.toLowerCase()
  let multiplier = 1.10

  if (/rzr|polaris/.test(t))                            multiplier = 1.18
  else if (/can-am|canam/.test(t))                      multiplier = 1.16
  else if (/kawasaki|yamaha|honda utv/.test(t))         multiplier = 1.14
  else if (/dump trailer/.test(t))                      multiplier = 1.15
  else if (/equipment trailer|flatbed trailer/.test(t)) multiplier = 1.13
  else if (/utility trailer/.test(t))                   multiplier = 1.10
  else if (/skid steer/.test(t))                        multiplier = 1.15
  else if (/excavator|mini ex/.test(t))                 multiplier = 1.13
  else if (/kubota|john deere|bobcat/.test(t))          multiplier = 1.12
  else if (/caterpillar|cat\b|case\b/.test(t))          multiplier = 1.12
  else if (/tractor/.test(t))                           multiplier = 1.10
  else if (/mahindra|kioti|new holland/.test(t))        multiplier = 1.08

  const currentYear = new Date().getFullYear()
  const age = year ? currentYear - year : 5
  if (age <= 1)       multiplier += 0.10
  else if (age <= 3)  multiplier += 0.06
  else if (age <= 5)  multiplier += 0.02
  else if (age >= 12) multiplier -= 0.10
  else if (age >= 8)  multiplier -= 0.05

  if (hours !== null) {
    if (hours < 300)       multiplier += 0.06
    else if (hours < 800)  multiplier += 0.02
    else if (hours > 3000) multiplier -= 0.10
    else if (hours > 1500) multiplier -= 0.05
  }

  if (mileage !== null) {
    if (mileage < 2000)       multiplier += 0.05
    else if (mileage < 5000)  multiplier += 0.02
    else if (mileage > 15000) multiplier -= 0.08
    else if (mileage > 8000)  multiplier -= 0.04
  }

  if (condition.notRunning)     multiplier -= 0.12
  else if (condition.needsWork) multiplier -= 0.08
  if (condition.salvage)        multiplier -= 0.10
  if (condition.noTitle)        multiplier -= 0.08
  if (condition.lowHours)       multiplier += 0.04
  if (condition.clean)          multiplier += 0.04

  return Math.round(price * Math.max(multiplier, 1.05))
}

function estimateCosts(
  condition: Condition,
  title: string,
  description: string,
  hours: number | null
): number {
  const text = `${title} ${description}`.toLowerCase()
  let cost = 400

  if (condition.notRunning)     cost += 2800
  else if (condition.needsWork) cost += 1200
  if (condition.salvage)        cost += 1800
  if (condition.noTitle)        cost += 600
  if (/leak/.test(text))         cost += 750
  if (/tires|tracks/.test(text)) cost += 600
  if (/transmission/.test(text)) cost += 1200
  if (/engine/.test(text))       cost += 1500
  if (/as.?is/.test(text))       cost += 400
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
  price: number
): string[] {
  const text = `${title} ${description}`.toLowerCase()
  const flags: string[] = []

  if (condition.notRunning)  flags.push("Not running")
  if (condition.needsWork)   flags.push("Needs work")
  if (condition.salvage)     flags.push("Salvage title")
  if (condition.noTitle)     flags.push("No title")
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

function scoreDeal(profit: number, price: number, riskFlags: string[]): number {
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
    (f) => f !== "Limited info — ask seller" && f !== "Older unit"
  ).length
  score -= hardRiskCount * 0.75
  if (riskFlags.includes("Limited info — ask seller")) score -= 0.25

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
        const estimatedResaleValue = (listing as any).utahAvgPrice || estimateResaleValue(title, price, condition, year, hours, mileage)
        const transportCost = (listing as any).transportCost || 800
        const estimatedCosts = estimateCosts(condition, title, description, hours) + transportCost
        const estimatedProfit = estimatedResaleValue - price - estimatedCosts
        const mao = Math.round((estimatedResaleValue - estimatedCosts) * 0.7)
        const riskFlags = getRiskFlags(condition, title, description, year, hours, mileage, price)
        const dealScore = scoreDeal(estimatedProfit, price, riskFlags)

        return {
          ...listing,
          title,
          price,
          year,
          hours,
          mileage,
          estimatedResaleValue,
          estimatedCosts,
          estimatedProfit,
          mao,
          recommendedOffer: Math.round(mao * 0.9),
          walkAwayPrice: mao,
          score: dealScore,
          recommendation: recommendation(dealScore),
          riskFlags,
          condition,
        }
      })
      .filter((deal) => deal.price > 0)
      .filter((deal) => deal.estimatedProfit >= 1000)
      .sort((a, b) => b.score - a.score)

    return NextResponse.json({
      deals: analyzedDeals,
      topDeal: analyzedDeals[0] || null,
    })
  } catch (error) {
    return NextResponse.json({ error: "Failed to analyze deals" }, { status: 500 })
  }
}
