import React, { useState } from 'react';
import { User, Product, Claim, MerchantPlatform } from '../types';
import {
  ShoppingBag,
  ExternalLink,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  AlertTriangle,
  FileCheck,
  CreditCard,
  Image as ImageIcon,
  Check,
  X,
  History,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';

interface CustomerPortalProps {
  currentUser: User;
  products: Product[];
  claims: Claim[];
  onSubmitClaim: (claimData: Omit<Claim, 'id' | 'submittedAt' | 'status'>) => void;
  onViewProof: (claim: Claim, type: 'order' | 'payment' | 'rating') => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  currentUser,
  products,
  claims,
  onSubmitClaim,
  onViewProof
}) => {
  const [activeTab, setActiveTab] = useState<'offers' | 'my-claims'>('offers');
  const [platformFilter, setPlatformFilter] = useState<'All' | MerchantPlatform>('All');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Claim modal form states
  const [enteredCode, setEnteredCode] = useState('');
  const [orderImg, setOrderImg] = useState<string | null>(null);
  const [paymentImg, setPaymentImg] = useState<string | null>(null);
  const [ratingImg, setRatingImg] = useState<string | null>(null);
  const [upiId, setUpiId] = useState('');
  const [formError, setFormError] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filter user's claims
  const userClaims = claims.filter((c) => c.customerMobile === currentUser.mobile);
  const totalApprovedEarnings = userClaims
    .filter((c) => c.status === 'Approved')
    .reduce((sum, c) => sum + (c.cashbackAmount || 150), 0);

  const filteredProducts = products.filter((p) => {
    if (platformFilter === 'All') return true;
    return p.platform === platformFilter;
  });

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleOpenClaimModal = (product: Product) => {
    setSelectedProduct(product);
    setEnteredCode('');
    setOrderImg(null);
    setPaymentImg(null);
    setRatingImg(null);
    setUpiId('');
    setFormError('');
  };

  const handleCloseClaimModal = () => {
    setSelectedProduct(null);
    setFormError('');
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        setFormError('Image size exceeds 8MB. Please choose a smaller image.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setter(reader.result as string);
        setFormError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!selectedProduct) return;

    const trimmedCode = enteredCode.trim().toUpperCase();
    if (trimmedCode !== selectedProduct.code.trim().toUpperCase()) {
      setFormError(
        `Code Mismatch! Entered code (${trimmedCode}) does not match the product code (${selectedProduct.code}).`
      );
      return;
    }

    if (!orderImg || !paymentImg || !ratingImg) {
      setFormError('Please attach all 3 screenshot proof images (Order, Payment, and Rating).');
      return;
    }

    if (!upiId.trim() || !upiId.includes('@')) {
      setFormError('Please enter a valid UPI ID (e.g. mobile@upi, username@okaxis).');
      return;
    }

    onSubmitClaim({
      productId: selectedProduct.id,
      productTitle: selectedProduct.title,
      platform: selectedProduct.platform,
      systemCode: selectedProduct.code,
      specialCode: trimmedCode,
      customerName: currentUser.name,
      customerMobile: currentUser.mobile,
      customerEmail: currentUser.email,
      orderImgData: orderImg,
      paymentImgData: paymentImg,
      ratingImgData: ratingImg,
      upiId: upiId.trim(),
      cashbackAmount: selectedProduct.cashbackAmount || 150
    });

    handleCloseClaimModal();
  };

  const platformBadgeStyle = (platform: string) => {
    switch (platform) {
      case 'Amazon':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Flipkart':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'Blinkit':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      default:
        return 'bg-purple-100 text-purple-900 border-purple-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* User Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-violet-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-wrap justify-between items-center gap-6 relative overflow-hidden">
        <div className="flex items-center gap-4 sm:gap-5 z-10">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center font-black text-2xl text-indigo-200 border border-white/20 shadow-inner">
            <span>{currentUser.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl sm:text-3xl font-black text-white">{currentUser.name}</h2>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                ● Active Customer
              </span>
            </div>
            <p className="text-xs sm:text-sm text-indigo-200 flex flex-wrap items-center gap-3 mt-1.5 font-medium">
              <span>📱 {currentUser.mobile}</span>
              <span>•</span>
              <span>✉️ {currentUser.email}</span>
            </p>
          </div>
        </div>

        {/* User stats summary */}
        <div className="flex items-center gap-3 z-10 flex-wrap">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 text-center">
            <span className="text-[10px] text-indigo-200 uppercase tracking-wider block font-bold">
              Submitted Claims
            </span>
            <span className="text-xl font-black text-white">{userClaims.length}</span>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15 text-center">
            <span className="text-[10px] text-indigo-200 uppercase tracking-wider block font-bold">
              Total Cashback Earned
            </span>
            <span className="text-xl font-black text-emerald-400">₹{totalApprovedEarnings}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex gap-2 bg-slate-200/70 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('offers')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'offers'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Cashback Offer Products</span>
            <span className="bg-indigo-100 text-indigo-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {products.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('my-claims')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 ${
              activeTab === 'my-claims'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>My Submitted Claims</span>
            <span className="bg-slate-200 text-slate-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
              {userClaims.length}
            </span>
          </button>
        </div>

        {activeTab === 'offers' && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1">Platform:</span>
            {(['All', 'Amazon', 'Flipkart', 'Blinkit'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  platformFilter === p
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Offers Grid */}
      {activeTab === 'offers' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <p>
              Buy the product directly from the platform, enter the Special Code, and submit the 3
              screenshots to get your cashback refund.
            </p>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
              <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-700">No Offer Products Listed Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Products will appear here once added by the administrator with special verification codes.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((prod) => {
                const existingClaim = claims.find(
                  (c) => c.customerMobile === currentUser.mobile && c.productId === prod.id
                );

                return (
                  <div
                    key={prod.id}
                    className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                  >
                    <div>
                      {/* Image & Platform Badge */}
                      <div className="relative h-52 bg-slate-100 overflow-hidden">
                        <img
                          src={prod.image}
                          alt={prod.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
                          }}
                        />
                        <span
                          className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-xl border shadow-sm ${platformBadgeStyle(
                            prod.platform
                          )}`}
                        >
                          {prod.platform}
                        </span>

                        {prod.cashbackAmount && (
                          <span className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md text-emerald-400 border border-slate-700 text-xs font-black px-2.5 py-1 rounded-xl">
                            ₹{prod.cashbackAmount} Cashback
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="p-5">
                        <h4 className="font-bold text-slate-900 text-base leading-snug">
                          {prod.title}
                        </h4>
                        {prod.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {prod.description}
                          </p>
                        )}

                        {/* Special Code Box */}
                        <div className="mt-3 p-2.5 bg-indigo-50/70 border border-indigo-200/80 rounded-xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block">
                              Special Code (Required)
                            </span>
                            <span className="font-mono font-bold text-sm text-indigo-900 tracking-wider">
                              {prod.code}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopyCode(prod.code)}
                            className="p-1.5 text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100 rounded-lg transition"
                            title="Copy Code"
                          >
                            {copiedCode === prod.code ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-5 pt-0 space-y-2.5">
                      <a
                        href={prod.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full text-center bg-amber-400 hover:bg-amber-500 text-slate-900 font-bold text-xs py-2.5 rounded-xl shadow-sm transition flex items-center justify-center gap-1.5"
                      >
                        <span>Buy on {prod.platform}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {existingClaim ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {existingClaim.status === 'Approved' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ) : existingClaim.status === 'Rejected' ? (
                              <XCircle className="w-4 h-4 text-rose-600" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-600" />
                            )}
                            <span className="text-xs font-bold text-slate-700">Already Claimed</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Status:{' '}
                            <strong
                              className={
                                existingClaim.status === 'Approved'
                                  ? 'text-emerald-600 font-bold'
                                  : existingClaim.status === 'Rejected'
                                  ? 'text-rose-600 font-bold'
                                  : 'text-amber-600 font-bold'
                              }
                            >
                              {existingClaim.status}
                            </strong>
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenClaimModal(prod)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-md shadow-indigo-100 transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileCheck className="w-4 h-4" />
                          <span>Submit Order Claim</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Customer Submitted Claims Tracking */}
      {activeTab === 'my-claims' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Your Submitted Claims Tracker</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Track the status of your cashback claims submitted from your mobile (
                {currentUser.mobile})
              </p>
            </div>

            {userClaims.length === 0 ? (
              <div className="text-center py-16 px-4">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-700">No claims submitted yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Purchase any product from our offer list, enter the Special Code, and upload
                  proofs to claim cashback.
                </p>
                <button
                  onClick={() => setActiveTab('offers')}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Browse Offer Products
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[11px] font-bold tracking-wider">
                      <th className="p-4">Claim ID & Date</th>
                      <th className="p-4">Product</th>
                      <th className="p-4">Special Code</th>
                      <th className="p-4">Your Proofs</th>
                      <th className="p-4">Refund UPI</th>
                      <th className="p-4">Status & Cashback</th>
                      <th className="p-4">Admin Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {userClaims.map((claim) => (
                      <tr key={claim.id} className="hover:bg-slate-50 transition">
                        <td className="p-4">
                          <span className="font-mono font-bold text-indigo-700">#{claim.id}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            {claim.submittedAt}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-800">{claim.productTitle}</p>
                          <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 border text-slate-700">
                            {claim.platform}
                          </span>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-700">
                          {claim.specialCode}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => onViewProof(claim, 'order')}
                              className="w-8 h-8 rounded-lg overflow-hidden border border-slate-300 hover:scale-110 transition shadow-sm"
                              title="Inspect Order Screenshot"
                            >
                              <img
                                src={claim.orderImgData}
                                alt="Order Proof"
                                className="w-full h-full object-cover"
                              />
                            </button>
                            <button
                              onClick={() => onViewProof(claim, 'payment')}
                              className="w-8 h-8 rounded-lg overflow-hidden border border-slate-300 hover:scale-110 transition shadow-sm"
                              title="Inspect Payment Receipt"
                            >
                              <img
                                src={claim.paymentImgData}
                                alt="Payment Proof"
                                className="w-full h-full object-cover"
                              />
                            </button>
                            <button
                              onClick={() => onViewProof(claim, 'rating')}
                              className="w-8 h-8 rounded-lg overflow-hidden border border-slate-300 hover:scale-110 transition shadow-sm"
                              title="Inspect Rating Review"
                            >
                              <img
                                src={claim.ratingImgData}
                                alt="Rating Proof"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-800">{claim.upiId}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                claim.status === 'Approved'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                  : claim.status === 'Rejected'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}
                            >
                              {claim.status}
                            </span>
                          </div>
                          {claim.status === 'Approved' && (
                            <span className="block text-[11px] font-bold text-emerald-600 mt-1">
                              +₹{claim.cashbackAmount || 150} Credited
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-600 max-w-xs">
                          {claim.adminNote ? (
                            <span className="text-[11px] italic bg-slate-100 px-2 py-1 rounded-lg block">
                              "{claim.adminNote}"
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Claim Submission Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white max-w-xl w-full rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 transform transition-all">
            {/* Modal Header */}
            <div className="bg-indigo-600 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base sm:text-lg">
                  Upload Order & Screenshot Proofs
                </h3>
                <p className="text-xs text-indigo-100 mt-0.5">
                  {selectedProduct.title} ({selectedProduct.platform})
                </p>
              </div>
              <button
                onClick={handleCloseClaimModal}
                className="text-indigo-200 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form
              onSubmit={handleFormSubmit}
              className="p-6 space-y-4 max-h-[80vh] overflow-y-auto"
            >
              {/* Guidelines Alert */}
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-2xl text-xs space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Submission Guidelines:
                </p>
                <p>
                  1. Input the exact <strong>Special Product Code</strong> (
                  <span className="font-mono font-bold">{selectedProduct.code}</span>) displayed on
                  the card.
                </p>
                <p>2. Upload direct image screenshot files from your phone or PC.</p>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {formError}
                </div>
              )}

              {/* Special Code Input */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Special Product Verification Code *
                  </label>
                  <button
                    type="button"
                    onClick={() => setEnteredCode(selectedProduct.code)}
                    className="text-[11px] text-indigo-600 font-bold hover:underline"
                  >
                    Auto-Fill ({selectedProduct.code})
                  </button>
                </div>
                <input
                  type="text"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.toUpperCase())}
                  required
                  placeholder={`e.g. ${selectedProduct.code}`}
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-mono font-bold text-indigo-700"
                />
              </div>

              {/* 3 Screenshot File Uploads */}
              <div className="space-y-4 pt-1">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b pb-1">
                  Upload Image Screenshot Files
                </p>

                {/* 1. Order Screenshot */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>1. Order Screenshot File *</span>
                    {orderImg && <span className="text-emerald-600 font-bold text-[11px]">✓ Attached</span>}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setOrderImg)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {orderImg && (
                    <div className="mt-2.5 flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                      <img
                        src={orderImg}
                        alt="Order Preview"
                        className="w-14 h-14 object-cover rounded-lg border"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-emerald-600 block">
                          ✓ Order Screenshot Attached
                        </span>
                        <span className="text-[10px] text-slate-400">Ready for review</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOrderImg(null)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 2. Payment Screenshot */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>2. Payment Screenshot File *</span>
                    {paymentImg && (
                      <span className="text-emerald-600 font-bold text-[11px]">✓ Attached</span>
                    )}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setPaymentImg)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {paymentImg && (
                    <div className="mt-2.5 flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                      <img
                        src={paymentImg}
                        alt="Payment Preview"
                        className="w-14 h-14 object-cover rounded-lg border"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-emerald-600 block">
                          ✓ Payment Receipt Attached
                        </span>
                        <span className="text-[10px] text-slate-400">Ready for review</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPaymentImg(null)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* 3. Rating Screenshot */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                    <span>3. After Delivery Rating Screenshot File *</span>
                    {ratingImg && (
                      <span className="text-emerald-600 font-bold text-[11px]">✓ Attached</span>
                    )}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, setRatingImg)}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  {ratingImg && (
                    <div className="mt-2.5 flex items-center gap-3 p-2 bg-white rounded-xl border border-slate-200">
                      <img
                        src={ratingImg}
                        alt="Rating Preview"
                        className="w-14 h-14 object-cover rounded-lg border"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-emerald-600 block">
                          ✓ Rating Review Attached
                        </span>
                        <span className="text-[10px] text-slate-400">Ready for review</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRatingImg(null)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* UPI ID Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Refund Payment UPI ID *
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  required
                  placeholder="e.g. mobile@upi or name@okaxis"
                  className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-semibold font-mono"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleCloseClaimModal}
                  className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Claim Proofs</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
