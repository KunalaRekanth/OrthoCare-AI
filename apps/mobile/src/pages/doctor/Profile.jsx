import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dbSaveDoctorProfile, dbGetDoctorProfile, dbUploadProfilePhoto, dbUploadPaymentQr } from '../../utils/supabaseService';
import { User, Phone, MapPin, Building, Edit2, AlertTriangle, Trash2, Camera, Loader, X, Check, CheckCircle, DollarSign, CreditCard, QrCode, Upload } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { getCroppedImgFile } from '../../utils/cropImage';



const Profile = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState('');
  const [consultationFee, setConsultationFee] = useState(500);
  const [upiId, setUpiId] = useState('');
  const [paymentQrUrl, setPaymentQrUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isQrUploading, setIsQrUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cropper state
  const [imageToCrop, setImageToCrop] = useState(null);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (user && !isSaving) {
        if (user.profile_complete) {
          setIsEditing(false);
          try {
            const profile = await dbGetDoctorProfile(user.id);
            if (profile) {
              setName(profile.name || '');
              setPhone(profile.phone || '');
              setHospitalName(profile.hospitalName || '');
              setAddress(profile.address || '');
              setLatitude(profile.latitude);
              setLongitude(profile.longitude);
              setProfilePhotoUrl(profile.profilePhotoUrl || '');
              setConsultationFee(profile.consultationFee || 500);
              setUpiId(profile.upiId || '');
              setPaymentQrUrl(profile.payment_qr_url || profile.paymentQrUrl || '');
            }
          } catch (err) {
            console.error('Error loading doctor profile:', err);
          }
        } else {
          setIsEditing(true);
        }
      }
    };

    loadProfile();
  }, [user, isSaving]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    let currentLat = latitude;
    let currentLng = longitude;

    // Auto-geocode if address is present and coordinates are missing or changed
    if (address) {
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
        const data = await response.json();
        if (data && data.length > 0) {
          currentLat = parseFloat(data[0].lat);
          currentLng = parseFloat(data[0].lon);
          setLatitude(currentLat);
          setLongitude(currentLng);
        }
      } catch (err) {
        console.error('Auto-geocoding failed:', err);
      }
    }

    try {
      await dbSaveDoctorProfile(user.id, {
        name,
        phone,
        hospitalName,
        address,
        profilePhotoUrl,
        latitude: currentLat,
        longitude: currentLng,
        consultationFee,
        upiId,
        paymentQrUrl
      });

      // Update global user state with new details so Navbar/Dashboard reflect changes immediately
      login({
        ...user,
        name,
        hospital_name: hospitalName,
        profile_photo_url: profilePhotoUrl,
        profile_complete: true,
        latitude: currentLat,
        longitude: currentLng,
        consultationFee,
        upiId
      });

      if (!user.profile_complete) {
        navigate('/doctor/dashboard');
      } else {
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error saving doctor profile:', err);
      alert('Failed to save profile: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };


  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check file size
    if (file.size > 10 * 1024 * 1024) {
      alert('Photo is too large. Please select an image under 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageToCrop(reader.result);
      setShowCropper(true);
    });
    reader.readAsDataURL(file);

    // Reset input value so same file can be selected again
    e.target.value = '';
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    setShowCropper(false);
    setIsUploading(true);
    try {
      const croppedFile = await getCroppedImgFile(imageToCrop, croppedAreaPixels);
      const publicUrl = await dbUploadProfilePhoto(user.id, croppedFile);
      setProfilePhotoUrl(publicUrl);
      setIsUploading(false);
    } catch (err) {
      console.error('Error processing/uploading photo:', err);
      alert('Failed to process photo: ' + (err.message || 'Unknown error'));
      setIsUploading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setImageToCrop(null);
  };

  const handleQrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('QR image is too large. Please select an image under 5MB.');
      return;
    }
    setIsQrUploading(true);
    try {
      const url = await dbUploadPaymentQr(user.id, file);
      setPaymentQrUrl(url);
    } catch (err) {
      console.error('QR upload failed:', err);
      alert('Failed to upload QR: ' + (err.message || 'Unknown error'));
    } finally {
      setIsQrUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAccount = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="flex-center min-h-screen" style={{ minHeight: 'calc(100vh - 80px)', padding: '2rem 0' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>

        {showDeleteConfirm ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ display: 'inline-flex', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '1rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
              <AlertTriangle size={48} />
            </div>
            <h2 style={{ marginBottom: '1rem' }}>Delete Account?</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              This action cannot be undone. All your details, including your clinic address and scheduled appointments, will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)} style={{ flex: 1 }}>
                Cancel
              </button>
              <button className="btn" onClick={handleDeleteAccount} style={{ flex: 1, background: '#EF4444', color: 'white', border: 'none' }}>
                Yes, Delete
              </button>
            </div>
          </div>
        ) : !isEditing && user.profile_complete ? (
          <div>
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setIsEditing(true)}
                style={{
                  position: 'absolute',
                  top: '0',
                  right: '0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem'
                }}
              >
                <Edit2 size={16} /> Edit
              </button>

              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '4px solid var(--primary-light)',
                marginBottom: '1rem',
                background: 'var(--glass-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {profilePhotoUrl ? (
                  <img src={profilePhotoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={64} color="var(--text-muted)" />
                )}
              </div>
              <h2 style={{ margin: 0 }}>{name}</h2>
              <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>{hospitalName}</p>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '50%', color: 'var(--primary)' }}>
                  <User size={24} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Full Name</p>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{name}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '50%', color: 'var(--primary)' }}>
                  <Building size={24} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Clinic / Hospital</p>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{hospitalName}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '50%', color: 'var(--primary)' }}>
                  <Phone size={24} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Contact Phone</p>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{phone}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '50%', color: 'var(--primary)' }}>
                  <DollarSign size={24} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Consultation Fee</p>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>₹{consultationFee}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '50%', color: 'var(--primary)' }}>
                  <CreditCard size={24} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>UPI ID for Payments</p>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{upiId}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '50%', color: 'var(--primary)' }}>
                  <QrCode size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Custom Payment QR</p>
                  {paymentQrUrl ? (
                    <div style={{ marginTop: '0.5rem' }}>
                      <img src={paymentQrUrl} alt="Payment QR" style={{ width: '100px', height: '100px', borderRadius: '8px', border: '2px solid var(--primary-light)', objectFit: 'contain', background: '#fff', padding: '4px' }} />
                      <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--secondary)' }}>✓ Custom QR uploaded</p>
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-muted)' }}>Auto-generated (UPI-based)</p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '50%', color: 'var(--primary)' }}>
                  <MapPin size={24} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>Practice Address</p>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '500' }}>{address}</p>
                </div>
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => navigate('/doctor/dashboard')} style={{ width: '100%', marginTop: '1.5rem' }}>
              Return to Dashboard
            </button>

            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '0.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500' }}
              >
                <Trash2 size={16} /> Delete My Account
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ marginBottom: '0.5rem' }}>{user.profile_complete ? 'Update Profile' : 'Doctor Profile'}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
              {user.profile_complete ? 'Update your practice details below.' : 'Please complete your practice details. This information will be kept private until an appointment is booked.'}
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '4px solid var(--primary-light)',
                    background: 'var(--glass-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {isUploading ? (
                      <Loader className="animate-spin" size={32} />
                    ) : profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <User size={64} color="var(--text-muted)" />
                    )}
                  </div>
                  <label
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      background: 'var(--primary)',
                      color: 'white',
                      padding: '0.5rem',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <input type="file" onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
                    <Camera size={18} />
                  </label>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                  Add a professional profile photo
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Full Name (with Title)</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. Jane Smith"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Phone</label>
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
                <label className="form-label">Hospital / Clinic Name</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="City Orthodontics"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Consultation Fee (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  required
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  placeholder="500"
                  min="0"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Custom Payment QR Code (Optional)</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                  Upload your own UPI QR code image (PNG/JPG). This will be shown to patients when paying. If not uploaded, a QR is auto-generated from your UPI ID.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  {paymentQrUrl && (
                    <div style={{ position: 'relative' }}>
                      <img src={paymentQrUrl} alt="Payment QR Preview" style={{ width: '80px', height: '80px', borderRadius: '10px', border: '2px solid var(--primary-light)', objectFit: 'contain', background: '#fff', padding: '4px' }} />
                      <button
                        type="button"
                        onClick={() => setPaymentQrUrl('')}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#EF4444', border: 'none', borderRadius: '50%', color: 'white', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: '10px', cursor: isQrUploading ? 'wait' : 'pointer', color: 'var(--text)', fontSize: '0.85rem', fontWeight: '500', transition: 'all 0.2s' }}>
                    {isQrUploading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
                    {isQrUploading ? 'Uploading...' : (paymentQrUrl ? 'Replace QR' : 'Upload QR Image')}
                    <input type="file" accept="image/*" onChange={handleQrUpload} style={{ display: 'none' }} disabled={isQrUploading} />
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">UPI ID for Payments</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@bankname"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Practice Address</label>
                <textarea
                  className="form-input"
                  required
                  rows="3"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Medical Pl, Suite 100, City"
                ></textarea>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Best format: <strong>Street Name, City</strong> (e.g. Poonamallee High Rd, Chennai)
                </p>
                
                {latitude && longitude && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle size={12} /> Address coordinates saved for patient map.
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                {user.profile_complete && (
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)} style={{ flex: 1 }}>
                    Cancel
                  </button>
                )}
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={isSaving || isUploading}>
                  {isSaving ? 'Saving...' : (user.profile_complete ? 'Save Changes' : 'Save & Enter Dashboard')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Image Cropper Modal */}
      {showCropper && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="glass-panel animate-scale-in" style={{
            width: '100%',
            maxWidth: '500px',
            height: '500px',
            position: 'relative',
            padding: 0,
            overflow: 'hidden',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: '80px' }}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>

            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '80px',
              background: 'var(--glass-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 2rem',
              borderTop: '1px solid var(--border)'
            }}>
              <button
                className="btn btn-secondary"
                onClick={handleCropCancel}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <X size={18} /> Cancel
              </button>

              <div style={{ flex: 1, margin: '0 2rem' }}>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(e.target.value)}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

              <button
                className="btn btn-primary"
                onClick={handleCropSave}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Check size={18} /> Save
              </button>
            </div>
          </div>
          <p style={{ color: 'white', marginTop: '1.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
            Drag to reposition • Scroll or use slider to zoom
          </p>
        </div>
      )}
    </div>
  );
};

export default Profile;
