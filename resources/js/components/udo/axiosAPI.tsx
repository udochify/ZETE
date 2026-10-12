import axios from 'axios';

const axiosAPI = axios.create({
    baseURL: 'http://localhost:8000', // Your Laravel URL
    withCredentials: true,           // CRITICAL: Sends/receives session cookies
    withXSRFToken: true,
    headers: {
        // 'X-Requested-With': 'XMLHttpRequest',
        // 'Content-Type': 'application/json',
        // 'Accept': 'application/json',
    },
});

export default axiosAPI;
