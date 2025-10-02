'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

interface ActiveClient {
  id: string;
  keap_id: string;
  email: string;
  given_name: string;
  family_name: string;
  company_name: string;
  lifecycle_stage: string;
  lead_score: number;
  tags: any[];
  date_created: string;
  last_updated: string;
}

interface ClientStatusChange {
  id: string;
  keap_id: string;
  email: string;
  given_name: string;
  family_name: string;
  added_tags: string;
  removed_tags: string;
  old_lifecycle_stage: string;
  new_lifecycle_stage: string;
  changed_at: string;
}

interface SyncStats {
  total_contacts: number;
  active_clients: number;
  synced_contacts: number;
  failed_syncs: number;
  last_sync: string;
  sync_success_rate: number;
}

export default function ActiveClientsPage() {
  const [activeClients, setActiveClients] = useState<ActiveClient[]>([]);
  const [statusChanges, setStatusChanges] = useState<ClientStatusChange[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchData();
    const subscription = setupRealtimeSubscription();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: clients, error: clientsError } = await supabase
        .from('active_clients')
        .select('*')
        .order('last_updated', { ascending: false });

      if (!clientsError && clients) {
        setActiveClients(clients);
      }

      const { data: changes, error: changesError } = await supabase
        .from('client_status_changes')
        .select('*')
        .limit(50);

      if (!changesError && changes) {
        setStatusChanges(changes);
      }

      const { data: stats, error: statsError } = await supabase
        .rpc('get_sync_statistics');

      if (!statsError && stats && stats.length > 0) {
        setSyncStats(stats[0]);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    return supabase
      .channel('active_clients_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'keap_contacts' },
        (payload) => {
          console.log('Real-time update:', payload);
          fetchData();
        }
      )
      .subscribe();
  };

  const triggerSync = async (type: 'full' | 'incremental' = 'incremental') => {
    setSyncing(true);
    try {
      const response = await fetch('/api/keap/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Sync result:', result);
        await fetchData();
      } else {
        console.error('Sync failed');
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  const filteredClients = activeClients.filter(client => {
    const matchesSearch = searchTerm
      ? `${client.given_name} ${client.family_name} ${client.email} ${client.company_name}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      : true;

    const matchesFilter = filter === 'all' ? true :
      filter === 'customer' ? client.lifecycle_stage === 'Customer' :
      filter === 'lead' ? client.lifecycle_stage === 'Lead' :
      filter === 'prospect' ? client.lifecycle_stage === 'Prospect' :
      true;

    return matchesSearch && matchesFilter;
  });

  const stats = {
    totalActive: activeClients.length,
    customers: activeClients.filter(c => c.lifecycle_stage === 'Customer').length,
    leads: activeClients.filter(c => c.lifecycle_stage === 'Lead').length,
    prospects: activeClients.filter(c => c.lifecycle_stage === 'Prospect').length,
    recentChanges: statusChanges.filter(c =>
      new Date(c.changed_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading active clients...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Active Clients</h1>
          <p className="text-gray-600 mt-1">
            Clients with "Active Client" tag from Keap CRM
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => triggerSync('incremental')}
            disabled={syncing}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
          <button
            onClick={() => triggerSync('full')}
            disabled={syncing}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-400"
          >
            Full Sync
          </button>
        </div>
      </div>

      {syncStats && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
            <div>
              <div className="text-gray-500">Total Contacts</div>
              <div className="font-semibold">{syncStats.total_contacts.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-500">Active Clients</div>
              <div className="font-semibold text-green-600">
                {syncStats.active_clients.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Synced</div>
              <div className="font-semibold">{syncStats.synced_contacts.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-500">Failed</div>
              <div className="font-semibold text-red-600">
                {syncStats.failed_syncs.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Success Rate</div>
              <div className="font-semibold">{syncStats.sync_success_rate}%</div>
            </div>
            <div>
              <div className="text-gray-500">Last Sync</div>
              <div className="font-semibold">
                {syncStats.last_sync
                  ? new Date(syncStats.last_sync).toLocaleString()
                  : 'Never'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{stats.totalActive}</div>
          <div className="text-gray-600">Total Active</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{stats.customers}</div>
          <div className="text-gray-600">Customers</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{stats.leads}</div>
          <div className="text-gray-600">Leads</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">{stats.prospects}</div>
          <div className="text-gray-600">Prospects</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-red-600">{stats.recentChanges}</div>
          <div className="text-gray-600">Changes (7d)</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search active clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Lifecycle Stages</option>
            <option value="customer">Customers</option>
            <option value="lead">Leads</option>
            <option value="prospect">Prospects</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-3 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Active Clients ({filteredClients.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {client.given_name} {client.family_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{client.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{client.company_name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                      ${
                        client.lifecycle_stage === 'Customer'
                          ? 'bg-green-100 text-green-800'
                          : client.lifecycle_stage === 'Lead'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {client.lifecycle_stage || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">{client.lead_score || 0}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {client.tags.slice(0, 3).map((tag: any, index: number) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                        >
                          {tag.name}
                        </span>
                      ))}
                      {client.tags.length > 3 && (
                        <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">
                          +{client.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {new Date(client.last_updated).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredClients.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No active clients found matching your filters
            </div>
          )}
        </div>
      </div>

      {statusChanges.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">Recent Status Changes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Change Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statusChanges.slice(0, 10).map((change) => (
                  <tr key={change.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {change.given_name} {change.family_name}
                      </div>
                      <div className="text-xs text-gray-500">{change.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {change.added_tags?.includes('Active Client') && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Became Active
                        </span>
                      )}
                      {change.removed_tags?.includes('Active Client') && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                          Became Inactive
                        </span>
                      )}
                      {change.old_lifecycle_stage && (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                          Stage Changed
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {change.old_lifecycle_stage && (
                          <div>
                            {change.old_lifecycle_stage} → {change.new_lifecycle_stage}
                          </div>
                        )}
                        {change.added_tags && (
                          <div className="text-xs text-green-600">+{change.added_tags}</div>
                        )}
                        {change.removed_tags && (
                          <div className="text-xs text-red-600">-{change.removed_tags}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">
                        {new Date(change.changed_at).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}