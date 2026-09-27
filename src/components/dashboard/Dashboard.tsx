import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Business } from '../../types';
import { searchOrganizations, matchNonprofit } from '../../lib/proPublica';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Building2, ChevronRight, Info, CheckCircle2, Circle, X, Layers, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard({ isDemo }: { isDemo?: boolean }) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBusiness, setNewBusiness] = useState({ name: '', type: 'small_business' as any, industry: '', address: '' });
  const [submitting, setSubmitting] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isDemo) {
      setBusinesses([
        {
          id: 'demo-biz-1',
          name: 'Harlem Tech Solutions',
          type: 'small_business',
          industry: 'IT Consulting',
          ownerId: 'demo-user-123',
          certified: true,
          createdAt: { seconds: Date.now() / 1000 }
        },
        {
          id: 'demo-biz-2',
          name: 'The Bronx Literacy Fund',
          type: 'nonprofit',
          industry: 'Education',
          ownerId: 'demo-user-123',
          certified: false,
          createdAt: { seconds: Date.now() / 1000 }
        },
        {
          id: 'demo-biz-3',
          name: 'Brooklyn Green Eats',
          type: 'small_business',
          industry: 'Food & Beverage',
          ownerId: 'demo-user-123',
          certified: true,
          createdAt: { seconds: Date.now() / 1000 }
        }
      ]);
      setLoading(false);
      return;
    }

    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'businesses'),
      where('ownerId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Business));
      setBusinesses(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'businesses');
    });

    return unsubscribe;
  }, []);

  const handleAddBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSubmitting(true);
    setStatusNote(null);

    // Match nonprofits against their IRS/ProPublica record. ProPublica only
    // covers tax-exempt orgs, so small businesses skip this step. Best-effort:
    // a search failure must never block registration.
    let verification: Partial<Business> = {};
    if (newBusiness.type === 'nonprofit') {
      try {
        setStatusNote('Verifying against IRS records…');
        const { organizations } = await searchOrganizations(
          { q: newBusiness.name, state: 'NY' },
          { isDemo },
        );
        const match = matchNonprofit(newBusiness.name, organizations);
        if (match && match.confidence === 'high') {
          verification = {
            ein: match.ein,
            ppVerified: true,
            ppName: match.name,
            ppNtee: match.ntee_code ?? '',
          };
        }
      } catch (err) {
        console.error('ProPublica verification failed', err);
      }
    }

    try {
      await addDoc(collection(db, 'businesses'), {
        ...newBusiness,
        ...verification,
        ownerId: auth.currentUser.uid,
        certified: false,
        createdAt: serverTimestamp(),
      });
      setShowAddModal(false);
      setNewBusiness({ name: '', type: 'small_business', industry: '', address: '' });
      setStatusNote(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'businesses');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section Strategy */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-16 animate-fade-in-up">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-dssg-blue rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
            <Layers size={12} />
            Portfolio Management
          </div>
          <h1 className="text-5xl font-display font-bold text-dssg-blue tracking-tight leading-[1.1] mb-6 mb-2">
            Client <span className="italic">Accounts</span> Overview
          </h1>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Manage your partner businesses and track their progress through the DSSG engagement lifecycle. High-impact data solutions for NYC's social sector.
          </p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={20} />
          Register New Account
        </button>
      </div>

      {/* Stats Summary Pattern */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16 px-4">
        <div className="flex flex-col border-l-2 border-slate-100 pl-6">
          <span className="text-3xl font-display font-bold text-dssg-blue leading-none mb-2">{businesses.length}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Partnerships</span>
        </div>
        <div className="flex flex-col border-l-2 border-slate-100 pl-6">
          <span className="text-3xl font-display font-bold text-dssg-orange leading-none mb-2">{businesses.filter(b => b.certified).length}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Certified Entities</span>
        </div>
        <div className="flex flex-col border-l-2 border-slate-100 pl-6">
          <span className="text-3xl font-display font-bold text-dssg-blue leading-none mb-2">{businesses.filter(b => b.type === 'nonprofit').length}</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active Nonprofits</span>
        </div>
        <div className="flex flex-col border-l-2 border-slate-100 pl-6">
          <span className="text-3xl font-display font-bold text-emerald-600 leading-none mb-2">92%</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Success Rate</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-8 h-64 bg-slate-100 rounded-2xl animate-pulse" />
          <div className="col-span-12 md:col-span-4 h-64 bg-slate-100 rounded-2xl animate-pulse" />
        </div>
      ) : businesses.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building2 size={40} className="text-slate-300" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">No active accounts</h3>
          <p className="text-slate-500 mt-2 mb-8 max-w-sm mx-auto">Register a small business or nonprofit to start tracking your DSSG onboarding roadmap.</p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-slate-900 text-white font-bold px-8 py-3 rounded-xl hover:bg-slate-800 transition-all"
          >
            Create Profile
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {businesses.map((business) => (
            <motion.div 
              layoutId={business.id}
              key={business.id}
              onClick={() => navigate(`/business/${business.id}`)}
              className={`bento-card bento-card-hover p-8 group cursor-pointer relative overflow-hidden ${
                business.certified ? 'accent-stripe-orange' : 'accent-stripe-blue'
              }`}
            >
              <div className="absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity duration-500 scale-150 rotate-12">
                <Building2 size={160} />
              </div>
              
              <div className="flex justify-between items-start mb-8">
                <div className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-[0.15em] ${
                  business.type === 'nonprofit' ? 'bg-purple-50 text-purple-600 border border-purple-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                }`}>
                  {business.type.replace('_', ' ')}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {business.certified && (
                    <div className="flex items-center gap-1.5 text-dssg-orange text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle2 size={14} />
                      SBS Certified
                    </div>
                  )}
                  {business.ppVerified && (
                    <div className="flex items-center gap-1.5 text-emerald-600 text-[10px] font-bold uppercase tracking-wider" title={business.ppName || undefined}>
                      <ShieldCheck size={14} />
                      IRS Verified
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-10">
                <h3 className="text-2xl font-display font-bold text-dssg-blue group-hover:text-dssg-blue-light transition-colors leading-tight">
                  {business.name}
                </h3>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-2">{business.industry || 'General Industry'}</p>
                {business.ppVerified && business.ein && (
                  <p className="text-emerald-600 text-[10px] font-mono font-medium mt-1">EIN {business.ein}</p>
                )}
              </div>

              <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                <div className="flex flex-col">
                  <span className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.2em]">Partner ID</span>
                  <span className="text-xs font-mono font-medium text-slate-500">{business.id.slice(0, 8)}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-dssg-blue group-hover:text-white transition-all duration-300">
                  <ChevronRight size={18} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Business Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-display italic font-black">Register Business</h2>
                  <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X />
                  </button>
                </div>

                <form onSubmit={handleAddBusiness} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Business Name</label>
                    <input 
                      required
                      value={newBusiness.name}
                      onChange={e => setNewBusiness({...newBusiness, name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-dssg-blue"
                      placeholder="e.g. Gotham Data Solutions"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Entity Type</label>
                      <select 
                        value={newBusiness.type}
                        onChange={e => setNewBusiness({...newBusiness, type: e.target.value as any})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-dssg-blue capitalize"
                      >
                        <option value="small_business">Small Business</option>
                        <option value="nonprofit">Nonprofit</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-gray-400 ml-1">Industry</label>
                      <input 
                        value={newBusiness.industry}
                        onChange={e => setNewBusiness({...newBusiness, industry: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-dssg-blue"
                        placeholder="e.g. Technology"
                      />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 bg-dssg-orange text-white rounded-xl font-bold shadow-lg shadow-orange-900/10 hover:bg-dssg-orange-light hover:-translate-y-0.5 active:translate-y-0 transition-all font-display disabled:opacity-60 disabled:hover:translate-y-0"
                    >
                      {submitting ? (statusNote ?? 'Processing…') : 'Process Registration'}
                    </button>
                  </div>
                </form>
              </div>
              <div className="bg-gray-50 p-6 flex items-start gap-3">
                <Info className="text-gray-400 shrink-0" size={18} />
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Registered accounts are automatically evaluated against the <a href="https://data.cityofnewyork.us/Business/SBS-Certified-Business-List/ci93-uc8s" className="text-dssg-blue underline" target="_blank" rel="noreferrer">NYC SBS Certified Business List</a>. Certification status may take 24-48 hours to reflect if newly certified.
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
