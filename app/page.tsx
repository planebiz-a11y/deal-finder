"use client"
import { useState } from "react"

const REC_STYLES: Record<string, { color: string; bg: string; dot: string }> = {
  "BUY / CALL FAST": { color: "#27500A", bg: "#EAF3DE", dot: "#3B6D11" },
  "NEGOTIATE":       { color: "#633806", bg: "#FAEEDA", dot: "#854F0B" },
  "ONLY IF CHEAP":   { color: "#633806", bg: "#FAEEDA", dot: "#854F0B" },
  "PASS":            { color: "#791F1F", bg: "#FCEBEB", dot: "#A32D2D" },
}

function fmt(n: number) {
  return n > 0 ? `$${n.toLocaleString()}` : "—"
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: `conic-gradient(${color} ${score * 3.6}deg, rgba(0,0,0,0.06) 0deg)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 4px",
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: "50%",
          background: "var(--color-background-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 500,
        }}>
          {score}
        </div>
      </div>
      <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{label}</div>
    </div>
  )
}

function DealCard({ deal, featured }: { deal: any; featured?: boolean }) {
  const [copied, setCopied] = useState(false)
  const rec = REC_STYLES[deal.recommendation] ?? REC_STYLES["PASS"]

  function copyOffer() {
    navigator.clipboard.writeText(deal.offerMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      background: "var(--color-background-primary)",
      border: featured ? "2px solid #378ADD" : "0.5px solid rgba(0,0,0,0.12)",
      borderRadius: 16, padding: "16px 20px", marginBottom: 12,
    }}>
      {featured && (
        <div style={{ fontSize: 11, fontWeight: 500, color: "#185FA5", letterSpacing: "0.05em", marginBottom: 8 }}>
          BEST DEAL
        </div>
      )}

      {deal.underpricedAlert && (
        <div style={{
          background: "#EAF3DE", color: "#27500A",
          borderRadius: 8, padding: "6px 12px",
          fontSize: 12, fontWeight: 500, marginBottom: 10,
        }}>
          {deal.underpricedAlert}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, flex: 1 }}>
          {deal.title}
        </div>
        <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
          <ScoreRing score={deal.confidenceScore} label="Confidence" color="#378ADD" />
          <ScoreRing score={deal.liquidityScore} label="Liquidity" color="#3B6D11" />
        </div>
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        {deal.year && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{deal.year}</span>}
        {deal.hours != null && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{deal.hours.toLocaleString()} hrs</span>}
        {deal.mileage != null && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{deal.mileage.toLocaleString()} mi</span>}
        {deal.location && <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{deal.location}</span>}
        {deal.liquidityLabel && <span style={{ fontSize: 12, color: "#3B6D11" }}>{deal.liquidityLabel}</span>}
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8, marginBottom: 12 }}>
        {[
          { label: "Asking",       val: fmt(deal.price),               color: "" },
          { label: "Utah Value",   val: fmt(deal.estimatedResaleValue), color: "#185FA5" },
          { label: "Transport",    val: fmt(deal.transportCost),        color: "" },
          { label: "Repairs",      val: fmt(deal.repairCosts),          color: "" },
          { label: "Offer",        val: fmt(deal.recommendedOffer),     color: "#185FA5" },
          { label: "MAO",          val: fmt(deal.mao),                  color: "#854F0B" },
          { label: "Fees (5%)",    val: fmt(deal.sellingFees),          color: "" },
          { label: "Profit",       val: fmt(deal.estimatedProfit),
            color: deal.estimatedProfit > 2000 ? "#27500A" : deal.estimatedProfit > 1000 ? "#854F0B" : "#A32D2D" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{
            background: "rgba(0,0,0,0.03)", borderRadius: 8, padding: "8px 10px",
          }}>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: color || "var(--color-text-primary)" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Recommendation + negotiation */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "5px 12px", borderRadius: 8,
          background: rec.bg, color: rec.color,
          fontSize: 12, fontWeight: 500,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: rec.dot }} />
          {deal.recommendation}
        </div>
        {deal.negotiation && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 8,
            background: "rgba(0,0,0,0.04)", color: "var(--color-text-secondary)",
            fontSize: 12,
          }}>
            {deal.negotiation.strategy} — {deal.negotiation.reason}
          </div>
        )}
      </div>

      {/* Seller flags */}
      {deal.sellerFlags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {deal.sellerFlags.map((flag: string) => (
            <span key={flag} style={{
              fontSize: 11, borderRadius: 4, padding: "2px 8px",
              background: "#FAEEDA", color: "#633806",
            }}>
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Risk flags */}
      {deal.riskFlags?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {deal.riskFlags.map((flag: string) => (
            <span key={flag} style={{
              fontSize: 11, borderRadius: 4, padding: "2px 8px",
              background: flag.includes("Limited info") ? "rgba(0,0,0,0.05)" : "#FCEBEB",
              color: flag.includes("Limited info") ? "var(--color-text-secondary)" : "#791F1F",
            }}>
              {flag}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={copyOffer}
        style={{
          width: "100%", padding: "10px", borderRadius: 8,
          background: copied ? "#EAF3DE" : "rgba(0,0,0,0.04)",
          color: copied ? "#27500A" : "var(--color-text-primary)",
          border: "0.5px solid rgba(0,0,0,0.12)",
          fontSize: 13, fontWeight: 500, cursor: "pointer",
          marginBottom: 8,
        }}
      >
        {copied ? "✓ Copied offer message" : "Copy offer message"}
      </button>

      {deal.url && (
        <a href={deal.url} target="_blank" rel="noreferrer" style={{
          display: "block", fontSize: 12, color: "#185FA5", textDecoration: "none",
        }}>
          View listing on KSL →
        </a>
      )}
    </div>
  )
}

export default function Home() {
  const [query, setQuery] = useState("")
  const [deals, setDeals] = useState<any[]>([])
  const [topDeal, setTopDeal] = useState<any>(null)
  const [utahComps, setUtahComps] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function analyze() {
    if (!query.trim()) return
    setLoading(true)
    setError("")
    setDeals([])
    setTopDeal(null)
    setUtahComps(null)

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

      setUtahComps(searchData.utahComps)

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

  return (
    <div style={{
      maxWidth: 480, margin: "0 auto",
      padding: "24px 16px", fontFamily: "system-ui, sans-serif",
      minHeight: "100vh", background: "#F1EFE8",
    }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: "0 0 4px" }}>Deal Finder</h1>
        <p style={{ fontSize: 13, color: "#888780", margin: 0 }}>UTVs · Trailers · Skid steers · Farm equipment</p>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="What are you looking for? (e.g. rzr 1000)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && analyze()}
          style={{ flex: 1 }}
        />
        <button onClick={analyze} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {utahComps && utahComps.avg > 0 && (
        <div style={{
          background: "var(--color-background-primary)",
          border: "0.5px solid rgba(0,0,0,0.12)",
          borderRadius: 12, padding: "12px 16px", marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: "#888780", marginBottom: 6, fontWeight: 500 }}>
            KSL UTAH MARKET · {query.toUpperCase()}
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: "#888780" }}>Avg</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{fmt(utahComps.avg)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#888780" }}>Low</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{fmt(utahComps.low)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#888780" }}>High</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{fmt(utahComps.high)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#888780" }}>Samples</div>
              <div style={{ fontSize: 16, fontWeight: 500 }}>{utahComps.samples}</div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background: "#FCEBEB", color: "#791F1F",
          borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 16,
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{
              background: "var(--color-background-primary)",
              borderRadius: 16, height: 180, opacity: 0.5,
              border: "0.5px solid rgba(0,0,0,0.08)",
            }} />
          ))}
        </div>
      )}

      {!loading && topDeal && (
        <>
          <div style={{ fontSize: 13, color: "#888780", marginBottom: 12 }}>
            {deals.length} deal{deals.length !== 1 ? "s" : ""} found · sorted by confidence
          </div>
          <DealCard deal={topDeal} featured />
          {deals.slice(1).map((deal, i) => <DealCard key={i} deal={deal} />)}
        </>
      )}

      {!loading && !topDeal && !error && (
        <div style={{ textAlign: "center", padding: "48px 0", fontSize: 13, color: "#B4B2A9" }}>
          Search for equipment to find deals
        </div>
      )}
    </div>
  )
}
