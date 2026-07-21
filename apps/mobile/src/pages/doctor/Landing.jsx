import { Link } from 'react-router-dom';
import { Users, CalendarCheck, Shield } from 'lucide-react';

const Landing = () => {
  return (
    <div className="animate-fade-in">
      <div style={{ textAlign: 'center', margin: '4rem 0' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', fontFamily: 'Outfit' }}>
          Ortho Care AI <span style={{ color: 'var(--secondary)' }}>Doctor Portal</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
          Expand your practice and connect with patients who need your expertise. 
          Our AI preliminary analysis helps you focus on what matters most: patient care.
        </p>
        <div className="flex-center" style={{ gap: '1.5rem' }}>
          <Link to="/auth/register/doctor" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, var(--secondary), #34D399)' }}>
            Join as a Doctor
          </Link>
          <Link to="/auth/login/doctor" className="btn btn-secondary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
            Doctor Login
          </Link>
        </div>
      </div>

      <div className="grid-3" style={{ marginTop: '5rem' }}>
        <div className="card text-center flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '50%' }}>
            <Users size={32} color="var(--secondary)" />
          </div>
          <h3>Patient Acquisition</h3>
          <p>Connect with local patients actively seeking orthodontic treatments and consultations.</p>
        </div>
        
        <div className="card text-center flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '1rem', borderRadius: '50%' }}>
            <CalendarCheck size={32} color="var(--primary)" />
          </div>
          <h3>Streamlined Booking</h3>
          <p>Receive appointment requests directly with patient AI scan summaries pre-attached.</p>
        </div>

        <div className="card text-center flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '50%' }}>
            <Shield size={32} color="var(--warning)" />
          </div>
          <h3>Verified Network</h3>
          <p>Join an exclusive network of verified professionals maintaining the highest standards of care.</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
