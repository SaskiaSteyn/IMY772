import { Button, Stack, Text, Title } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import './not-found.scss';

const brandImageSrc = `${import.meta.env.BASE_URL}icon.svg`;

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className='not-found-page'>
            <div className='not-found-card'>
                <div className='not-found-brand'>
                    <img src={brandImageSrc} alt='MicroTrack' className='not-found-logo' />
                    <Text size='lg'>
                        <strong>Micro</strong>Track
                    </Text>
                </div>

                <div className='not-found-code'>404</div>

                <Stack align='center' gap='xs'>
                    <Title order={2} className='not-found-title'>
                        Page not found
                    </Title>
                    <Text c='dimmed' size='sm' ta='center' maw={320}>
                        The page you&apos;re looking for doesn&apos;t exist or
                        has been moved.
                    </Text>
                </Stack>

                <Stack gap='sm' w='100%' maw={280}>
                    <Button color='themeColors.6' fullWidth onClick={() => navigate('/dashboard')}>
                        Go to Dashboard
                    </Button>
                    <Button variant='outline' color='themeColors.6' fullWidth onClick={() => navigate(-1)}>
                        Go Back
                    </Button>
                </Stack>
            </div>
        </div>
    );
}
