import express from 'express'

const router = express.Router()

const SYSTEM_PROMPT = `You are a data filter assistant for a water sample dashboard. The user will describe what data they want to see in natural language.

Convert their query into a JSON filter spec. Respond ONLY with valid JSON — no explanation, no markdown.

Available fields and types:
- ph (number) — e.g. "pH is 7", "pH above 6.5"
- water_temp (number, °C) — e.g. "temperature below 20"
- tds (number, mg/L) — Total Dissolved Solids
- do (number, mg/L) — Dissolved Oxygen
- isolation_source (string) — e.g. "river", "tap", "borehole"
- location_name (string) — e.g. "Cape Town"
- predicted_sir_profile (string) — one of: "resistant", "susceptible", "intermediate", "unknown"

Available operators: eq, gt, lt, gte, lte, contains, between

Response format:
{
  "filters": [
    { "field": "ph", "op": "eq", "value": 7 }
  ]
}

For "between", value is an array: { "field": "ph", "op": "between", "value": [6, 8] }
For string fields use "eq" for exact match or "contains" for partial match.
If you cannot interpret the query or it references unknown fields, return: { "filters": [], "error": "Could not interpret query" }`

// Field aliases so users can say "temperature", "water temp", "ph", "dissolved oxygen", etc.
const FIELD_ALIASES = {
    ph: 'ph',
    'p h': 'ph',
    temperature: 'water_temp',
    temp: 'water_temp',
    'water temp': 'water_temp',
    'water temperature': 'water_temp',
    tds: 'tds',
    'total dissolved solids': 'tds',
    'dissolved solids': 'tds',
    do: 'do',
    oxygen: 'do',
    'dissolved oxygen': 'do',
    location: 'location_name',
    'location name': 'location_name',
    source: 'isolation_source',
    'isolation source': 'isolation_source',
    sir: 'predicted_sir_profile',
    profile: 'predicted_sir_profile',
    'sir profile': 'predicted_sir_profile',
    resistant: 'predicted_sir_profile',
    susceptible: 'predicted_sir_profile',
    intermediate: 'predicted_sir_profile',
}

const STRING_FIELDS = new Set(['isolation_source', 'location_name', 'predicted_sir_profile'])

// Operator keywords
const OP_PATTERNS = [
    { re: /\b(greater than or equal to|at least|>=|gte)\b/, op: 'gte' },
    { re: /\b(less than or equal to|at most|<=|lte)\b/, op: 'lte' },
    { re: /\b(greater than|above|over|more than|>)\b/, op: 'gt' },
    { re: /\b(less than|below|under|<)\b/, op: 'lt' },
    { re: /\b(equals?|is|=|of)\b/, op: 'eq' },
    { re: /\b(contains?|includes?|like)\b/, op: 'contains' },
    { re: /\bbetween\b/, op: 'between' },
]

function resolveField(text) {
    const lower = text.toLowerCase().trim()
    if (FIELD_ALIASES[lower]) return FIELD_ALIASES[lower]
    // Try partial match
    for (const [alias, field] of Object.entries(FIELD_ALIASES)) {
        if (lower.includes(alias)) return field
    }
    return null
}

function parseLocalQuery(query) {
    const lower = query.toLowerCase()
    const filters = []

    // Handle SIR profile keywords directly: "show resistant samples"
    for (const profile of ['resistant', 'susceptible', 'intermediate']) {
        if (lower.includes(profile)) {
            filters.push({ field: 'predicted_sir_profile', op: 'eq', value: profile })
        }
    }

    // Match patterns like: "<field> <op> <value>" or "between <value> and <value>"
    // E.g. "ph above 7", "water temp between 20 and 30", "location contains Cape Town"
    const fieldPattern = new RegExp(
        `(ph|p h|temperature|temp|water temp(?:erature)?|tds|total dissolved solids|dissolved solids|do|dissolved oxygen|oxygen|location(?: name)?|isolation source|source|sir(?: profile)?|profile)` +
        `\\s+(?:is\\s+)?` +
        `(greater than or equal to|at least|less than or equal to|at most|greater than|above|over|more than|less than|below|under|equals?|is|contains?|includes?|between|>=|<=|>|<|=)?` +
        `\\s*([\\d.]+(?:\\s+and\\s+[\\d.]+)?|[\\w\\s]+?)(?=\\s+(?:and|or|,|$)|$)`,
        'gi'
    )

    let match
    while ((match = fieldPattern.exec(lower)) !== null) {
        const fieldRaw = match[1]
        const opRaw = (match[2] || 'eq').trim()
        const valueRaw = match[3].trim()

        const field = resolveField(fieldRaw)
        if (!field) continue

        // Skip if already added via SIR shortcut
        if (field === 'predicted_sir_profile' && filters.some(f => f.field === 'predicted_sir_profile')) continue

        // Resolve operator
        let op = 'eq'
        for (const { re, op: o } of OP_PATTERNS) {
            if (re.test(opRaw)) { op = o; break }
        }

        // Parse value
        if (op === 'between') {
            const nums = valueRaw.match(/[\d.]+/g)
            if (nums && nums.length >= 2) {
                filters.push({ field, op, value: [parseFloat(nums[0]), parseFloat(nums[1])] })
            }
        } else if (STRING_FIELDS.has(field)) {
            filters.push({ field, op: op === 'eq' ? 'contains' : op, value: valueRaw })
        } else {
            const num = parseFloat(valueRaw)
            if (!isNaN(num)) {
                filters.push({ field, op, value: num })
            }
        }
    }

    return filters
}

async function parseWithGemini(query, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ parts: [{ text: query }] }],
            generationConfig: {
                temperature: 0,
                responseMimeType: 'application/json',
            },
        }),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Gemini error ${res.status}: ${err}`)
    }

    const data = await res.json()
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text
    return JSON.parse(content)
}

router.post('/filter', async (req, res) => {
    const { query } = req.body
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'query is required' })
    }

    const apiKey = process.env.GEMINI_API_KEY

    // Try Gemini first if key is available
    if (apiKey) {
        try {
            const result = await parseWithGemini(query, apiKey)
            return res.json(result)
        } catch (err) {
            console.warn('Gemini unavailable, falling back to local parser:', err.message)
        }
    }

    // Local regex fallback
    const filters = parseLocalQuery(query)
    if (filters.length > 0) {
        return res.json({ filters })
    }

    return res.json({ filters: [], error: 'Could not interpret query. Try something like "show samples where pH is above 7".' })
})

export default router
