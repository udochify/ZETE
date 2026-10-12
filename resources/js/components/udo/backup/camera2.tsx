import axios from 'axios'; // Assuming you use axios, otherwise use fetch
import { useEffect, useRef, useState } from 'react';
import SmallCardLayout from '@/layouts/udo/small-card-layout';

export default function Camera() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [CONTEXT, setCONTEXT] = useState<CanvasRenderingContext2D | null>(null);
    const [uploading, setUploading] = useState(false);

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
                                    context.drawImage(videoRef.current, -200, -50);
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

    const captureAndUpload = () => {
        if (!canvasRef.current) return;

        setUploading(true);

        // 1. Convert Canvas to Blob
        canvasRef.current.toBlob((blob) => {
            if (!blob) return;

            // 2. Prepare FormData
            const formData = new FormData();
            formData.append('image', blob, 'capture.jpg');

            // 3. Send to Laravel
            axios.post('/api/upload-camera-image', formData)
                .then(response => {
                    console.log(response)
                    alert('Image uploaded successfully!');
                })
                .catch(err => {
                    console.error(err);
                    alert('Upload failed.');
                })
                .finally(() => setUploading(false));
        }, 'image/jpeg', 0.9); // 0.9 is the quality
    };

    return (
        <SmallCardLayout name='Camera'>
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
    );
}