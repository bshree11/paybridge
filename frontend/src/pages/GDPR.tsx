import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  Download,
  Trash2,
  Shield,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

export default function GDPR() {
  const { logout } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleExport() {
    setError('');
    setExporting(true);

    try {
      const res = await api.get('/gdpr/export');

      // Download as JSON file
      const blob = new Blob([JSON.stringify(res.data.data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `paybridge-data-export-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      setSuccess('Data exported successfully! Check your downloads.');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to export data');
    } finally {
      setExporting(false);
    }
  }

  async function handleDelete() {
    if (deleteConfirmText !== 'DELETE MY ACCOUNT') return;

    setError('');
    setDeleting(true);

    try {
      await api.delete('/gdpr/account');
      // Account deleted — log out
      setTimeout(() => logout(), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete account');
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Shield size={24} /> Data Privacy
        </h1>
        <p className="text-gray-500 mt-1">Manage your personal data under GDPR</p>
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

      {/* Export Data */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <Download size={24} className="text-blue-500 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800">Export Your Data</h3>
            <p className="text-sm text-gray-500 mt-1">
              Download a copy of all your personal data including transactions,
              KYC records, and account information. This is your right under GDPR Article 20.
            </p>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="mt-4 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              <Download size={16} />
              {exporting ? 'Exporting...' : 'Download My Data'}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Account */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <div className="flex items-start gap-4">
          <Trash2 size={24} className="text-red-500 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">Delete Account</h3>
            <p className="text-sm text-gray-500 mt-1">
              Permanently anonymize your account. Your personal data will be removed,
              but transaction records are kept for regulatory compliance (FCA 5-year retention).
              This action cannot be undone.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="mt-4 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Trash2 size={16} />
                Delete My Account
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="bg-red-50 rounded-lg p-3">
                  <p className="text-sm text-red-700 font-medium">
                    Type "DELETE MY ACCOUNT" to confirm:
                  </p>
                </div>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  className="w-full px-4 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
                  placeholder="DELETE MY ACCOUNT"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteConfirmText !== 'DELETE MY ACCOUNT' || deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Your Rights */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-800 mb-3">Your Rights Under GDPR</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• Right to access — you can export all your data at any time</p>
          <p>• Right to erasure — you can delete your account and personal data</p>
          <p>• Right to rectification — contact support to correct inaccurate data</p>
          <p>• Right to portability — your data export is in a standard JSON format</p>
          <p>• Right to withdraw consent — update your preferences in Settings</p>
        </div>
      </div>
    </div>
  );
}