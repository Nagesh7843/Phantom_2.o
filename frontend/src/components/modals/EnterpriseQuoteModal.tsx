'use strict';

import React, { useState } from 'react';
import { X, Check, Copy } from 'lucide-react';

interface EnterpriseQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnterpriseQuoteModal: React.FC<EnterpriseQuoteModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Config state
  const [seats, setSeats] = useState(25);
  const [computeTier, setComputeTier] = useState<'cloud' | 'dedicated_gpu' | 'airgap_vpc'>('dedicated_gpu');
  const [storageTier, setStorageTier] = useState<'100gb' | '1tb' | '10tb'>('1tb');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  // Add-ons
  const [customModels, setCustomModels] = useState(true);
  const [deepseekLocal, setDeepseekLocal] = useState(false);
  const [samlSso, setSamlSso] = useState(true);
  const [soc2Compliance, setSoc2Compliance] = useState(true);
  const [dedicatedSla, setDedicatedSla] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [copiedQuote, setCopiedQuote] = useState(false);

  if (!isOpen) return null;

  const getBaseSeatPrice = (count: number) => {
    if (count <= 10) return 40;
    if (count <= 30) return 32;
    if (count <= 75) return 26;
    if (count <= 150) return 20;
    return 16;
  };

  const computeCosts = {
    cloud: 0,
    dedicated_gpu: 250,
    airgap_vpc: 700,
  };

  const storageCosts = {
    '100gb': 0,
    '1tb': 120,
    '10tb': 380,
  };

  const baseSeatRate = getBaseSeatPrice(seats);
  const seatSubtotal = seats * baseSeatRate;
  const computeCost = computeCosts[computeTier];
  const storageCost = storageCosts[storageTier];

  const addOnCost =
    (customModels ? 180 : 0) +
    (deepseekLocal ? 250 : 0) +
    (samlSso ? 90 : 0) +
    (soc2Compliance ? 180 : 0) +
    (dedicatedSla ? 250 : 0);

  const rawMonthlyTotal = seatSubtotal + computeCost + storageCost + addOnCost;
  const discountMultiplier = billingCycle === 'annual' ? 0.8 : 1.0;
  const finalMonthlyTotal = Math.round(rawMonthlyTotal * discountMultiplier);
  const effectivePerSeatMonthly = (finalMonthlyTotal / seats).toFixed(1);

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
  };

  const generateQuoteSummaryText = () => {
    return `PHANTOM AI 2.0 ENTERPRISE SPECIFICATION
Company: ${companyName || 'N/A'}
Contact: ${fullName || 'N/A'} (${workEmail || 'N/A'})
Seats: ${seats} Users ($${baseSeatRate}/user/mo)
Compute: ${computeTier}
Storage: ${storageTier}
Custom Models: ${customModels ? 'Yes' : 'No'}
Local DeepSeek/Llama: ${deepseekLocal ? 'Yes' : 'No'}
SAML SSO: ${samlSso ? 'Yes' : 'No'}
SOC2 Compliance: ${soc2Compliance ? 'Yes' : 'No'}
24/7 SLA: ${dedicatedSla ? 'Yes' : 'No'}
Billing: ${billingCycle}
Estimated Total: $${finalMonthlyTotal.toLocaleString()}/mo ($${effectivePerSeatMonthly}/user/mo)`;
  };

  const handleCopyQuote = () => {
    navigator.clipboard.writeText(generateQuoteSummaryText());
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden my-auto max-h-[90vh] flex flex-col text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              Enterprise Plan Calculator
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Customize seats and infrastructure to calculate your estimated cost.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isSubmitted ? (
            <div className="py-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-850 text-zinc-900 dark:text-white mx-auto flex items-center justify-center">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-semibold text-zinc-900 dark:text-white">Quote Request Received</h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                We've registered your configuration for <strong>{companyName || 'your company'}</strong>. Our team will follow up at <strong>{workEmail}</strong> shortly.
              </p>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyQuote}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-850 transition-colors"
                >
                  {copiedQuote ? 'Copied' : 'Copy Summary'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-black text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Configuration Controls (Left) */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Team Seats */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-white">Team seats</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-400">
                      {seats} seats (${baseSeatRate}/seat/mo)
                    </span>
                  </div>

                  <input
                    type="range"
                    min={5}
                    max={250}
                    step={5}
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
                  />

                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>5 seats</span>
                    <span>50 seats</span>
                    <span>150 seats</span>
                    <span>250+ seats</span>
                  </div>
                </div>

                {/* 2. Compute Environment */}
                <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                    Compute environment
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cloud', title: 'Shared Cloud', price: '+$0' },
                      { id: 'dedicated_gpu', title: 'Dedicated GPU', price: '+$250' },
                      { id: 'airgap_vpc', title: 'Air-Gapped VPC', price: '+$700' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setComputeTier(opt.id as any)}
                        className={`p-2.5 rounded-lg border text-left transition-all text-xs cursor-pointer ${
                          computeTier === opt.id
                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black font-medium'
                            : 'border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600'
                        }`}
                      >
                        <div className="font-medium truncate">{opt.title}</div>
                        <div className="text-[11px] opacity-75 mt-0.5">{opt.price}/mo</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Storage */}
                <div className="space-y-2 pt-3 border-t border-zinc-100 dark:border-zinc-850">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-white block">
                    PostgreSQL storage
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: '100gb', title: '100 GB', price: 'Included' },
                      { id: '1tb', title: '1 TB Vector', price: '+$120' },
                      { id: '10tb', title: '10 TB Multi-Region', price: '+$380' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStorageTier(opt.id as any)}
                        className={`p-2.5 rounded-lg border text-left transition-all text-xs cursor-pointer ${
                          storageTier === opt.id
                            ? 'border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black font-medium'
                            : 'border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600'
                        }`}
                      >
                        <div className="font-medium truncate">{opt.title}</div>
                        <div className="text-[11px] opacity-75 mt-0.5">{opt.price}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Add-on Features */}
                <div className="space-y-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-850 text-xs">
                  <span className="font-semibold text-zinc-900 dark:text-white block">
                    Security & model features
                  </span>

                  <div className="space-y-2 text-zinc-700 dark:text-zinc-300">
                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={customModels}
                          onChange={(e) => setCustomModels(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white"
                        />
                        <span>Custom Model Weights & LoRA Fine-Tuning</span>
                      </div>
                      <span className="text-zinc-400 text-[11px]">+$180/mo</span>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={deepseekLocal}
                          onChange={(e) => setDeepseekLocal(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white"
                        />
                        <span>Local DeepSeek-R1 / Llama 3 70B Weights Hosting</span>
                      </div>
                      <span className="text-zinc-400 text-[11px]">+$250/mo</span>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={samlSso}
                          onChange={(e) => setSamlSso(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white"
                        />
                        <span>SAML / Okta SSO & SCIM Provisioning</span>
                      </div>
                      <span className="text-zinc-400 text-[11px]">+$90/mo</span>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={soc2Compliance}
                          onChange={(e) => setSoc2Compliance(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white"
                        />
                        <span>SOC2 Type II & HIPAA Compliance</span>
                      </div>
                      <span className="text-zinc-400 text-[11px]">+$180/mo</span>
                    </label>

                    <label className="flex items-center justify-between cursor-pointer py-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={dedicatedSla}
                          onChange={(e) => setDedicatedSla(e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 accent-zinc-900 dark:accent-white"
                        />
                        <span>99.99% Uptime SLA with 24/7 Slack Channel</span>
                      </div>
                      <span className="text-zinc-400 text-[11px]">+$250/mo</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Summary & Form (Right) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Clean Price Card */}
                <div className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">Estimated cost</span>
                    <div className="flex items-center gap-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setBillingCycle('monthly')}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          billingCycle === 'monthly'
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-black font-medium'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingCycle('annual')}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          billingCycle === 'annual'
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-black font-medium'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        Annual (-20%)
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-3xl sm:text-4xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
                      ${finalMonthlyTotal.toLocaleString()}
                      <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 ml-1">/ month</span>
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      ${effectivePerSeatMonthly} / user / month ({seats} seats)
                    </div>
                  </div>

                  <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex justify-between">
                      <span>{seats} Seats:</span>
                      <span>${seatSubtotal}/mo</span>
                    </div>
                    {computeCost > 0 && (
                      <div className="flex justify-between">
                        <span>Compute:</span>
                        <span>+${computeCost}/mo</span>
                      </div>
                    )}
                    {storageCost > 0 && (
                      <div className="flex justify-between">
                        <span>Storage:</span>
                        <span>+${storageCost}/mo</span>
                      </div>
                    )}
                    {addOnCost > 0 && (
                      <div className="flex justify-between">
                        <span>Add-ons:</span>
                        <span>+${addOnCost}/mo</span>
                      </div>
                    )}
                    {billingCycle === 'annual' && (
                      <div className="flex justify-between text-zinc-900 dark:text-white font-medium">
                        <span>Annual Discount:</span>
                        <span>-20%</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmitQuote} className="space-y-3 text-xs">
                  <div>
                    <label className="text-zinc-600 dark:text-zinc-400 block mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      value={workEmail}
                      onChange={(e) => setWorkEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-white text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-zinc-600 dark:text-zinc-400 block mb-1">Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Alex Chen"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-zinc-600 dark:text-zinc-400 block mb-1">Company</label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Inc"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-white text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-black font-medium text-xs hover:opacity-90 transition-opacity cursor-pointer mt-2"
                  >
                    Request Enterprise Quote
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
