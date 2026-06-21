/**
 * Tests for the pure OCR field parser (lib/sample-field-parser.js).
 *
 * No image or Tesseract involved — we feed synthetic word boxes (as Tesseract
 * would emit) and assert the extracted Sample fields.
 */

import {
    extractAllFromWords,
    extractFieldsFromWords,
    extractSampleRows,
    FIELDS,
} from '../lib/sample-field-parser.js'

// Build a word as Tesseract emits it: text + confidence + bounding box.
const word = (text, x0, y0, x1, y1, confidence = 90) => ({
    text,
    confidence,
    bbox: { x0, y0, x1, y1 },
})

describe('extractFieldsFromWords', () => {
    it('extracts a key/value (label : value) table', () => {
        const words = [
            // pH row
            word('pH', 10, 10, 40, 30, 95),
            word('7.2', 200, 10, 250, 30, 88),
            // Water Temperature row (multi-word label, value to the right)
            word('Water', 10, 50, 70, 70),
            word('Temperature', 75, 50, 200, 70),
            word('24.5', 300, 50, 360, 70, 80),
            // Latitude (negative number)
            word('Latitude', 10, 90, 110, 110),
            word('-25.75', 200, 90, 300, 110),
            // Longitude
            word('Longitude', 10, 130, 120, 150),
            word('28.23', 200, 130, 300, 150),
            // Collection Date (ISO)
            word('Collection', 10, 170, 110, 190),
            word('Date', 115, 170, 160, 190),
            word('2024-03-12', 200, 170, 380, 190),
            // Location (string)
            word('Location', 10, 210, 110, 230),
            word('Hartbeespoort', 200, 210, 420, 230),
            // Analysis type
            word('Analysis', 10, 250, 110, 270),
            word('Type', 115, 250, 170, 270),
            word('Metagenomic', 200, 250, 380, 270),
            // Punctuation-only noise word (normalises to empty string)
            word('--', 10, 290, 30, 310),
        ]

        const { fields, confidence } = extractFieldsFromWords(words)

        expect(fields).toMatchObject({
            ph: 7.2,
            water_temperature: 24.5,
            latitude: -25.75,
            longitude: 28.23,
            collection_date: '2024-03-12',
            location_name: 'Hartbeespoort',
            sample_analysis_type: 'Metagenomic',
        })
        // Fields not present in the image are not invented.
        expect(fields.tds).toBeUndefined()
        expect(fields.do).toBeUndefined()
        expect(fields.collected_by).toBeUndefined()

        // Confidence is the min of the contributing value words.
        expect(confidence.ph).toBe(88)
        expect(confidence.water_temperature).toBe(80)
    })

    it('extracts a header-row table (values directly below labels)', () => {
        const words = [
            // header row
            word('pH', 10, 10, 40, 30),
            word('DO', 100, 10, 140, 30),
            word('Analysis', 200, 10, 320, 30),
            // value row
            word('6.8', 10, 50, 50, 70),
            word('5.5', 100, 50, 150, 70),
            word('WGS', 200, 50, 260, 70),
        ]

        const { fields } = extractFieldsFromWords(words)

        expect(fields.ph).toBe(6.8)
        expect(fields.do).toBe(5.5)
        expect(fields.sample_analysis_type).toBe('WGS')
    })

    it('parses day-first dates (DD/MM/YYYY)', () => {
        const words = [
            word('Date', 10, 10, 60, 30),
            word('12/03/2024', 100, 10, 220, 30),
        ]
        const { fields } = extractFieldsFromWords(words)
        expect(fields.collection_date).toBe('2024-03-12')
    })

    it('parses named-month dates', () => {
        const words = [
            word('Date', 10, 10, 60, 30),
            word('March', 100, 10, 165, 30),
            word('15', 170, 10, 195, 30),
            word('2024', 200, 10, 255, 30),
        ]
        const { fields } = extractFieldsFromWords(words)
        expect(fields.collection_date).toBe('2024-03-15')
    })

    it('drops values that fail type/range validation', () => {
        const words = [
            word('pH', 10, 10, 40, 30),
            word('abc', 100, 10, 140, 30), // not a number
            word('Latitude', 10, 50, 110, 70),
            word('999', 200, 50, 260, 70), // out of [-90, 90]
            word('Date', 10, 90, 60, 110),
            word('N/A', 100, 90, 140, 110), // not a date
        ]
        const { fields } = extractFieldsFromWords(words)
        expect(Object.keys(fields)).toHaveLength(0)
    })

    it('matches slightly misspelled labels and handles missing confidence', () => {
        const words = [
            word('Locaton', 10, 10, 90, 30), // OCR typo for "Location"
            { text: 'Pretoria', bbox: { x0: 150, y0: 10, x1: 250, y1: 30 } }, // no confidence
        ]
        const { fields, confidence } = extractFieldsFromWords(words)
        expect(fields.location_name).toBe('Pretoria')
        expect(confidence.location_name).toBe(0)
    })

    it('does not borrow a neighbouring row value when the right value is invalid', () => {
        // OCR dropped the decimal in "20.5 °C" -> "205C", which is out of range.
        // The parser must NOT fall back to the pH value on the row below.
        const words = [
            word('Water', 20, 10, 90, 30),
            word('Temperature', 95, 10, 230, 30),
            word('205C', 320, 10, 400, 30),
            word('pH', 20, 54, 50, 74),
            word('7.85', 320, 54, 400, 74),
        ]
        const { fields } = extractFieldsFromWords(words)
        expect(fields.ph).toBe(7.85)
        expect(fields.water_temperature).toBeUndefined()
    })

    it('reads a header-row layout without swallowing other headers into string fields', () => {
        const words = [
            // header row
            word('Location', 40, 10, 180, 30),
            word('Latitude', 240, 10, 360, 30),
            word('Longitude', 420, 10, 560, 30),
            // value row
            word('Roodeplaat', 40, 50, 180, 70),
            word('-25.62', 240, 50, 340, 70),
            word('28.37', 420, 50, 520, 70),
        ]
        const { fields } = extractFieldsFromWords(words)
        expect(fields.location_name).toBe('Roodeplaat')
        expect(fields.latitude).toBe(-25.62)
        expect(fields.longitude).toBe(28.37)
    })

    it('uses the longest matching label so the value is not truncated', () => {
        const words = [
            word('Location', 20, 10, 140, 30),
            word('Name', 145, 10, 210, 30),
            word('Vaal', 320, 10, 380, 30),
            word('Dam', 385, 10, 440, 30),
        ]
        const { fields } = extractFieldsFromWords(words)
        expect(fields.location_name).toBe('Vaal Dam')
    })

    it('returns empty results for empty or missing input', () => {
        expect(extractFieldsFromWords([])).toEqual({ fields: {}, confidence: {} })
        expect(extractFieldsFromWords(undefined)).toEqual({ fields: {}, confidence: {} })
    })

    it('defines all Sample fields it can extract', () => {
        const keys = FIELDS.map((f) => f.key)
        expect(keys).toEqual(
            expect.arrayContaining([
                'water_temperature',
                'ph',
                'tds',
                'do',
                'latitude',
                'longitude',
                'collection_date',
                'location_name',
                'collected_by',
                'isolation_source',
                'sample_analysis_type',
            ]),
        )
    })
})

describe('extractSampleRows (one row per sample)', () => {
    it('extracts multiple samples from a wide table', () => {
        const words = [
            // header
            word('Location', 20, 10, 140, 30),
            word('Latitude', 200, 10, 330, 30),
            word('Longitude', 360, 10, 500, 30),
            word('Temp', 540, 10, 620, 30),
            word('pH', 660, 10, 710, 30),
            // row 1
            word('LakeA', 20, 50, 110, 70),
            word('-25.5', 200, 50, 290, 70),
            word('28.1', 360, 50, 440, 70),
            word('21.3', 540, 50, 610, 70),
            word('7.2', 660, 50, 710, 70),
            // row 2
            word('LakeB', 20, 90, 110, 110),
            word('-26.0', 200, 90, 290, 110),
            word('29.4', 360, 90, 440, 110),
            word('19.8', 540, 90, 610, 110),
            word('8.0', 660, 90, 710, 110),
        ]

        const samples = extractSampleRows(words)

        expect(samples).toEqual([
            { location_name: 'LakeA', latitude: -25.5, longitude: 28.1, water_temperature: 21.3, ph: 7.2 },
            { location_name: 'LakeB', latitude: -26.0, longitude: 29.4, water_temperature: 19.8, ph: 8.0 },
        ])
    })

    it('keeps rows without coordinates (they upload without a map marker)', () => {
        const words = [
            word('Location', 20, 10, 140, 30),
            word('Latitude', 200, 10, 330, 30),
            word('Longitude', 360, 10, 500, 30),
            word('pH', 560, 10, 610, 30),
            // fully-populated row
            word('LakeA', 20, 50, 110, 70),
            word('-25.5', 200, 50, 290, 70),
            word('28.1', 360, 50, 440, 70),
            word('7.2', 560, 50, 610, 70),
            // row missing longitude -> still kept, just without coordinates
            word('LakeB', 20, 90, 110, 110),
            word('-26.0', 200, 90, 290, 110),
            word('8.0', 560, 90, 610, 110),
        ]

        const samples = extractSampleRows(words)
        expect(samples).toHaveLength(2)
        expect(samples[0].location_name).toBe('LakeA')
        expect(samples[1].location_name).toBe('LakeB')
        expect(samples[1].longitude).toBeUndefined()
    })

    it('returns [] for a single-sample key/value layout', () => {
        const words = [
            word('pH', 10, 10, 40, 30),
            word('7.2', 200, 10, 250, 30),
            word('Latitude', 10, 50, 110, 70),
            word('-25.75', 200, 50, 300, 70),
        ]
        expect(extractSampleRows(words)).toEqual([])
    })
})

describe('extractAllFromWords (analysis details & genes)', () => {
    it('extracts a Metagenomic record table and AMR gene list', () => {
        const words = [
            // a couple of flat Sample fields above the table
            word('pH', 20, 10, 50, 30),
            word('7.4', 200, 10, 250, 30),
            // Metagenomic header row
            word('Sequence', 40, 70, 150, 90),
            word('Name', 155, 70, 230, 90),
            word('Element', 280, 70, 390, 90),
            word('Type', 395, 70, 455, 90),
            word('Class', 520, 70, 600, 90),
            word('Subclass', 660, 70, 790, 90),
            // data row 1
            word('seq_001', 40, 110, 150, 130),
            word('AMR', 280, 110, 360, 130),
            word('Aminoglycoside', 500, 110, 640, 130),
            word('Streptomycin', 660, 110, 800, 130),
            // data row 2
            word('seq_002', 40, 150, 150, 170),
            word('AMR', 280, 150, 360, 170),
            word('Beta-lactam', 500, 150, 640, 170),
            word('Carbapenem', 660, 150, 800, 170),
            // AMR genes line (last)
            word('AMR', 40, 210, 120, 230),
            word('Genes:', 125, 210, 230, 230),
            word('blaTEM,', 240, 210, 360, 230),
            word('sul1,', 365, 210, 440, 230),
            word('tetA', 445, 210, 510, 230),
        ]

        const result = extractAllFromWords(words)

        expect(result.fields.ph).toBe(7.4)
        expect(result.metagenomic).toEqual([
            { sequence_name: 'seq_001', element_type: 'AMR', class: 'Aminoglycoside', subclass: 'Streptomycin' },
            { sequence_name: 'seq_002', element_type: 'AMR', class: 'Beta-lactam', subclass: 'Carbapenem' },
        ])
        expect(result.amrGenes).toEqual(['blaTEM', 'sul1', 'tetA'])
        expect(result.wgs).toEqual([])
        expect(result.virulenceGenes).toEqual([])
    })

    it('extracts a WGS record table (numeric isolate IDs) and virulence genes', () => {
        const words = [
            // WGS header row
            word('Isolate', 40, 10, 140, 30),
            word('ID', 145, 10, 180, 30),
            word('Organism', 300, 10, 460, 30),
            // data row 1
            word('101', 40, 50, 90, 70),
            word('Escherichia', 300, 50, 440, 70),
            word('coli', 445, 50, 510, 70),
            // data row 2
            word('102', 40, 90, 90, 110),
            word('Salmonella', 300, 90, 460, 110),
            // virulence genes line
            word('Virulence', 40, 150, 180, 170),
            word('Genes:', 185, 150, 290, 170),
            word('stx1', 300, 150, 380, 170),
            word('eae', 385, 150, 450, 170),
        ]

        const result = extractAllFromWords(words)

        expect(result.wgs).toEqual([
            { isolateID: 101, organism: 'Escherichia coli' },
            { isolateID: 102, organism: 'Salmonella' },
        ])
        expect(result.virulenceGenes).toEqual(['stx1', 'eae'])
        expect(result.metagenomic).toEqual([])
        expect(result.amrGenes).toEqual([])
    })

    it('ignores a "None" gene placeholder and finds no tables in a plain key/value image', () => {
        const words = [
            word('pH', 20, 10, 50, 30),
            word('7.0', 200, 10, 250, 30),
            word('AMR', 20, 50, 100, 70),
            word('Genes:', 105, 50, 210, 70),
            word('None', 220, 50, 290, 70),
        ]

        const result = extractAllFromWords(words)
        expect(result.metagenomic).toEqual([])
        expect(result.wgs).toEqual([])
        expect(result.amrGenes).toEqual([])
    })
})
