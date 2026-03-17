import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const initialSessionHandledRef = useRef(false)

    /** Fetch the user's profile from Supabase */
    async function fetchProfile(userId) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single()

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error)
        }
        setProfile(data || null)
        return data
    }

    /** Helper function to apply session data to state */
    async function applySession(session) {
        setUser(session?.user ?? null)
        if (session?.user) {
            await fetchProfile(session.user.id)
        } else {
            setProfile(null)
        }
    }

    useEffect(() => {
        let subscription = null

        // Safety net: force loading off after 10s if network fails
        const safetyTimeout = setTimeout(() => {
            setLoading(false)
        }, 10000)

        async function initAuth() {
            try {
                // 1. Get initial session
                const { data: { session } } = await supabase.auth.getSession()
                await applySession(session)
                initialSessionHandledRef.current = true
            } catch (err) {
                console.warn('Auth init error:', err.message)
            } finally {
                clearTimeout(safetyTimeout)
                setLoading(false)
            }

            // 2. Listen for auth changes
            try {
                const { data } = supabase.auth.onAuthStateChange(
                    async (event, session) => {
                        // Avoid redundant processing of the initial session if initAuth already did it
                        if (event === 'INITIAL_SESSION' && initialSessionHandledRef.current) {
                            return
                        }

                        await applySession(session)
                        setLoading(false)
                    }
                )
                subscription = data?.subscription
            } catch (err) {
                console.error('Auth listener error:', err.message)
            }
        }

        initAuth()

        return () => {
            clearTimeout(safetyTimeout)
            if (subscription) subscription.unsubscribe()
        }
    }, [])

    /** Sign up with email + password */
    async function signUp(email, password, metadata = {}) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata },
        })
        if (error) throw error
        
        if (data?.session) {
            await applySession(data.session)
        }
        
        return data
    }

    /** Sign in with email + password */
    async function signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        if (error) throw error
        return data
    }

    /** Sign in with Google OAuth */
    async function signInWithGoogle() {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        })
        if (error) throw error
        return data
    }

    /** Sign out */
    async function signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setUser(null)
        setProfile(null)
    }

    /** Update or create profile */
    async function updateProfile(profileData) {
        if (!user) throw new Error('No user logged in')

        const { data, error } = await supabase
            .from('profiles')
            .update({ ...profileData, updated_at: new Date().toISOString() })
            .eq('user_id', user.id)
            .select()
            .single()

        if (error) throw error
        setProfile(data)
        return data
    }

    /** Check if profile is complete */
    function isProfileComplete() {
        if (!profile) return false
        return !!(profile.provincia && profile.tipo_vivienda)
    }

    const value = {
        user,
        profile,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        updateProfile,
        fetchProfile,
        isProfileComplete,
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}