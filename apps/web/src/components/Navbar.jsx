import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Stethoscope, Bell, LogOut, User, Download } from 'lucide-react';

const Navbar = () => {
  const { user, logout, unreadCount } = useAuth();
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`User response to PWA install: ${outcome}`);
    setInstallPrompt(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="glass-nav">
      <Link to="/" className="flex-center" style={{ gap: '0.5rem', color: 'white' }}>
        <div style={{
          borderRadius: '50%',
          display: 'flex',
          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
          width: '45px',
          height: '45px',
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img src="/logo.png?v=3" alt="Ortho Care AI" style={{ height: '100%', width: '100%', objectFit: 'contain' }} />
        </div>
        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>
          Ortho Care <span style={{ color: '#FF4D4D' }}>AI</span>
        </span>
      </Link>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {installPrompt && (
          <button 
            onClick={handleInstallClick} 
            className="btn btn-primary" 
            style={{ 
              background: 'linear-gradient(135deg, #10B981, #059669)',
              borderColor: 'transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 1rem',
              fontSize: '0.85rem'
            }}
          >
            <Download size={14} />
            Download App
          </button>
        )}
        {!user ? (
          <>
            <Link to="/doctor" className="btn btn-secondary">For Doctors</Link>
            <Link to="/auth/login/patient" className="btn btn-primary">Patient Login</Link>
          </>
        ) : (
          <>
            {user.role === 'doctor' && user.profileComplete && (
              <div style={{ position: 'relative', cursor: 'pointer', marginRight: '1rem' }}>
                <Bell size={20} color="var(--text-main)" />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-5px', right: '-5px',
                    background: 'var(--danger)', color: 'white',
                    fontSize: '0.7rem', padding: '0.1rem 0.3rem',
                    borderRadius: '10px', fontWeight: 'bold'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </div>
            )}
            
            <div className="flex-center" style={{ gap: '1rem' }}>
              <Link to={`/${user.role}/profile`} className="flex-center hover-scale" style={{ gap: '0.75rem', textDecoration: 'none', cursor: 'pointer' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  {user.profile_photo_url ? (
                    <img src={user.profile_photo_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={16} color="white" />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2' }}>
                  <span className="hide-on-mobile" style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white' }}>
                    {user.name || user.email.split('@')[0]}
                  </span>
                  <span className="hide-on-mobile" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>
                    {user.role}
                  </span>
                </div>
              </Link>
              <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                <LogOut size={16} />
                <span className="hide-on-mobile">Logout</span>
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
