import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { dataUrlToBlob, isInlineAvatar, uploadAvatar } from '../lib/avatar';

const AuthContext = createContext({});
const MAX_SAFE_ACCESS_TOKEN_LENGTH = 48 * 1024;

const needsLegacySessionRecovery = (session) => Boolean(
  session && (
    (session.access_token?.length || 0) > MAX_SAFE_ACCESS_TOKEN_LENGTH ||
    isInlineAvatar(session.user?.user_metadata?.avatar_url)
  )
);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionRecoveryRequired, setSessionRecoveryRequired] = useState(null);
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
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('No se pudo cargar el perfil:', error.message);
        setProfile(null);
        return null;
      }

      if (!data && authUser?.email) {
        const metadata = authUser.user_metadata || {};
        const recoveredProfile = {
          id: userId,
          email: authUser.email,
          nombre_completo: metadata.nombre_completo || metadata.full_name || '',
          telefono: metadata.telefono || '',
          pais: metadata.pais || '',
          estado: metadata.estado || '',
          grado: metadata.grado || '',
          especialidad: metadata.especialidad || '',
          institucion: metadata.institucion || '',
          cargo: metadata.cargo || '',
          rol: 'estudiante'
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(recoveredProfile)
          .select('*')
          .single();

        if (createError) {
          console.warn('El usuario no tiene perfil y no se pudo reconstruir:', createError.message);
          setProfile(null);
          return null;
        }

        data = createdProfile;
      }

      if (!data) {
        setProfile(null);
        return null;
      }

      const safeProfile = await migrateLegacyAvatar(userId, data, authUser);
      setProfile(safeProfile);
      return safeProfile;
    } catch (err) {
      console.error('Error de red al cargar el perfil:', err);
      setProfile(null);
      return null;
    }
  }, [migrateLegacyAvatar]);

  const refreshLegacySession = useCallback(async (session) => {
    if (!needsLegacySessionRecovery(session)) return session;

    console.warn('Se detectó una sesión antigua demasiado grande; intentando renovarla antes de consultar Supabase.');
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token: session.refresh_token
    });

    if (error) throw error;
    if (!data.session || needsLegacySessionRecovery(data.session)) {
      throw new Error('La metadata antigua todavía está presente en Auth y requiere la migración SQL.');
    }

    return data.session;
  }, []);

  const applySession = useCallback(async (session) => {
    setLoading(true);

    try {
      if (!session) {
        currentUserIdRef.current = null;
        setUser(null);
        setProfile(null);
        setSessionRecoveryRequired(null);
        return;
      }

      let activeSession = session;
      try {
        activeSession = await refreshLegacySession(session);
      } catch (error) {
        // Do not mount portal pages while the oversized JWT would make every REST call fail.
        currentUserIdRef.current = session.user.id;
        setUser(session.user);
        setProfile(null);
        setSessionRecoveryRequired({
          message: 'La sesión guardada contiene datos antiguos demasiado grandes y Supabase la rechaza.',
          detail: error.message
        });
        return;
      }

      setSessionRecoveryRequired(null);
      currentUserIdRef.current = activeSession.user.id;
      setUser(activeSession.user);
      await fetchProfile(activeSession.user.id, activeSession.user);
    } catch (error) {
      console.error('Error al aplicar la sesión:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchProfile, refreshLegacySession]);

  useEffect(() => {
    let isMounted = true;
    const initialLoadDone = { current: false };

    const handleAuthChange = async (session) => {
      if (!isMounted) return;
      await applySession(session);
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
  }, [applySession]);

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

      // Brevo — alta en la lista del portal, que dispara el correo de bienvenida.
      // No bloquea el registro: si Brevo falla, la cuenta ya quedó creada igual.
      fetch('/.netlify/functions/portal-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, nombres, apellidos, telefono,
          pais, estado, grado, especialidad, institucion, cargo,
        }),
      }).catch((err) => console.error('Error registering portal contact in Brevo:', err));
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
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('Supabase signOut error, forcing local logout:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setSessionRecoveryRequired(null);
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

  const retrySessionRecovery = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    await applySession(session);
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
    sessionRecoveryRequired,
    signUp,
    login,
    logout,
    retrySessionRecovery,
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
