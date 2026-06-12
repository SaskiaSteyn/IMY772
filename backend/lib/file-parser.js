import xlsx from 'xlsx'
import Papa from 'papaparse'

export async function parseBulkUploadFile(fileBuffer, mimeType) {
    let rows = []

    if (mimeType === 'application/json' || mimeType === 'text/plain') {
        const json = JSON.parse(fileBuffer.toString('utf-8'))

        if (Array.isArray(json)) {
            rows = json
        } else if (json && typeof json === 'object') {
            const { samples = [], isolates = [], predicted_phenotypes = [], amr_findings = [], virulence_genes = [] } = json

            const isolatesBySample = {}
            const phenotypesBySample = {}
            const amrBySample = {}
            const vgBySample = {}

            isolates.forEach(i => {
                if (!isolatesBySample[i.sample_id]) isolatesBySample[i.sample_id] = []
                isolatesBySample[i.sample_id].push(i)
            })
            predicted_phenotypes.forEach(p => {
                if (!phenotypesBySample[p.sample_id]) phenotypesBySample[p.sample_id] = []
                phenotypesBySample[p.sample_id].push(p)
            })
            amr_findings.forEach(a => {
                if (!amrBySample[a.sample_id]) amrBySample[a.sample_id] = []
                amrBySample[a.sample_id].push(a)
            })
            virulence_genes.forEach(v => {
                if (!vgBySample[v.sample_id]) vgBySample[v.sample_id] = []
                vgBySample[v.sample_id].push(v)
            })

            rows = samples.map(s => ({
                ...s,
                isolates_json: JSON.stringify(isolatesBySample[s.sample_id] || []),
                predicted_phenotypes_json: JSON.stringify(phenotypesBySample[s.sample_id] || []),
                amr_findings_json: JSON.stringify(amrBySample[s.sample_id] || []),
                virulence_genes_json: JSON.stringify(vgBySample[s.sample_id] || []),
            }))
        } else {
            throw new Error('JSON must be an array of samples or a combined object with samples/isolates/predicted_phenotypes/amr_findings')
        }
    } else if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
        const csvString = fileBuffer.toString('utf-8')
        const result = Papa.parse(csvString, {header: true, skipEmptyLines: true})
        if (result.errors.length) {
            throw new Error(`CSV parsing errors: ${result.errors.map(e => e.message).join(', ')}`)
        }
        rows = result.data
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        const workbook = xlsx.read(fileBuffer, {type: 'buffer'})
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        rows = xlsx.utils.sheet_to_json(sheet)
    } else {
        throw new Error('Unsupported file type. Please upload CSV, JSON, or Excel (.xlsx)')
    }

    const samples = []

    for (const row of rows) {
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
            sample_name: getField(['sample_name', 'Sample_name']) ? String(getField(['sample_name', 'Sample_name'])).trim() : null,
            collected_by: getField(['collected_by', 'Collected_by']) || null,
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

        const isolatesJson = getField(['isolates_json', 'isolatesJson', 'isolates'])
        if (isolatesJson) {
            try { sample.isolates = JSON.parse(isolatesJson) } catch (e) {
                throw new Error(`Invalid JSON in isolates_json for sample ${sample_id}: ${e.message}`)
            }
        } else { sample.isolates = [] }

        const amrJson = getField(['amr_findings_json', 'amrFindingsJson', 'amr_findings'])
        if (amrJson) {
            try { sample.amrFindings = JSON.parse(amrJson) } catch (e) {
                throw new Error(`Invalid JSON in amr_findings_json for sample ${sample_id}: ${e.message}`)
            }
        } else { sample.amrFindings = [] }

        const phenJson = getField(['predicted_phenotypes_json', 'predictedPhenotypesJson', 'predicted_phenotypes'])
        if (phenJson) {
            try { sample.predictedPhenotypes = JSON.parse(phenJson) } catch (e) {
                throw new Error(`Invalid JSON in predicted_phenotypes_json for sample ${sample_id}: ${e.message}`)
            }
        } else { sample.predictedPhenotypes = [] }

        const vgJson = getField(['virulence_genes_json', 'virulenceGenesJson', 'virulence_genes'])
        if (vgJson) {
            try { sample.virulenceGenes = JSON.parse(vgJson) } catch (e) {
                throw new Error(`Invalid JSON in virulence_genes_json for sample ${sample_id}: ${e.message}`)
            }
        } else { sample.virulenceGenes = [] }

        samples.push(sample)
    }

    return {samples}
}
