import { createTheme, MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.scss';

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
});

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <MantineProvider theme={theme}>
            <App />
        </MantineProvider>
    </StrictMode>,
);
