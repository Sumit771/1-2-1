import React, { createContext, useContext, useState, ReactNode } from 'react'
import api, { setAuthToken } from '../services/api'
import { generateKeypair, storeKeypair } from '../services/encryption'

interface AuthState{token: string | null; user: {id:string;username:string;email:string} | null}

const AuthContext = createContext<{
  auth: AuthState
  login: (token: string, user: NonNullable<AuthState['user']>) => void
  logout: () => void
}>({
  auth: {token: null, user: null},
  login: ()=>{},
  logout: ()=>{}
})

export const AuthProvider = ({children}:{children:ReactNode})=>{
  const [auth,setAuth] = useState<AuthState>({token:null,user:null})

  function login(token:string,user:{id:string;username:string;email:string}){
    setAuth({token,user})
    setAuthToken(token)
    
    // Generate and store encryption keypair for this user
    const keypair = generateKeypair()
    storeKeypair(user.id, keypair.publicKey, keypair.secretKey)
  }

  function logout(){
    setAuth({token:null,user:null})
    setAuthToken(null)
  }

  return <AuthContext.Provider value={{auth,login,logout}}>{children}</AuthContext.Provider>
}

export function useAuth(){
  return useContext(AuthContext)
}
