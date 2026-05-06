import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  FileText,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface KYCRecord {
  id: string;
  document_type: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
}

export default function KYC() {
  const { user, setUser } = useAuth();
  const [records, setRecords] = useState<KYCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [documentType, setDocumentType] = useState('passport');
  const [documentNumber, setDocumentNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    loadKYCRecords();
  }, []);

  async function loadKYCRecords() {
    try {
      const res = await api.get('/kyc/status');
      setRecords(res.data.data || []);
    } catch {
      // No records yet — that's fine
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await api.post('/kyc/submit', {
        documentType,
        documentNumber,
        fullName,
        dateOfBirth,
        address,
      });

      setSuccess('KYC documents submitted successfully! Review typically takes 1-2 business days.');

      // Clear form
      setDocumentNumber('');
      setFullName('');
      setDateOfBirth('');
      setAddress('');

      // Reload records
      await loadKYCRecords();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit KYC documents');
    } finally {
      setSubmitting(false);
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'verified':
      case 'approved':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'pending':
        return <Clock size={20} className="text-yellow-500" />;
      case 'rejected':
        return <XCircle size={20} className="text-red-500" />;
      default:
        return <AlertTriangle size={20} className="text-gray-500" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'verified':
      case 'approved':
        return 'bg-green-50 text-green-700';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700';
      case 'rejected':
        return 'bg-red-50 text-red-700';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Current Status */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">KYC Verification</h2>
            <p className="text-sm text-gray-500 mt-1">
              Verify your identity to start making payments
            </p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${getStatusColor(user?.kycStatus || 'unverified')}`}>
            {getStatusIcon(user?.kycStatus || 'unverified')}
            <span className="capitalize">{user?.kycStatus || 'Unverified'}</span>
          </div>
        </div>
      </div>

      {/* Already verified */}
      {user?.kycStatus === 'verified' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800">Identity Verified</h3>
              <p className="text-sm text-green-600 mt-1">
                Your identity has been verified. You can make payments and use all features.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Form — only show if not verified */}
      {user?.kycStatus !== 'verified' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Submit Documents</h3>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 text-sm px-4 py-3 rounded-lg mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Type
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="passport">Passport</option>
                <option value="driving_licence">Driving Licence</option>
                <option value="national_id">National ID Card</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Document Number
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g. 123456789"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name (as on document)
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="John Smith"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                rows={3}
                placeholder="123 Main Street, London, UK"
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Upload size={16} />
              {submitting ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </form>
        </div>
      )}

      {/* Previous Submissions */}
      {records.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-800">Submission History</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {records.map((record) => (
              <div key={record.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 capitalize">
                      {record.document_type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500">
                      Submitted {new Date(record.submitted_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(record.status)}`}>
                  {record.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}