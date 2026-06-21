import {useState} from 'react';
import * as XLSX from 'xlsx';
import BulkPreviewModal from './bulk-preview-modal';
import ImageSamplesEditor from './image-samples-editor';
import {extractSamplesFromImage} from '../../api/sample-data-management';
import {
    Button,
    Group,
    Modal,
    Stack,
    Text,
    Badge,
    Alert,
    Loader,
    ActionIcon,
    Divider,
} from '@mantine/core';
import {AlertCircle, CheckCircle, FileUp, Image as ImageIcon, X} from 'lucide-react';
import styles from './bulk-upload-modal.module.scss';
import {buildApiUrl} from '../../api/api-client.js';

// Normalise the backend's upload response into the summary shape the results
// panel renders. The /api/bulk-upload/samples endpoint returns `results` as a
// per-row array ({ success, sample_id, error }); older endpoints returned a
// ready-made summary object, which is passed through unchanged.
function normaliseUploadResult(results) {
    if (!Array.isArray(results)) {
        return results || {successCount: 0, failureCount: 0, totalSamples: 0, sampleIDs: [], errors: []};
    }

    const succeeded = results.filter((r) => r.success);
    const failed = results.filter((r) => !r.success);

    return {
        totalSamples: results.length,
        successCount: succeeded.length,
        failureCount: failed.length,
        sampleIDs: succeeded.map((r) => r.sample_id),
        errors: failed.map((r, idx) => ({
            sampleIndex: r.sample_id || idx + 1,
            error: r.error || 'Unknown error',
        })),
    };
}

export default function BulkUploadModal({isOpen, onClose, onUploadSuccess}) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [error, setError] = useState(null);
    const [samplePreviews, setSamplePreviews] = useState([]);
    const [previewOpen, setPreviewOpen] = useState(false);
    // Image (multi-sample) flow: null = inactive, array = editable extracted rows
    const [imageSamples, setImageSamples] = useState(null);

    // Allowed fields for samples, isolates, phenotypes, and amr findings
    const allowedSampleFields = [
        'sample_id', 'sample_name', 'collected_by', 'collection_date', 'location_name', 'latitude', 'longitude',
        'isolation_source', 'water_temp', 'ph', 'tds', 'do'
    ];
    const allowedIsolateFields = [
        'isolate_id', 'sample_id', 'organism', 'mlst_type'
    ];
    const allowedPhenotypeFields = [
        'phenotype_id', 'sample_id', 'organism', 'antibiotic', 'predicted_sir_profile'
    ];
    const allowedAmrFields = [
        'finding_id', 'sample_id', 'analysis_type', 'gene_symbol', 'amr_class', 'method', 'percent_identity',
        'sequence_name', 'element_type', 'subclass', 'percentage_coverage'
    ];
    const allowedVirulenceFields = [
        'virulence_gene_id', 'sample_id', 'gene_symbol', 'method', 'percent_identity', 'coverage_percent',
        'alignment_length', 'target_length', 'ref_seq_length', 'accession', 'sequence_name', 'element_type'
    ];

    const filterFields = (obj, allowed) => {
        if (!obj) return {};
        const filtered = {};
        for (const key of allowed) {
            if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
                filtered[key] = obj[key];
            }
        }
        return filtered;
    };

    // Detect data type based on first record properties
    const detectDataType = (data) => {
        if (!Array.isArray(data) || data.length === 0) return null;

        const first = data[0];

        // Check for nested structure (all_tables_combined.json format)
        if (first.sample || (first.isolates && !first.sample_id)) {
            return 'nested';
        }

        // Check for individual table types
        if (first.phenotype_id && !first.organism && first.predicted_sir_profile !== undefined) {
            return 'phenotypes';
        }
        if (first.finding_id && first.gene_symbol && (first.amr_class || first.drug_class)) {
            return 'amr_findings';
        }
        if (first.virulence_gene_id || (first.gene_symbol && first.coverage_percent !== undefined)) {
            return 'virulence_genes';
        }
        if (first.isolate_id && first.organism && first.mlst_type) {
            return 'isolates';
        }
        if (first.phenotype_id && first.organism && first.antibiotic) {
            return 'phenotypes';
        }
        if (first.sample_id && (first.collection_date || first.location_name || first.latitude)) {
            return 'samples';
        }

        return 'unknown';
    };

    // Transform flat arrays into preview structure
    const transformFlatData = (data, dataType) => {
        if (dataType === 'nested') {
            // Already in nested format
            return data.map(item => ({
                sample: filterFields(item.sample, allowedSampleFields),
                isolates: (item.isolates || []).map(i => filterFields(i, allowedIsolateFields)),
                phenotypes: (item.phenotypes || []).map(p => filterFields(p, allowedPhenotypeFields)),
                amrFindings: (item.amr_findings || []).map(a => filterFields(a, allowedAmrFields)),
                virulenceGenes: (item.virulence_genes || []).map(v => filterFields(v, allowedVirulenceFields)),
            }));
        }

        if (dataType === 'virulence_genes') {
            const byIndex = {};
            data.forEach((gene, idx) => {
                byIndex[idx] = {
                    sample: {},
                    isolates: [],
                    phenotypes: [],
                    amrFindings: [],
                    virulenceGenes: [filterFields(gene, allowedVirulenceFields)],
                };
            });
            return Object.values(byIndex);
        }

        if (dataType === 'samples') {
            return data.map(sample => ({
                sample: filterFields(sample, allowedSampleFields),
                isolates: [],
                phenotypes: [],
                amrFindings: [],
                virulenceGenes: [],
            }));
        }

        if (dataType === 'isolates') {
            const byIndex = {};
            data.forEach((isolate, idx) => {
                byIndex[idx] = {
                    sample: {},
                    isolates: [filterFields(isolate, allowedIsolateFields)],
                    phenotypes: [],
                    amrFindings: [],
                    virulenceGenes: [],
                };
            });
            return Object.values(byIndex);
        }

        if (dataType === 'phenotypes') {
            const byIndex = {};
            data.forEach((phenotype, idx) => {
                byIndex[idx] = {
                    sample: {},
                    isolates: [],
                    phenotypes: [filterFields(phenotype, allowedPhenotypeFields)],
                    amrFindings: [],
                    virulenceGenes: [],
                };
            });
            return Object.values(byIndex);
        }

        if (dataType === 'amr_findings') {
            const byIndex = {};
            data.forEach((finding, idx) => {
                byIndex[idx] = {
                    sample: {},
                    isolates: [],
                    phenotypes: [],
                    amrFindings: [filterFields(finding, allowedAmrFields)],
                    virulenceGenes: [],
                };
            });
            return Object.values(byIndex);
        }

        // Unknown format - try to convert as-is
        return data.map(item => ({
            sample: filterFields(item, allowedSampleFields),
            isolates: [],
            phenotypes: [],
            amrFindings: [],
            virulenceGenes: [],
        }));
    };

    // Build preview objects for each sample or record
    const buildSamplePreviews = (parsedArray) => {
        const dataType = detectDataType(parsedArray);

        if (dataType === 'unknown' || !dataType) {
            console.warn('Unknown data format, attempting to parse as samples');
            return transformFlatData(parsedArray, 'samples');
        }

        return transformFlatData(parsedArray, dataType);
    };

    const handleFileChange = async (event) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        const fileName = selectedFile.name.toLowerCase();
        const validExtensions = ['.csv', '.json', '.xlsx'];
        const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext));
        if (!hasValidExtension) {
            setError('Invalid file type. Please upload a CSV, JSON, or Excel (.xlsx) file.');
            setFile(null);
            setSamplePreviews([]);
            return;
        }

        setFile(selectedFile);
        setError(null);
        setUploadResult(null);

        let parsed = null;
        try {
            if (fileName.endsWith('.json')) {
                const text = await selectedFile.text();
                parsed = JSON.parse(text);
            } else if (fileName.endsWith('.xlsx')) {
                // Count rows for display only — actual parsing happens server-side
                const arrayBuffer = await selectedFile.arrayBuffer();
                const workbook = XLSX.read(arrayBuffer, {type: 'array'});
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                // range: 4 skips the 3 legend rows + 1 blank row; row 5 becomes the header row
                const rows = XLSX.utils.sheet_to_json(sheet, {defval: null, range: 4});
                const getSampleId = (r) => {
                    for (const key of Object.keys(r)) {
                        if (key.replace(/^\*/, '').trim().toLowerCase() === 'sample id') return r[key];
                    }
                    return r['sample_id'] || null;
                };
                const sampleIds = new Set(rows.map(getSampleId).filter(Boolean));
                setFile(selectedFile);
                setError(null);
                setUploadResult(null);
                setSamplePreviews([{_xlsxSummary: true, rowCount: rows.length, sampleCount: sampleIds.size}]);
                setPreviewOpen(true);
                return;
            } else if (fileName.endsWith('.csv')) {
                const text = await selectedFile.text();
                const rows = text.split(/\r?\n/).filter(r => r.trim());
                if (rows.length < 1) {
                    setError('CSV file is empty');
                    setSamplePreviews([]);
                    return;
                }

                const headers = rows[0].split(',').map(h => h.trim());
                parsed = rows.slice(1).map(row => {
                    const values = row.split(',').map(v => v.trim());
                    const obj = {};
                    headers.forEach((h, i) => {
                        const value = values[i];
                        if (value === 'true') obj[h] = true;
                        else if (value === 'false') obj[h] = false;
                        else if (!isNaN(value) && value !== '') obj[h] = parseFloat(value);
                        else obj[h] = value;
                    });
                    return obj;
                });
            }
        } catch (e) {
            setError('Failed to parse file: ' + e.message);
            setSamplePreviews([]);
            return;
        }

        // Handle nested structure (all_tables_combined.json format)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const {samples = [], isolates = [], predicted_phenotypes = [], amr_findings = [], virulence_genes = []} = parsed;

            // Convert nested structure to array format
            if (samples.length > 0 || isolates.length > 0 || predicted_phenotypes.length > 0 || amr_findings.length > 0 || virulence_genes.length > 0) {
                // Build a map for quick lookup
                const isolatesByID = {};
                const phenotypesByID = {};
                const amrByID = {};
                const virulenceByID = {};

                isolates.forEach(iso => {
                    if (!isolatesByID[iso.sample_id]) isolatesByID[iso.sample_id] = [];
                    isolatesByID[iso.sample_id].push(iso);
                });

                predicted_phenotypes.forEach(phen => {
                    if (!phenotypesByID[phen.sample_id]) phenotypesByID[phen.sample_id] = [];
                    phenotypesByID[phen.sample_id].push(phen);
                });

                amr_findings.forEach(amr => {
                    if (!amrByID[amr.sample_id]) amrByID[amr.sample_id] = [];
                    amrByID[amr.sample_id].push(amr);
                });

                virulence_genes.forEach(vg => {
                    if (!virulenceByID[vg.sample_id]) virulenceByID[vg.sample_id] = [];
                    virulenceByID[vg.sample_id].push(vg);
                });

                // Build preview array
                const previews = samples.map(sample => ({
                    sample: filterFields(sample, allowedSampleFields),
                    isolates: (isolatesByID[sample.sample_id] || []).map(i => filterFields(i, allowedIsolateFields)),
                    phenotypes: (phenotypesByID[sample.sample_id] || []).map(p => filterFields(p, allowedPhenotypeFields)),
                    amrFindings: (amrByID[sample.sample_id] || []).map(a => filterFields(a, allowedAmrFields)),
                    virulenceGenes: (virulenceByID[sample.sample_id] || []).map(v => filterFields(v, allowedVirulenceFields)),
                }));

                setSamplePreviews(previews);
                setPreviewOpen(true);
                return;
            } else {
                setError('File contains no data. Expected samples, isolates, predicted_phenotypes, amr_findings, or virulence_genes.');
                setSamplePreviews([]);
                return;
            }
        }

        if (!Array.isArray(parsed)) {
            setError('File must be an array or a combined JSON object with samples, isolates, predicted_phenotypes, and amr_findings.');
            setSamplePreviews([]);
            return;
        }

        if (parsed.length === 0) {
            setError('File contains no records.');
            setSamplePreviews([]);
            return;
        }

        // Build previews and open the modal
        try {
            const previews = buildSamplePreviews(parsed);
            setSamplePreviews(previews);
            setPreviewOpen(true);
        } catch (e) {
            setError('Error processing file data: ' + e.message);
            setSamplePreviews([]);
        }
    };

    // Shared insert path: send a file to /api/bulk-upload (CSV/JSON parsed and
    // inserted server-side). Image samples are packaged as a JSON file so they
    // reuse the exact same validation + insert + result reporting.
    const uploadFile = async (fileToUpload, specificEndpoint = null) => {
        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', fileToUpload);

            const endpoint = buildApiUrl(specificEndpoint || '/api/bulk-upload/samples');
            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.details || data.error || data.message || 'Upload failed');
                setUploadResult(null);
            } else {
                // The /samples endpoint returns `results` as a per-row array
                // ({ success, sample_id, error }); older endpoints returned a
                // summary object. Normalise to the summary shape the UI renders.
                const summary = normaliseUploadResult(data.results);
                setUploadResult(summary);
                setFile(null);
                setSamplePreviews([]);
                setImageSamples(null);
                if (onUploadSuccess) {
                    onUploadSuccess(summary.sampleIDs);
                }
            }
        } catch (err) {
            setError(err.message || 'Network error during upload');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }
        if (file.name.toLowerCase().endsWith('.xlsx')) {
            uploadFile(file, '/api/template-upload');
        } else {
            uploadFile(file);
        }
    };

    // ── Image (multi-sample) flow ───────────────────────────────────────────
    const handleImageChange = async (event) => {
        const selected = event.target.files?.[0];
        event.target.value = ''; // allow re-selecting the same file later
        if (!selected) return;

        setError(null);
        setUploadResult(null);
        setFile(null);
        setSamplePreviews([]);
        setLoading(true);
        try {
            const {samples} = await extractSamplesFromImage(selected);
            if (!samples || samples.length === 0) {
                setError(
                    'No sample rows were found. This uploader expects a table with one sample per row and a clear header row. For a single sample (one field per row), use "Add new entry" instead.',
                );
                setImageSamples(null);
            } else {
                // Ensure empty fields for sample_id so user can fill them in
                // (bulk-upload requires sample_id)
                const withIds = samples.map((s) => ({
                    sample_id: s.sample_id || '',
                    ...s,
                }));
                setImageSamples(withIds);
            }
        } catch (err) {
            setError(err.message || 'Failed to read image');
            setImageSamples(null);
        } finally {
            setLoading(false);
        }
    };

    const updateImageSample = (idx, field, value) => {
        setImageSamples((prev) =>
            prev.map((s, i) => (i === idx ? {...s, [field]: value} : s)),
        );
    };

    const removeImageSample = (idx) => {
        setImageSamples((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleImageUpload = () => {
        const isFilled = (v) => v !== '' && v !== null && v !== undefined;
        // Only a Sample ID is required — latitude/longitude are optional. Samples
        // without coordinates upload fine; they just won't appear on the map.
        const valid = (imageSamples || []).filter((s) => isFilled(s.sample_id));
        if (valid.length === 0) {
            setError('Each sample needs a Sample ID before uploading.');
            return;
        }

        // Convert the simple format { sample_id, ... } into the format expected by the CSV parser
        // (which is just an array of flat objects, that's what PapaParse output would look like)
        // AND the backend only reads CSV or Excel for `/samples` now. Wait!

        // Build the header from the union of every sample's keys so rows that omit
        // a field (e.g. missing coordinates) still line up with the right columns.
        const columns = Array.from(
            valid.reduce((set, obj) => {
                Object.keys(obj).forEach((k) => set.add(k));
                return set;
            }, new Set()),
        );
        const escape = (val) => {
            if (val === null || val === undefined) return '';
            const str = String(val);
            return str.includes(',') ? `"${str}"` : str;
        };
        const header = columns.join(',');
        const rows = valid
            .map((obj) => columns.map((col) => escape(obj[col])).join(','))
            .join('\n');

        const csvContent = `${header}\n${rows}`;
        
        const csvFile = new File(
            [csvContent],
            'image-samples.csv',
            {type: 'text/csv'},
        );
        uploadFile(csvFile, '/api/bulk-upload/samples');
    };

    const handleReset = () => {
        setFile(null);
        setError(null);
        setUploadResult(null);
        setSamplePreviews([]);
        setImageSamples(null);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    return (
        <>
            <Modal
                opened={isOpen}
                onClose={handleClose}
                title='Bulk Upload Sample Data'
                size='lg'
                centered
            >
                <Stack spacing='md'>
                    {/* File Input Section */}
                    {!uploadResult && !file && !imageSamples && (
                        <>
                            <Text size='sm' color='dimmed'>
                                Choose a file format below. Each format is parsed differently — pick the one that matches your data.
                            </Text>

                            {/* Excel template */}
                            <div className={styles.uploadArea}>
                                <input
                                    type='file'
                                    id='file-input'
                                    onChange={handleFileChange}
                                    accept='.csv,.json,.xlsx'
                                    style={{display: 'none'}}
                                />
                                <label htmlFor='file-input' className={styles.uploadLabel}>
                                    <FileUp size={28} />
                                    <Text weight={600} size='sm'>Excel / CSV / JSON</Text>
                                    <Text size='xs' color='dimmed' style={{textAlign: 'center', maxWidth: 380}}>
                                        <strong>.xlsx</strong> — standard dashboard template (one row per AMR gene, samples grouped automatically)<br/>
                                        <strong>.json</strong> — <code>samples.json</code> array, or <code>all_tables_combined.json</code> with samples, isolates, phenotypes &amp; AMR findings<br/>
                                        <strong>.csv</strong> — same flat structure as JSON
                                    </Text>
                                </label>
                            </div>

                            <Divider label='or' labelPosition='center' />

                            <div className={styles.uploadArea}>
                                <input
                                    type='file'
                                    id='image-input'
                                    onChange={handleImageChange}
                                    accept='image/*'
                                    style={{display: 'none'}}
                                />
                                <label htmlFor='image-input' className={styles.uploadLabel}>
                                    <ImageIcon size={32} />
                                    <Text weight={500}>
                                        Upload a photo of a table
                                    </Text>
                                    <Text size='xs' color='dimmed'>
                                        One sample per row (Latitude & Longitude optional)
                                    </Text>
                                </label>
                            </div>
                        </>
                    )}

                    {/* Editable preview for samples extracted from an image */}
                    {!uploadResult && imageSamples && !loading && (
                        <ImageSamplesEditor
                            samples={imageSamples}
                            onUpdate={updateImageSample}
                            onRemove={removeImageSample}
                        />
                    )}

                    {/* Selected File Display & Preview Button */}
                    {!uploadResult && file && (
                        <Stack spacing='md'>
                            <Text size='sm' color='dimmed'>
                                Selected file will be uploaded:
                            </Text>
                            <Group spacing='xs'>
                                <Badge color='blue' size='lg'>
                                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                                </Badge>
                                <ActionIcon
                                    size='sm'
                                    color='gray'
                                    variant='subtle'
                                    onClick={() => {setFile(null); setSamplePreviews([]);}}
                                    title='Remove file'
                                >
                                    <X size={18} />
                                </ActionIcon>
                                {samplePreviews.length > 0 && (
                                    <Button size='xs' variant='light' onClick={() => setPreviewOpen(true)}>
                                        Preview Data
                                    </Button>
                                )}
                            </Group>
                        </Stack>
                    )}

                    {/* Error Alert */}
                    {error && (
                        <Alert icon={<AlertCircle size={16} />} color='red' title='Upload Error'>
                            {error}
                        </Alert>
                    )}

                    {/* Loading State */}
                    {loading && (
                        <Stack spacing='sm' align='center'>
                            <Loader size='lg' />
                            <Text color='dimmed'>Processing your file...</Text>
                        </Stack>
                    )}

                    {/* Results Section */}
                    {uploadResult && !loading && (
                        <Stack spacing='md'>
                            <Alert icon={<CheckCircle size={16} />} title='Upload Completed'>
                                {uploadResult.createdCount != null ? (
                                    <>
                                        {uploadResult.createdCount} created, {uploadResult.updatedCount} updated
                                        {uploadResult.failureCount > 0 && `, ${uploadResult.failureCount} failed`}
                                        {' '}— {uploadResult.totalSamples} total.
                                    </>
                                ) : (
                                    <>{uploadResult.successCount} of {uploadResult.totalSamples} samples were successfully uploaded.</>
                                )}
                            </Alert>
                            {uploadResult.failureCount > 0 && (
                                <>
                                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                                        <Alert icon={<AlertCircle size={14} />} color='yellow' title='Failed Samples' size='sm'>
                                            {uploadResult.errors.map((err, idx) => (
                                                <Text key={idx} size='sm'><strong>{err.sample_id || `Sample ${err.sampleIndex}`}:</strong> {err.error}</Text>
                                            ))}
                                        </Alert>
                                    )}
                                </>
                            )}
                        </Stack>
                    )}

                    {/* Action Buttons */}
                    <Group position='right' spacing='sm'>
                        {!uploadResult ? (
                            <>
                                <Button variant='default' onClick={handleClose} disabled={loading}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={imageSamples ? handleImageUpload : handleUpload}
                                    loading={loading}
                                    disabled={
                                        loading ||
                                        (imageSamples
                                            ? imageSamples.length === 0
                                            : !file)
                                    }
                                >
                                    {imageSamples
                                        ? `Upload ${imageSamples.length} sample${imageSamples.length === 1 ? '' : 's'}`
                                        : 'Upload'}
                                </Button>
                            </>
                        ) : (
                            <Button onClick={handleClose}>Close</Button>
                        )}
                    </Group>
                </Stack>
            </Modal>

            {/* Multi‑sample Preview Modal */}
            <BulkPreviewModal
                opened={previewOpen}
                onClose={() => setPreviewOpen(false)}
                samples={samplePreviews}
            />
        </>
    );
}