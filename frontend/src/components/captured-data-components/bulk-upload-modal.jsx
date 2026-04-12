import { useState } from 'react';
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
import { Upload, AlertCircle, CheckCircle, FileUp, X } from 'lucide-react';
import styles from './bulk-upload-modal.module.scss';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function BulkUploadModal({ isOpen, onClose, onUploadSuccess }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const [error, setError] = useState(null);

    const handleFileChange = (event) => {
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
                setFile(null);
                return;
            }

            setFile(selectedFile);
            setError(null);
            setUploadResult(null);
        }
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
                            Upload a CSV or JSON file containing sample data
                            with optional metagenomic information.
                        </Text>

                        <div className={styles.uploadArea}>
                            <input
                                type='file'
                                id='file-input'
                                onChange={handleFileChange}
                                accept='.csv,.json'
                                style={{ display: 'none' }}
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
                                    CSV or JSON files only
                                </Text>
                            </label>
                        </div>
                    </>
                )}

                {/* Selected File Display */}
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
                                onClick={() => setFile(null)}
                                title='Remove file'
                            >
                                <X size={18} />
                            </ActionIcon>
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
    );
}
