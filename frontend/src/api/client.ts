
// Connects to backend 

import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: { 'Content-Type' : 'application/json'},
});

//Automatically attach JWT token on every request
api.interceptors.request.use((config) =>{
    const token = localStorage.getItem('accessToken');
    if(token){
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// If we get 401 (unauthorized), try to refresh the token

api.interceptors.response.use(
    (response) => response,
    async(error) => {
        const originalRequest = error.config;
        if(error.response?.status === 401 && !originalRequest._retry){
            originalRequest._retry = true;

            try{
                const refreshToken = localStorage.getItem('refreshToken');
                const res = await axios.post('http://localhost:3000/api/auth/refresh', {
                    refreshToken,
                });

                const {accessToken, refreshToken: newRefresh} = res.data;
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshTOken', newRefresh);

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            }catch{
                //auto - redirect to login page if both tokens fail

                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
            }
        }
        return  Promise.reject(error);


    }
);
export default api;