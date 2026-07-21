import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dbSavePatientProfile, dbGetPatientProfile } from '../../utils/supabaseService';

const Profile = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user && user.profile_complete) {
        try {
          const profile = await dbGetPatientProfile(user.id);
          if (profile) {
            setName(profile.full_name || '');
            setPhone(profile.phone || '');
            setAddress(profile.address || '');
          }
        } catch (err) {
          console.error('Error fetching profile:', err);
        }
      }
    };
    fetchProfile();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await dbSavePatientProfile(user.id, { 
        full_name: name, 
        phone: phone, 
        address: address 
      });
      
      // Update context user object
      login({ ...user, profile_complete: true });
      navigate('/patient/home');
    } catch (err) {
      alert('Error saving profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center min-h-screen" style={{ minHeight: 'calc(100vh - 80px)', padding: '2rem 0' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Complete Your Profile</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
          Please provide your details before proceeding.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input 
              type="tel" 
              className="form-input" 
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Home Address</label>
            <textarea 
              className="form-input" 
              required
              rows="3"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, Country"
            ></textarea>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
