import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Settings as SettingsIcon,
  Shield,
  CheckCircle,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';

export default function Settings() {
  const { user, setUser } = useAuth();
  const [loading2FA, setLoading2FA] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Consent state
  const [marketing, setMarketing] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [savingConsent, setSavingConsent] = useState(false);

  async function handleEnable2FA() {
    setError('');
    setLoading2FA(true);

    try {
      const res = await api.post('/auth/2fa/setup');
      setQrCode(res.data.qrCode || res.data.qr);
      setShow2FASetup(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to setup 2FA');
    } finally {
      setLoading2FA(false);
    }
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading2FA(true);

    try {
      await api.post('/auth/2fa/verify', { code: verifyCode });
      setSuccess('2FA enabled successfully!');
      setShow2FASetup(false);
      setQrCode('');
      setVerifyCode('');

      // Update user state
      if (user) {
        setUser({ ...user, twoFactorEnabled: true });
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setLoading2FA(false);
    }
  }

  async function handleDisable2FA() {
    setError('');
    setLoading2FA(true);

    try {
      await api.post('/auth/2fa/disable');
      setSuccess('2FA disabled');

      if (user) {
        setUser({ ...user, twoFactorEnabled: false });
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setLoading2FA(false);
    }
  }

  async function handleSaveConsent() {
    setError('');
    setSavingConsent(true);

    try {
      await api.patch('/gdpr/consent', {
        dataProcessing: true,
        marketing,
        analytics,
      });
      setSuccess('Consent preferences updated');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update preferences');
    } finally {
      setSavingConsent(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <SettingsIcon size={24} /> Settings
        </h1>
        <p className="text-gray-500 mt-1">Manage your account security and preferences</p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={16} /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* 2FA Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <Smartphone size={24} className="text-blue-500 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-500 mt-1">
              Add an extra layer of security to your account using an authenticator app.
            </p>

            <div className="mt-4">
              {user?.twoFactorEnabled ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-lg text-sm">
                    <CheckCircle size={16} />
                    <span className="font-medium">2FA is enabled</span>
                  </div>
                  <button
                    onClick={handleDisable2FA}
                    disabled={loading2FA}
                    className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {loading2FA ? 'Disabling...' : 'Disable 2FA'}
                  </button>
                </div>
              ) : !show2FASetup ? (
                <button
                  onClick={handleEnable2FA}
                  disabled={loading2FA}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Shield size={16} />
                  {loading2FA ? 'Setting up...' : 'Enable 2FA'}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-3">
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, etc):
                    </p>
                    {qrCode && (
                      <img
                        src={qrCode}
                        alt="2FA QR Code"
                        className="mx-auto w-48 h-48 border border-gray-200 rounded-lg"
                      />
                    )}
                  </div>

                  <form onSubmit={handleVerify2FA} className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enter the 6-digit code from your app
                      </label>
                      <input
                        type="text"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center tracking-widest text-lg"
                        placeholder="000000"
                        maxLength={6}
                        required
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShow2FASetup(false);
                          setQrCode('');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={loading2FA}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {loading2FA ? 'Verifying...' : 'Verify & Enable'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Consent Preferences */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <Shield size={24} className="text-blue-500 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800">Consent Preferences</h3>
            <p className="text-sm text-gray-500 mt-1">
              Control how we use your data. You can change these at any time.
            </p>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Data Processing</p>
                  <p className="text-xs text-gray-500">Required for service operation</p>
                </div>
                <div className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                  Required
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Marketing Communications</p>
                  <p className="text-xs text-gray-500">Product updates and promotions</p>
                </div>
                <button
                  onClick={() => setMarketing(!marketing)}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    marketing ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${
                    marketing ? 'translate-x-4' : ''
                  }`} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Analytics</p>
                  <p className="text-xs text-gray-500">Help us improve the product</p>
                </div>
                <button
                  onClick={() => setAnalytics(!analytics)}
                  className={`w-10 h-6 rounded-full transition-colors ${
                    analytics ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${
                    analytics ? 'translate-x-4' : ''
                  }`} />
                </button>
              </div>

              <button
                onClick={handleSaveConsent}
                disabled={savingConsent}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
              >
                {savingConsent ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-3">Account Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-800">{user?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Role</span>
            <span className="text-gray-800 capitalize">{user?.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">KYC Status</span>
            <span className="text-gray-800 capitalize">{user?.kycStatus}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">2FA</span>
            <span className={user?.twoFactorEnabled ? 'text-green-600' : 'text-red-600'}>
              {user?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}