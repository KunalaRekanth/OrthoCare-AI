import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyOTP from './pages/auth/VerifyOTP';
import SetPassword from './pages/auth/SetPassword';

// Patient Pages
import PatientLanding from './pages/patient/Landing';
import PatientProfile from './pages/patient/Profile';
import PatientHome from './pages/patient/Home';
import PatientScan from './pages/patient/Scan';
import PatientResults from './pages/patient/Results';
import DoctorsList from './pages/patient/Doctors';

// Doctor Pages
import DoctorLanding from './pages/doctor/Landing';
import VerifyCredentials from './pages/doctor/VerifyCredentials';
import DoctorProfile from './pages/doctor/Profile';
import DoctorDashboard from './pages/doctor/Dashboard';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, loading } = useAuth();

  // Wait for session to restore before making any redirect decisions
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--glass-border)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );

  if (!user) return <Navigate to="/" />;
  if (allowedRole && user.role !== allowedRole) return <Navigate to="/" />;
  
  if (!user.credential_verified && user.role === 'doctor') {
      return <Navigate to="/doctor/verify-credentials" />;
  }
  
  if (!user.profile_complete) {
    return <Navigate to={`/${user.role}/profile`} />;
  }

  return children;
};

const ProfileRoute = ({ children }) => {
    const { user, loading } = useAuth();

    // Wait for session to restore before making any redirect decisions
    if (loading) return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 80px)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid var(--glass-border)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );

    if (!user) return <Navigate to="/" />;
    return children;
}

function App() {
  return (
    <Router>
      <Navbar />
      <div className="container" style={{ paddingTop: '2rem' }}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PatientLanding />} />
          <Route path="/doctor" element={<DoctorLanding />} />

          {/* Auth Routes */}
          <Route path="/auth/login/:role" element={<Login />} />
          <Route path="/auth/register/:role" element={<Register />} />
          <Route path="/auth/verify/:role" element={<VerifyOTP />} />
          <Route path="/auth/set-password/:role" element={<SetPassword />} />

          {/* Doctor Verification (before profile) */}
          <Route path="/doctor/verify-credentials" element={
              <ProfileRoute><VerifyCredentials /></ProfileRoute>
          } />

          {/* Profile Routes (need auth, but profile might not be complete yet) */}
          <Route path="/patient/profile" element={
            <ProfileRoute><PatientProfile /></ProfileRoute>
          } />
          <Route path="/doctor/profile" element={
            <ProfileRoute><DoctorProfile /></ProfileRoute>
          } />

          {/* Patient Protected Routes */}
          <Route path="/patient/home" element={
            <ProtectedRoute allowedRole="patient"><PatientHome /></ProtectedRoute>
          } />
          <Route path="/patient/scan" element={
            <ProtectedRoute allowedRole="patient"><PatientScan /></ProtectedRoute>
          } />
          <Route path="/patient/results" element={
            <ProtectedRoute allowedRole="patient"><PatientResults /></ProtectedRoute>
          } />
          <Route path="/patient/doctors" element={
            <ProtectedRoute allowedRole="patient"><DoctorsList /></ProtectedRoute>
          } />

          {/* Doctor Protected Routes */}
          <Route path="/doctor/dashboard" element={
            <ProtectedRoute allowedRole="doctor"><DoctorDashboard /></ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
