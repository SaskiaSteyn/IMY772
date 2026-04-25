import {useState} from 'react';
import * as XLSX from 'xlsx';
import ExpandedDataModal from './expanded-data-modal';
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
import {Upload, AlertCircle, CheckCircle, FileUp, X} from 'lucide-react';
import styles from './bulk-upload-modal.module.scss';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function BulkUploadModal({isOpen, onClose, onUploadSuccess}) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [error, setError] = useState(null);
    const [previewData, setPreviewData] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);

    // Only allow fields matching backend routes
    const allowedSampleFields = [
        'water_temperature', 'ph', 'tds', 'do', 'sample_analysis_type', 'isolation_source',
        'collection_date', 'location_name', 'latitude', 'longitude', 'collected_by', 'predicted_sir_profile', 'sampleID'
    ];
    const allowedMetagenomicFields = [
        'sampleID', 'sequence_name', 'element_type', 'class', 'subclass'
    ];
    const allowedWgsFields = [
        'sampleID', 'isolateID', 'organism'
    ];
    const allowedAmrGenesFields = [
        'sampleID', 'geneSymbol'
    ];
    const allowedVirulenceGenesFields = [
        'sampleID', 'isolateID', 'geneSymbol'
    ];

    const filterFields = (obj, allowed) => {
        const filtered = {};
        for (const key of allowed) {
            if (obj[key] !== undefined) filtered[key] = obj[key];
        }
        return filtered;
    };

    const handleFileChange = async (event) => {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;
        const fileName = selectedFile.name.toLowerCase();
        const validExtensions = ['.csv', '.json', '.xlsx'];
        const hasValidExtension = validExtensions.some((ext) => fileName.endsWith(ext));
        if (!hasValidExtension) {
            setError('Invalid file type. Please upload a CSV, JSON, or XLSX file.');
            setFile(null);
            setPreviewData(null);
            return;
        }
        setFile(selectedFile);
        setError(null);
        setUploadResult(null);

        // Parse file for preview
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
            } else if (fileName.endsWith('.xlsx')) {
                const data = await selectedFile.arrayBuffer();
                const workbook = XLSX.read(data, {type: 'array'});
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                parsed = XLSX.utils.sheet_to_json(sheet);
            }
        } catch (e) {
            setError('Failed to parse file: ' + e.message);
            setPreviewData(null);
            return;
        }

        // Only allow array of objects
        if (!Array.isArray(parsed)) {
            setError('File must contain an array of records');
            setPreviewData(null);
            return;
        }

        // Try to infer data structure for preview (simple: treat as samples, or group by keys)
        // For now, treat as samples, and allow user to upload if fields match
        const previewSample = filterFields(parsed[0], allowedSampleFields);
        // Optionally, could add logic to detect metagenomic, wgs, etc.
        setPreviewData({
            sample: previewSample,
            metagenomic: parsed.map(r => filterFields(r, allowedMetagenomicFields)).filter(r => Object.keys(r).length > 1),
            wgs: parsed.map(r => filterFields(r, allowedWgsFields)).filter(r => Object.keys(r).length > 1),
            amrGenes: parsed.map(r => filterFields(r, allowedAmrGenesFields)).filter(r => Object.keys(r).length > 1),
            virulenceGenes: parsed.map(r => filterFields(r, allowedVirulenceGenesFields)).filter(r => Object.keys(r).length > 1),
        });
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

                console.log(
                    'Upload successful, sample IDs:',
                    data.results.sampleIDs,
                );

                // Call success callback with the newly created sample IDs
                if (onUploadSuccess) {
                    console.log('Calling onUploadSuccess callback');
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
                                Upload a CSV, JSON, or XLSX file containing sample data with optional metagenomic information.
                            </Text>
                            <div className={styles.uploadArea}>
                                <input
                                    type='file'
                                    id='file-input'
                                    onChange={handleFileChange}
                                    accept='.csv,.json,.xlsx'
                                    style={{display: 'none'}}
                                />
                                <label
                                    htmlFor='file-input'
                                    className={styles.uploadLabel}
                                >
                                    <FileUp size={32} />
                                    <Text weight={500}>
                                        {file
                                            ? file.name
                                            : 'Click to select a file or drag and drop'}
                                    </Text>
                                    <Text size='xs' color='dimmed'>
                                        CSV, JSON, or XLSX files only
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
                                    onClick={() => {setFile(null); setPreviewData(null);}}
                                    title='Remove file'
                                >
                                    <X size={18} />
                                </ActionIcon>
                                {previewData && (
                                    <Button size='xs' variant='light' onClick={() => setPreviewOpen(true)}>
                                        Preview Data
                                    </Button>
                                )}
                            </Group>
                        </Stack>
                    )}

                    {/* Error Alert */}
                    {error && (
                        <Alert
                            icon={<AlertCircle size={16} />}
                            color='red'
                            title='Upload Error'
                        >
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
                            <Alert
                                icon={<CheckCircle size={16} />}
                                title='Upload Completed'
                            >
                                {uploadResult.successCount} of{' '}
                                {uploadResult.totalSamples} samples were
                                successfully uploaded.
                            </Alert>

                            <Stack spacing='xs'>
                                {/* <Group position='apart'>
                                <Text weight={500}>Results:</Text>
                            </Group>
                            <Text size='sm'>
                                <strong>Successfully Added:</strong>{' '}
                                {uploadResult.successCount}
                            </Text> */}
                                {uploadResult.failureCount > 0 && (
                                    <>
                                        <Text size='sm' color='red'>
                                            <strong>Failed:</strong>{' '}
                                            {uploadResult.failureCount}
                                        </Text>
                                        {uploadResult.errors &&
                                            uploadResult.errors.length > 0 && (
                                                <Alert
                                                    icon={<AlertCircle size={14} />}
                                                    color='yellow'
                                                    title='Failed Samples'
                                                    size='sm'
                                                >
                                                    <List size='sm' spacing='xs'>
                                                        {uploadResult.errors.map(
                                                            (err, idx) => (
                                                                <List.Item
                                                                    key={idx}
                                                                >
                                                                    Sample{' '}
                                                                    {
                                                                        err.sampleIndex
                                                                    }
                                                                    : {err.error}
                                                                </List.Item>
                                                            ),
                                                        )}
                                                    </List>
                                                </Alert>
                                            )}
                                    </>
                                )}
                                {/* <Text size='sm'>
                                <strong>Sample IDs Created:</strong>{' '}
                                {uploadResult.sampleIDs.join(', ')}
                            </Text> */}
                            </Stack>
                        </Stack>
                    )}

                    {/* Action Buttons */}
                    <Group position='right' spacing='sm'>
                        {!uploadResult ? (
                            <>
                                <Button
                                    variant='default'
                                    onClick={handleClose}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleUpload}
                                    loading={loading}
                                    disabled={!file || loading}
                                >
                                    Upload
                                </Button>
                            </>
                        ) : (
                            <Button onClick={handleClose}>Close</Button>
                        )}
                    </Group>
                </Stack>
            </Modal>
            {/* Data Preview Modal */}
            <ExpandedDataModal
                opened={previewOpen}
                onClose={() => setPreviewOpen(false)}
                sample={previewData?.sample}
                metagenomic={previewData?.metagenomic}
                wgs={previewData?.wgs}
                amrGenes={previewData?.amrGenes}
                virulenceGenes={previewData?.virulenceGenes}
            />
        </>
    );
}
