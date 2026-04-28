import { useMemo, useState } from 'react';
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
    Tabs,
    List,
    TextInput,
    Paper,
    SimpleGrid,
} from '@mantine/core';
import { AlertCircle, CheckCircle, FileUp, X, Sparkles } from 'lucide-react';
import {
    extractSamplesFromImage,
    ingestReviewedSamples,
} from '../../api/sample-data-management.js';
import styles from './bulk-upload-modal.module.scss';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const FILE_MODE = 'file';
const IMAGE_MODE = 'image';

const REVIEW_FIELDS = [
    {
        key: 'latitude',
        label: 'Latitude',
        required: true,
        placeholder: 'e.g. -25.7479',
    },
    {
        key: 'longitude',
        label: 'Longitude',
        required: true,
        placeholder: 'e.g. 28.2293',
    },
    {
        key: 'water_temperature',
        label: 'Water Temperature',
        placeholder: 'e.g. 24.5',
    },
    {
        key: 'ph',
        label: 'pH',
        placeholder: 'e.g. 7.2',
    },
    {
        key: 'tds',
        label: 'TDS',
        placeholder: 'e.g. 98.5',
    },
    {
        key: 'do',
        label: 'Dissolved Oxygen',
        placeholder: 'e.g. 8.2',
    },
    {
        key: 'sample_analysis_type',
        label: 'Sample Analysis Type',
        placeholder: 'e.g. Metagenomic',
    },
    {
        key: 'isolation_source',
        label: 'Isolation Source',
        placeholder: 'e.g. River water',
    },
    {
        key: 'collection_date',
        label: 'Collection Date',
        placeholder: 'YYYY-MM-DD',
    },
    {
        key: 'location_name',
        label: 'Location Name',
        placeholder: 'e.g. University of Pretoria',
    },
    {
        key: 'collected_by',
        label: 'Collected By',
        placeholder: 'e.g. Riley Carter',
    },
    {
        key: 'predicted_sir_profile',
        label: 'Predicted SIR Profile',
        placeholder: 'Susceptible | Intermediate | Resistant',
    },
];

const FIELD_ALIASES = {
    latitude: ['lat'],
    longitude: ['lon', 'lng', 'long'],
    water_temperature: ['waterTemperature', 'water_temp', 'temperature'],
    ph: ['pH', 'ph_level'],
    tds: ['total_dissolved_solids', 'totalDissolvedSolids'],
    do: ['dissolved_oxygen', 'dissolvedOxygen'],
    sample_analysis_type: ['sampleAnalysisType', 'analysis_type', 'analysisType'],
    isolation_source: ['isolationSource'],
    collection_date: ['collectionDate'],
    location_name: ['locationName', 'location'],
    collected_by: ['collectedBy'],
    predicted_sir_profile: ['predictedSirProfile', 'sir_profile', 'sir'],
};

const FIELD_LABEL_PATTERNS = {
    latitude: /\b(latitude|lat)\b[:-]?\s*(.+)$/i,
    longitude: /\b(longitude|lon|lng|long)\b[:-]?\s*(.+)$/i,
    water_temperature: /\b(water\s*temperature|temperature|temp)\b[:-]?\s*(.+)$/i,
    ph: /\b(ph|p\.?h\.?)\b[:-]?\s*(.+)$/i,
    tds: /\b(tds|total\s*dissolved\s*solids)\b[:-]?\s*(.+)$/i,
    do: /\b(dissolved\s*oxygen|\bdo\b)\b[:-]?\s*(.+)$/i,
    sample_analysis_type: /\b(sample\s*analysis\s*type|analysis\s*type)\b[:-]?\s*(.+)$/i,
    isolation_source: /\b(isolation\s*source|source)\b[:-]?\s*(.+)$/i,
    collection_date: /\b(collection\s*date|date)\b[:-]?\s*(.+)$/i,
    location_name: /\b(location\s*name|location|site)\b[:-]?\s*(.+)$/i,
    collected_by: /\b(collected\s*by|collector|collected\s*person)\b[:-]?\s*(.+)$/i,
    predicted_sir_profile: /\b(predicted\s*sir\s*profile|sir\s*profile|sir)\b[:-]?\s*(.+)$/i,
};

const TABLE_FIELD_ORDER = [
    'sampleID',
    'latitude',
    'longitude',
    'water_temperature',
    'ph',
    'tds',
    'do',
    'sample_analysis_type',
    'isolation_source',
    'collection_date',
    'location_name',
    'collected_by',
    'predicted_sir_profile',
    'sequence_name',
    'element_type',
    'class',
    'subclass',
    'amr_resistance_genes',
];

const HEADER_LABELS = new Set(
    TABLE_FIELD_ORDER.map((fieldName) => normalizeHeaderLabel(fieldName)),
);

function cloneSamples(samples) {
    return (samples || []).map((sample) => ({
        ...sample,
        metagenomic: Array.isArray(sample.metagenomic)
            ? sample.metagenomic
            : [],
    }));
}

function normalizeHeaderLabel(value) {
    return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, '');
}

function isPresent(value) {
    return value !== null && value !== undefined && String(value).trim().length > 0;
}

function isHeaderRow(values) {
    const normalizedValues = values
        .map((value) => normalizeHeaderLabel(value))
        .filter((value) => value.length > 0);

    if (normalizedValues.length === 0) {
        return false;
    }

    const matches = normalizedValues.filter((value) => HEADER_LABELS.has(value)).length;
    return matches >= Math.max(3, Math.ceil(normalizedValues.length * 0.6));
}

function coerceTableValue(fieldName, value) {
    if (!isPresent(value)) {
        return undefined;
    }

    if (fieldName === 'amr_resistance_genes') {
        if (Array.isArray(value)) {
            return value.map((gene) => String(gene).trim()).filter(Boolean);
        }

        return String(value)
            .split(',')
            .map((gene) => gene.trim())
            .filter(Boolean);
    }

    if (
        ['latitude', 'longitude', 'water_temperature', 'ph', 'tds', 'do'].includes(
            fieldName,
        )
    ) {
        const numericValue = Number.parseFloat(value);
        return Number.isNaN(numericValue) ? String(value).trim() : numericValue;
    }

    return String(value).trim();
}

function mapTableRowToSample(rowValues) {
    if (!Array.isArray(rowValues) || rowValues.length === 0) {
        return null;
    }

    const cleanedRow = rowValues.map((value) => String(value ?? '').trim());
    if (isHeaderRow(cleanedRow)) {
        return null;
    }

    const sample = {};
    const scoreFieldCompatibility = (fieldName, value) => {
        if (!isPresent(value)) {
            return -0.5;
        }

        if (['latitude', 'longitude', 'water_temperature', 'ph', 'tds', 'do'].includes(fieldName)) {
            return Number.isNaN(Number.parseFloat(value)) ? -1 : 2;
        }

        if (fieldName === 'sampleID') {
            return /[a-z0-9]/i.test(String(value)) ? 1 : -0.5;
        }

        return 0.25;
    };

    const maxOffset = Math.max(0, TABLE_FIELD_ORDER.length - cleanedRow.length);
    let bestOffset = 0;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (let offset = 0; offset <= maxOffset; offset += 1) {
        let score = 0;
        cleanedRow.forEach((value, index) => {
            const fieldName = TABLE_FIELD_ORDER[index + offset];
            if (!fieldName) {
                return;
            }
            score += scoreFieldCompatibility(fieldName, value);
        });

        if (score > bestScore) {
            bestScore = score;
            bestOffset = offset;
        }
    }

    cleanedRow.forEach((value, index) => {
        const fieldName = TABLE_FIELD_ORDER[index + bestOffset];
        if (!fieldName) {
            return;
        }
        const fieldValue = coerceTableValue(fieldName, value);
        if (isPresent(fieldValue)) {
            sample[fieldName] = fieldValue;
        }
    });

    return Object.keys(sample).length > 0 ? sample : null;
}

function getCandidateRowValues(sample) {
    if (Array.isArray(sample)) {
        return sample;
    }

    if (Array.isArray(sample?.values)) {
        return sample.values;
    }

    if (Array.isArray(sample?.row)) {
        return sample.row;
    }

    if (Array.isArray(sample?.cells)) {
        return sample.cells.map((cell) => (typeof cell === 'object' ? cell?.text ?? '' : cell));
    }

    return null;
}

function getRawTextLines(sample) {
    if (!Array.isArray(sample?.raw_text_sample)) {
        return [];
    }

    return sample.raw_text_sample
        .map((entry) => {
            if (typeof entry === 'string') {
                return entry;
            }

            if (entry && typeof entry.text === 'string') {
                return entry.text;
            }

            return '';
        })
        .filter((line) => line.trim().length > 0);
}

function extractLabeledFieldValue(lines, fieldKey) {
    const pattern = FIELD_LABEL_PATTERNS[fieldKey];
    if (!pattern) {
        return undefined;
    }

    for (const line of lines) {
        const match = line.match(pattern);
        if (match && isPresent(match[2])) {
            return match[2].trim();
        }
    }

    return undefined;
}

function extractCoordinatePair(lines) {
    const coordinatePairPattern = /(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)/;
    for (const line of lines) {
        const match = line.match(coordinatePairPattern);
        if (match) {
            return { latitude: match[1], longitude: match[2] };
        }
    }

    return null;
}

function normalizeExtractedSample(sample) {
    const candidateRowValues = getCandidateRowValues(sample);
    if (candidateRowValues) {
        return mapTableRowToSample(candidateRowValues);
    }

    const normalized = { ...sample };
    const lines = getRawTextLines(sample);
    const coordinates = extractCoordinatePair(lines);

    if (isHeaderRow(REVIEW_FIELDS.map((field) => normalized[field.key]).filter(Boolean))) {
        return null;
    }

    REVIEW_FIELDS.forEach((field) => {
        if (isPresent(normalized[field.key])) {
            return;
        }

        const aliases = FIELD_ALIASES[field.key] || [];
        const aliasValue = aliases
            .map((alias) => normalized[alias])
            .find((value) => isPresent(value));

        if (isPresent(aliasValue)) {
            normalized[field.key] = aliasValue;
            return;
        }

        const labeledValue = extractLabeledFieldValue(lines, field.key);
        if (isPresent(labeledValue)) {
            normalized[field.key] = labeledValue;
            return;
        }

        if (coordinates && (field.key === 'latitude' || field.key === 'longitude')) {
            normalized[field.key] = coordinates[field.key];
        }
    });

    return normalized;
}

function formatConfidence(confidence) {
    if (typeof confidence !== 'number') {
        return null;
    }

    return `${Math.round(confidence * 100)}%`;
}

export default function BulkUploadModal({ isOpen, onClose, onUploadSuccess }) {
    const [activeMode, setActiveMode] = useState(FILE_MODE);
    const [dataFile, setDataFile] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [extractLoading, setExtractLoading] = useState(false);
    const [reviewSubmitLoading, setReviewSubmitLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [error, setError] = useState(null);
    const [extractionData, setExtractionData] = useState(null);
    const [reviewedSamples, setReviewedSamples] = useState([]);

    const loading = uploadLoading || extractLoading || reviewSubmitLoading;
    const isImageMode = activeMode === IMAGE_MODE;
    const currentFile = isImageMode ? imageFile : dataFile;
    const preview = extractionData?.preview || {};
    const summary = extractionData?.extractionSummary || {};

    const lowConfidenceBySample = useMemo(() => {
        const grouped = new Map();
        (preview.lowConfidenceFields || []).forEach((item) => {
            if (typeof item?.rowIndex !== 'number') {
                return;
            }

            if (!grouped.has(item.rowIndex)) {
                grouped.set(item.rowIndex, []);
            }

            grouped.get(item.rowIndex).push(item);
        });

        return grouped;
    }, [preview.lowConfidenceFields]);

    const handleModeChange = (value) => {
        if (!value) {
            return;
        }

        setActiveMode(value);
        setError(null);
    };

    const handleDataFileChange = (event) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            const validExtensions = ['.csv', '.json'];
            const fileName = selectedFile.name.toLowerCase();

            const hasValidExtension = validExtensions.some((ext) =>
                fileName.endsWith(ext),
            );

            if (!hasValidExtension) {
                setError(
                    'Invalid file type. Please upload a CSV or JSON file.',
                );
                setDataFile(null);
                return;
            }

            setDataFile(selectedFile);
            setUploadResult(null);
            setError(null);
        }
    };

    const handleImageFileChange = (event) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            const validExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
            const fileName = selectedFile.name.toLowerCase();

            const hasValidExtension = validExtensions.some((ext) =>
                fileName.endsWith(ext),
            );

            if (!hasValidExtension) {
                setError(
                    'Invalid file type. Please upload a PNG, JPG, JPEG, or WEBP image.',
                );
                setImageFile(null);
                return;
            }

            setImageFile(selectedFile);
            setExtractionData(null);
            setReviewedSamples([]);
            setUploadResult(null);
            setError(null);
        }
    };

    const handleDataUpload = async () => {
        if (!dataFile) {
            setError('Please select a file first');
            return;
        }

        setUploadLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('file', dataFile);

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
                setDataFile(null);

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
            setUploadLoading(false);
        }
    };

    const handleImageExtraction = async () => {
        if (!imageFile) {
            setError('Please select an image first');
            return;
        }

        setExtractLoading(true);
        setError(null);

        try {
            const response = await extractSamplesFromImage(imageFile);
            
            // Map new response structure to internal format
            // response.samples (array) -> samples for editing
            // response.diagnostics -> warnings, validationErrors, lowConfidenceFields
            const samples = cloneSamples(response.samples || [])
                .map(normalizeExtractedSample)
                .filter(Boolean);
            
            // Transform diagnostics.lowConfidenceFields from {fieldName: [sampleIDs]}
            // to legacy format for low confidence rendering
            const diagnostics = response.diagnostics || {};
            const lowConfidenceByFieldAndSample = [];
            
            if (diagnostics.lowConfidenceFields && typeof diagnostics.lowConfidenceFields === 'object') {
                Object.entries(diagnostics.lowConfidenceFields).forEach(([fieldName, sampleIds]) => {
                    if (Array.isArray(sampleIds)) {
                        sampleIds.forEach((sampleId, index) => {
                            lowConfidenceByFieldAndSample.push({
                                rowIndex: index,
                                fieldName: fieldName,
                                confidence: undefined // Not available in new format
                            });
                        });
                    }
                });
            }
            
            // Enrich extraction data with both new and transformed formats
            const enrichedData = {
                provider: response.provider,
                samples,
                diagnostics: diagnostics,
                // Legacy format for backwards compatibility with existing UI
                preview: {
                    samples: samples,
                    warnings: diagnostics.warnings || [],
                    validationErrors: diagnostics.validationErrors || [],
                    lowConfidenceFields: lowConfidenceByFieldAndSample
                },
                extractionSummary: {
                    processingTimeMs: diagnostics.processingTimeMs || 0,
                    tableCount: 1,
                    rowCount: samples.length,
                    averageConfidence: 0.95 // Default for PaddleOCR
                }
            };

            setExtractionData(enrichedData);
            setReviewedSamples(samples);
            setImageFile(null);
        } catch (err) {
            setError(err.message || 'Image extraction failed');
        } finally {
            setExtractLoading(false);
        }
    };

    const handleReviewedFieldChange = (sampleIndex, fieldName, value) => {
        setReviewedSamples((prev) =>
            prev.map((sample, index) => {
                if (index !== sampleIndex) {
                    return sample;
                }

                return {
                    ...sample,
                    [fieldName]: value,
                };
            }),
        );
    };

    const handleReviewedSubmit = async () => {
        if (reviewedSamples.length === 0) {
            setError('No reviewed samples available to submit');
            return;
        }

        setReviewSubmitLoading(true);
        setError(null);

        try {
            const results = await ingestReviewedSamples(reviewedSamples);
            setUploadResult(results);
            setExtractionData(null);
            setReviewedSamples([]);

            if (onUploadSuccess) {
                onUploadSuccess(results.sampleIDs || []);
            }
        } catch (err) {
            setError(err.message || 'Reviewed sample submission failed');
        } finally {
            setReviewSubmitLoading(false);
        }
    };

    const resetImageWorkflow = () => {
        setImageFile(null);
        setExtractionData(null);
        setReviewedSamples([]);
        setError(null);
    };

    const handleReset = () => {
        setActiveMode(FILE_MODE);
        setDataFile(null);
        setImageFile(null);
        setError(null);
        setUploadResult(null);
        setExtractionData(null);
        setReviewedSamples([]);
    };

    const handleClose = () => {
        handleReset();
        onClose();
    };

    return (
        <Modal
            opened={isOpen}
            onClose={handleClose}
            title='Bulk Upload Sample Data'
            size='lg'
            centered
        >
            <Stack gap='md'>
                {!uploadResult && (
                    <Tabs value={activeMode} onChange={handleModeChange}>
                        <Tabs.List grow>
                            <Tabs.Tab value={FILE_MODE}>CSV / JSON</Tabs.Tab>
                            <Tabs.Tab value={IMAGE_MODE}>Image OCR</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value={FILE_MODE} pt='md'>
                            <Stack gap='md'>
                                <Text size='sm' c='dimmed'>
                                    Upload a CSV or JSON file containing sample
                                    data with optional metagenomic information.
                                </Text>

                                {!dataFile && (
                                    <div className={styles.uploadArea}>
                                        <input
                                            type='file'
                                            id='bulk-file-input'
                                            onChange={handleDataFileChange}
                                            accept='.csv,.json'
                                            style={{ display: 'none' }}
                                        />
                                        <label
                                            htmlFor='bulk-file-input'
                                            className={styles.uploadLabel}
                                        >
                                            <FileUp size={32} />
                                            <Text fw={500}>
                                                Click to choose a file
                                            </Text>
                                            <Text size='xs' c='dimmed'>
                                                CSV or JSON files only
                                            </Text>
                                        </label>
                                    </div>
                                )}

                                {dataFile && (
                                    <Group
                                        gap='xs'
                                        className={styles.selectedFileRow}
                                    >
                                        <Badge color='blue' size='lg'>
                                            {dataFile.name} ({' '}
                                            {(dataFile.size / 1024).toFixed(2)}{' '}
                                            KB)
                                        </Badge>
                                        <ActionIcon
                                            size='sm'
                                            color='gray'
                                            variant='subtle'
                                            onClick={() => setDataFile(null)}
                                            aria-label='Remove selected data file'
                                        >
                                            <X size={18} />
                                        </ActionIcon>
                                    </Group>
                                )}
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value={IMAGE_MODE} pt='md'>
                            <Stack gap='md'>
                                <Text size='sm' c='dimmed'>
                                    Upload an image of table-formatted data. We
                                    will extract the values, then you review and
                                    edit before saving.
                                </Text>

                                {!imageFile && !extractionData && (
                                    <div className={styles.imageUploadArea}>
                                        <input
                                            type='file'
                                            id='image-file-input'
                                            onChange={handleImageFileChange}
                                            accept='.png,.jpg,.jpeg,.webp'
                                            style={{ display: 'none' }}
                                        />
                                        <label
                                            htmlFor='image-file-input'
                                            className={styles.uploadLabel}
                                        >
                                            <Sparkles size={32} />
                                            <Text fw={500}>
                                                Drop or choose an image
                                            </Text>
                                            <Text size='xs' c='dimmed'>
                                                PNG, JPG, JPEG or WEBP
                                            </Text>
                                        </label>
                                    </div>
                                )}

                                {imageFile && !extractionData && (
                                    <Group
                                        gap='xs'
                                        className={styles.selectedFileRow}
                                    >
                                        <Badge color='indigo' size='lg'>
                                            {imageFile.name} ({' '}
                                            {(imageFile.size / 1024).toFixed(2)}{' '}
                                            KB)
                                        </Badge>
                                        <ActionIcon
                                            size='sm'
                                            color='gray'
                                            variant='subtle'
                                            onClick={() => setImageFile(null)}
                                            aria-label='Remove selected image file'
                                        >
                                            <X size={18} />
                                        </ActionIcon>
                                    </Group>
                                )}

                                {extractionData && (
                                    <Stack gap='md'>
                                        <Group
                                            gap='xs'
                                            className={styles.summaryBadges}
                                        >
                                            <Badge color='blue' variant='light'>
                                                Provider:{' '}
                                                {extractionData.provider ||
                                                    'unknown'}
                                            </Badge>
                                            <Badge
                                                color='cyan'
                                                variant='light'
                                            >
                                                Tables:{' '}
                                                {summary.tableCount ?? 0}
                                            </Badge>
                                            <Badge
                                                color='grape'
                                                variant='light'
                                            >
                                                Rows: {summary.rowCount ?? 0}
                                            </Badge>
                                            <Badge
                                                color='teal'
                                                variant='light'
                                            >
                                                Avg Confidence:{' '}
                                                {formatConfidence(
                                                    summary.averageConfidence,
                                                ) || 'n/a'}
                                            </Badge>
                                        </Group>

                                        {preview.warnings?.length > 0 && (
                                            <Alert
                                                icon={
                                                    <AlertCircle size={16} />
                                                }
                                                color='yellow'
                                                title='Extraction Warnings'
                                            >
                                                <List size='sm' spacing='xs'>
                                                    {preview.warnings.map(
                                                        (warning, index) => (
                                                            <List.Item
                                                                key={`warning-${index}`}
                                                            >
                                                                {warning}
                                                            </List.Item>
                                                        ),
                                                    )}
                                                </List>
                                            </Alert>
                                        )}

                                        {preview.validationErrors?.length >
                                            0 && (
                                            <Alert
                                                icon={
                                                    <AlertCircle size={16} />
                                                }
                                                color='red'
                                                title='Validation Issues'
                                            >
                                                <List size='sm' spacing='xs'>
                                                    {preview.validationErrors.map(
                                                        (
                                                            validationError,
                                                            index,
                                                        ) => (
                                                            <List.Item
                                                                key={`validation-${index}`}
                                                            >
                                                                {
                                                                    validationError
                                                                }
                                                            </List.Item>
                                                        ),
                                                    )}
                                                </List>
                                            </Alert>
                                        )}

                                        {preview.lowConfidenceFields
                                            ?.length > 0 && (
                                            <Alert
                                                icon={
                                                    <AlertCircle size={16} />
                                                }
                                                color='orange'
                                                title='Low Confidence Fields Detected'
                                            >
                                                Review highlighted fields before
                                                submitting.
                                            </Alert>
                                        )}

                                        {reviewedSamples.length > 0 && (
                                            <div
                                                className={styles.reviewContainer}
                                            >
                                                <Stack gap='sm'>
                                                    {reviewedSamples.map(
                                                        (sample, sampleIndex) => {
                                                            const lowConfidenceFields =
                                                                lowConfidenceBySample.get(
                                                                    sampleIndex,
                                                                ) || [];

                                                            return (
                                                                <Paper
                                                                    key={`review-${sampleIndex}`}
                                                                    className={styles.reviewCard}
                                                                    p='md'
                                                                    withBorder
                                                                >
                                                                    <Stack gap='sm'>
                                                                        <Group justify='space-between'>
                                                                            <Text fw={600}>
                                                                                Sample {sampleIndex + 1}
                                                                            </Text>
                                                                            {lowConfidenceFields.length >
                                                                                0 && (
                                                                                <Badge color='orange' variant='light'>
                                                                                    {lowConfidenceFields.length} low-confidence fields
                                                                                </Badge>
                                                                            )}
                                                                        </Group>

                                                                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing='sm'>
                                                                            {REVIEW_FIELDS.map((field) => {
                                                                                const fieldValue =
                                                                                    sample[
                                                                                        field.key
                                                                                    ];
                                                                                const lowConfidenceMatch =
                                                                                    lowConfidenceFields.find(
                                                                                        (
                                                                                            lowConfidenceField,
                                                                                        ) =>
                                                                                            lowConfidenceField.fieldName
                                                                                            ===
                                                                                            field.key,
                                                                                    );

                                                                                const isMissingRequired =
                                                                                    field.required
                                                                                    && (fieldValue === null
                                                                                        || fieldValue
                                                                                            ===
                                                                                            undefined
                                                                                        || String(
                                                                                            fieldValue,
                                                                                        ).trim()
                                                                                            .length
                                                                                            ===
                                                                                            0);

                                                                                return (
                                                                                    <TextInput
                                                                                        key={`${sampleIndex}-${field.key}`}
                                                                                        label={field.label}
                                                                                        value={
                                                                                            fieldValue
                                                                                            ??
                                                                                            ''
                                                                                        }
                                                                                        required={field.required}
                                                                                        placeholder={field.placeholder}
                                                                                        error={
                                                                                            isMissingRequired
                                                                                                ? 'Required'
                                                                                                : undefined
                                                                                        }
                                                                                        description={
                                                                                            lowConfidenceMatch
                                                                                                ? `Low OCR confidence (${formatConfidence(
                                                                                                      lowConfidenceMatch.confidence,
                                                                                                  )})`
                                                                                                : undefined
                                                                                        }
                                                                                        onChange={(event) =>
                                                                                            handleReviewedFieldChange(
                                                                                                sampleIndex,
                                                                                                field.key,
                                                                                                event.currentTarget.value,
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                );
                                                                            })}
                                                                        </SimpleGrid>
                                                                    </Stack>
                                                                </Paper>
                                                            );
                                                        },
                                                    )}
                                                </Stack>
                                            </div>
                                        )}
                                    </Stack>
                                )}
                            </Stack>
                        </Tabs.Panel>
                    </Tabs>
                )}

                {error && (
                    <Alert
                        icon={<AlertCircle size={16} />}
                        color='red'
                        title='Upload Error'
                    >
                        {error}
                    </Alert>
                )}

                {loading && (
                    <Stack gap='sm' align='center'>
                        <Loader size='lg' />
                        <Text c='dimmed'>
                            {extractLoading
                                ? 'Extracting image data...'
                                : reviewSubmitLoading
                                  ? 'Saving reviewed samples...'
                                  : 'Processing your file...'}
                        </Text>
                    </Stack>
                )}

                {uploadResult && !loading && (
                    <Stack gap='md'>
                        <Alert
                            icon={<CheckCircle size={16} />}
                            title='Upload Completed'
                        >
                            {uploadResult.successCount} of{' '}
                            {uploadResult.totalSamples} samples were
                            successfully uploaded.
                        </Alert>

                        <Stack gap='xs'>
                            {uploadResult.failureCount > 0 && (
                                <>
                                    <Text size='sm' c='red'>
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
                                                                Sample {err.sampleIndex}
                                                                : {err.error}
                                                            </List.Item>
                                                        ),
                                                    )}
                                                </List>
                                            </Alert>
                                        )}
                                </>
                            )}
                        </Stack>
                    </Stack>
                )}

                <Group justify='flex-end' gap='sm'>
                    {!uploadResult ? (
                        activeMode === IMAGE_MODE && extractionData ? (
                            <>
                                <Button
                                    variant='default'
                                    onClick={resetImageWorkflow}
                                    disabled={loading}
                                >
                                    Extract Another
                                </Button>
                                <Button
                                    variant='default'
                                    onClick={handleClose}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleReviewedSubmit}
                                    loading={reviewSubmitLoading}
                                    disabled={
                                        reviewedSamples.length === 0 || loading
                                    }
                                >
                                    Save Reviewed Data
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    variant='default'
                                    onClick={handleClose}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={
                                        isImageMode
                                            ? handleImageExtraction
                                            : handleDataUpload
                                    }
                                    loading={
                                        isImageMode
                                            ? extractLoading
                                            : uploadLoading
                                    }
                                    disabled={!currentFile || loading}
                                >
                                    {isImageMode
                                        ? 'Extract Table Data'
                                        : 'Upload'}
                                </Button>
                            </>
                        )
                    ) : (
                        <Button onClick={handleClose}>Close</Button>
                    )}
                </Group>
            </Stack>
        </Modal>
    );
}
