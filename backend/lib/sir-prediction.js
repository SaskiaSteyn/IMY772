import OpenAI from 'openai'

function toNumber(value) {
    if (value === null || value === undefined || value === '') return null
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
}

function toRadians(degrees) {
    return (degrees * Math.PI) / 180
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
    const earthRadiusKm = 6371
    const deltaLat = toRadians(lat2 - lat1)
    const deltaLon = toRadians(lon2 - lon1)
    const a =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(deltaLon / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return earthRadiusKm * c
}

/**
 * Build nearby training samples that have a predicted phenotype matching the requested organism/antibiotic.
 */
function buildNearbySamples(inputSample, trainingSamples, organism, antibiotic, limit = 30) {
    const inputLat = toNumber(inputSample.latitude)
    const inputLon = toNumber(inputSample.longitude)
    if (inputLat === null || inputLon === null) return []

    const results = []

    for (const sample of trainingSamples) {
        const lat = toNumber(sample.latitude)
        const lon = toNumber(sample.longitude)
        if (lat === null || lon === null) continue

        // Find predicted phenotypes for this sample that match the requested organism & antibiotic
        const matchingPhenotypes = (sample.predictedPhenotypes || []).filter(
            (p) =>
                p.organism === organism &&
                p.antibiotic === antibiotic &&
                typeof p.resistant === 'boolean'
        )
        if (matchingPhenotypes.length === 0) continue

        // Use the first matching phenotype (or you could aggregate)
        const phenotype = matchingPhenotypes[0]
        const distanceKm = haversineDistanceKm(inputLat, inputLon, lat, lon)

        results.push({
            latitude: lat,
            longitude: lon,
            distance_km: Number(distanceKm.toFixed(3)),
            water_temperature: toNumber(sample.water_temp),
            ph: toNumber(sample.ph),
            tds: toNumber(sample.tds),
            do: toNumber(sample.do),
            isolation_source: sample.isolation_source || null,
            resistant: phenotype.resistant, // boolean target
        })
    }

    results.sort((a, b) => a.distance_km - b.distance_km)
    return results.slice(0, limit)
}

/**
 * Fallback: distance-weighted majority vote on `resistant` boolean.
 */
function buildFallbackPrediction(nearbySamples) {
    if (nearbySamples.length === 0) {
        return {
            resistant: false,
            confidence: 0.5,
            strategy: 'default-no-training-data',
            nearbySampleCount: 0,
        }
    }

    let totalWeight = 0
    let resistantWeight = 0

    for (const s of nearbySamples) {
        const weight = 1 / (s.distance_km + 0.25)
        totalWeight += weight
        if (s.resistant === true) resistantWeight += weight
    }

    const resistantProbability = totalWeight > 0 ? resistantWeight / totalWeight : 0.5
    const predictedResistant = resistantProbability >= 0.5

    return {
        resistant: predictedResistant,
        confidence: Number(resistantProbability.toFixed(3)),
        strategy: 'distance-weighted-nearest-neighbors',
        nearbySampleCount: nearbySamples.length,
    }
}

/**
 * Prepare training examples for the OpenAI prompt.
 */
function sanitizeTrainingSamplesForPrompt(samples) {
    return samples.map((s) => ({
        distance_km: s.distance_km,
        water_temperature: s.water_temperature,
        ph: s.ph,
        tds: s.tds,
        do: s.do,
        isolation_source: s.isolation_source,
        resistant: s.resistant,
    }))
}

/**
 * Main prediction function – returns { resistant: boolean, confidence, ... }
 */
export async function predictSirProfileWithAI({
    inputSample,
    trainingSamples, // array of Sample objects with .predictedPhenotypes included
    organism,
    antibiotic,
}) {
    if (!organism || !antibiotic) {
        throw new Error('organism and antibiotic are required for prediction')
    }

    const nearbySamples = buildNearbySamples(inputSample, trainingSamples, organism, antibiotic)
    const fallback = buildFallbackPrediction(nearbySamples)

    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
        return {
            ...fallback,
            usedOpenAI: false,
            model: null,
            note: 'OPENAI_API_KEY not configured. Returned deterministic fallback prediction.',
        }
    }

    try {
        const client = new OpenAI({apiKey: openaiApiKey})
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

        const completion = await client.chat.completions.create({
            model,
            temperature: 0.1,
            response_format: {type: 'json_object'},
            messages: [
                {
                    role: 'system',
                    content:
                        'You predict whether a water sample will be resistant to a specific antibiotic for a given organism. Respond only with JSON: {"resistant": boolean, "confidence": number (0-1), "reasoning": string}.',
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        target_sample: {
                            latitude: toNumber(inputSample.latitude),
                            longitude: toNumber(inputSample.longitude),
                            water_temperature: toNumber(inputSample.water_temp),
                            ph: toNumber(inputSample.ph),
                            tds: toNumber(inputSample.tds),
                            do: toNumber(inputSample.do),
                            isolation_source: inputSample.isolation_source || null,
                        },
                        organism,
                        antibiotic,
                        nearest_training_samples: sanitizeTrainingSamplesForPrompt(nearbySamples),
                        fallback_prediction: fallback,
                        instruction:
                            'Use nearby training samples as main signal. Prefer geographically close points and similar water chemistry. Return resistant: true/false and a confidence score.',
                    }),
                },
            ],
        })

        const content = completion.choices?.[0]?.message?.content
        const parsed = content ? JSON.parse(content) : {}
        const predictedResistant =
            typeof parsed.resistant === 'boolean'
                ? parsed.resistant
                : fallback.resistant
        const confidence =
            typeof parsed.confidence === 'number' && !isNaN(parsed.confidence)
                ? Math.min(Math.max(parsed.confidence, 0), 1)
                : fallback.confidence

        return {
            resistant: predictedResistant,
            confidence: Number(confidence.toFixed(3)),
            strategy: 'openai-with-nearby-training-context',
            nearbySampleCount: nearbySamples.length,
            usedOpenAI: true,
            model,
            reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : null,
        }
    } catch (error) {
        return {
            ...fallback,
            usedOpenAI: false,
            model: null,
            note: `OpenAI request failed. ${error.message}`,
        }
    }
}