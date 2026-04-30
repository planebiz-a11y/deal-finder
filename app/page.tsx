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

    const resaleValue = 12000
    const transport = 300
    const repair = 500
    const profitTarget = 1000

    const mao =
      resaleValue - transport - repair - profitTarget

    setResult({
      parsed: data,
      resaleValue,
      mao,
      profit: resaleValue - mao,
    })
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
          <p>Value: ${result.resaleValue}</p>
          <p>MAO: ${result.mao}</p>
          <p>Profit: ${result.profit}</p>
        </div>
      )}
    </div>
  )
}
