import {
    Anchor,
    Button,
    Checkbox,
    Divider,
    PasswordInput,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useGoogleLogin } from '@react-oauth/google';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context.jsx';
import './auth.scss';

function GoogleIcon() {
    return (
        <svg
            xmlns='http://www.w3.org/2000/svg'
            viewBox='0 0 48 48'
            width='18'
            height='18'
        >
            <path
                fill='#4285F4'
                d='M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v8.51h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.14z'
            />
            <path
                fill='#34A853'
                d='M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z'
            />
            <path
                fill='#FBBC05'
                d='M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z'
            />
            <path
                fill='#EA4335'
                d='M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z'
            />
        </svg>
    );
}

function GoogleSignInButton({ loading, onSuccess, onError }) {
    const runGoogleLogin = useGoogleLogin({
        onSuccess,
        onError,
        flow: 'implicit',
        scope: 'openid email profile',
    });

    return (
        <Button
            variant='outline'
            fullWidth
            className='auth-google-btn'
            leftSection={<GoogleIcon />}
            loading={loading}
            onClick={() => runGoogleLogin()}
        >
            Sign in with Google
        </Button>
    );
}

export default function SignUp() {
    const navigate = useNavigate();
    const { register, googleLogin } = useAuth();
    const brandImageSrc = `${import.meta.env.BASE_URL}favicon.svg`;
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const isGoogleAuthEnabled = Boolean(
        import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim(),
    );

    const form = useForm({
        initialValues: {
            name: '',
            surname: '',
            email: '',
            password: '',
            confirmPassword: '',
            rememberMe: false,
        },
        validate: {
            name: (v) => (v.trim().length > 0 ? null : 'Name is required'),
            surname: (v) =>
                v.trim().length > 0 ? null : 'Surname is required',
            email: (v) =>
                /^\S+@\S+$/.test(v) ? null : 'Please enter a valid email',
            password: (v) =>
                v.length >= 8 ? null : 'Password must be at least 8 characters',
            confirmPassword: (v, values) =>
                v === values.password ? null : 'Passwords do not match',
        },
    });

    async function handleSubmit(values) {
        setLoading(true);
        setError('');
        try {
            await register(
                values.name,
                values.surname,
                values.email,
                values.password,
            );
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleSuccess(tokenResponse) {
        setGoogleLoading(true);
        setError('');
        try {
            await googleLogin({ accessToken: tokenResponse.access_token });
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setGoogleLoading(false);
        }
    }

    return (
        <div className='auth-page'>
            <div className='auth-card'>
                <div className='auth-brand'>
                    <img src={brandImageSrc} alt='MicroTrack' />
                    <Text size='lg'>
                        <strong>Micro</strong>Track
                    </Text>
                </div>

                <form
                    onSubmit={form.onSubmit(handleSubmit)}
                    style={{ width: '100%' }}
                >
                    <Stack gap='sm'>
                        <Title order={2} className='auth-title'>
                            Sign up
                        </Title>

                        <TextInput
                            label='Name'
                            placeholder='Your first name'
                            classNames={{ input: 'auth-input' }}
                            {...form.getInputProps('name')}
                        />

                        <TextInput
                            label='Surname'
                            placeholder='Your last name'
                            classNames={{ input: 'auth-input' }}
                            {...form.getInputProps('surname')}
                        />

                        <TextInput
                            type='email'
                            aria-label='email'
                            label='Email'
                            placeholder='your@email.com'
                            classNames={{ input: 'auth-input' }}
                            {...form.getInputProps('email')}
                        />

                        <PasswordInput
                            label='Password'
                            placeholder='*********'
                            classNames={{ input: 'auth-input' }}
                            {...form.getInputProps('password')}
                        />

                        <PasswordInput
                            label='Confirm Password'
                            placeholder='*********'
                            classNames={{ input: 'auth-input' }}
                            {...form.getInputProps('confirmPassword')}
                        />

                        <Checkbox
                            label='Remember me'
                            color='themeColors.6'
                            {...form.getInputProps('rememberMe', {
                                type: 'checkbox',
                            })}
                        />

                        {error && (
                            <Text c='red' size='sm'>
                                {error}
                            </Text>
                        )}

                        <Button
                            type='submit'
                            fullWidth
                            loading={loading}
                            color='themeColors.6'
                        >
                            Sign Up
                        </Button>

                        {isGoogleAuthEnabled && (
                            <>
                                <Divider label='or' labelPosition='center' />
                                <GoogleSignInButton
                                    loading={googleLoading}
                                    onSuccess={handleGoogleSuccess}
                                    onError={() =>
                                        setError('Google sign-in failed')
                                    }
                                />
                            </>
                        )}

                        <div className='auth-footer'>
                            <Text size='sm' component='span'>
                                Have an account?{' '}
                            </Text>
                            <Anchor size='sm' component={Link} to='/login'>
                                Sign in
                            </Anchor>
                        </div>
                    </Stack>
                </form>
            </div>
        </div>
    );
}
