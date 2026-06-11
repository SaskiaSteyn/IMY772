import { Button, Group, Paper, Text } from '@mantine/core';
import { useEffect, useState } from 'react';

export default function PwaInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setVisible(true);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <Paper
            shadow="md"
            p="md"
            radius="md"
            style={{
                position: 'fixed',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                width: 'min(360px, calc(100vw - 32px))',
            }}
        >
            <Text fw={500} mb={8}>Install Microtrack</Text>
            <Text size="sm" c="dimmed" mb={12}>
                Add to your home screen for a better experience.
            </Text>
            <Group justify="flex-end" gap="sm">
                <Button variant="subtle" size="sm" onClick={() => setVisible(false)}>
                    Not now
                </Button>
                <Button size="sm" onClick={handleInstall}>
                    Install
                </Button>
            </Group>
        </Paper>
    );
}
