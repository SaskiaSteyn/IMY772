import OpenAI from 'openai'

const VALID_SIR_VALUES = ['susceptible', 'intermediate', 'resistant']

function normalizeSirProfile(value) {
    if (!value) {
        return null
    }

    const normalized = String(value).trim().toLowerCase()
    return VALID_SIR_VALUES.includes(normalized) ? normalized : null
}

function toNumber(value) {
    if (value === null || value === undefined || value === '') {
        return null
    }

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
        Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return earthRadiusKm * c
}

function buildNearbySamples(inputSample, trainingSamples, limit = 30) {
    const inputLatitude = toNumber(inputSample.latitude)
    const inputLongitude = toNumber(inputSample.longitude)

    if (inputLatitude === null || inputLongitude === null) {
        return []
    }

    return trainingSamples
        .map((sample) => {
            const latitude = toNumber(sample.latitude)
            const longitude = toNumber(sample.longitude)

            if (latitude === null || longitude === null) {
                return null
            }

            const normalizedProfile = normalizeSirProfile(sample.predicted_sir_profile)
            if (!normalizedProfile) {
                return null
            }

            const distanceKm = haversineDistanceKm(
                inputLatitude,
                inputLongitude,
                latitude,
                longitude,
            )

            return {
                latitude,
                longitude,
                water_temperature: toNumber(sample.water_temperature),
                ph: toNumber(sample.ph),
                tds: toNumber(sample.tds),
                do: toNumber(sample.do),
                sample_analysis_type: sample.sample_analysis_type || null,
                isolation_source: sample.isolation_source || null,
                predicted_sir_profile: normalizedProfile,
                distance_km: Number(distanceKm.toFixed(3)),
            }
        })
        .filter(Boolean)
        .sort((a, b) => a.distance_km - b.distance_km)
        .slice(0, limit)
}

function buildFallbackPrediction(nearbySamples) {
    if (nearbySamples.length === 0) {
        return {
            predicted_sir_profile: 'intermediate',
            confidence: 0.34,
            strategy: 'default-no-training-data',
            nearbySampleCount: 0,
        }
    }

    const scores = {
        susceptible: 0,
        intermediate: 0,
        resistant: 0,
    }

    nearbySamples.forEach((sample) => {
        const profile = normalizeSirProfile(sample.predicted_sir_profile)
        if (!profile) {
            return
        }

        const weight = 1 / (sample.distance_km + 0.25)
        scores[profile] += weight
    })

    const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1])
    const winner = ranked[0][0]
    const total = ranked.reduce((sum, [, score]) => sum + score, 0)
    const confidence = total > 0 ? ranked[0][1] / total : 0.34

    return {
        predicted_sir_profile: winner,
        confidence: Number(Math.min(Math.max(confidence, 0), 1).toFixed(3)),
        strategy: 'distance-weighted-nearest-neighbors',
        nearbySampleCount: nearbySamples.length,
    }
}

function sanitizeTrainingSamplesForPrompt(samples) {
    return samples.map((sample) => ({
        latitude: sample.latitude,
        longitude: sample.longitude,
        distance_km: sample.distance_km,
        water_temperature: sample.water_temperature,
        ph: sample.ph,
        tds: sample.tds,
        do: sample.do,
        sample_analysis_type: sample.sample_analysis_type,
        isolation_source: sample.isolation_source,
        predicted_sir_profile: sample.predicted_sir_profile,
    }))
}

export async function predictSirProfileWithAI({ inputSample, trainingSamples }) {
    const nearbySamples = buildNearbySamples(inputSample, trainingSamples)
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
        const client = new OpenAI({ apiKey: openaiApiKey })
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'

        const completion = await client.chat.completions.create({
            model,
            temperature: 0.1,
            response_format: { type: 'json_object' },
            messages: [
                {
                    role: 'system',
                    content:
                        'You classify water sample SIR profiles. Respond only with valid JSON using keys: predicted_sir_profile, confidence, reasoning. predicted_sir_profile must be one of susceptible|intermediate|resistant. confidence must be between 0 and 1.',
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        target_sample: {
                            latitude: toNumber(inputSample.latitude),
                            longitude: toNumber(inputSample.longitude),
                            water_temperature: toNumber(inputSample.water_temperature),
                            ph: toNumber(inputSample.ph),
                            tds: toNumber(inputSample.tds),
                            do: toNumber(inputSample.do),
                            sample_analysis_type: inputSample.sample_analysis_type || null,
                            isolation_source: inputSample.isolation_source || null,
                        },
                        nearest_training_samples: sanitizeTrainingSamplesForPrompt(nearbySamples),
                        fallback_prediction: fallback,
                        instruction:
                            'Use nearby training samples as main signal. Prefer geographically close points and similar water chemistry. Return probability-like confidence.',
                    }),
                },
            ],
        })

        const content = completion.choices?.[0]?.message?.content
        const parsed = content ? JSON.parse(content) : {}
        const predicted = normalizeSirProfile(parsed.predicted_sir_profile) || fallback.predicted_sir_profile
        const confidence = Number(parsed.confidence)

        return {
            predicted_sir_profile: predicted,
            confidence: Number.isFinite(confidence)
                ? Number(Math.min(Math.max(confidence, 0), 1).toFixed(3))
                : fallback.confidence,
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
            note: `OpenAI request failed. Returned fallback prediction. ${error.message}`,
        }
    }
}