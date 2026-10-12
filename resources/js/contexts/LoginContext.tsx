import { createContext } from "react";
import type { Dispatch, SetStateAction } from "react";

export interface LoginFormData {
    email: string;
    password: string;
}

export type contextData = {
    formData: LoginFormData;
    isLoading: boolean;
    setIsLoading: Dispatch<SetStateAction<boolean>>;
}

export const LoginContext = createContext<contextData | null>(null);