import { Head } from '@inertiajs/react';
import type { AxiosError } from 'axios'
import type { SubmitEvent } from 'react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import axiosAPI from '@/components/udo/axiosAPI';
import Camera from '@/components/udo/register-camera';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { login } from '@/routes';

// Define the shape of the registration form
interface RegisterFormData {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

// Define the shape of Laravel's validation error response
interface LaravelValidationErrors {
    message: string;
    errors: {
        [key: string]: string[]; // e.g., "email": ["The email is already taken."]
    };
}

export default function Register() {
    const [formData, setFormData] = useState<RegisterFormData>({
        name: '',
        email: '',
        password: '',
        password_confirmation: ''
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<LaravelValidationErrors['errors']>({});

    const handleRegistration = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault(); // Stop the page from reloading!

        // 3. Send to Laravel
        axiosAPI.post('/register', formData)
            .then(response => {
                // setMessage(response.data.message);
                console.log("Registration Successful", response.data);
                window.location.href = '/dashboard';
            })
            .catch(error => {
                const err = error as AxiosError<LaravelValidationErrors>;
                if (err.response && err.response.status === 422) {
                    // 422 is for Laravel validation errors, and 
                    // are inside error.response.data.errors
                    setErrors(err.response.data.errors);
                } else if (err.response && err.response.status === 419) {
                    alert("Session expired. Please refresh the page.");
                } else {
                    console.error("An unexpected error occurred:", err.message);
                }
            }).finally(()=> {
                setIsLoading(false);
            })
    };

    return (
        <AuthLayout
            title="Create an account"
            description="Capture Face and enter your details below to create your account"
        >
            <Head title="Register" />
            <div className='flex w-full flex-col md:flex-row items-center'>
                <div className='block w-1/2 border m-5 min-h-105 items-center min-w-80'>
                    <Camera />
                </div>
                <form
                    onSubmit={(event)=>handleRegistration(event)}
                    className="flex flex-col gap-6 w-1/2 min-h-105"
                >
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                onChange={event => setFormData({...formData, name: event.target.value})}
                                value={formData.name}
                                type="text"
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="name"
                                name="name"
                                placeholder="Full name"
                            />
                            {errors.name && 
                            <InputError message={errors.name[0]} className="mt-2" />
                            }
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                onChange={event=> setFormData({...formData, email: event.target.value})}
                                value={formData.email}
                                type="email"
                                required
                                tabIndex={2}
                                autoComplete="email"
                                name="email"
                                placeholder="email@example.com"
                            />
                            {errors.email && 
                            <InputError message={errors.email[0]} />
                            }
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                onChange={event=> setFormData({...formData, password: event.target.value})}
                                value={formData.password}
                                type="password"
                                required
                                tabIndex={3}
                                autoComplete="new-password"
                                name="password"
                                placeholder="Password"
                            />
                            {errors.password &&
                            <InputError message={errors.password[0]} />
                            }
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password_confirmation">
                                Confirm password
                            </Label>
                            <Input
                                id="password_confirmation"
                                onChange={event=> setFormData({...formData, password_confirmation: event.target.value})}
                                value={formData.password_confirmation}
                                type="password"
                                required
                                tabIndex={4}
                                autoComplete="new-password"
                                name="password_confirmation"
                                placeholder="Confirm password"
                            />
                            {errors.password_confirmation &&
                                <InputError message={errors.password_confirmation[0]} />
                            }
                        </div>

                        <Button
                            type="submit"
                            // ref={submitBtn} 
                            // onClick={handleRegistration}
                            className="mt-2 w-full"
                            tabIndex={5}
                            data-test="register-user-button"
                        >
                            {isLoading && <Spinner />}
                            Create account
                        </Button>
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <TextLink href={login()} tabIndex={6}>
                            Log in
                        </TextLink>
                    </div>
                </form>
            </div>
        </AuthLayout>
    );
}
