"use client"

import { useState } from "react"

export default function Home() {
  const [text, setText] = useState("")
  const [result, setResult] = useState<any>(null)
const [deals, setDeals] = useState<any[]>([])
const [topDeal, setTopDeal] = useState<any>(null)

  async function analyze() {
  if (!text.trim()) return
    const res = await fetch("/api/parse", {
      method: "POST",
      headers: {
  "Content-Type": "application/json",
},
body: JSON.stringify({ text }),
    })

    const data = await res.json()

    setResult(data)

// NEW
setDeals([data])
setTopDeal(data)
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Deal Analyzer</h1>

      <textarea
        style={{ width: "100%", height: 150 }}
        placeholder="Paste listing..."
        value={text}
  onChange={(e) => setText(e.target.value)}
      />

      <br /><br />

      <button onClick={analyze}>
        Analyze
      </button>

      {result && (
        <div style={{ marginTop: 20 }}>
          <h2>{result.dealRating} — Score {result.dealScore}</h2>

          <p><strong>Title:</strong> {result.title}</p>
          <p><strong>Asking:</strong> ${result.askingPrice}</p>
          <p><strong>Utah Fast Flip Value:</strong> ${result.recommendedFastFlipValue}</p>
          <p><strong>Safe MAO:</strong> ${result.safeMAO}</p>
          <p><strong>Aggressive MAO:</strong> ${result.aggressiveMAO}</p>
          <p><strong>Opening Offer:</strong> ${result.recommendedOpeningOffer}</p>
          <p><strong>Walk Away:</strong> ${result.walkAwayPrice}</p>
          <p><strong>Profit at Asking:</strong> ${result.estimatedProfitAtAsking}</p>
          <p><strong>Profit at Offer:</strong> ${result.estimatedProfitAtRecommendedOffer}</p>
          <p><strong>Risk:</strong> {result.riskLevel}</p>
          <p><strong>Recommendation:</strong> {result.recommendation}</p>
          <p><strong>Cash Offer:</strong> {result.cashOfferMessage}</p>
        </div>
      )}
    </div>
  )
}
