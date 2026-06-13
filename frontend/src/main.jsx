import { createTheme, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import AppRouter from './app-router.jsx';
import './index.scss';

registerSW({ immediate: true });

const themeColors = [
    '#f2fbe8',
    '#e6f3d9',
    '#cde4b6',
    '#b3d48f',
    '#9cc76e',
    '#8dbf59',
    '#7db344',
    '#72a53d',
    '#649234',
    '#547f27',
];

const theme = createTheme({
    colors: {
        themeColors,
    },
    forceColorScheme: 'light',
    fontFamily: "'Roboto', sans-serif",
    headings: {
        fontFamily: "'Roboto', sans-serif",
    },
    primaryColor: 'themeColors',
    components: {
        Button: {
            defaultProps: {
                radius: 'xl',
                px: 'xl',
            },
        },
    },
});

const root = createRoot(document.getElementById('root'));
root.render(
    <StrictMode>
        <BrowserRouter>
            <MantineProvider theme={theme}>
                <AppRouter />
            </MantineProvider>
        </BrowserRouter>
    </StrictMode>,
);

