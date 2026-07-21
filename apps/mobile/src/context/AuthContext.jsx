import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { dbGetUserByEmail } from '../utils/supabaseService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On page load / refresh: restore session using getSession()
    const restoreSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const profile = await dbGetUserByEmail(session.user.email);
          
          // Fetch role-specific details
          let roleDetails = null;
          if (profile?.role === 'doctor') {
            const { data: docData } = await supabase
              .from('doctor_profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            if (docData) {
              roleDetails = {
                name: docData.name,
                profile_photo_url: docData.profile_photo_url,
                hospital_name: docData.hospital_name,
                latitude: docData.latitude,
                longitude: docData.longitude
              };
            }
          } else if (profile?.role === 'patient') {
            const { data: patData } = await supabase
              .from('patient_profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            if (patData) {
              roleDetails = {
                name: patData.full_name,
                phone: patData.phone
              };
            }
          }

          setUser({
            ...session.user,
            role: profile?.role || session.user.user_metadata?.role,
            ...profile,
            ...roleDetails
          });
        }
      } catch (err) {
        console.warn('Session restore error:', err);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();

    // Only listen for SIGNED_OUT to clear user state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Called by Login.jsx after successful dbLogin()
  const login = (userObj) => {
    setUser(userObj);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
