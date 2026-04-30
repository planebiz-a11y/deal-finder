"use client"

import { useState } from "react"

export default function Home() {
  const [text, setText] = useState("")
  const [result, setResult] = useState<any>(null)
const [deals, setDeals] = useState<any[]>([])
const [topDeal, setTopDeal] = useState<any>(null)

  async function analyze() {
  if (!text.trim()) return

  // 🔍 1. SEARCH
  const searchRes = await fetch("/api/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: text }),
  })

  const searchData = await searchRes.json()

  if (!searchData?.listings?.length) {
    alert("No listings found")
    return
  }

  // 🧠 2. ANALYZE
  const analyzeRes = await fetch("/api/analyzeDeals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ listings: searchData.listings }),
  })

  const data = await analyzeRes.json()

  // 🏆 RESULTS
  setDeals(data.deals || [])
  setTopDeal(data.topDeal || null)
  setResult(data.topDeal || null)
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

      {topDeal && (
  <div style={{ marginTop: 20, border: "3px solid green", padding: 15 }}>
    <h2>🔥 BEST DEAL</h2>
    <p><strong>{topDeal.title}</strong></p>
    <p>Score: {topDeal.dealScore}</p>
    <p>MAO: ${topDeal.safeMAO}</p>
    <p>Profit: ${topDeal.estimatedProfitAtRecommendedOffer}</p>
    {topDeal.link && <a href={topDeal.link} target="_blank">View Listing</a>}
  </div>
)}

{deals.length > 1 && (
  <div style={{ marginTop: 20 }}>
    <h2>All Deals</h2>
    {deals.map((deal, i) => (
      <div key={i} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
        <p><strong>{deal.title}</strong></p>
        <p>Score: {deal.dealScore}</p>
        <p>MAO: ${deal.safeMAO}</p>
        {deal.link && <a href={deal.link} target="_blank">View</a>}
      </div>
    ))}
  </div>
)}

{topDeal && (
  <div style={{ marginTop: 20, border: "3px solid green", padding: 15 }}>
    <h2>🔥 BEST DEAL</h2>
    <p><strong>{topDeal.title}</strong></p>
    <p>Score: {topDeal.dealScore}</p>
    <p>MAO: ${topDeal.safeMAO}</p>
    <p>Profit: ${topDeal.estimatedProfitAtRecommendedOffer}</p>
    {topDeal.link && (
      <a href={topDeal.link} target="_blank">View Listing</a>
    )}
  </div>
)}
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
