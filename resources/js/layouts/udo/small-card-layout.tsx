// import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
// import AppLogoIcon from '@/components/app-logo-icon';
import {
    Card,
    CardContent,
    CardDescription,
    // CardHeader,
    // CardTitle,
} from '@/components/ui/card';
// import { home } from '@/routes';

export default function SmallCardLayout({
    children,
    // title,
    description,
}: PropsWithChildren<{
    name?: string;
    // title?: string;
    description?: string;
}>) {
    return (
        <>
        <div className="flex flex-col items-center justify-center gap-6 bg-muted p-2 h-95">

                <div className="flex flex-col h-full">
                    <Card className="h-full rounded-xl py-0 m-0 gap-0">
                        <CardContent className="h-full p-0 m-0">
                            {children}
                        </CardContent>
                    </Card>
                </div>
        </div>
        <CardDescription className='p-2 text-center'>
            {description}
        </CardDescription>
        </>
    );
}
