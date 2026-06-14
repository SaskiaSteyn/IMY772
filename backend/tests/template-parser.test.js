/**
 * Tests for lib/template-parser.js
 * Uses xlsx to build in-memory workbook buffers.
 */

import xlsx from 'xlsx'
import {parseExcelTemplate} from '../lib/template-parser.js'

// Mirrors the real template structure using aoa_to_sheet so row positions are exact:
//   Row 1-3: legend text   (skipped by range:4)
//   Row 4:   blank         (skipped by range:4)
//   Row 5:   column headers  ← range:4 treats this as the header row
//   Row 6+:  data rows
function makeBuffer(rows) {
    if (rows.length === 0) {
        // Empty data: just write legend + header row with no data rows
        const aoa = [
            ['GREEN fields are mandatory.'],
            ['BLUE fields indicate at least one is mandatory.'],
            ['YELLOW fields are optional.'],
            [],
            [],  // empty header row
        ]
        const ws = xlsx.utils.aoa_to_sheet(aoa)
        const wb = xlsx.utils.book_new()
        xlsx.utils.book_append_sheet(wb, ws, 'Sheet1')
        return xlsx.write(wb, {type: 'buffer', bookType: 'xlsx'})
    }

    const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
    const aoa = [
        ['GREEN fields are mandatory.'],
        ['BLUE fields indicate at least one is mandatory.'],
        ['YELLOW fields are optional.'],
        [],
        headers,
        ...rows.map(r => headers.map(h => r[h] ?? null)),
    ]
    const ws = xlsx.utils.aoa_to_sheet(aoa)
    const wb = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(wb, ws, 'Sheet1')
    return xlsx.write(wb, {type: 'buffer', bookType: 'xlsx'})
}

describe('parseExcelTemplate', () => {
    test('parses a basic row into a sample with AMR finding', () => {
        const buf = makeBuffer([
            {
                'Sample ID': 'S001',
                latitude: 25.1,
                longitude: 28.2,
                'Sample_name': 'River Site A',
                'Collected by': 'Alice',
                'AMR_Resistance_genes': 'blaCTX-M',
                'Class': 'Cephalosporin',
            },
        ])

        const samples = parseExcelTemplate(buf)
        expect(samples).toHaveLength(1)
        const s = samples[0]
        expect(s.sample_id).toBe('S001')
        expect(s.sample_name).toBe('River Site A')
        expect(s.latitude).toBe(25.1)
        expect(s.longitude).toBe(28.2)
        expect(s.collected_by).toBe('Alice')
        expect(s.amrFindings).toHaveLength(1)
        expect(s.amrFindings[0].gene_symbol).toBe('blaCTX-M')
        expect(s.amrFindings[0].amr_class).toBe('Cephalosporin')
    })

    test('falls back to sample_id as sample_name when sample_name is absent', () => {
        const buf = makeBuffer([{
            'Sample ID': 'S002',
            latitude: 1,
            longitude: 2,
        }])
        const [s] = parseExcelTemplate(buf)
        expect(s.sample_name).toBe('S002')
    })

    test('groups multiple rows with same sample_id into one sample', () => {
        const buf = makeBuffer([
            {'Sample ID': 'S003', latitude: 10, longitude: 20, 'AMR_Resistance_genes': 'blaOXA'},
            {'Sample ID': 'S003', latitude: 10, longitude: 20, 'AMR_Resistance_genes': 'blaNDM'},
        ])
        const samples = parseExcelTemplate(buf)
        expect(samples).toHaveLength(1)
        expect(samples[0].amrFindings).toHaveLength(2)
    })

    test('parses virulence genes (comma-separated) from Virulence_genes column', () => {
        const buf = makeBuffer([{
            'Sample ID': 'S004',
            latitude: 5,
            longitude: 6,
            'Virulence_genes': 'hlyA, stx1, stx2',
        }])
        const [s] = parseExcelTemplate(buf)
        expect(s.virulenceGenes).toHaveLength(3)
        expect(s.virulenceGenes.map(g => g.gene_symbol)).toEqual(['hlyA', 'stx1', 'stx2'])
    })

    test('parses predicted phenotype from Organism and SIR profile', () => {
        const buf = makeBuffer([{
            'Sample ID': 'S005',
            latitude: 1,
            longitude: 2,
            'Organism': 'E. coli',
            'Predicted_SIR profile': 'resistant',
        }])
        const [s] = parseExcelTemplate(buf)
        expect(s.isolates).toHaveLength(1)
        expect(s.isolates[0].organism).toBe('E. coli')
        expect(s.predictedPhenotypes).toHaveLength(1)
        expect(s.predictedPhenotypes[0].predicted_sir_profile).toBe('Resistant')
    })

    test('skips rows without a Sample ID', () => {
        const buf = makeBuffer([
            {'Sample ID': '', latitude: 1, longitude: 2},
            {'Sample ID': 'S006', latitude: 3, longitude: 4},
        ])
        const samples = parseExcelTemplate(buf)
        expect(samples).toHaveLength(1)
        expect(samples[0].sample_id).toBe('S006')
    })

    test('returns sample with null lat/lon when coordinates are missing', () => {
        const buf = makeBuffer([{'Sample ID': 'S007'}])
        const samples = parseExcelTemplate(buf)
        expect(samples).toHaveLength(1)
        expect(samples[0].sample_id).toBe('S007')
        expect(samples[0].latitude).toBeNull()
        expect(samples[0].longitude).toBeNull()
    })

    test('returns empty array when sheet has no valid rows', () => {
        const buf = makeBuffer([])
        const samples = parseExcelTemplate(buf)
        expect(samples).toHaveLength(0)
    })

    test('parses all optional water quality fields', () => {
        const buf = makeBuffer([{
            'Sample ID': 'S008',
            latitude: 10,
            longitude: 20,
            'Temp of water': 18.5,
            'pH': 7.4,
            'TDS (mg/L)': 120,
            'Dissolved Oxygen (mg/L)': 9.6,
            'Isolation source': 'River',
            'Collection date': '2024-03-01',
            'geo_loc_name': 'Limpopo River',
        }])
        const [s] = parseExcelTemplate(buf)
        expect(s.water_temp).toBe(18.5)
        expect(s.ph).toBe(7.4)
        expect(s.tds).toBe(120)
        expect(s.do).toBe(9.6)
        expect(s.isolation_source).toBe('River')
        expect(s.collection_date).toBeInstanceOf(Date)
        expect(s.location_name).toBe('Limpopo River')
    })

    test('handles case-insensitive column name lookup', () => {
        const buf = makeBuffer([{
            'sample id': 'S009',
            'LATITUDE': 15,
            'LONGITUDE': 25,
        }])
        const samples = parseExcelTemplate(buf)
        expect(samples).toHaveLength(1)
        expect(samples[0].sample_id).toBe('S009')
    })

    test('parses AMR finding with all optional fields', () => {
        const buf = makeBuffer([{
            'Sample ID': 'S010',
            latitude: 1,
            longitude: 2,
            'AMR_Resistance_genes': 'blaNDM',
            'Sample_Analysis_Type': 'WGS',
            'Subclass': 'Carbapenem',
            'Sequence Name': 'NDM-1',
            'Element type': 'AMR',
            'Target length': 800,
            'Reference sequence length': 810,
            '% Coverage of reference sequence': 99.5,
            '% Identity to reference sequence': 98.2,
            'Accession of closest sequence': 'NG_052671',
        }])
        const [s] = parseExcelTemplate(buf)
        const f = s.amrFindings[0]
        expect(f.analysis_type).toBe('WGS')
        expect(f.subclass).toBe('Carbapenem')
        expect(f.sequence_name).toBe('NDM-1')
        expect(f.element_type).toBe('AMR')
        expect(f.target_length).toBe(800)
        expect(f.reference_sequence_length).toBe(810)
        expect(f.percentage_coverage).toBeCloseTo(99.5)
        expect(f.percent_identity).toBeCloseTo(98.2)
        expect(f.accession_of_closest_sequence).toBe('NG_052671')
    })
})
