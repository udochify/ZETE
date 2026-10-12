import { useEffect, useRef } from 'react';
import { useState } from 'react';
import SmallCardLayout from '@/layouts/udo/small-card-layout';

export default function Camera() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [CONTEXT, setCONTEXT] = useState<CanvasRenderingContext2D | null>(null);

    useEffect(() => {
        if (canvasRef.current) {

            function updateCanvas() {
                if (videoRef.current && CONTEXT) {
                    CONTEXT.drawImage(videoRef.current, -200, -200);
                    window.requestAnimationFrame(updateCanvas)
                }
            }

            const context = canvasRef.current.getContext("2d");
            if (context) {
                setCONTEXT(context);
                canvasRef.current.height = 280;
                canvasRef.current.width = 280;
                const promise = navigator.mediaDevices.getUserMedia({video:true});
                promise.then(function(signal) {
                    videoRef.current = document.createElement('video')
                    videoRef.current.srcObject = signal;
                    videoRef.current.play();

                    videoRef.current.onloadeddata = function() {
                        if (videoRef.current) {
                            updateCanvas();
                        }
                    }
                }).catch(function(err) {
                    alert("Camera error: " + err)
                });
            }
        }
    }, [CONTEXT]);

    return (
        <>
            <SmallCardLayout 
                name='Camera'
            >
                <canvas className='block w-75 h-75 rounded-xl rounded-b-none m-0 mx-auto p-0 transform-[scaleX(-1)]' ref={canvasRef} ></canvas>
            </SmallCardLayout>
        </>
    );
}