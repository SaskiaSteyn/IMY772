import xlsx from 'xlsx'
import Papa from 'papaparse'

/**
 * Parse a CSV or Excel file buffer and return an object with `samples` array.
 * Expected columns (case-insensitive matching):
 *   - sample_id (string, required)
 *   - latitude (decimal, required)
 *   - longitude (decimal, required)
 *   - water_temp (optional decimal)
 *   - ph (optional decimal)
 *   - tds (optional decimal)
 *   - do (optional decimal)
 *   - isolation_source (optional string)
 *   - collection_date (optional date string)
 *   - location_name (optional string)
 * 
 * For nested relations, the file should have repeating rows per sample? Alternatively,
 * we support a simplified approach: each row is one sample, and isolates/amr/phenotypes
 * are encoded as JSON strings in columns. But more robust: separate sections.
 * 
 * For simplicity, this parser assumes each row represents one sample and any related
 * data (isolates, AMR findings, predicted phenotypes) are provided as JSON arrays
 * in columns: `isolates_json`, `amr_findings_json`, `predicted_phenotypes_json`.
 * 
 * Example JSON formats:
 *   isolates_json: '[{"organism":"E. coli","mlst_type":"ST131"}]'
 *   amr_findings_json: '[{"analysis_type":"WGS","gene_symbol":"blaCTX-M-15","drug_class":"Cephalosporin","method":"ResFinder","percent_identity":99.5}]'
 *   predicted_phenotypes_json: '[{"organism":"E. coli","antibiotic":"Ciprofloxacin","resistant":true}]'
 */
export async function parseBulkUploadFile(fileBuffer, mimeType) {
    let rows = []

    if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
        // Parse CSV
        const csvString = fileBuffer.toString('utf-8')
        const result = Papa.parse(csvString, {header: true, skipEmptyLines: true})
        if (result.errors.length) {
            throw new Error(`CSV parsing errors: ${result.errors.map(e => e.message).join(', ')}`)
        }
        rows = result.data
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        // Parse Excel
        const workbook = xlsx.read(fileBuffer, {type: 'buffer'})
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        rows = xlsx.utils.sheet_to_json(sheet)
    } else {
        throw new Error('Unsupported file type. Please upload CSV or Excel (.xlsx)')
    }

    const samples = []

    for (const row of rows) {
        // Helper to get case-insensitive field
        const getField = (fieldNames) => {
            for (const name of fieldNames) {
                if (row[name] !== undefined) return row[name]
                const lowerName = name.toLowerCase()
                for (const key in row) {
                    if (key.toLowerCase() === lowerName) return row[key]
                }
            }
            return undefined
        }

        const sample_id = getField(['sample_id', 'sampleId', 'SampleID'])
        if (!sample_id) {
            throw new Error(`Missing sample_id in row: ${JSON.stringify(row)}`)
        }

        const latitude = getField(['latitude', 'Latitude'])
        const longitude = getField(['longitude', 'Longitude'])
        if (latitude === undefined || longitude === undefined) {
            throw new Error(`Missing latitude or longitude for sample ${sample_id}`)
        }

        const sample = {
            sample_id: String(sample_id).trim(),
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            water_temp: getField(['water_temp', 'waterTemperature', 'water_temperature']) !== undefined ? parseFloat(getField(['water_temp', 'waterTemperature', 'water_temperature'])) : undefined,
            ph: getField(['ph', 'pH']) !== undefined ? parseFloat(getField(['ph', 'pH'])) : undefined,
            tds: getField(['tds', 'TDS']) !== undefined ? parseFloat(getField(['tds', 'TDS'])) : undefined,
            do: getField(['do', 'DO', 'dissolved_oxygen']) !== undefined ? parseFloat(getField(['do', 'DO', 'dissolved_oxygen'])) : undefined,
            isolation_source: getField(['isolation_source', 'isolationSource', 'source']) || null,
            collection_date: getField(['collection_date', 'collectionDate', 'date']) ? new Date(getField(['collection_date', 'collectionDate', 'date'])) : null,
            location_name: getField(['location_name', 'locationName', 'location']) || null,
        }

        // Parse nested JSON if present
        const isolatesJson = getField(['isolates_json', 'isolatesJson', 'isolates'])
        if (isolatesJson) {
            try {
                sample.isolates = JSON.parse(isolatesJson)
            } catch (e) {
                throw new Error(`Invalid JSON in isolates_json for sample ${sample_id}: ${e.message}`)
            }
        } else {
            sample.isolates = []
        }

        const amrJson = getField(['amr_findings_json', 'amrFindingsJson', 'amr_findings'])
        if (amrJson) {
            try {
                sample.amrFindings = JSON.parse(amrJson)
            } catch (e) {
                throw new Error(`Invalid JSON in amr_findings_json for sample ${sample_id}: ${e.message}`)
            }
        } else {
            sample.amrFindings = []
        }

        const phenJson = getField(['predicted_phenotypes_json', 'predictedPhenotypesJson', 'predicted_phenotypes'])
        if (phenJson) {
            try {
                sample.predictedPhenotypes = JSON.parse(phenJson)
            } catch (e) {
                throw new Error(`Invalid JSON in predicted_phenotypes_json for sample ${sample_id}: ${e.message}`)
            }
        } else {
            sample.predictedPhenotypes = []
        }

        samples.push(sample)
    }

    return {samples}
}