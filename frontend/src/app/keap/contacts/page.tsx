'use client';

import { useEffect, useState } from 'react';
import { KeapContact, KeapLifecycleStage } from '@/lib/keap/keap-types';
import * as utils from '@/lib/keap/keap-utils';

export default function KeapContactsPage() {
  const [contacts, setContacts] = useState<KeapContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState<KeapLifecycleStage | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const itemsPerPage = 100;

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async (loadMore = false) => {
    try {
      if (loadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setContacts([]);
      }

      // Calculate offset for pagination
      const offset = loadMore ? contacts.length : 0;

      // Use API route with pagination
      const response = await fetch(`/api/keap/contacts?limit=${itemsPerPage}&offset=${offset}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch contacts');
      }

      const data = await response.json();

      if (loadMore) {
        setContacts(prev => [...prev, ...(data.items || [])]);
      } else {
        setContacts(data.items || []);
      }

      setTotalCount(data.count || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadAllContacts = async () => {
    if (contacts.length >= totalCount) return;

    setLoadingMore(true);
    try {
      // Load all remaining contacts
      const remainingCount = totalCount - contacts.length;
      const numCalls = Math.ceil(remainingCount / itemsPerPage);

      for (let i = 0; i < numCalls; i++) {
        const offset = contacts.length + (i * itemsPerPage);
        const response = await fetch(`/api/keap/contacts?limit=${itemsPerPage}&offset=${offset}`);

        if (!response.ok) {
          throw new Error('Failed to fetch contacts');
        }

        const data = await response.json();
        setContacts(prev => [...prev, ...(data.items || [])]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load all contacts');
    } finally {
      setLoadingMore(false);
    }
  };

  // Filter contacts based on search and stage
  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = searchTerm ?
      utils.searchContacts([contact], searchTerm).length > 0 : true;
    const matchesStage = filterStage ?
      contact.lifecycle_stage === filterStage : true;
    return matchesSearch && matchesStage;
  });

  // Calculate stats
  const stats = {
    total: contacts.length,
    leads: utils.filterContactsByStage(contacts, KeapLifecycleStage.LEAD).length,
    customers: utils.filterContactsByStage(contacts, KeapLifecycleStage.CUSTOMER).length,
    prospects: utils.filterContactsByStage(contacts, KeapLifecycleStage.PROSPECT).length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading contacts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
        <button
          onClick={fetchContacts}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Keap Contacts</h1>
        <p className="text-gray-600">Manage and view your Keap CRM contacts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-gray-600">Loaded Contacts</div>
          {totalCount > contacts.length && (
            <div className="text-xs text-gray-500 mt-1">
              {totalCount.toLocaleString()} total in Keap
            </div>
          )}
        </div>
        <div className="bg-blue-50 p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{stats.leads}</div>
          <div className="text-gray-600">Leads</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{stats.customers}</div>
          <div className="text-gray-600">Customers</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{stats.prospects}</div>
          <div className="text-gray-600">Prospects</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value as KeapLifecycleStage | '')}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Stages</option>
            <option value={KeapLifecycleStage.LEAD}>Leads</option>
            <option value={KeapLifecycleStage.PROSPECT}>Prospects</option>
            <option value={KeapLifecycleStage.CUSTOMER}>Customers</option>
            <option value={KeapLifecycleStage.PAST_CUSTOMER}>Past Customers</option>
          </select>
          <button
            onClick={fetchContacts}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Phone
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stage
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredContacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {utils.formatContactName(contact)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {utils.getContactPrimaryEmail(contact) || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {utils.getContactPrimaryPhone(contact) || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {contact.company_name || '-'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                    ${contact.lifecycle_stage === KeapLifecycleStage.LEAD ? 'bg-blue-100 text-blue-800' : ''}
                    ${contact.lifecycle_stage === KeapLifecycleStage.CUSTOMER ? 'bg-green-100 text-green-800' : ''}
                    ${contact.lifecycle_stage === KeapLifecycleStage.PROSPECT ? 'bg-purple-100 text-purple-800' : ''}
                  `}>
                    {contact.lifecycle_stage || 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-600">
                    {new Date(contact.date_created).toLocaleDateString()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredContacts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No contacts found matching your filters
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalCount > contacts.length && (
        <div className="mt-4 flex justify-center gap-4">
          <button
            onClick={() => fetchContacts(true)}
            disabled={loadingMore}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loadingMore ? 'Loading...' : `Load Next ${Math.min(itemsPerPage, totalCount - contacts.length)} Contacts`}
          </button>
          <button
            onClick={loadAllContacts}
            disabled={loadingMore}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400"
          >
            {loadingMore ? 'Loading...' : `Load All ${(totalCount - contacts.length).toLocaleString()} Remaining`}
          </button>
        </div>
      )}

      {loadingMore && (
        <div className="mt-4 text-center text-gray-600">
          Loading contacts... {contacts.length} / {totalCount}
        </div>
      )}

      {/* Export Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => {
            const csv = utils.exportContactsToCSV(filteredContacts);
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `keap-contacts-${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
          }}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
        >
          Export to CSV
        </button>
      </div>
    </div>
  );
}