import { Head } from '@inertiajs/react';
import type { AxiosError } from 'axios'
import type { SubmitEvent } from 'react';
// import { useState } from 'react';
import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import api from '@/components/udo/axiosAPI';
// import Camera from '@/components/udo/camera';
// import axiosAPI from '@/components/udo/axiosAPI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import SmallCardLayout from '@/layouts/udo/small-card-layout';
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
    // const axios = axiosAPI;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [messageCam, setMessageCam] = useState<string>("");
    const [CONTEXT, setCONTEXT] = useState<CanvasRenderingContext2D | null>(null);
    const [uploading, setUploading] = useState(false);

    // 1. Handshake on Mount
    useEffect(() => {
        const prepareSession = async () => {
            await api.get('/sanctum/csrf-cookie');
            console.log("Session Handshake Complete");
        };
        prepareSession();
    }, []);

    useEffect(() => {
        
        if (canvasRef.current && !CONTEXT) {
            const context = canvasRef.current.getContext("2d");
            if (context) {
                setCONTEXT(context);
                canvasRef.current.height = 280;
                canvasRef.current.width = 280;
                
                navigator.mediaDevices.getUserMedia({ video: true })
                    .then((signal) => {
                        const video = document.createElement('video');
                        video.srcObject = signal;
                        video.play();
                        videoRef.current = video;

                        video.onloadeddata = () => {
                            const updateCanvas = () => {
                                if (videoRef.current && context) {
                                    // Adjusted drawImage to center the feed slightly better
                                    context.drawImage(videoRef.current, -200, -200);
                                    window.requestAnimationFrame(updateCanvas);
                                }
                            };
                            updateCanvas();
                        };
                    })
                    .catch((err) => alert("Camera error: " + err));
            }
        }
    }, [CONTEXT]);

    const captureAndUpload = async () => {

        if (!canvasRef.current) return;

        setUploading(true);

        // 1. Convert Canvas to Blob
        canvasRef.current.toBlob((blob) => {
            if (!blob) return;

            // 2. Prepare FormData
            const formDataCam = new FormData();
            formDataCam.append('image', blob, 'capture.jpg');

            // 3. Send to Laravel

            api.post('/upload-camera-image', formDataCam)
                .then(response => {
                    setMessageCam(response.data.message);
                })
                .catch(err => {
                    setMessageCam(err);
                })
                .finally(() => setUploading(false)
            )

        }, 'image/jpeg', 0.9); // 0.9 is the quality
    };

    const [formData, setFormData] = useState<RegisterFormData>({
        name: '',
        email: '',
        password: '',
        password_confirmation: ''
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<LaravelValidationErrors['errors']>({});

    const handleRegistration = async (event: SubmitEvent<HTMLFormElement>) => {
        console.log("I got here")
        event.preventDefault(); // Stop the page from reloading!
        api.defaults.headers.common['Content-Type'] = 'application/json';

        // 3. Send to Laravel
        api.post('/register', formData)
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
            });
    };

    return (
        <AuthLayout
            title="Create an account"
            description="Capture Faces and enter your details below to create your account"
        >
            <Head title="Register" />
            <div className='flex w-full flex-col md:flex-row items-center'>
                <div className='block w-1/2 border m-5 min-h-105 items-center min-w-80'>
                    <SmallCardLayout name='Camera' description={messageCam}>
                        <div className="flex flex-col items-center">
                            <canvas 
                                className='block w-75 h-75 rounded-xl rounded-b-none m-0 mx-auto p-0 transform-[scaleX(-1)]' 
                                ref={canvasRef} 
                            />
                            <button 
                                onClick={captureAndUpload}
                                disabled={uploading}
                                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                            >
                                {uploading ? 'Uploading...' : 'Capture & Upload'}
                            </button>
                        </div>
                    </SmallCardLayout>
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
