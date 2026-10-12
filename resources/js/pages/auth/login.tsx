import { Head } from '@inertiajs/react';
import type { AxiosError } from 'axios'
import type { SubmitEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import axiosAPI from '@/components/udo/axiosAPI';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import SmallCardLayout from '@/layouts/udo/small-card-layout';
import { register } from '@/routes';
import { request } from '@/routes/password';

// Define the shape of the registration form
interface LoginFormData {
    image: Blob;
    email: string;
    password: string;
    privatekey: string;
}

// Define the shape of Laravel's validation error response
interface LaravelValidationErrors {
    message: string;
    errors: {
        [key: string]: string[]; // e.g., "email": ["The email is already taken."]
    };
}

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [CONTEXT, setCONTEXT] = useState<CanvasRenderingContext2D | null>(null);
    const [formData, setFormData] = useState<LoginFormData>({
        image: new Blob,
        email: '',
        password: '',
        privatekey: '',
    });
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [errors, setErrors] = useState<LaravelValidationErrors['errors']>({});

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
        // This runs when the component is destroyed/unmounted
        return () => {
            if(videoRef.current) {
                videoRef.current.srcObject = null
            }
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                setStream(null)
            }
        };
    }, [CONTEXT, stream]);

    const handleLogin = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault(); // Stop the page from reloading!
        if (!canvasRef.current) return;
        canvasRef.current.toBlob(blob => {
            if (!blob) return;
            // 1. Initialize FormData
            const data = new FormData();

            // 2. Append your state values
            data.append('image', blob, 'capture.jpg');
            data.append('email', formData.email);
            data.append('password', formData.password);
            data.append('privatekey', formData.privatekey);
            
            // 3. Append the Blob
            // Note: Always provide a filename (e.g., 'face.jpg') so Laravel recognizes it as a file

            // const file = new File([formData.image], "capture.jpg", { 
            //     type: "image/jpeg" 
            // });
            // data.append('image', file);

            // 4. Send to Laravel
            axiosAPI.post('/login', data)
                .then(response => {
                    // setMessage(response.data.message);
                    console.log("Login Successful", response.data);
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
        }, 'image/jpeg', 0.9);
    };

    return (
        <AuthLayout
            title="Log in to your account"
            description="Enter your email and password below to log in"
        >
            <Head title="Log in" />
            <div className='flex w-full flex-col md:flex-row items-center'>
                <div className='block w-1/2 border m-5 items-center min-w-80'>
                    <SmallCardLayout name='Camera' description={""}>
                        <div className="flex flex-col items-center">
                            <canvas 
                                className='block w-75 h-75 rounded-xl rounded-b-none m-0 mx-auto p-0 transform-[scaleX(-1)]' 
                                ref={canvasRef} 
                            />
                            {errors.image &&
                            <InputError className='p-4 pt-3' message={errors.image[0]} />
                            }
                        </div>
                    </SmallCardLayout>
                </div>
                <form
                    onSubmit={(event)=>handleLogin(event)}
                    className="flex flex-col gap-6 w-1/2"
                >
                    <div className="grid gap-6">
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email address</Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                onChange={event=> setFormData({...formData, email: event.target.value})}
                                value={formData.email}
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="email"
                                placeholder="email@example.com"
                            />
                            {errors.email && 
                            <InputError message={errors.email[0]} />
                            }
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-center">
                            <Label htmlFor="password">Password</Label>
                            {canResetPassword && (
                                <TextLink
                                    href={request()}
                                    className="ml-auto text-sm"
                                    tabIndex={5}
                                >
                                    Forgot password?
                                </TextLink>
                            )}
                            </div>
                            <Input
                                id="password"
                                type="password"
                                name="password"
                                onChange={event=> setFormData({...formData, password: event.target.value})}
                                value={formData.password}
                                required
                                tabIndex={2}
                                autoComplete="current-password"
                                placeholder="Password"
                            />
                            {errors.password &&
                            <InputError message={errors.password[0]} />
                            }
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="privatekey">Private Key</Label>
                            <Input
                                id="privatekey"
                                type="password"
                                name="privatekey"
                                onChange={event=> setFormData({...formData, privatekey: event.target.value})}
                                value={formData.privatekey}
                                required
                                autoFocus
                                tabIndex={1}
                                autoComplete="privatekey"
                                placeholder="*****"
                            />
                            {errors.privatekey && 
                            <InputError message={errors.privatekey[0]} />
                            }
                        </div>

                        <div className="flex items-center space-x-3">
                            <Checkbox
                                id="remember"
                                name="remember"
                                tabIndex={3}
                            />
                            <Label htmlFor="remember">Remember me</Label>
                        </div>

                        <Button
                            type="submit"
                            className="mt-4 w-full"
                            tabIndex={4}
                            disabled={isLoading}
                            data-test="login-button"
                        >
                            {isLoading && <Spinner />}
                            Log in
                        </Button>
                    </div>

                    {canRegister && (
                        <div className="text-center text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <TextLink href={register()} tabIndex={5}>
                                Sign up
                            </TextLink>
                        </div>
                    )}   
                </form>
            </div>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </AuthLayout>
    );
}
