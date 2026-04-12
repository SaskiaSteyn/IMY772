import {useState} from 'react';
import {Stack, Button, Text, Group, FileInput, Alert, Center} from '@mantine/core';
import {Upload, ArrowLeft} from 'lucide-react';

const JsonUploadStep = ({onSubmit, onBack}) => {
    const [file, setFile] = useState(null);
    const [error, setError] = useState('');

    const handleUpload = () => {
        if (!file) {
            setError('Please select a JSON file');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target.result);
                // Basic validation: must have 'sample' field at least
                if (!json.sample) {
                    setError('Invalid format: missing "sample" object');
                    return;
                }
                onSubmit(json);
            } catch (err) {
                setError('Invalid JSON file: ' + err.message);
            }
        };
        reader.readAsText(file);
    };

    return (
        <Stack gap="lg" py="xl">
            <Center>
                <Text size="lg" fw={600} ta="center">
                    Upload JSON File
                </Text>
            </Center>
            
            <FileInput
                label="Select a JSON file"
                placeholder="Click to select file"
                accept="application/json"
                value={file}
                onChange={setFile}
                icon={<Upload size={16} />}
            />

            {file && (
                <Alert color="blue" title="File Selected">
                    {file.name}
                </Alert>
            )}

            {error && (
                <Alert color="red" title="Error">
                    {error}
                </Alert>
            )}

            <Group justify="space-between" mt="lg">
                <Button 
                    variant="default" 
                    onClick={onBack} 
                    leftSection={<ArrowLeft size={18} />}
                >
                    Back
                </Button>
                <Button 
                    onClick={handleUpload} 
                    leftSection={<Upload size={18} />}
                    disabled={!file}
                >
                    Upload & Add
                </Button>
            </Group>
        </Stack>
    );
};

export default JsonUploadStep;