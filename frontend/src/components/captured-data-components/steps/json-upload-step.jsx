import {useState} from 'react';
import {Stack, Button, Text, Group, FileInput, Alert} from '@mantine/core';
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
        <Stack align="center" py="xl">
            <FileInput
                label="Upload JSON file"
                placeholder="Click to select"
                accept="application/json"
                value={file}
                onChange={setFile}
                style={{width: '100%'}}
            />
            {error && <Alert color="red" title="Error">{error}</Alert>}
            <Group mt="md">
                <Button variant="default" onClick={onBack} leftSection={<ArrowLeft size={18} />}>
                    Back
                </Button>
                <Button onClick={handleUpload} leftSection={<Upload size={18} />}>
                    Upload & Add
                </Button>
            </Group>
        </Stack>
    );
};

export default JsonUploadStep;