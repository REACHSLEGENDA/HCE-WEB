import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { dataUrlToBlob, isInlineAvatar, uploadAvatar } from '../lib/avatar';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef(null);

  const migrateLegacyAvatar = useCallback(async (userId, profileRow, authUser) => {
    const profileAvatar = profileRow?.avatar_url;
    const metadataAvatar = authUser?.user_metadata?.avatar_url;
    const legacyAvatar = isInlineAvatar(profileAvatar)
      ? profileAvatar
      : (isInlineAvatar(metadataAvatar) ? metadataAvatar : null);

    let migratedProfile = profileRow;

    if (legacyAvatar) {
      try {
        const avatarBlob = await dataUrlToBlob(legacyAvatar);
        const publicUrl = await uploadAvatar(supabase, userId, avatarBlob);
        const { data: updatedProfile, error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: publicUrl })
          .eq('id', userId)
          .select()
          .single();

        if (profileError) throw profileError;
        migratedProfile = updatedProfile;
      } catch (error) {
        console.warn('No se pudo migrar el avatar Base64 a Storage:', error.message);
        // Never keep rendering a multi-megabyte data URL in the portal.
        migratedProfile = { ...profileRow, avatar_url: '' };
      }
    }

    if (isInlineAvatar(metadataAvatar)) {
      try {
        const { data, error } = await supabase.auth.updateUser({
          data: { avatar_url: null }
        });
        if (error) throw error;

        if (data.user) {
          setUser(data.user);
        }
      } catch (error) {
        console.warn('No se pudo limpiar el avatar del JWT:', error.message);
      }
    }

    return migratedProfile;
  }, []);

  // Fetch profiles table linked to the authenticated user
  const fetchProfile = useCallback(async (userId, authUser = null) => {
    if (!userId) {
      setProfile(null);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('No se pudo cargar el perfil:', error.message);
        setProfile(null);
        return null;
      } else {
        const safeProfile = await migrateLegacyAvatar(userId, data, authUser);
        setProfile(safeProfile);
        return safeProfile;
      }
    } catch (err) {
      console.error('Error de red al cargar el perfil:', err);
      setProfile(null);
      return null;
    }
  }, [migrateLegacyAvatar]);

  useEffect(() => {
    let isMounted = true;
    const initialLoadDone = { current: false };

    const handleAuthChange = async (session) => {
      if (!isMounted) return;
      setLoading(true);
      try {
        if (session) {
          currentUserIdRef.current = session.user.id;
          setUser(session.user);
          await fetchProfile(session.user.id, session.user);
        } else {
          currentUserIdRef.current = null;
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (!initialLoadDone.current) {
          initialLoadDone.current = true;
          void handleAuthChange(session);
        }
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (session?.user) {
          currentUserIdRef.current = session.user.id;
          setUser(session.user);
        }
        return;
      }

      if (event === 'SIGNED_IN' && session?.user?.id === currentUserIdRef.current) {
        setUser(session.user);
        return;
      }

      initialLoadDone.current = true;
      void handleAuthChange(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

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
    refetchProfile: () => fetchProfile(user?.id, user)
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// AuthProvider and its companion hook intentionally share this module.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  return useContext(AuthContext);
};
