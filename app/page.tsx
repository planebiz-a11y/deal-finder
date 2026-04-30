"use client"

import { useState } from "react"

export default function Home() {
  const [text, setText] = useState("")
  const [result, setResult] = useState<any>(null)

  async function analyze() {
    const res = await fetch("/api/parse", {
      method: "POST",
      body: JSON.stringify({ text }),
    })

    const data = await res.json()

    setResult(data)
  }

  return (
    <div style={{ padding: 20 }}>
      <h1>Deal Analyzer</h1>

      <textarea
        style={{ width: "100%", height: 150 }}
        placeholder="Paste listing..."
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
