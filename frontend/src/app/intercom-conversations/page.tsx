"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle,
  Users,
  Clock,
  Filter,
  Search,
  Eye,
  RefreshCw,
  Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatValue } from "@/lib/formatters";

interface IntercomConversation {
  conversation_id: string;
  type: string;
  created_at: string;
  updated_at: string;
  waiting_since?: string;
  snoozed_until?: string;
  state: string;
  open?: boolean;
  read?: boolean;
  priority: string;
  assignee_id?: string;
  tags?: string[];
  first_contact_reply_created_at?: string;
  first_contact_reply_type?: string;
  first_contact_reply_url?: string;
  contact_ids?: string[];
  teammates?: any[];
  title?: string;
  custom_attributes?: any;
  statistics?: {
    time_to_assignment?: number;
    time_to_admin_reply?: number;
    time_to_first_close?: number;
    time_to_last_close?: number;
    median_time_to_reply?: number;
    first_contact_reply_at?: number;
    first_assignment_at?: number;
    first_admin_reply_at?: number;
    first_close_at?: number;
    last_assignment_at?: number;
    last_assignment_admin_reply_at?: number;
    last_contact_reply_at?: number;
    last_admin_reply_at?: number;
    last_close_at?: number;
    last_closed_by_id?: string;
    count_reopens?: number;
    count_assignments?: number;
    count_conversation_parts?: number;
  };
  synced_at: string;
}

const STATE_COLORS = {
  open: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
  snoozed: "bg-yellow-100 text-yellow-800",
  unassigned: "bg-red-100 text-red-800",
};

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-800",
  normal: "bg-blue-100 text-blue-800",
  low: "bg-gray-100 text-gray-800",
};

export default function IntercomConversationsPage() {
  const [conversations, setConversations] = useState<IntercomConversation[]>(
    []
  );
  const [filteredConversations, setFilteredConversations] = useState<
    IntercomConversation[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"created_at" | "updated_at" | "state">(
    "updated_at"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedConversations, setSelectedConversations] = useState<
    Set<string>
  >(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const itemsPerPage = 20;

  const supabase = createClient();

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    filterAndSortConversations();
  }, [
    conversations,
    searchTerm,
    stateFilter,
    priorityFilter,
    sortBy,
    sortOrder,
  ]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      console.log("Fetching conversations from Supabase...");
      console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);

      const { data, error } = await supabase
        .from("intercom_conversations")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      console.log("Fetched conversations:", data?.length || 0, "items");
      setConversations(data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortConversations = () => {
    let filtered = [...conversations];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (conv) =>
          conv.conversation_id
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          conv.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          conv.type?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply state filter
    if (stateFilter !== "all") {
      filtered = filtered.filter((conv) => conv.state === stateFilter);
    }

    // Apply priority filter
    if (priorityFilter !== "all") {
      filtered = filtered.filter((conv) => conv.priority === priorityFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case "created_at":
          compareValue =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "updated_at":
          compareValue =
            new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case "state":
          compareValue = (a.state || "").localeCompare(b.state || "");
          break;
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    setFilteredConversations(filtered);
    setCurrentPage(1);
  };

  const toggleConversationSelection = (conversationId: string) => {
    const newSelection = new Set(selectedConversations);
    if (newSelection.has(conversationId)) {
      newSelection.delete(conversationId);
    } else {
      newSelection.add(conversationId);
    }
    setSelectedConversations(newSelection);
  };

  const selectAllVisible = () => {
    const visibleIds = paginatedConversations.map(
      (conv) => conv.conversation_id
    );
    setSelectedConversations(new Set(visibleIds));
  };

  const clearSelection = () => {
    setSelectedConversations(new Set());
  };

  const exportConversations = () => {
    const dataToExport =
      selectedConversations.size > 0
        ? filteredConversations.filter((conv) =>
            selectedConversations.has(conv.conversation_id)
          )
        : filteredConversations;

    const csv = [
      [
        "Conversation ID",
        "Type",
        "State",
        "Priority",
        "Created",
        "Updated",
        "Title",
      ],
      ...dataToExport.map((conv) => [
        conv.conversation_id,
        conv.type || "",
        conv.state || "",
        conv.priority || "",
        formatValue(conv.created_at, "dateTime"),
        formatValue(conv.updated_at, "dateTime"),
        conv.title || "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intercom-conversations-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
  };

  const refreshData = async () => {
    setSyncing(true);
    try {
      await fetchConversations();
    } finally {
      setSyncing(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(filteredConversations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedConversations = filteredConversations.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Get unique states and priorities for filters
  const uniqueStates = [
    ...new Set(conversations.map((conv) => conv.state).filter(Boolean)),
  ];
  const uniquePriorities = [
    ...new Set(conversations.map((conv) => conv.priority).filter(Boolean)),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              Intercom Conversations
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredConversations.length} conversations found
              {selectedConversations.size > 0 &&
                ` • ${selectedConversations.size} selected`}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={refreshData}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
              />
              {syncing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              onClick={exportConversations}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* State Filter */}
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All States</option>
            {uniqueStates.map((state) => (
              <option key={state} value={state}>
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Priorities</option>
            {uniquePriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="updated_at">Sort by Updated</option>
            <option value="created_at">Sort by Created</option>
            <option value="state">Sort by State</option>
          </select>

          {/* Sort Order */}
          <button
            onClick={() =>
              setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
            }
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            {sortOrder === "asc" ? "↑ Ascending" : "↓ Descending"}
          </button>
        </div>

        {/* Bulk Actions */}
        {selectedConversations.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedConversations.size} conversation
              {selectedConversations.size !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={clearSelection}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear selection
            </button>
            <button
              onClick={selectAllVisible}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Select all visible
            </button>
          </div>
        )}
      </div>

      {/* Conversations Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={
                      selectedConversations.size ===
                        paginatedConversations.length &&
                      paginatedConversations.length > 0
                    }
                    onChange={() =>
                      selectedConversations.size ===
                      paginatedConversations.length
                        ? clearSelection()
                        : selectAllVisible()
                    }
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Updated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedConversations.map((conversation) => (
                <tr
                  key={conversation.conversation_id}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedConversations.has(
                        conversation.conversation_id
                      )}
                      onChange={() =>
                        toggleConversationSelection(
                          conversation.conversation_id
                        )
                      }
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900">
                        {conversation.conversation_id.slice(-12)}...
                      </div>
                      {conversation.title && (
                        <div className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                          {conversation.title}
                        </div>
                      )}
                      <div className="text-xs text-gray-400">
                        Type: {conversation.type || "N/A"}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        STATE_COLORS[
                          conversation.state as keyof typeof STATE_COLORS
                        ] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {conversation.state || "Unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        PRIORITY_COLORS[
                          conversation.priority as keyof typeof PRIORITY_COLORS
                        ] || "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {conversation.priority || "Normal"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatValue(conversation.created_at, "dateTime")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatValue(conversation.updated_at, "dateTime")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() =>
                        setShowDetails(
                          showDetails === conversation.conversation_id
                            ? null
                            : conversation.conversation_id
                        )
                      }
                      className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      {showDetails === conversation.conversation_id
                        ? "Hide"
                        : "View"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-lg shadow-sm p-4 mt-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1 rounded ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredConversations.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No conversations found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || stateFilter !== "all" || priorityFilter !== "all"
              ? "Try adjusting your filters or search term"
              : "No conversations have been synced yet"}
          </p>
        </div>
      )}
    </div>
  );
}
