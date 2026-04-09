import { Button } from '@mantine/core';
import { ChartColumn, Dam, Droplet, Leaf } from 'lucide-react';
import './styles/style-guide.scss';

function App() {
    return (
        <>
            <section style={{ padding: '1.5rem' }}>
                <h1>Style Guide</h1>
                <p>
                    This is the style guide of the application. It gives an
                    overview of the design elements and components used
                    throughout the app.
                </p>
                <div class='group'>
                    <div class='header'>
                        <h2>Typography</h2>
                    </div>
                    <div class='inner-group'>
                        <h1>Heading 1</h1>
                        <h2>Heading 2</h2>
                        <h3>Heading 3</h3>
                        <h4>Heading 4</h4>
                        <p>Paragraph</p>
                    </div>
                </div>
                <div class='group'>
                    <div class='header'>
                        <h2>Colors</h2>
                    </div>
                    <div class='color-grid'>
                        <div>
                            <div
                                style={{
                                    backgroundColor: '#7db344',
                                    width: '300px',
                                    height: '100px',
                                }}
                            ></div>
                            <div class='color-name'>
                                <p>Primary</p>
                                <p>
                                    <code>$primary-color</code>
                                </p>
                            </div>
                        </div>
                        <div>
                            <div
                                style={{
                                    backgroundColor: '#b3d48f',
                                    width: '300px',
                                    height: '100px',
                                }}
                            ></div>
                            <div class='color-name'>
                                <p>Secondary</p>
                                <p>
                                    <code>$secondary-color</code>
                                </p>
                            </div>
                        </div>
                        <div>
                            <div
                                style={{
                                    backgroundColor: '#547f27',
                                    width: '300px',
                                    height: '100px',
                                }}
                            ></div>
                            <div class='color-name'>
                                <p>Accent</p>
                                <p>
                                    <code>$accent-color</code>
                                </p>
                            </div>
                        </div>
                        <div>
                            <div
                                style={{
                                    backgroundColor:
                                        'var(--mantine-color-green-6)',
                                    width: '300px',
                                    height: '100px',
                                }}
                            ></div>
                            <div class='color-name'>
                                <p>Success</p>
                                <p>
                                    <code>$success-color</code>
                                </p>
                            </div>
                        </div>
                        <div>
                            <div
                                style={{
                                    backgroundColor:
                                        'var(--mantine-color-orange-6)',
                                    width: '300px',
                                    height: '100px',
                                }}
                            ></div>
                            <div class='color-name'>
                                <p>Warning</p>
                                <p>
                                    <code>$warning-color</code>
                                </p>
                            </div>
                        </div>
                        <div>
                            <div
                                style={{
                                    backgroundColor:
                                        'var(--mantine-color-error)',
                                    width: '300px',
                                    height: '100px',
                                }}
                            ></div>
                            <div class='color-name'>
                                <p>Error</p>
                                <p>
                                    <code>$error-color</code>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class='group'>
                    <div class='header'>
                        <h2>Buttons</h2>
                    </div>
                    <div class='btn-div'>
                        <Button variant='default'>Default Button</Button>
                        <Button variant='filled'>Filled Button</Button>
                        <Button variant='light'>Light Button</Button>
                        <Button variant='outline'>Outline Button</Button>
                        <Button variant='subtle'>Subtle Button</Button>
                    </div>
                </div>
                <div class='group'>
                    <div class='header'>
                        <h2>Icons</h2>
                    </div>
                    <div class='inner-group'>
                        <p>
                            Make use of{' '}
                            <a
                                href='https://lucide.dev/icons/'
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                Lucide Icons
                            </a>
                            . Below are some examples:
                        </p>
                        <div class='icon-div'>
                            <Leaf />
                            <Droplet />
                            <ChartColumn />
                            <Dam />
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}

export default App;
