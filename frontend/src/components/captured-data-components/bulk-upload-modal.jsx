import {useState} from 'react';
import * as XLSX from 'xlsx';
import BulkPreviewModal from './bulk-preview-modal';
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
} from '@mantine/core';
import {AlertCircle, CheckCircle, FileUp, X} from 'lucide-react';
import styles from './bulk-upload-modal.module.scss';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function BulkUploadModal({isOpen, onClose, onUploadSuccess}) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [error, setError] = useState(null);
    const [samplePreviews, setSamplePreviews] = useState([]);
    const [previewOpen, setPreviewOpen] = useState(false);

    // Allowed fields for preview filtering (only used for display)
    const allowedSampleFields = [
        'water_temperature', 'ph', 'tds', 'do', 'sample_analysis_type', 'isolation_source',
        'collection_date', 'location_name', 'latitude', 'longitude', 'collected_by',
        'predicted_sir_profile', 'sampleID'
    ];
    const allowedMetagenomicFields = [
        'sequence_name', 'element_type', 'class', 'subclass'
    ];
    const allowedWgsFields = [
        'isolateID', 'organism'
    ];

    const filterFields = (obj, allowed) => {
        const filtered = {};
        for (const key of allowed) {
            if (obj[key] !== undefined) filtered[key] = obj[key];
        }
        return filtered;
    };

    // Build preview objects for each sample, extracting AMR/virulence genes
    const buildSamplePreviews = (parsedArray) => {
        return parsedArray.map(sample => {
            const sampleFields = filterFields(sample, allowedSampleFields);

            // Metagenomic records (if any)
            const metagenomic = sample.metagenomic
                ? sample.metagenomic.map(rec => filterFields(rec, allowedMetagenomicFields))
                : [];

            // WGS records (if any)
            const wgs = sample.wgs
                ? sample.wgs.map(rec => filterFields(rec, allowedWgsFields))
                : [];

            // Extract AMR genes from metagenomic records
            const amrGenesSet = new Set();
            if (sample.metagenomic) {
                sample.metagenomic.forEach(rec => {
                    if (rec.amr_resistance_genes && Array.isArray(rec.amr_resistance_genes)) {
                        rec.amr_resistance_genes.forEach(gene => {
                            if (gene && gene.trim()) amrGenesSet.add(gene.trim());
                        });
                    }
                });
            }
            const amrGenes = Array.from(amrGenesSet).map(gene => ({geneSymbol: gene}));

            // Extract virulence genes from WGS records
            const virulenceGenesSet = new Set();
            if (sample.wgs) {
                sample.wgs.forEach(rec => {
                    if (rec.virulence_genes && Array.isArray(rec.virulence_genes)) {
                        rec.virulence_genes.forEach(gene => {
                            if (gene && gene.trim()) virulenceGenesSet.add(gene.trim());
                        });
                    }
                });
            }
            const virulenceGenes = Array.from(virulenceGenesSet).map(gene => ({geneSymbol: gene}));

            return {
                sample: sampleFields,
                metagenomic,
                wgs,
                amrGenes,
                virulenceGenes,
            };
        });
    };

    const handleFileChange = async (event) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;

        const fileName = selectedFile.name.toLowerCase();
        const validExtensions = ['.csv', '.json']; // backend only accepts CSV/JSON
        const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext));
        if (!hasValidExtension) {
            setError('Invalid file type. Please upload a CSV or JSON file.');
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
            } else if (fileName.endsWith('.csv')) {
                const text = await selectedFile.text();
                const rows = text.split(/\r?\n/).filter(Boolean);
                const headers = rows[0].split(',');
                parsed = rows.slice(1).map(row => {
                    const values = row.split(',');
                    const obj = {};
                    headers.forEach((h, i) => {obj[h.trim()] = values[i]?.trim();});
                    return obj;
                });
            }
        } catch (e) {
            setError('Failed to parse file: ' + e.message);
            setSamplePreviews([]);
            return;
        }

        if (!Array.isArray(parsed)) {
            setError('File must contain an array of sample objects.');
            setSamplePreviews([]);
            return;
        }

        // Build previews and open the modal
        const previews = buildSamplePreviews(parsed);
        setSamplePreviews(previews);
        setPreviewOpen(true);
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file first');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${API_URL}/api/bulk-upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.details || data.error || 'Upload failed');
                setUploadResult(null);
            } else {
                setUploadResult(data.results);
                setFile(null);
                setSamplePreviews([]);
                console.log('Upload successful, sample IDs:', data.results.sampleIDs);
                if (onUploadSuccess) {
                    onUploadSuccess(data.results.sampleIDs);
                }
            }
        } catch (err) {
            setError(err.message || 'Network error during upload');
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setError(null);
        setUploadResult(null);
        setSamplePreviews([]);
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
                    {!uploadResult && !file && (
                        <>
                            <Text size='sm' color='dimmed'>
                                Upload a CSV or JSON file containing an array of sample objects.
                                Each sample may include <strong>metagenomic</strong> or <strong>wgs</strong> arrays.
                            </Text>
                            <div className={styles.uploadArea}>
                                <input
                                    type='file'
                                    id='file-input'
                                    onChange={handleFileChange}
                                    accept='.csv,.json'
                                    style={{display: 'none'}}
                                />
                                <label htmlFor='file-input' className={styles.uploadLabel}>
                                    <FileUp size={32} />
                                    <Text weight={500}>
                                        {file ? file.name : 'Click to select a file or drag and drop'}
                                    </Text>
                                    <Text size='xs' color='dimmed'>
                                        CSV or JSON files only
                                    </Text>
                                </label>
                            </div>
                        </>
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
                                {uploadResult.successCount} of {uploadResult.totalSamples} samples were successfully uploaded.
                            </Alert>
                            {uploadResult.failureCount > 0 && (
                                <>
                                    <Text size='sm' color='red'>
                                        <strong>Failed:</strong> {uploadResult.failureCount}
                                    </Text>
                                    {uploadResult.errors && uploadResult.errors.length > 0 && (
                                        <Alert icon={<AlertCircle size={14} />} color='yellow' title='Failed Samples' size='sm'>
                                            {uploadResult.errors.map((err, idx) => (
                                                <Text key={idx} size='sm'>Sample {err.sampleIndex}: {err.error}</Text>
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
                                <Button onClick={handleUpload} loading={loading} disabled={!file || loading}>
                                    Upload
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