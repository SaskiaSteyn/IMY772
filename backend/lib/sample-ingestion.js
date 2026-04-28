import prisma from './prisma.js'

function parseOptionalDecimal(value) {
    if (value === null || value === undefined) {
        return null
    }

    const raw = String(value).trim()
    if (!raw) {
        return null
    }

    const parsed = Number(raw)
    if (Number.isNaN(parsed)) {
        throw new Error('Expected numeric value')
    }

    return parsed
}

function parseRequiredDecimal(value, fieldName) {
    if (value === null || value === undefined) {
        throw new Error(`Missing required field: ${fieldName}`)
    }

    const raw = String(value).trim()
    if (!raw) {
        throw new Error(`Missing required field: ${fieldName}`)
    }

    const parsed = Number(raw)
    if (Number.isNaN(parsed)) {
        throw new Error(`${fieldName} must be numeric`)
    }

    return parsed
}

function parseOptionalDate(value) {
    if (value === null || value === undefined) {
        return null
    }

    const raw = String(value).trim()
    if (!raw) {
        return null
    }

    const date = new Date(raw)
    if (Number.isNaN(date.getTime())) {
        throw new Error('collection_date must be a valid ISO 8601 date')
    }

    return date
}

function normalizeString(value) {
    if (value === null || value === undefined) {
        return null
    }

    const raw = String(value).trim()
    return raw.length > 0 ? raw : null
}

function normalizeGeneSymbol(value) {
    const raw = String(value || '').trim()
    return raw.length > 0 ? raw : null
}

/**
 * Inserts sample rows and related metagenomic + AMR gene rows.
 * This function is designed for bulk workflows where each sample should succeed/fail independently.
 *
 * @param {Array} samples
 * @returns {Promise<{totalSamples:number, successCount:number, failureCount:number, errors:Array, sampleIDs:number[]}>}
 */
export async function insertSamplesWithRelations(samples) {
    const totalSamples = Array.isArray(samples) ? samples.length : 0

    const results = {
        totalSamples,
        successCount: 0,
        failureCount: 0,
        errors: [],
        sampleIDs: [],
    }

    if (!Array.isArray(samples)) {
        return {
            ...results,
            failureCount: totalSamples,
            errors: [{ sampleIndex: 0, error: 'Samples must be an array' }],
        }
    }

    for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex += 1) {
        const sample = samples[sampleIndex]

        try {
            const createdSample = await prisma.$transaction(async (tx) => {
                const created = await tx.sample.create({
                    data: {
                        latitude: parseRequiredDecimal(sample?.latitude, 'latitude'),
                        longitude: parseRequiredDecimal(sample?.longitude, 'longitude'),
                        water_temperature: parseOptionalDecimal(sample?.water_temperature),
                        ph: parseOptionalDecimal(sample?.ph),
                        tds: parseOptionalDecimal(sample?.tds),
                        do: parseOptionalDecimal(sample?.do),
                        sample_analysis_type: normalizeString(sample?.sample_analysis_type),
                        isolation_source: normalizeString(sample?.isolation_source),
                        collection_date: parseOptionalDate(sample?.collection_date),
                        location_name: normalizeString(sample?.location_name),
                        collected_by: normalizeString(sample?.collected_by),
                        predicted_sir_profile: normalizeString(sample?.predicted_sir_profile),
                    },
                })

                const metagenomicRecords = Array.isArray(sample?.metagenomic)
                    ? sample.metagenomic
                    : []

                const amrGeneSymbols = new Set()
                const seenSequenceNames = new Set()

                for (const metagenomicRecord of metagenomicRecords) {
                    const sequenceName = normalizeString(metagenomicRecord?.sequence_name)
                    if (!sequenceName) {
                        throw new Error('Metagenomic sequence_name is required when metagenomic data is provided')
                    }

                    if (seenSequenceNames.has(sequenceName)) {
                        continue
                    }

                    seenSequenceNames.add(sequenceName)

                    await tx.metagenomic.create({
                        data: {
                            sampleID: created.sampleID,
                            sequence_name: sequenceName,
                            element_type: normalizeString(metagenomicRecord?.element_type),
                            class: normalizeString(metagenomicRecord?.class),
                            subclass: normalizeString(metagenomicRecord?.subclass),
                        },
                    })

                    const genes = Array.isArray(metagenomicRecord?.amr_resistance_genes)
                        ? metagenomicRecord.amr_resistance_genes
                        : []

                    for (const gene of genes) {
                        const geneSymbol = normalizeGeneSymbol(gene)
                        if (geneSymbol) {
                            amrGeneSymbols.add(geneSymbol)
                        }
                    }
                }

                for (const geneSymbol of amrGeneSymbols) {
                    await tx.amrResistanceGene.create({
                        data: {
                            sampleID: created.sampleID,
                            geneSymbol,
                        },
                    })
                }

                return created
            })

            results.successCount += 1
            results.sampleIDs.push(createdSample.sampleID)
        } catch (error) {
            results.failureCount += 1
            results.errors.push({
                sampleIndex,
                error: error?.message || 'Failed to insert sample',
            })
        }
    }

    return results
}
