import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch profiles table linked to the authenticated user
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, we might try to create one or handle it
        console.warn('Profile not found or error fetching:', error.message);
        setProfile(null);
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      setProfile(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initialLoadDone = { current: false };

    const handleAuthChange = async (session) => {
      if (!isMounted) return;
      setLoading(true);
      try {
        if (session) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error('Error al manejar cambio de autenticación:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;
          await handleAuthChange(session);
        }
      } catch (err) {
        console.error('Error al inicializar sesión:', err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;
          await handleAuthChange(session);
        }
      } else {
        initialLoadDone.current = true;
        await handleAuthChange(session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Sign Up function
  const signUp = async (
    email,
    password,
    nombres = '',
    apellidos = '',
    telefono = '',
    pais = '',
    estado = '',
    grado = '',
    especialidad = '',
    institucion = '',
    cargo = ''
  ) => {
    const nombreCompleto = `${nombres} ${apellidos}`.trim();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://healthcareexp.com/confirmacion',
        data: {
          nombre_completo: nombreCompleto,
          nombres,
          apellidos,
          telefono,
          pais,
          estado,
          grado,
          especialidad,
          institucion,
          cargo,
          rol: 'estudiante'
        }
      }
    });

    if (error) throw error;
    
    // If sign up is successful, let's also manually update/ensure profile is saved with phone
    if (data.user) {
      try {
        // We wait a tiny bit for trigger to complete, then update additional info like phone
        setTimeout(async () => {
          await supabase
            .from('profiles')
            .update({ 
              telefono: telefono, 
              nombre_completo: nombreCompleto 
            })
            .eq('id', data.user.id);
        }, 1500);
      } catch (err) {
        console.error('Error writing phone to profile:', err);
      }
    }

    return data;
  };

  // Sign In function
  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  // Sign Out function
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase signOut error, forcing local logout:', err);
    } finally {
      setUser(null);
      setProfile(null);
      // Clear local storage keys belonging to Supabase to prevent stuck token state
      try {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase.auth.token'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } catch (e) {
        console.error('Error clearing local storage keys:', e);
      }
    }
  };

  // Password Reset Request
  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/restablecer-contrasena`
    });
    if (error) throw error;
    return data;
  };

  // Update Profile Data
  const updateProfile = async (updates) => {
    if (!user) throw new Error('No active session user');
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    setProfile(data);
    return data;
  };

  // Update User Auth Metadata
  const updateUserMetadata = async (metadata) => {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata
    });
    if (error) throw error;
    setUser(data.user);
    return data.user;
  };

  const value = {
    user,
    profile,
    loading,
    signUp,
    login,
    logout,
    resetPassword,
    updateProfile,
    updateUserMetadata,
    refetchProfile: () => fetchProfile(user?.id)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};
