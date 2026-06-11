import { describe, it, expect } from 'vitest';
import { mapExtractionToFormData } from './extraction-mapping';

describe('mapExtractionToFormData', () => {
    it('maps a Metagenomic extraction into records and AMR genes', () => {
        const result = {
            fields: {
                ph: 7.85,
                water_temperature: 21.7,
                sample_analysis_type: 'Metagenomic',
                location_name: 'Hartbeespoort Dam',
            },
            confidence: { ph: 95, water_temperature: 90, location_name: 88 },
            metagenomic: [
                { sequence_name: 'contig_017', element_type: 'AMR', class: 'BETA-LACTAM', subclass: 'CEPHALOSPORIN' },
                { sequence_name: 'contig_023', element_type: 'AMR', class: 'MACROLIDE', subclass: 'ERYTHROMYCIN' },
            ],
            wgs: [],
            amrGenes: ['blaCTX', 'mecA', 'vanA'],
            virulenceGenes: [],
        };

        const { updates, analysisType, info } = mapExtractionToFormData(result);

        expect(analysisType).toBe('Metagenomic');
        expect(updates.sample_analysis_type).toBe('Metagenomic');
        expect(updates.metagenomicRecords).toHaveLength(2);
        expect(updates.metagenomicRecords[0]).toEqual({
            sequence_name: 'contig_017',
            element_type: 'AMR',
            class: 'BETA-LACTAM',
            subclass: 'CEPHALOSPORIN',
        });
        expect(updates.amrGenes).toEqual(['blaCTX', 'mecA', 'vanA']);
        expect(updates.ph).toBe(7.85);
        expect(info.extras).toEqual(
            expect.arrayContaining(['2 Metagenomic records', '3 AMR genes']),
        );
    });

    it('maps a WGS extraction with string isolate IDs and virulence genes', () => {
        const result = {
            fields: { sample_analysis_type: 'WGS' },
            wgs: [{ isolateID: 1001, organism: 'Escherichia coli' }],
            amrGenes: [],
            virulenceGenes: ['stx1', 'eae'],
        };

        const { updates, analysisType } = mapExtractionToFormData(result);

        expect(analysisType).toBe('Whole Genome Sequence (WGS)');
        expect(updates.wgsRecords).toEqual([
            { isolateID: '1001', organism: 'Escherichia coli' },
        ]);
        expect(updates.virulenceGenes).toEqual(['stx1', 'eae']);
    });

    it('infers analysis type from the detail tables when the field is absent', () => {
        const result = {
            fields: {},
            metagenomic: [{ sequence_name: 'c1' }],
            amrGenes: [],
        };

        const { analysisType, updates } = mapExtractionToFormData(result);

        expect(analysisType).toBe('Metagenomic');
        expect(updates.sample_analysis_type).toBe('Metagenomic');
        expect(updates.metagenomicRecords).toHaveLength(1);
    });

    it('converts collection_date to a Date and flags low-confidence fields', () => {
        const result = {
            fields: { collection_date: '2024-10-15', ph: 6.9 },
            confidence: { collection_date: 95, ph: 40 },
        };

        const { updates, info } = mapExtractionToFormData(result);

        expect(updates.collection_date instanceof Date).toBe(true);
        expect(info.lowConfidence).toContain('pH Level');
    });
});
