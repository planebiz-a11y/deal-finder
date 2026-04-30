"use client"
import { useState } from "react"

const REC_STYLES: Record<string, { color: string; bg: string; dot: string }> = {
  "BUY / CALL FAST": { color: "#27500A", bg: "#EAF3DE", dot: "#3B6D11" },
  "NEGOTIATE":       { color: "#633806", bg: "#FAEEDA", dot: "#854F0B" },
  "ONLY IF CHEAP":   { color: "#633806", bg: "#FAEEDA", dot: "#854F0B" },
  "PASS":            { color: "#791F1F", bg: "#FCEBEB", dot: "#A32D2D" },
}

function formatMoney(n: number) {
  return n > 0 ? `$${n.toLocaleString()}` : "—"
}

function DealCard({ deal, featured }: { deal: any; featured?: boolean }) {
  const rec = REC_STYLES[deal.recommendation] ?? REC_STYLES["PASS"]

  return (
    <div style={{
      background: "#fff",
      border: featured ? "2px solid #378ADD" : "0.5px solid rgba(0,0,0,0.12)",
      borderRadius: 16,
      padding: "16px 20px",
      marginBottom: 12,
    }}>
      {featured && (
        <div style={{
          fontSize: 11, fontWeight: 500, color: "#185FA5",
          letterSpacing: "0.05em", marginBottom: 8,
        }}>
          BEST DEAL
        </div>
      )}

      {/* Title + Score */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, flex: 1 }}>
          {deal.title}
        </div>
        <div style={{
          flexShrink: 0, width: 36, height: 36, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 500,
          background: rec.bg, color: rec.color,
        }}>
          {deal.score}
        </div>
      </div>

      {/* Meta row: year / hours / mileage */}
      {(deal.year || deal.hours || deal.mileage) && (
        <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
          {deal.year && (
            <span style={{ fontSize: 12, color: "#5F5E5A" }}>{deal.year}</span>
          )}
          {deal.hours !== null && deal.hours !== undefined && (
            <span style={{ fontSize: 12, color: "#5F5E5A" }}>{deal.hours.toLocaleString()} hrs</span>
          )}
          {deal.mileage !== null && deal.mileage !== undefined && (
            <span style={{ fontSize: 12, color: "#5F5E5A" }}>{deal.mileage.toLocaleString()} mi</span>
          )}
        </div>
      )}

      {/* Stat grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Asking",  val: formatMoney(deal.price),            color: "" },
          { label: "Offer",   val: formatMoney(deal.recommendedOffer), color: "#185FA5" },
          { label: "MAO",     val: formatMoney(deal.mao),              color: "#854F0B" },
          { label: "Profit",  val: formatMoney(deal.estimatedProfit),
            color: deal.estimatedProfit > 1500 ? "#27500A"
                 : deal.estimatedProfit > 0    ? "#854F0B"
                 : "#A32D2D" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{
            background: "rgba(0,0,0,0.03)",
            borderRadius: 8, padding: "8px 10px",
          }}>
            <div style={{ fontSize: 11, color: "#888780", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 500, color: color || "inherit" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Recommendation badge */}
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "5px 12px", borderRadius: 8,
        background: rec.bg, color: rec.color,
        fontSize: 12, fontWeight: 500,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: rec.dot }} />
        {deal.recommendation}
      </div>

      {/* Risk flags */}
      {deal.riskFlags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {deal.riskFlags.map((flag: string) => (
            <span key={flag} style={{
              fontSize: 11, borderRadius: 4, padding: "2px 8px",
              background: flag.includes("Limited info")
                ? "rgba(0,0,0,0.05)" : "#FCEBEB",
              color: flag.includes("Limited info")
                ? "#888780" : "#791F1F",
            }}>
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Link */}
      {deal.url && (
        <a href={deal.url} target="_blank" rel="noreferrer" style={{
          display: "block", marginTop: 10,
          fontSize: 12, color: "#185FA5",
          textDecoration: "none",
        }}>
          View listing →
        </a>
      )}
    </div>
  )
}

export default function Home() {
  const [query, setQuery] = useState("")
  const [deals, setDeals] = useState<any[]>([])
  const [topDeal, setTopDeal] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function analyze() {
    if (!query.trim()) return
    setLoading(true)
    setError("")
    setDeals([])
    setTopDeal(null)

    try {
      const searchRes = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const searchData = await searchRes.json()

      if (!searchData?.listings?.length) {
        setError("No listings found. Try a different search.")
        setLoading(false)
        return
      }

      const analyzeRes = await fetch("/api/analyzeDeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listings: searchData.listings }),
      })
      const data = await analyzeRes.json()

      setDeals(data.deals || [])
      setTopDeal(data.topDeal || null)
    } catch {
      setError("Something went wrong. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") analyze()
  }

  return (
    <div style={{
      maxWidth: 480, margin: "0 auto",
      padding: "24px 16px", fontFamily: "system-ui, sans-serif",
      minHeight: "100vh", background: "#F1EFE8",
    }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px" }}>
          Deal Finder
        </h1>
        <p style={{ fontSize: 13, color: "#888780", margin: 0 }}>
          UTVs · Trailers · Skid steers · Farm equipment
        </p>
      </div>

      {/* Search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="rzr 1000 utah..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          style={{ flex: 1 }}
        />
        <button
          onClick={analyze}
          disabled={loading}
          style={{ opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: "#FCEBEB", color: "#791F1F",
          borderRadius: 8, padding: "10px 14px",
          fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              background: "#fff", borderRadius: 16,
              height: 140, opacity: 0.5,
              border: "0.5px solid rgba(0,0,0,0.08)",
            }} />
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && topDeal && (
        <>
          <div style={{ fontSize: 13, color: "#888780", marginBottom: 12 }}>
            {deals.length} deal{deals.length !== 1 ? "s" : ""} found
          </div>
          <DealCard deal={topDeal} featured />
          {deals.slice(1).map((deal, i) => (
            <DealCard key={i} deal={deal} />
          ))}
        </>
      )}

      {/* Empty state */}
      {!loading && !topDeal && !error && (
        <div style={{
          textAlign: "center", padding: "48px 0",
          fontSize: 13, color: "#B4B2A9",
        }}>
          Search for equipment to find deals
        </div>
      )}
    </div>
  )
}
