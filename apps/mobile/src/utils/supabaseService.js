import { supabase } from './supabaseClient';

// ── Users & Auth ─────────────────────────────────────────────────────────────

export const dbGetUserByEmail = async (email) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email.toLowerCase())
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
  return data;
};

export const dbCreateUser = async (email, password, role) => {
  console.log(`Setting password for ${email} as ${role}...`);

  // 1. Update the password for the currently logged-in user (authenticated via OTP)
  const { data: authData, error: authError } = await supabase.auth.updateUser({
    password: password,
  });

  if (authError) {
    console.error('Auth Password Update Error:', authError);
    throw authError;
  }

  console.log('Password set successfully, now creating profile...');

  // 2. Create the profile record in our public.profiles table
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .upsert([
      {
        id: authData.user.id,
        email: email.toLowerCase(),
        role: role,
        profile_complete: false,
        credential_verified: role === 'patient'
      }
    ])
    .select()
    .single();

  if (profileError) {
    console.error('Profile Creation Error:', profileError);
    throw profileError;
  }

  console.log('Profile created successfully!');
  return profileData;
};

export const dbResetPassword = async (password) => {
  console.log('Resetting password for authenticated user...');

  // 1. Update the password for the currently logged-in user
  const { data: authData, error: authError } = await supabase.auth.updateUser({
    password: password,
  });

  if (authError) {
    console.error('Auth Password Update Error:', authError);
    throw authError;
  }

  // 2. Fetch their existing profile to return it
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (profileError) {
    console.error('Profile Fetch Error after reset:', profileError);
    // Even if fetch fails, the password was reset successfully
    return { id: authData.user.id };
  }

  return profileData;
};

export const dbLogin = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.toLowerCase(),
    password: password,
  });

  if (error) throw error;

  // Fetch the profile
  const profile = await dbGetUserByEmail(email);

  // Fetch role-specific details
  let roleDetails = null;
  if (profile?.role === 'doctor') {
    const { data: docData } = await supabase
      .from('doctor_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
    if (docData) {
      roleDetails = {
        name: docData.name,
        profile_photo_url: docData.profile_photo_url,
        hospital_name: docData.hospital_name
      };
    }
  } else if (profile?.role === 'patient') {
    const { data: patData } = await supabase
      .from('patient_profiles')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
    if (patData) {
      roleDetails = {
        name: patData.full_name,
        phone: patData.phone
      };
    }
  }

  return {
    ...data.user,
    ...profile,
    ...roleDetails
  };
};

export const dbLogout = async () => {
  await supabase.auth.signOut();
};

// ── Profiles ─────────────────────────────────────────────────────────────────

export const dbSavePatientProfile = async (userId, profileData) => {
  const { error } = await supabase
    .from('patient_profiles')
    .upsert({
      user_id: userId,
      ...profileData,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) throw error;

  // Mark profile as complete in main profiles table
  await supabase
    .from('profiles')
    .update({ profile_complete: true })
    .eq('id', userId);
};

export const dbGetPatientProfile = async (userId) => {
  const { data, error } = await supabase
    .from('patient_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// ── Scans ────────────────────────────────────────────────────────────────────

export const dbSaveScan = async (patientId, scanData) => {
  const { data, error } = await supabase
    .from('scans')
    .insert([{ patient_id: patientId, ...scanData }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const dbGetPatientScans = async (patientId, includeImages = true, limit = null) => {
  const columns = includeImages ? '*' : 'id, created_at, analysis_result, patient_id';
  let query = supabase
    .from('scans')
    .select(columns)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
};

// ── Doctor Profiles ──────────────────────────────────────────────────────────

export const dbSaveDoctorProfile = async (userId, profileData) => {
  const payload = {
    user_id: userId,
    name: profileData.name,
    phone: profileData.phone,
    hospital_name: profileData.hospitalName,
    address: profileData.address,
    profile_photo_url: profileData.profilePhotoUrl,
    updated_at: new Date().toISOString()
  };

  if (profileData.consultationFee !== undefined) {
    payload.consultation_fee = profileData.consultationFee;
  }
  if (profileData.upiId !== undefined) {
    payload.upi_id = profileData.upiId;
  }

  let { error } = await supabase
    .from('doctor_profiles')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) {
    // If undefined_column error (code 42703 or message contains consultation_fee/upi_id)
    if (error.code === '42703' || (error.message && (error.message.includes('consultation_fee') || error.message.includes('upi_id')))) {
      console.warn('Payment columns do not exist in doctor_profiles table. Using localStorage fallback.');
      
      try {
        localStorage.setItem(`payment_fallback_${userId}`, JSON.stringify({
          consultationFee: profileData.consultationFee,
          upiId: profileData.upiId
        }));
      } catch (e) {
        console.error('LocalStorage save error:', e);
      }

      // Retry upsert without the payment columns
      delete payload.consultation_fee;
      delete payload.upi_id;
      const { error: retryError } = await supabase
        .from('doctor_profiles')
        .upsert(payload, { onConflict: 'user_id' });

      if (retryError) throw retryError;
    } else {
      console.error('Error saving doctor_profiles:', error);
      throw error;
    }
  }

  // Mark profile as complete in main profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ profile_complete: true })
    .eq('id', userId);

  if (profileError) {
    console.error('Error updating profile completion status:', profileError);
    throw profileError;
  }
};

export const dbGetAllDoctors = async () => {
  // 1. Fetch all profiles that are verified doctors with completed profiles
  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'doctor')
    .eq('profile_complete', true);

  if (pError) throw pError;
  if (!profiles || profiles.length === 0) return [];

  // 2. Fetch all doctor clinic details
  const { data: details, error: dError } = await supabase
    .from('doctor_profiles')
    .select('*');

  if (dError) throw dError;

  // 3. Fetch all reviews to calculate ratings and show text
  // 3. Fetch all reviews to calculate ratings and show text
  let allReviews = [];
  try {
    // Fetch reviews first
    const { data: revs, error: rError } = await supabase
      .from('reviews')
      .select('*');
    
    if (rError) {
      console.warn('Could not fetch reviews:', rError);
    } else if (revs && revs.length > 0) {
      // Fetch patient names for these reviews
      const patientIds = [...new Set(revs.map(r => r.patient_id))];
      const { data: pData } = await supabase
        .from('patient_profiles')
        .select('user_id, full_name')
        .in('user_id', patientIds);
      
      const pMap = {};
      (pData || []).forEach(p => { pMap[p.user_id] = p.full_name; });
      
      allReviews = revs.map(r => ({
        ...r,
        patientName: pMap[r.patient_id] || 'Anonymous Patient'
      }));
    }
  } catch (err) {
    console.warn('Reviews fetch failed:', err);
  }

  // 4. Manually join the data by user_id
  return profiles.map(p => {
    const d = (details || []).find(det => det.user_id === p.id);
    if (!d) return null;

    const docReviews = (allReviews || []).filter(r => r.doctor_id === p.id);
    const avgRating = docReviews.length > 0 
      ? docReviews.reduce((sum, r) => sum + r.rating, 0) / docReviews.length 
      : 0;

    return {
      ...p,
      profile: {
        ...d,
        hospitalName: d.hospital_name,
        profilePhotoUrl: d.profile_photo_url
      },
      avgRating,
      reviewCount: docReviews.length,
      verified: p.credential_verified,
      reviews: docReviews.map(r => ({
        id: r.id,
        rating: r.rating,
        text: r.text,
        createdAt: r.created_at,
        patientName: r.patientName
      }))
    };
  }).filter(Boolean);
};

export const dbGetDoctorProfile = async (userId) => {
  const { data, error } = await supabase
    .from('doctor_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;

  if (data) {
    let fallbackData = {};
    try {
      const stored = localStorage.getItem(`payment_fallback_${userId}`);
      if (stored) {
        fallbackData = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
    }

    return {
      ...data,
      hospitalName: data.hospital_name,
      profilePhotoUrl: data.profile_photo_url,
      consultationFee: (data.consultation_fee != null) ? data.consultation_fee : (fallbackData.consultationFee || 500),
      upiId: (data.upi_id != null && data.upi_id !== '') ? data.upi_id : (fallbackData.upiId || ''),
      paymentQrUrl: (data.payment_qr_url != null && data.payment_qr_url !== '') ? data.payment_qr_url : (fallbackData.paymentQrUrl || '')
    };
  }
  return data;
};

export const dbUploadProfilePhoto = async (userId, file) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Math.random()}.${fileExt}`;
  const filePath = `profile-photos/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('doctor-assets')
    .upload(filePath, file);

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('doctor-assets')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

export const dbUploadPaymentQr = async (userId, file) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-payment-qr-${Date.now()}.${fileExt}`;
  const filePath = `payment-qr/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('doctor-assets')
    .upload(filePath, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from('doctor-assets')
    .getPublicUrl(filePath);

  const publicUrl = data.publicUrl;

  // Save the URL to doctor_profiles
  const { error: updateError } = await supabase
    .from('doctor_profiles')
    .update({ payment_qr_url: publicUrl })
    .eq('user_id', userId);

  if (updateError) {
    // Column may not exist yet — store in localStorage fallback
    console.warn('payment_qr_url column missing, using localStorage fallback');
    try {
      const stored = localStorage.getItem(`payment_fallback_${userId}`);
      const existing = stored ? JSON.parse(stored) : {};
      localStorage.setItem(`payment_fallback_${userId}`, JSON.stringify({ ...existing, paymentQrUrl: publicUrl }));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
  }

  return publicUrl;
};

export const dbVerifyDoctorCredential = async (userId) => {
  const { error } = await supabase
    .from('profiles')
    .update({ credential_verified: true })
    .eq('id', userId);

  if (error) throw error;
};

// ── Appointments ─────────────────────────────────────────────────────────────

export const dbGetDoctorAppointments = async (doctorId) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const dbScheduleAppointment = async (appointmentId, scheduledTime) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'scheduled', scheduled_time: scheduledTime })
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const dbCompleteAppointment = async (appointmentId) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const dbRejectAppointment = async (appointmentId) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: 'rejected' })
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const dbSubmitAppointmentPayment = async (appointmentId, txnRef) => {
  const payload = {
    payment_status: 'pending_verification',
    payment_reference: txnRef
  };

  const { data, error } = await supabase
    .from('appointments')
    .update(payload)
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) {
    if (error.code === '42703' || (error.message && (error.message.includes('payment_status') || error.message.includes('payment_reference')))) {
      console.warn('Payment columns do not exist in appointments table. Storing in localStorage fallback.');
      
      try {
        localStorage.setItem(`payment_appt_fallback_${appointmentId}`, JSON.stringify({
          payment_status: 'pending_verification',
          payment_reference: txnRef
        }));
      } catch (e) {
        console.error('LocalStorage save error:', e);
      }
      return { id: appointmentId, payment_status: 'pending_verification', payment_reference: txnRef };
    }
    throw error;
  }
  return data;
};

export const dbVerifyAppointmentPayment = async (appointmentId, isApproved) => {
  const status = isApproved ? 'paid' : 'unpaid';
  const payload = {
    payment_status: status
  };

  if (!isApproved) {
    payload.payment_reference = null;
  }

  const { data, error } = await supabase
    .from('appointments')
    .update(payload)
    .eq('id', appointmentId)
    .select()
    .single();

  if (error) {
    if (error.code === '42703' || (error.message && error.message.includes('payment_status'))) {
      console.warn('Payment columns do not exist in appointments table. Storing in localStorage fallback.');
      
      try {
        localStorage.setItem(`payment_appt_fallback_${appointmentId}`, JSON.stringify({
          payment_status: status,
          payment_reference: isApproved ? undefined : null
        }));
      } catch (e) {
        console.error('LocalStorage save error:', e);
      }
      return { id: appointmentId, payment_status: status };
    }
    throw error;
  }
  return data;
};

// ── Reviews & Notifications ──────────────────────────────────────────────────

export const dbGetDoctorReviews = async (doctorId) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('doctor_id', doctorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const dbAddNotification = async (toUserId, message, type = 'info') => {
  const { error } = await supabase
    .from('notifications')
    .insert([{ to_user_id: toUserId, message, type, read: false }]);

  if (error) throw error;
};
