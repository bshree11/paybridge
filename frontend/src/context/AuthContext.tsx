import { createContext, useContext, useState, useEffect, type ReactNode} from 'react';
import api from '../api/client';

//what we store about the logged - in user
interface User{
    id: number;
    email: string;
    role: string;
    kycStatus: string;
    twoFactorEnabled: boolean;
}

// what AuthContext provides to all pages
interface AuthContextType{
    user: User| null;
    loading: boolean;
    login: (email: string, password: string) => Promise<any>;
    signup:(email: string, password: string, consent: boolean) => Promise<any>;
    logout:() => void;
    setUser: (user: User | null) => void;
}

// create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

//Provider component - wraps the entire app
export function AuthProvider({children} : {children: ReactNode}){
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    //on app load, check if user is already logged in
    useEffect(() =>{
        const token = localStorage.getItem('accessToken');
        if(token){
            loadUser();
        }else{
            setLoading(false);
        }
    }, []);

    //fetch current user from backend
    async function loadUser(){
        try{
            const res = await api.get('/auth/me');
            setUser(res.data.user);
        }catch{
            //token invalid - clear everything
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
        }finally{
            setLoading(false);
        }
    }

    //Login function
    async function login(email: string, password: string){
        const res = await api.post('/auth/login', {email, password});
        if(res.data.requires2FA){
            //don't save tokens yet - need 2FA first
            return { requires2FA: true, tempToken: res.data.tempToken};
        }

        //save tokens
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);

        //load user data
        await loadUser();
        return { requires2FA: false};
    }

    //signup function
    async function signup(email:string, password: string, consent: boolean){
        const res = await api.post('/auth/register', {email, password, consent});

        //auto-login after signup
        localStorage.setItem('accessToken', res.data.accessToken);
        localStorage.setItem('refreshToken', res.data.refreshToken);

        await loadUser();
        return res.data;
    }

    //Logout function 
    function logout(){
        const refreshToken = localStorage.getItem('refreshToken');

        //tell backend to invalidate tokens 
        api.post('/auth/logout', {refreshToken}).catch(()=> {});

        //clear local storage
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setUser(null);

        //redirect to login
        window.location.href = '/login';
    }

    return (
        <AuthContext.Provider value={{user, loading, login, signup, logout, setUser}}>
            {children}
        </AuthContext.Provider>
    );
}

//hook to use auth in any component
export function useAuth(){
    const context = useContext(AuthContext);
    if(!context){
        throw new Error('useAuth must be used within AuthProvider');

    }
    return context;
}