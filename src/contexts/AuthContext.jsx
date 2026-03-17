import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

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

    useEffect(() => {
        let subscription = null

        async function init() {
            try {
                // Get initial session
                const { data: { session } } = await supabase.auth.getSession()
                setUser(session?.user ?? null)
                if (session?.user) {
                    await fetchProfile(session.user.id)
                }
            } catch (err) {
                console.warn('Auth init error (Supabase not configured?):', err.message)
            } finally {
                setLoading(false)
            }

            try {
                // Listen for auth changes
                const { data } = supabase.auth.onAuthStateChange(
                    async (_event, session) => {
                        setUser(session?.user ?? null)
                        if (session?.user) {
                            await fetchProfile(session.user.id)
                        } else {
                            setProfile(null)
                        }
                        setLoading(false)
                    }
                )
                subscription = data?.subscription
            } catch (err) {
                console.warn('Auth listener error:', err.message)
            }
        }

        init()

        return () => {
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
                redirectTo: window.location.origin + '/complete-profile',
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
            .upsert(
                { user_id: user.id, ...profileData, updated_at: new Date().toISOString() },
                { onConflict: 'user_id' }
            )
            .select()
            .single()

        if (error) throw error
        setProfile(data)
        return data
    }

    /** Check if profile is complete (has required fields filled) */
    function isProfileComplete() {
        if (!profile) return false
        return !!(profile.provincia && profile.tipo_vivienda && profile.full_name)
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
