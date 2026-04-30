import OpenAI from "openai"

export async function POST(req: Request) {
  const { text } = await req.json()

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return Response.json(
      { error: "OPENAI_API_KEY is missing" },
      { status: 500 }
    )
  }

  const openai = new OpenAI({
    apiKey,
  })

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `
You are an equipment valuation assistant.

Extract the following as JSON:
year
make
model
category
hours
miles
conditionScore (0-100)
riskFlags (array)

Only return JSON.
        `,
      },
      {
        role: "user",
        content: text,
      },
    ],
  })

  return Response.json(
    completion.choices[0].message.content
  )
}
