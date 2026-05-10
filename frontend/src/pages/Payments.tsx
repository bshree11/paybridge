import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import {
  CreditCard,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface ConversionPreview {
  fromCurrency: string;
  toCurrency: string;
  originalAmount: number;
  convertedAmount: number;
  rate: number;
  fee: number;
  feePercentage: number;
  totalCharged: number;
}

export default function Payments() {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('GBP');
  const [targetCurrency, setTargetCurrency] = useState('GBP');
  const [cardToken, setCardToken] = useState('tok_visa');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<ConversionPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const currencies = ['GBP', 'USD', 'EUR', 'INR'];

  // Fetch conversion preview when amount or currencies change
  useEffect(() => {
    if (amount && parseFloat(amount) > 0 && currency !== targetCurrency) {
      loadPreview();
    } else {
      setPreview(null);
    }
  }, [amount, currency, targetCurrency]);

  async function loadPreview() {
    setLoadingPreview(true);
    try {
      const res = await api.get('/currency/convert', {
        params: {
          amount: parseFloat(amount),
          from: currency,
          to: targetCurrency,
        },
      });
      setPreview(res.data.data || res.data);
    } catch {
      setPreview(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate KYC
    if (user?.kycStatus !== 'verified') {
      setError('You must complete KYC verification before making payments');
      return;
    }

    // Validate amount
    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);

    try {
      const idempotencyKey = `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`;

       await api.post('/payments', {
        amount: payAmount,
        currency,
        cardToken,
        idempotencyKey,
      });

      setSuccess(`Payment of ${getCurrencySymbol(currency)}${payAmount.toFixed(2)} was successful!`);
      setAmount('');
      setPreview(null);
   } catch (err: any) {
      const rawError = err.response?.data?.error || err.response?.data?.message || 'Payment failed';
      const errorMsg = typeof rawError === 'string' ? rawError : 'Payment failed';

      if (err.response?.status === 202) {
        setError('Additional 2FA verification required for this payment');
      } else if (err.response?.status === 403) {
        setError('Payment blocked: ' + errorMsg);
      } else {
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
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

  function getProcessorName(curr: string) {
    return curr === 'INR' ? 'Razorpay' : 'Stripe';
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Send Payment</h1>
        <p className="text-gray-500 mt-1">Send money securely through PayBridge</p>
      </div>

      {/* KYC Warning */}
      {user?.kycStatus !== 'verified' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">KYC verification required</p>
            <p className="text-xs text-yellow-600">You must verify your identity before making payments</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-green-600" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-600" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Payment Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handlePayment} className="space-y-6">
          {/* Amount + Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount
            </label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  {getCurrencySymbol(currency)}
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-medium"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Currency (for conversion) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipient Currency
            </label>
            <select
              value={targetCurrency}
              onChange={(e) => setTargetCurrency(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Conversion Preview */}
          {preview && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-800">
                <RefreshCw size={14} />
                Currency Conversion
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">Exchange Rate</span>
                <span className="font-medium text-blue-800">
                  1 {preview.fromCurrency} = {preview.rate.toFixed(4)} {preview.toCurrency}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">Conversion Fee ({preview.feePercentage}%)</span>
                <span className="font-medium text-blue-800">
                  {getCurrencySymbol(preview.fromCurrency)}{preview.fee.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-blue-200 pt-2 flex items-center justify-between text-sm">
                <span className="text-blue-700">Recipient Gets</span>
                <span className="font-bold text-blue-900">
                  {getCurrencySymbol(preview.toCurrency)}{preview.convertedAmount.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {loadingPreview && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw size={14} className="animate-spin" />
              Calculating conversion...
            </div>
          )}

          {/* Card Token (simplified — in real app this would be Stripe Elements) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Card
            </label>
            <select
              value={cardToken}
              onChange={(e) => setCardToken(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="tok_visa">Visa •••• 4242</option>
              <option value="tok_mastercard">Mastercard •••• 5555</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Test cards for demo purposes
            </p>
          </div>

          {/* Processor Info */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CreditCard size={14} />
            <span>
              Processed via <span className="font-medium">{getProcessorName(currency)}</span>
              {currency !== targetCurrency && ' with currency conversion'}
            </span>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || user?.kycStatus !== 'verified'}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Pay {amount ? `${getCurrencySymbol(currency)}${parseFloat(amount).toFixed(2)}` : ''}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Transaction Transparency (GDPR/PSD2 requirement) */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-xs text-gray-500">
          All transactions are processed securely through PayBridge. A 1.5% currency conversion fee
          applies for cross-currency payments. Payments are monitored for fraud prevention.
          By proceeding, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
}