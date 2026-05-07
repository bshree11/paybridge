import { useState, useEffect } from 'react';
import api from '../api/client';
import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface KYCItem {
  id: string;
  user_id: number;
  document_type: string;
  status: string;
  submitted_at: string;
}

interface SARItem {
  id: string;
  referenceNumber: string;
  userId: string;
  status: string;
  reason: string;
  priority: string;
  fraudScore: number;
  createdAt: string;
  notes: any[];
}

type Tab = 'kyc' | 'sar';

export default function Compliance() {
  const [activeTab, setActiveTab] = useState<Tab>('kyc');

  // KYC state
  const [kycQueue, setKycQueue] = useState<KYCItem[]>([]);
  const [kycLoading, setKycLoading] = useState(true);

  // SAR state
  const [sars, setSars] = useState<SARItem[]>([]);
  const [sarLoading, setSarLoading] = useState(true);
  const [expandedSar, setExpandedSar] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadKYCQueue();
    loadSARs();
  }, []);

  async function loadKYCQueue() {
    try {
      const res = await api.get('/compliance/kyc/queue');
      setKycQueue(res.data.data || res.data || []);
    } catch {
      setKycQueue([]);
    } finally {
      setKycLoading(false);
    }
  }

  async function loadSARs() {
    try {
      const res = await api.get('/sar');
      setSars(res.data.data || []);
    } catch {
      setSars([]);
    } finally {
      setSarLoading(false);
    }
  }

  async function handleKYCAction(kycId: string, action: 'approve' | 'reject') {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/compliance/kyc/${kycId}/${action}`);
      setSuccess(`KYC ${action}d successfully`);
      await loadKYCQueue();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${action} KYC`);
    }
  }

  async function handleSARStatus(sarId: string, status: string) {
    setError('');
    try {
      await api.patch(`/sar/${sarId}/status`, { status });
      setSuccess(`SAR status updated to ${status}`);
      await loadSARs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update SAR');
    }
  }

  async function handleAddNote(sarId: string) {
    if (!noteText.trim()) return;
    setError('');
    try {
      await api.post(`/sar/${sarId}/notes`, { note: noteText });
      setNoteText('');
      setSuccess('Note added');
      await loadSARs();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add note');
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-700';
      case 'HIGH': return 'bg-orange-100 text-orange-700';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-700';
      case 'LOW': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  function getSARStatusColor(status: string) {
    switch (status) {
      case 'OPEN': return 'bg-red-50 text-red-700';
      case 'UNDER_REVIEW': return 'bg-yellow-50 text-yellow-700';
      case 'ESCALATED': return 'bg-orange-50 text-orange-700';
      case 'RESOLVED': return 'bg-green-50 text-green-700';
      case 'FILED': return 'bg-blue-50 text-blue-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Shield size={24} /> Compliance Dashboard
        </h1>
        <p className="text-gray-500 mt-1">Manage KYC verifications and suspicious activity reports</p>
      </div>

      {/* Success / Error */}
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

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('kyc')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'kyc'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          KYC Queue ({kycQueue.length})
        </button>
        <button
          onClick={() => setActiveTab('sar')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'sar'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          SAR Reports ({sars.length})
        </button>
      </div>

      {/* KYC Tab */}
      {activeTab === 'kyc' && (
        <div className="bg-white rounded-xl border border-gray-200">
          {kycLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : kycQueue.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle size={40} className="mx-auto text-green-300 mb-3" />
              <p className="text-gray-500">No pending KYC verifications</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {kycQueue.map((item) => (
                <div key={item.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        User #{item.user_id}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {item.document_type.replace('_', ' ')} • Submitted{' '}
                        {new Date(item.submitted_at).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleKYCAction(item.id, 'approve')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                      <CheckCircle size={14} /> Approve
                    </button>
                    <button
                      onClick={() => handleKYCAction(item.id, 'reject')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SAR Tab */}
      {activeTab === 'sar' && (
        <div className="space-y-3">
          {sarLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : sars.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center">
              <Shield size={40} className="mx-auto text-green-300 mb-3" />
              <p className="text-gray-500">No suspicious activity reports</p>
            </div>
          ) : (
            sars.map((sar) => (
              <div key={sar.id} className="bg-white rounded-xl border border-gray-200">
                {/* SAR Header */}
                <div
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedSar(expandedSar === sar.id ? null : sar.id)}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle size={18} className="text-orange-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {sar.referenceNumber}
                      </p>
                      <p className="text-xs text-gray-500">
                        Score: {sar.fraudScore}/100 • User #{sar.userId}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(sar.priority)}`}>
                      {sar.priority}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSARStatusColor(sar.status)}`}>
                      {sar.status.replace('_', ' ')}
                    </span>
                    {expandedSar === sar.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* SAR Details (expandable) */}
                {expandedSar === sar.id && (
                  <div className="px-6 pb-4 border-t border-gray-100 pt-4 space-y-4">
                    {/* Reason */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Reason</p>
                      <p className="text-sm text-gray-700">{sar.reason}</p>
                    </div>

                    {/* Status Actions */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Update Status</p>
                      <div className="flex flex-wrap gap-2">
                        {['UNDER_REVIEW', 'ESCALATED', 'RESOLVED', 'FILED'].map((status) => (
                          <button
                            key={status}
                            onClick={() => handleSARStatus(sar.id, status)}
                            disabled={sar.status === status}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              sar.status === status
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {status.replace('_', ' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                        Notes ({sar.notes?.length || 0})
                      </p>
                      {sar.notes?.length > 0 && (
                        <div className="space-y-2 mb-3">
                          {sar.notes.map((note: any, i: number) => (
                            <div key={i} className="bg-gray-50 rounded-lg p-3">
                              <p className="text-sm text-gray-700">{note.note}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {note.by} • {new Date(note.at).toLocaleString('en-GB')}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Note */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="Add investigation note..."
                        />
                        <button
                          onClick={() => handleAddNote(sar.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}