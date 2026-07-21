import { findClosestMatch } from './imageMatcher';

// ── Mock Database via localStorage ──────────────────────────────────────────

const get = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const set = (key, value) => localStorage.setItem(key, JSON.stringify(value));

// ── OTP Store ────────────────────────────────────────────────────────────────
export const saveOTP = (email, otp) => {
  const otps = get('otps').filter(o => o.email !== email);
  otps.push({ email, otp, createdAt: Date.now() });
  set('otps', otps);
};

export const getLatestOTP = (email) => {
  const otps = get('otps');
  const userOtps = otps.filter(o => o.email === email);
  if (userOtps.length === 0) return null;
  return userOtps[userOtps.length - 1].otp;
};

export const verifyOTP = (email, otp) => {
  const otps = get('otps');
  const record = otps.find(o => o.email === email && o.otp === otp);
  if (!record) return false;
  const isExpired = Date.now() - record.createdAt > 10 * 60 * 1000; // 10 min
  return !isExpired;
};

export const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── Users ────────────────────────────────────────────────────────────────────
export const getUsers = () => get('users');

export const getUserByEmail = (email) =>
  get('users').find(u => u.email === email.toLowerCase());

export const createUser = (email, role) => {
  const users = get('users');
  const existing = users.find(u => u.email === email.toLowerCase());
  if (existing) return existing;
  const user = {
    id: Date.now().toString(),
    email: email.toLowerCase(),
    role,
    passwordHash: null,
    profileComplete: false,
    credentialVerified: role === 'patient', // patients don't need credential verification
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  set('users', users);
  return user;
};

export const setUserPassword = (email, password) => {
  const users = get('users');
  const idx = users.findIndex(u => u.email === email.toLowerCase());
  if (idx === -1) return false;
  users[idx].passwordHash = btoa(password); // base64 (not real hash, demo only)
  set('users', users);
  return true;
};

export const verifyPassword = (email, password) => {
  const user = getUserByEmail(email);
  if (!user || !user.passwordHash) return false;
  return user.passwordHash === btoa(password);
};

export const markProfileComplete = (email) => {
  const users = get('users');
  const idx = users.findIndex(u => u.email === email.toLowerCase());
  if (idx === -1) return;
  users[idx].profileComplete = true;
  set('users', users);
};

export const verifyDoctorCredential = (email) => {
  const users = get('users');
  const idx = users.findIndex(u => u.email === email.toLowerCase());
  if (idx === -1) return;
  users[idx].credentialVerified = true;
  set('users', users);
};

// ── Patient Profiles ─────────────────────────────────────────────────────────
export const savePatientProfile = (userId, data) => {
  const profiles = get('patientProfiles').filter(p => p.userId !== userId);
  profiles.push({ userId, ...data, updatedAt: new Date().toISOString() });
  set('patientProfiles', profiles);
};

export const getPatientProfile = (userId) =>
  get('patientProfiles').find(p => p.userId === userId);

// ── Doctor Profiles ──────────────────────────────────────────────────────────
export const saveDoctorProfile = (userId, data) => {
  const profiles = get('doctorProfiles').filter(p => p.userId !== userId);
  profiles.push({ userId, ...data, updatedAt: new Date().toISOString() });
  set('doctorProfiles', profiles);
};

export const getDoctorProfile = (userId) =>
  get('doctorProfiles').find(p => p.userId === userId);

export const getAllDoctors = () => {
  const doctors = get('users').filter(u => u.role === 'doctor' && u.profileComplete && u.credentialVerified);
  return doctors.map(d => {
    const profile = getDoctorProfile(d.id);
    const reviews = get('reviews').filter(r => r.doctorId === d.id);
    const avgRating = reviews.length ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : 0;
    return {
      ...d,
      profile,
      reviews,
      avgRating: parseFloat(avgRating),
      reviewCount: reviews.length
    };
  }).filter(d => d.profile);
};

export const deleteDoctorAccount = (userId) => {
  const users = get('users');
  set('users', users.filter(u => u.id !== userId));

  const profiles = get('doctorProfiles');
  set('doctorProfiles', profiles.filter(p => p.userId !== userId));

  const appointments = get('appointments');
  set('appointments', appointments.filter(a => a.doctorId !== userId));

  const notifications = get('notifications');
  set('notifications', notifications.filter(n => n.toUserId !== userId));
};

// ── Scans / Analysis ─────────────────────────────────────────────────────────
export const saveScan = (patientId, scanData) => {
  const scans = get('scans');
  const scan = {
    scanId: Date.now().toString(),
    patientId,
    ...scanData,
    createdAt: new Date().toISOString(),
  };
  scans.push(scan);
  set('scans', scans);
  return scan;
};

export const getPatientScans = (patientId) =>
  get('scans').filter(s => s.patientId === patientId);

export const getLatestScan = (patientId) => {
  const scans = getPatientScans(patientId);
  return scans[scans.length - 1] || null;
};

// ── Appointments ─────────────────────────────────────────────────────────────
export const createAppointment = (patientId, doctorId) => {
  const appointments = get('appointments');
  const appt = {
    id: Date.now().toString(),
    patientId,
    doctorId,
    status: 'pending',
    scheduledTime: null,
    createdAt: new Date().toISOString(),
  };
  appointments.push(appt);
  set('appointments', appointments);
  return appt;
};

export const getDoctorAppointments = (doctorId) =>
  get('appointments').filter(a => a.doctorId === doctorId);

export const getPatientAppointments = (patientId) =>
  get('appointments').filter(a => a.patientId === patientId);

export const scheduleAppointment = (appointmentId, scheduledTime) => {
  const appointments = get('appointments');
  const idx = appointments.findIndex(a => a.id === appointmentId);
  if (idx === -1) return;
  appointments[idx].status = 'scheduled';
  appointments[idx].scheduledTime = scheduledTime;
  set('appointments', appointments);
  return appointments[idx];
};

export const completeAppointment = (appointmentId) => {
  const appointments = get('appointments');
  const idx = appointments.findIndex(a => a.id === appointmentId);
  if (idx === -1) return;
  appointments[idx].status = 'completed';
  set('appointments', appointments);
  return appointments[idx];
};

// ── Reviews ──────────────────────────────────────────────────────────────────
export const saveReview = (patientId, doctorId, appointmentId, rating, text) => {
  const reviews = get('reviews');
  // Only one review per appointment
  if (reviews.find(r => r.appointmentId === appointmentId)) return false;
  
  const review = {
    id: Date.now().toString(),
    patientId,
    doctorId,
    appointmentId,
    rating,
    text,
    createdAt: new Date().toISOString()
  };
  reviews.push(review);
  set('reviews', reviews);
  return review;
};

export const getDoctorReviews = (doctorId) =>
  get('reviews').filter(r => r.doctorId === doctorId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

// ── Notifications ─────────────────────────────────────────────────────────────
export const addNotification = (toUserId, message, type = 'info') => {
  const notifs = get('notifications');
  notifs.push({
    id: Date.now().toString(),
    toUserId,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
  });
  set('notifications', notifs);
};

export const getUserNotifications = (userId) =>
  get('notifications')
    .filter(n => n.toUserId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

export const markNotificationRead = (notifId) => {
  const notifs = get('notifications');
  const idx = notifs.findIndex(n => n.id === notifId);
  if (idx !== -1) notifs[idx].read = true;
  set('notifications', notifs);
};

export const getUnreadCount = (userId) =>
  get('notifications').filter(n => n.toUserId === userId && !n.read).length;

// ── Session ──────────────────────────────────────────────────────────────────
export const saveSession = (user) =>
  sessionStorage.setItem('currentUser', JSON.stringify(user));

export const getSession = () => {
  const s = sessionStorage.getItem('currentUser');
  return s ? JSON.parse(s) : null;
};

export const clearSession = () => sessionStorage.removeItem('currentUser');

// ── AI Analysis (Simulated + Dataset Matching) ───────────────────────────────────
export const analyzeTeethImages = async (leftImg, frontImg, rightImg) => {
  // Simulate AI processing delay
  await new Promise(r => setTimeout(r, 1000));

  // 1. Only reject truly blank/solid images; do NOT reject real dental photos
  //    that happen to not match our small reference dataset.
  for (const file of [frontImg, leftImg, rightImg]) {
    if (file) {
      const result = await findClosestMatch(file, 0.70);
      if (result && result.status === 'BLANK') {
        throw new Error('One of your uploaded images is blank. Please upload a clear photo of your teeth.');
      }
    }
  }

  // 2. Try to match the uploaded images against our 100-image dataset (threshold similarity = 0.70)
  try {
    for (const file of [frontImg, leftImg, rightImg]) {
      if (file) {
        const result = await findClosestMatch(file, 0.70);
        if (result && result.status === 'MATCH') {
          const match = result.match;
          console.log(`Matched image: ${match.filename} (Similarity: ${(match.similarity * 100).toFixed(1)}%)`);
          return {
            severity: match.severity,
            score: match.score || 50,
            conditions: [match.condition],
            suggestions: match.suggestions,
            needsDoctor: match.severity !== 'minor',
            matchedImage: match.filename,
            similarity: match.similarity
          };
        }
      }
    }
  } catch (error) {
    console.error('Failed to run dataset image matching:', error);
  }

  // 2. Fallback to pseudo-random simulation if no match was found
  const seed = (leftImg.size + frontImg.size + rightImg.size) % 100;

  if (seed < 33) {
    // MINOR SEVERITY ISSUES
    const minorIssues = [
      {
        condition: 'Archwire-related: Poking wire',
        feature: 'Cheek ulcer caused by wire migration',
        suggestion: 'Apply orthodontic wax; wire needs trimming'
      },
      {
        condition: 'Soft tissue injuries: Cheek/lip ulcer',
        feature: 'Painful sores from appliance rubbing',
        suggestion: 'Apply orthodontic wax to the rubbing appliance'
      },
      {
        condition: 'Ligature-related: Lost elastic ligature',
        feature: 'Bracket disengaged due to mastication',
        suggestion: 'Requires ligature replacement'
      },
      {
        condition: 'Removable appliance: Excessive salivation',
        feature: 'Drooling from initial adaptation',
        suggestion: 'Reassurance; this is normal during initial adaptation'
      }
    ];
    const issue = minorIssues[seed % minorIssues.length];
    
    return {
      severity: 'minor',
      score: Math.floor(10 + Math.random() * 20),
      conditions: [issue.condition, issue.feature],
      suggestions: [
        issue.suggestion,
        'Maintain regular brushing and flossing routines',
        'Use interdental brushes'
      ],
      needsDoctor: false,
    };
  } else if (seed < 66) {
    // MODERATE SEVERITY ISSUES
    const moderateIssues = [
      {
        condition: 'Bracket-related: Complete debond',
        feature: 'Missing bracket from bond failure or hard food',
        suggestion: 'Schedule an appointment for rebonding'
      },
      {
        condition: 'Periodontal issues: Gingival inflammation',
        feature: 'Bleeding gums due to poor hygiene',
        suggestion: 'Strict hygiene reinforcement needed'
      },
      {
        condition: 'Pain-related: Excessive force pain',
        feature: 'Severe pain from overactivation',
        suggestion: 'Take OTC analgesics; consult doctor if pain persists'
      },
      {
        condition: 'Twin Block specific: Dislodged bite block',
        feature: 'Jaw pain or occlusal interference',
        suggestion: 'Needs rebuilding of blocks; schedule adjustment'
      },
      {
        condition: 'Caries/enamel: White spot lesions',
        feature: 'Chalky spots from plaque accumulation',
        suggestion: 'Requires remineralization treatment'
      }
    ];
    const issue = moderateIssues[seed % moderateIssues.length];

    return {
      severity: 'moderate',
      score: Math.floor(40 + Math.random() * 30),
      conditions: [issue.condition, issue.feature],
      suggestions: [
        issue.suggestion,
        'Consult your orthodontist within the next 2-4 weeks',
        'Avoid hard, sticky, or chewy foods'
      ],
      needsDoctor: true,
    };
  } else {
    // MAJOR/SEVERE SEVERITY ISSUES
    const majorIssues = [
      {
        condition: 'Trauma-related: Appliance injury',
        feature: 'Bleeding or fracture from fall/impact',
        suggestion: 'Immediate emergency care required'
      },
      {
        condition: 'Fixed appliance: Breakage of telescopic rod',
        feature: 'Sudden pain and loss of advancement',
        suggestion: 'Immediate repair required'
      },
      {
        condition: 'TMJ discomfort',
        feature: 'Joint pain due to improper advancement',
        suggestion: 'Reduce advancement and schedule emergency visit'
      },
      {
        condition: 'Ingestion / aspiration: Swallowed component',
        feature: 'GI symptoms from accidental ingestion',
        suggestion: 'Immediate medical referral required'
      }
    ];
    const issue = majorIssues[seed % majorIssues.length];

    return {
      severity: 'severe',
      score: Math.floor(75 + Math.random() * 20),
      conditions: [
        issue.condition,
        issue.feature,
        'Potentially compromising treatment progress or health'
      ],
      suggestions: [
        issue.suggestion,
        'Immediate consultation with your orthodontist is strongly recommended',
        'Do not attempt to fix or adjust the appliance yourself'
      ],
      needsDoctor: true,
    };
  }
};
