import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { RSVPFormData } from '../types';
import { ChevronDown, ChevronUp, Download, Home, Search, SortAsc, SortDesc, Trash2, Edit2, X, Save } from 'lucide-react';
import { branches } from '../data/branches';
import clsx from 'clsx';

// Helper function to get full branch name with city if available
const getFullBranchName = (branchValue: string): string => {
  const branch = branches.find(b => b.value === branchValue);
  if (!branch) return branchValue;
  
  return branch.city ? `${branch.label} (${branch.city})` : branch.label;
};

// Helper to get full name from first and last name
const getFullName = (first: string, last: string): string => {
  return `${first} ${last}`.trim();
};

interface GroupedRSVPs {
  [key: string]: RSVPFormData[];
}

type SortField = 'submittedAt' | 'branch' | 'fullName';
type SortDirection = 'asc' | 'desc';

const AdminPanel: React.FC = () => {
  const [rsvps, setRsvps] = useState<(RSVPFormData & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('submittedAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RSVPFormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/admin');
      }
    });

    const unsubRSVPs = onSnapshot(
      collection(db, 'rsvps'),
      (snapshot) => {
        const rsvpData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as (RSVPFormData & { id: string })[];
        setRsvps(rsvpData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching RSVPs:', error);
        setLoading(false);
      }
    );

    return () => {
      unsubAuth();
      unsubRSVPs();
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/admin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק רישום זה?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'rsvps', id));
    } catch (err) {
      console.error('Error deleting RSVP:', err);
      setError('אירעה שגיאה במחיקת הרישום');
    }
  };

  const handleEdit = (rsvp: RSVPFormData & { id: string }) => {
    setEditingId(rsvp.id);
    setEditForm(rsvp);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm) return;

    try {
      // Create the fullName field for backward compatibility
      const updatedData = {
        ...editForm,
        fullName: getFullName(editForm.firstName || '', editForm.lastName || ''),
        lastModifiedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'rsvps', editingId), updatedData);
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      console.error('Error updating RSVP:', err);
      setError('אירעה שגיאה בעדכון הרישום');
    }
  };

  const exportToCSV = () => {
    const headers = ['שם מלא', 'טלפון', 'סניף', 'הסעה', 'תאריך אישור'];
    const csvContent = [
      headers.join(','),
      ...rsvps.map(rsvp => [
        `"${rsvp.fullName}"`,
        `"${rsvp.phone}"`,
        `"${rsvp.branch}"`,
        rsvp.needsTransportation ? 'כן' : 'לא',
        rsvp.submittedAt ? new Date(rsvp.submittedAt).toLocaleDateString('he-IL') : '-'
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'rsvps.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sorting and filtering logic
  const sortAndFilterRSVPs = (rsvps: (RSVPFormData & { id: string })[]) => {
    return rsvps
      .filter(rsvp => {
        const fullName = rsvp.fullName || getFullName(rsvp.firstName || '', rsvp.lastName || '');
        
        const matchesSearch = searchTerm === '' || 
          fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          rsvp.phone.includes(searchTerm) ||
          rsvp.branch.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesBranch = selectedBranch === 'all' || rsvp.branch === selectedBranch;
        
        return matchesSearch && matchesBranch;
      })
      .sort((a, b) => {
        const direction = sortDirection === 'asc' ? 1 : -1;
        
        if (sortField === 'submittedAt') {
          return direction * ((new Date(a.submittedAt || 0)).getTime() - (new Date(b.submittedAt || 0)).getTime());
        }
        
        return direction * (getSortableValue(a, sortField) || '').localeCompare(getSortableValue(b, sortField) || '');
      });
  };

  // Group RSVPs by branch for transportation
  const transportationByBranch = rsvps
    .filter(rsvp => rsvp.needsTransportation)
    .reduce((acc, rsvp) => {
      const branch = rsvp.branch;
      if (!acc[branch]) {
        acc[branch] = [];
      }
      acc[branch].push(rsvp);
      return acc;
    }, {} as GroupedRSVPs);

  const stats = {
    total: rsvps.length,
    needTransportation: rsvps.filter(r => r.needsTransportation).length,
    branches: new Set(rsvps.map(r => r.branch)).size
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Create full name field for sorting if needed
  const getSortableValue = (rsvp: RSVPFormData & { id: string }, field: SortField): string => {
    if (field === 'fullName') {
      return rsvp.fullName || getFullName(rsvp.firstName || '', rsvp.lastName || '');
    }
    return rsvp[field] || '';
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-emerald-400">טוען...</div>
      </div>
    );
  }

  const filteredRSVPs = sortAndFilterRSVPs(rsvps);

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8">
      <Link 
        to="/" 
        className="fixed top-4 right-4 text-emerald-500/70 hover:text-emerald-400 transition-colors"
        title="חזרה לדף הראשי"
      >
        <Home className="w-6 h-6" />
      </Link>

      <div className="max-w-7xl mx-auto">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center">
            {error}
            <button 
              onClick={() => setError(null)}
              className="mr-2 text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4 inline" />
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-2xl">פאנל ניהול</h1>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              ייצוא ל-CSV
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
            >
              התנתק
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg mb-2">סה"כ נרשמים</h3>
            <p className="text-3xl text-emerald-400">{stats.total}</p>
          </div>
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg mb-2">צריכים הסעה</h3>
            <p className="text-3xl text-emerald-400">{stats.needTransportation}</p>
          </div>
          <div className="glass-card rounded-xl p-6">
            <h3 className="text-lg mb-2">מספר סניפים</h3>
            <p className="text-3xl text-emerald-400">{stats.branches}</p>
          </div>
        </div>

        {/* Transportation Table */}
        <div className="glass-card rounded-2xl p-6 mb-8">
          <h2 className="text-xl mb-6">רשימת הסעות לפי סניפים</h2>
          <div className="space-y-6">
            {Object.entries(transportationByBranch)
              .sort(([branchA], [branchB]) => branchA.localeCompare(branchB))
              .map(([branch, passengers]) => (
                <div key={branch} className="border border-emerald-500/20 rounded-xl overflow-hidden">
                  <div className="bg-emerald-500/10 px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium">{branch}</h3>
                      <p className="text-sm text-emerald-400">{passengers.length} נוסעים</p>
                    </div>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-emerald-500/20">
                          <th className="text-right py-2 px-4">שם מלא</th>
                          <th className="text-right py-2 px-4">טלפון</th>
                          <th className="text-right py-2 px-4">פעולות</th>
                        </tr>
                      </thead>
                      <tbody>
                        {passengers.map((passenger) => (
                          <tr 
                            key={passenger.id}
                            className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition-colors"
                          >
                            <td className="py-2 px-4">{passenger.fullName}</td>
                            <td className="py-2 px-4">{passenger.phone}</td>
                            <td className="py-2 px-4">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEdit(passenger)}
                                  className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                                  title="ערוך"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(passenger.id)}
                                  className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                  title="מחק"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* All RSVPs Table */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h2 className="text-xl">כל אישורי ההגעה ({filteredRSVPs.length})</h2>
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500/50" />
                <input
                  type="text"
                  placeholder="חיפוש..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 pr-10 bg-black/40 border border-emerald-500/30 rounded-lg text-white placeholder-emerald-500/50 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-4 py-2 bg-black/40 border border-emerald-500/30 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="all">כל הסניפים</option>
                {branches.map(branch => (
                  <option key={branch.value} value={branch.value}>
                    {branch.city ? `${branch.label} (${branch.city})` : branch.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-emerald-500/20">
                  <th 
                    className="text-right py-3 px-4 cursor-pointer hover:bg-emerald-500/5 transition-colors"
                    onClick={() => handleSort('fullName')}
                  >
                    <div className="flex items-center gap-2">
                      שם פרטי
                      <SortIcon field="fullName" />
                    </div>
                  </th>
                  <th className="text-right py-3 px-4">
                    שם משפחה
                  </th>
                  <th className="text-right py-3 px-4">טלפון</th>
                  <th 
                    className="text-right py-3 px-4 cursor-pointer hover:bg-emerald-500/5 transition-colors"
                    onClick={() => handleSort('branch')}
                  >
                    <div className="flex items-center gap-2">
                      סניף
                      <SortIcon field="branch" />
                    </div>
                  </th>
                  <th className="text-right py-3 px-4">הסעה</th>
                  <th 
                    className="text-right py-3 px-4 cursor-pointer hover:bg-emerald-500/5 transition-colors"
                    onClick={() => handleSort('submittedAt')}
                  >
                    <div className="flex items-center gap-2">
                      תאריך אישור
                      <SortIcon field="submittedAt" />
                    </div>
                  </th>
                  <th className="text-right py-3 px-4">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredRSVPs.map((rsvp) => (
                  <tr 
                    key={rsvp.id}
                    className="border-b border-emerald-500/10 hover:bg-emerald-500/5 transition-colors"
                  >
                    {editingId === rsvp.id ? (
                      <>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editForm?.firstName || ''}
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                            className="w-full px-2 py-1 bg-black/40 border border-emerald-500/30 rounded text-white"
                            placeholder="שם פרטי"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={editForm?.lastName || ''}
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                            className="w-full px-2 py-1 bg-black/40 border border-emerald-500/30 rounded text-white"
                            placeholder="שם משפחה"
                          />
                        </td>
                        <td className="py-3 px-4">{rsvp.phone}</td>
                        <td className="py-3 px-4">
                          {rsvp.branchDisplayName || getFullBranchName(rsvp.branch)}
                        </td>
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={editForm?.needsTransportation || false}
                            onChange={(e) => setEditForm(prev => prev ? { ...prev, needsTransportation: e.target.checked } : null)}
                            className="w-4 h-4 accent-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-4">
                          {rsvp.submittedAt ? new Date(rsvp.submittedAt).toLocaleDateString('he-IL') : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                              title="שמור"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setEditForm(null);
                              }}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                              title="בטל"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4">{getFullName(rsvp.firstName || '', rsvp.lastName || '') || rsvp.fullName}</td>
                        <td className="py-3 px-4">{rsvp.phone}</td>
                        <td className="py-3 px-4">
                          {rsvp.branchDisplayName || getFullBranchName(rsvp.branch)}
                        </td>
                        <td className="py-3 px-4">{rsvp.needsTransportation ? 'כן' : 'לא'}</td>
                        <td className="py-3 px-4">
                          {rsvp.submittedAt ? new Date(rsvp.submittedAt).toLocaleDateString('he-IL') : '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(rsvp)}
                              className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                              title="ערוך"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(rsvp.id)}
                              className="p-1 text-red-400 hover:text-red-300 transition-colors"
                              title="מחק"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;