import {
    Alert,
    Button,
    Center,
    FileInput,
    Group,
    Image,
    Loader,
    Stack,
    Text,
} from '@mantine/core';
import { AlertCircle, ArrowLeft, ScanLine, Upload } from 'lucide-react';
import { useState } from 'react';
import { extractSampleFromImage } from '../../../api/sample-data-management';

const ImageUploadStep = ({ onExtracted, onBack }) => {
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (selected) => {
        setError('');
        setFile(selected);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(selected ? URL.createObjectURL(selected) : null);
    };

    const handleExtract = async () => {
        if (!file) return;
        setLoading(true);
        setError('');
        try {
            const result = await extractSampleFromImage(file);
            const found =
                (result?.fields ? Object.keys(result.fields).length : 0) +
                (result?.metagenomic?.length || 0) +
                (result?.wgs?.length || 0) +
                (result?.amrGenes?.length || 0) +
                (result?.virulenceGenes?.length || 0);
            if (found === 0) {
                setError(
                    'No recognisable water-data was found in this image. Try a clearer photo, or enter the data manually.',
                );
                setLoading(false);
                return;
            }
            onExtracted(result);
        } catch (err) {
            setError(
                err.message || 'Something went wrong while reading the image.',
            );
            setLoading(false);
        }
    };

    return (
        <Stack gap='lg' py='md'>
            <Text size='sm' c='dimmed' ta='center'>
                Upload a photo of a table containing water-sample data. We'll
                read the values into the form for you to review and edit before
                saving. The photo itself is not stored.
            </Text>

            <FileInput
                label='Sample table image'
                placeholder='Choose an image (JPG, PNG, ...)'
                accept='image/*'
                leftSection={<Upload size={18} />}
                value={file}
                onChange={handleFileChange}
                clearable
                disabled={loading}
            />

            {previewUrl && (
                <Center>
                    <Image
                        src={previewUrl}
                        alt='Selected sample table'
                        radius='md'
                        mah={260}
                        fit='contain'
                    />
                </Center>
            )}

            {error && (
                <Alert
                    color='red'
                    icon={<AlertCircle size={18} />}
                    variant='light'
                >
                    {error}
                </Alert>
            )}

            {loading && (
                <Center>
                    <Group gap='xs'>
                        <Loader size='sm' />
                        <Text size='sm' c='dimmed'>
                            Reading image… this can take a few seconds.
                        </Text>
                    </Group>
                </Center>
            )}

            <Group justify='space-between' mt='sm'>
                <Button
                    variant='default'
                    leftSection={<ArrowLeft size={18} />}
                    onClick={onBack}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    leftSection={<ScanLine size={18} />}
                    onClick={handleExtract}
                    loading={loading}
                    disabled={!file}
                >
                    Extract Data
                </Button>
            </Group>
        </Stack>
    );
};

export default ImageUploadStep;
