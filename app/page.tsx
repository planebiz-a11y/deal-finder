"use client"

import { useState } from "react"

export default function Home() {
  const [text, setText] = useState("")
  const [deals, setDeals] = useState<any[]>([])
  const [topDeal, setTopDeal] = useState<any>(null)

  async function analyze() {
  if (!text.trim()) return

  const searchData = {
    listings: [
      { title: "2018 RZR 1000", price: 8500 },
      { title: "Dump trailer", price: 4000 },
      { title: "Kubota excavator needs work", price: 12000 }
    ]
  }

  const analyzeRes = await fetch("/api/analyzeDeals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listings: searchData.listings }),
  })

  const data = await analyzeRes.json()

  setDeals(data.deals || [])
  setTopDeal(data.topDeal || null)
}

  return (
    <div style={{ padding: 20 }}>
      <h1>Deal Finder</h1>

      <textarea
        style={{ width: "100%", height: 150 }}
        placeholder="Search listings..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <br /><br />

      <button onClick={analyze}>Analyze</button>

      {topDeal && (
        <div style={{ marginTop: 20, border: "3px solid green", padding: 15 }}>
          <h2>🔥 BEST DEAL</h2>
          <p><strong>{topDeal.title}</strong></p>
          <p>Score: {topDeal.score}</p>
          <p>Recommendation: {topDeal.recommendation}</p>
          <p>Asking: ${topDeal.price}</p>
          <p>MAO: ${topDeal.mao}</p>
          <p>Offer: ${topDeal.recommendedOffer}</p>
          <p>Profit: ${topDeal.estimatedProfit}</p>

          {topDeal.riskFlags?.length > 0 && (
            <p>⚠️ {topDeal.riskFlags.join(", ")}</p>
          )}

          {topDeal.url && (
            <a href={topDeal.url} target="_blank">View Listing</a>
          )}
        </div>
      )}

      {deals.length > 1 && (
        <div style={{ marginTop: 20 }}>
          <h2>All Deals</h2>

          {deals.slice(1).map((deal, i) => (
            <div key={i} style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}>
              <p><strong>{deal.title}</strong></p>
              <p>Score: {deal.score}</p>
              <p>{deal.recommendation}</p>
              <p>Asking: ${deal.price}</p>
              <p>MAO: ${deal.mao}</p>
              <p>Profit: ${deal.estimatedProfit}</p>

              {deal.riskFlags?.length > 0 && (
                <p>⚠️ {deal.riskFlags.join(", ")}</p>
              )}

              {deal.url && (
                <a href={deal.url} target="_blank">View</a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
