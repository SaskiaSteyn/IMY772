import xlsx from 'xlsx'

// Strip leading asterisk(s) and whitespace from column header keys before comparing,
// matching the template's colour-coded mandatory markers (e.g. "* Sample ID" → "sample id")
const normalizeKey = (k) => k.replace(/^\*+\s*/, '').trim().toLowerCase()

const get = (row, names) => {
    for (const name of names) {
        const normalName = normalizeKey(name)
        for (const key in row) {
            if (normalizeKey(key) === normalName && row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key]
        }
    }
    return undefined
}

const toStr = (v) => (v !== undefined ? String(v).trim() || null : null)
const toFloat = (v) => (v !== undefined && v !== '' ? parseFloat(v) : null)
const toInt = (v) => (v !== undefined && v !== '' ? parseInt(v) : null)

// Handles DD/MM/YYYY (template format) as well as ISO strings and JS Date objects
const toDate = (v) => {
    if (!v) return null
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v
    const s = String(v).trim()
    const ddmmyyyy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
    if (ddmmyyyy) {
        const [, d, m, y] = ddmmyyyy
        const dt = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`)
        return isNaN(dt.getTime()) ? null : dt
    }
    const dt = new Date(s)
    return isNaN(dt.getTime()) ? null : dt
}

// Parses the flat Excel template format where each row = one sample + one AMR gene.
// Groups rows by Sample ID, aggregating AMR findings and virulence genes per sample.
export function parseExcelTemplate(fileBuffer) {
    const workbook = xlsx.read(fileBuffer, {type: 'buffer', cellDates: true})
    // Skip the first 3 header/legend rows — actual data starts at row 4
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    // range: 4 skips the 3 legend rows + 1 blank row; row 5 becomes the header row
    const rows = xlsx.utils.sheet_to_json(sheet, {defval: null, raw: false, range: 4})

    const sampleMap = new Map()

    for (const row of rows) {
        const sample_id = toStr(get(row, ['Sample ID', '*Sample ID', 'sample_id', 'SampleID']))
        if (!sample_id) continue

        const lat = toFloat(get(row, ['latitude', 'Latitude']))
        const lon = toFloat(get(row, ['longitude', 'Longitude']))

        if (!sampleMap.has(sample_id)) {
            const organism = toStr(get(row, ['Organism', 'organism']))
            const sirRaw = toStr(get(row, ['Predicted_SIR profile', '*Predicted_SIR profile', 'Predicted SIR profile', 'predicted_sir_profile']))
            const sir = sirRaw ? sirRaw.charAt(0).toUpperCase() + sirRaw.slice(1).toLowerCase() : null

            sampleMap.set(sample_id, {
                sample_id,
                sample_name: toStr(get(row, ['Sample_name', '*Sample_name', 'Sample name', 'sample_name'])) || sample_id,
                collected_by: toStr(get(row, ['Collected by', 'Collected_by', 'collected_by'])),
                latitude: lat,
                longitude: lon,
                water_temp: toFloat(get(row, ['Temp of water', 'water_temp', 'water_temperature'])),
                ph: toFloat(get(row, ['pH', 'ph'])),
                tds: toFloat(get(row, ['TDS (mg/L)', 'tds', 'TDS'])),
                do: toFloat(get(row, ['Dissolved Oxygen (mg/L)', 'do', 'DO', 'dissolved_oxygen'])),
                isolation_source: toStr(get(row, ['Isolation source', 'isolation_source', 'isolationSource'])),
                collection_date: toDate(get(row, ['Collection date', 'collection_date', 'collectionDate'])),
                location_name: toStr(get(row, ['geo_loc_name', 'staged_loc_name', 'location_name', 'locationName', 'location'])),
                isolates: organism
                    ? [{ organism, mlst_type: toStr(get(row, ['Isolate ID', 'isolate_id'])) }]
                    : [],
                predictedPhenotypes: organism && sir
                    ? [{ organism, antibiotic: null, predicted_sir_profile: sir }]
                    : [],
                amrFindings: [],
                virulenceGenes: [],
            })
        }

        const entry = sampleMap.get(sample_id)

        const geneSymbol = toStr(get(row, ['AMR_Resistance_genes', 'AMR Resistance genes', 'gene_symbol']))
        if (geneSymbol) {
            entry.amrFindings.push({
                gene_symbol: geneSymbol,
                analysis_type: toStr(get(row, ['Sample_Analysis_Type', '*Sample_Analysis_Type', 'analysis_type'])),
                amr_class: toStr(get(row, ['Class', 'amr_class'])),
                subclass: toStr(get(row, ['Subclass', 'subclass'])),
                sequence_name: toStr(get(row, ['Sequence Name', 'sequence_name'])),
                element_type: toStr(get(row, ['Element type', 'element_type'])),
                target_length: toInt(get(row, ['Target length', 'target_length'])),
                reference_sequence_length: toInt(get(row, ['Reference sequence length', 'reference_sequence_length'])),
                percentage_coverage: toFloat(get(row, ['% Coverage of reference sequence', 'percentage_coverage'])),
                percent_identity: toFloat(get(row, ['% Identity to reference sequence', 'percent_identity'])),
                accession_of_closest_sequence: toStr(get(row, ['Accession of closest sequence', 'accession_of_closest_sequence'])),
            })
        }

        const vGenes = toStr(get(row, ['Virulence_genes', 'Virulence genes', 'virulence_genes']))
        if (vGenes) {
            for (const gs of vGenes.split(',').map(s => s.trim()).filter(Boolean)) {
                entry.virulenceGenes.push({ gene_symbol: gs })
            }
        }
    }

    return Array.from(sampleMap.values())
}
