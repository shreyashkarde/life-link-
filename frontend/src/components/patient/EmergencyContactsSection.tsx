import React, { useState, useEffect } from 'react';
import {
  PhoneCall,
  UserPlus,
  Trash2,
  AlertTriangle,
  Send,
  CheckCircle2,
  ShieldAlert,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';

interface EmergencyContactsSectionProps {
  apiFetch: (url: string, options?: any) => Promise<any>;
  currentLat?: number;
  currentLng?: number;
}

export const EmergencyContactsSection: React.FC<EmergencyContactsSectionProps> = ({
  apiFetch,
  currentLat,
  currentLng,
}) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [customAlertMessage, setCustomAlertMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savingMessage, setSavingMessage] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Form inputs
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [relationInput, setContactRelation] = useState('Parent');

  useEffect(() => {
    fetchEmergencyContacts();
  }, []);

  const fetchEmergencyContacts = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/emergency-contacts');
      setContacts(data.contacts || []);
      setCustomAlertMessage(data.customAlertMessage || '');
    } catch (err: any) {
      console.error('Failed to load emergency contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');

    if (contacts.length >= 3) {
      setActionError('Maximum limit of 3 emergency contacts reached.');
      return;
    }

    setSavingContact(true);
    try {
      await apiFetch('/emergency-contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: nameInput.trim(),
          phone: phoneInput.trim(),
          relation: relationInput.trim(),
        }),
      });

      setNameInput('');
      setPhoneInput('');
      setActionSuccess('Emergency contact added successfully.');
      fetchEmergencyContacts();
    } catch (err: any) {
      setActionError(err.message || 'Failed to add emergency contact');
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to remove this emergency contact?')) return;
    setActionError('');
    setActionSuccess('');

    try {
      await apiFetch(`/emergency-contacts/${contactId}`, {
        method: 'DELETE',
      });
      setActionSuccess('Emergency contact removed.');
      fetchEmergencyContacts();
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove contact');
    }
  };

  const handleSaveAlertMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    setSavingMessage(true);

    try {
      await apiFetch('/emergency-contacts/alert-message', {
        method: 'PUT',
        body: JSON.stringify({
          customAlertMessage: customAlertMessage.trim(),
        }),
      });
      setActionSuccess('Custom emergency SMS message saved.');
    } catch (err: any) {
      setActionError(err.message || 'Failed to update alert message');
    } finally {
      setSavingMessage(false);
    }
  };

  const handleManualNotify = async () => {
    if (contacts.length === 0) {
      alert('Please add at least one emergency contact before sending an alert.');
      return;
    }

    if (!confirm(`Broadcast urgent emergency alert SMS to all ${contacts.length} saved contact(s) now?`)) {
      return;
    }

    setActionError('');
    setActionSuccess('');
    setNotifying(true);

    try {
      const res = await apiFetch('/emergency-contacts/notify', {
        method: 'POST',
        body: JSON.stringify({
          lat: currentLat,
          lng: currentLng,
        }),
      });

      setActionSuccess(res.message || `Emergency SMS successfully dispatched to ${contacts.length} contact(s)!`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to notify emergency contacts');
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card with standalone manual trigger */}
      <div className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-600/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Emergency Contacts & SMS Network
                </h3>
                <span className="text-2xs font-mono font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                  Capped at 3 Trusted Contacts · Real-Time Cellular SMS Alerts
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              Your registered contacts will receive an instantaneous SMS containing your live GPS location link whenever you trigger an SOS or use the button below.
            </p>
          </div>

          {/* Standalone Button: Notify My Emergency Contacts */}
          <button
            onClick={handleManualNotify}
            disabled={notifying || contacts.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:opacity-40 text-white rounded-2xl text-xs font-black shadow-lg shadow-rose-600/20 flex items-center gap-2 shrink-0 cursor-pointer transition-all"
          >
            <Send className={`w-4 h-4 ${notifying ? 'animate-bounce' : ''}`} />
            <span>{notifying ? 'Broadcasting SMS...' : 'Notify My Emergency Contacts'}</span>
          </button>
        </div>

        {/* Feedback Banners */}
        {actionSuccess && (
          <div className="mt-4 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}
      </div>

      {/* Grid: Existing Contacts & Add Contact */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Existing Contacts (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
              Saved Contacts ({contacts.length} / 3)
            </h4>
            {contacts.length >= 3 && (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Max Limit Reached
              </span>
            )}
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading emergency contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 bg-gray-50 dark:bg-slate-900/50 rounded-2xl">
              No emergency contacts added yet. Add trusted family or friends to receive instant SMS alerts.
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact, idx) => (
                <div
                  key={contact.id}
                  className="p-4 rounded-2xl border border-gray-200 dark:border-slate-850 bg-gray-50/50 dark:bg-slate-900/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      0{idx + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {contact.name}
                        </span>
                        {contact.relation && (
                          <span className="px-2 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            {contact.relation}
                          </span>
                        )}
                      </div>
                      <span className="text-3xs text-slate-400 font-mono block">
                        {contact.phone}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteContact(contact.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    title="Remove Contact"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Add Contact Form (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-rose-500" />
            Add Emergency Contact
          </h4>

          {contacts.length >= 3 ? (
            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-xs text-slate-500 space-y-2">
              <p className="font-bold text-slate-700 dark:text-slate-300">
                Contact limit of 3 reached.
              </p>
              <p className="text-3xs text-slate-400">
                To add a new contact, please delete an existing one above. This security cap ensures rapid parallel cellular dispatch without network congestion.
              </p>
            </div>
          ) : (
            <form onSubmit={handleAddContact} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Phone Number (E.164 or Mobile) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+15550199 or 9876543210"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Relationship
                </label>
                <select
                  value={relationInput}
                  onChange={(e) => setContactRelation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="Parent">Parent</option>
                  <option value="Spouse">Spouse / Partner</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Child">Child</option>
                  <option value="Friend">Friend / Colleague</option>
                  <option value="Guardian">Legal Guardian</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={savingContact}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                {savingContact ? 'Saving...' : 'Add Contact'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Customizable Alert Message Card */}
      <div className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-rose-500" />
          <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
            Customizable Emergency SMS Message
          </h4>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          This customized note will be attached to every SMS alert dispatched to your contacts alongside your real-time Google Maps coordinates.
        </p>

        <form onSubmit={handleSaveAlertMessage} className="space-y-3">
          <textarea
            rows={2}
            value={customAlertMessage}
            onChange={(e) => setCustomAlertMessage(e.target.value)}
            placeholder="e.g. Please check on me, house keys are with apartment manager or in lockbox code 1234. I take insulin daily."
            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-rose-500 resize-none"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingMessage}
              className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              {savingMessage ? 'Saving Note...' : 'Save Custom Alert Note'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
