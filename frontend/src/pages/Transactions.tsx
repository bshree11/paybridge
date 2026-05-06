import { useState, useEffect } from 'react';
import api from '../api/client';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  MessageSquare,
} from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  source_currency: string;
  target_currency: string;
  status: string;
  processor: string;
  fraud_score: number | null;
  created_at: string;
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filtered, setFiltered] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dispute modal state
  const [showDispute, setShowDispute] = useState(false);
  const [disputeTxId, setDisputeTxId] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeSuccess, setDisputeSuccess] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  // Apply filters whenever transactions, status filter, or search changes
  useEffect(() => {
    let result = [...transactions];

    if (statusFilter !== 'all') {
      result = result.filter((tx) => tx.status === statusFilter);
    }

    if (searchQuery) {
      result = result.filter((tx) =>
        tx.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFiltered(result);
  }, [transactions, statusFilter, searchQuery]);

  async function loadTransactions() {
    try {
      const res = await api.get('/payments/my');
      setTransactions(res.data.data || res.data || []);
    } catch {
      setError('Failed to load transactions');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDispute(e: React.FormEvent) {
    e.preventDefault();
    setDisputeLoading(true);

    try {
      await api.post('/disputes', {
        transactionId: disputeTxId,
        reason: disputeReason,
      });

      setDisputeSuccess('Dispute raised successfully');
      setShowDispute(false);
      setDisputeReason('');
      setDisputeTxId('');

      // Reload to show updated status
      await loadTransactions();

      // Clear success after 3 seconds
      setTimeout(() => setDisputeSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to raise dispute');
    } finally {
      setDisputeLoading(false);
    }
  }

  function getCurrencySymbol(curr: string) {
    switch (curr) {
      case 'GBP': return '£';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'INR': return '₹';
      default: return curr;
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'confirmed':
        return (
          <span className="flex items-center gap-1 text-green-700 bg-green-50 px-2 py-1 rounded-full text-xs font-medium">
            <CheckCircle size={12} /> Confirmed
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-yellow-700 bg-yellow-50 px-2 py-1 rounded-full text-xs font-medium">
            <Clock size={12} /> Pending
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-1 rounded-full text-xs font-medium">
            <XCircle size={12} /> Failed
          </span>
        );
      case 'disputed':
        return (
          <span className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-1 rounded-full text-xs font-medium">
            <AlertTriangle size={12} /> Disputed
          </span>
        );
      case 'refunded':
        return (
          <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-1 rounded-full text-xs font-medium">
            <CheckCircle size={12} /> Refunded
          </span>
        );
      default:
        return (
          <span className="text-gray-700 bg-gray-50 px-2 py-1 rounded-full text-xs font-medium">
            {status}
          </span>
        );
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Transactions</h1>
        <p className="text-gray-500 mt-1">View and manage your payment history</p>
      </div>

      {/* Success message */}
      {disputeSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle size={16} />
          {disputeSuccess}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            placeholder="Search by transaction ID..."
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="disputed">Disputed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Transaction count */}
      <p className="text-sm text-gray-500">
        Showing {filtered.length} of {transactions.length} transactions
      </p>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Search size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No transactions found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Transaction
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Processor
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-800">
                      #{tx.id.slice(0, 8)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold text-gray-800">
                      {getCurrencySymbol(tx.source_currency)}{tx.amount.toFixed(2)}
                    </p>
                    {tx.source_currency !== tx.target_currency && (
                      <p className="text-xs text-gray-500">
                        → {tx.target_currency}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 capitalize">
                      {tx.processor}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(tx.status)}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">
                      {new Date(tx.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {tx.status === 'confirmed' && (
                      <button
                        onClick={() => {
                          setDisputeTxId(tx.id);
                          setShowDispute(true);
                        }}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1 ml-auto"
                      >
                        <MessageSquare size={14} />
                        Dispute
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dispute Modal */}
      {showDispute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Raise a Dispute
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Transaction #{disputeTxId.slice(0, 8)}
            </p>

            <form onSubmit={handleDispute} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for dispute
                </label>
                <textarea
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  rows={4}
                  placeholder="Describe why you're disputing this transaction..."
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDispute(false);
                    setDisputeReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disputeLoading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {disputeLoading ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}