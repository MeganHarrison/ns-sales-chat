"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  User,
  Bot,
  Clock,
  Search,
  Filter,
  ExternalLink,
  RefreshCw,
  Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatValue } from "@/lib/formatters";

interface IntercomMessage {
  message_id: string;
  conversation_id: string;
  part_type: string;
  body: string;
  created_at: string;
  updated_at: string;
  notified_at?: string;
  author_type: string;
  author_id: string;
  author_name?: string;
  author_email?: string;
  assigned_to_id?: string;
  assigned_to_type?: string;
  external_id?: string;
  message_index: number;
  redacted?: boolean;
  attachments?: any[];
  synced_at: string;
}

const AUTHOR_TYPE_COLORS = {
  user: "bg-blue-100 text-blue-800",
  contact: "bg-green-100 text-green-800",
  admin: "bg-purple-100 text-purple-800",
  bot: "bg-gray-100 text-gray-800",
};

const PART_TYPE_COLORS = {
  comment: "bg-blue-100 text-blue-800",
  note: "bg-yellow-100 text-yellow-800",
  assign: "bg-green-100 text-green-800",
  close: "bg-red-100 text-red-800",
  open: "bg-green-100 text-green-800",
  snooze: "bg-orange-100 text-orange-800",
  unsnooze: "bg-orange-100 text-orange-800",
};

export default function IntercomMessagesPage() {
  const [messages, setMessages] = useState<IntercomMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<IntercomMessage[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [conversationFilter, setConversationFilter] = useState("");
  const [authorTypeFilter, setAuthorTypeFilter] = useState("all");
  const [partTypeFilter, setPartTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"created_at" | "message_index">(
    "created_at"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(
    new Set()
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const itemsPerPage = 20;

  const supabase = createClient();

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    filterAndSortMessages();
  }, [
    messages,
    searchTerm,
    conversationFilter,
    authorTypeFilter,
    partTypeFilter,
    sortBy,
    sortOrder,
  ]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("intercom_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortMessages = () => {
    let filtered = [...messages];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (msg) =>
          msg.message_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          msg.body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          msg.author_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          msg.author_email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply conversation filter
    if (conversationFilter) {
      filtered = filtered.filter((msg) =>
        msg.conversation_id
          .toLowerCase()
          .includes(conversationFilter.toLowerCase())
      );
    }

    // Apply author type filter
    if (authorTypeFilter !== "all") {
      filtered = filtered.filter((msg) => msg.author_type === authorTypeFilter);
    }

    // Apply part type filter
    if (partTypeFilter !== "all") {
      filtered = filtered.filter((msg) => msg.part_type === partTypeFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case "created_at":
          compareValue =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "message_index":
          compareValue = (a.message_index || 0) - (b.message_index || 0);
          break;
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    setFilteredMessages(filtered);
    setCurrentPage(1);
  };

  const toggleMessageSelection = (messageId: string) => {
    const newSelection = new Set(selectedMessages);
    if (newSelection.has(messageId)) {
      newSelection.delete(messageId);
    } else {
      newSelection.add(messageId);
    }
    setSelectedMessages(newSelection);
  };

  const selectAllVisible = () => {
    const visibleIds = paginatedMessages.map((msg) => msg.message_id);
    setSelectedMessages(new Set(visibleIds));
  };

  const clearSelection = () => {
    setSelectedMessages(new Set());
  };

  const exportMessages = () => {
    const dataToExport =
      selectedMessages.size > 0
        ? filteredMessages.filter((msg) => selectedMessages.has(msg.message_id))
        : filteredMessages;

    const csv = [
      [
        "Message ID",
        "Conversation ID",
        "Author Type",
        "Author Name",
        "Part Type",
        "Body",
        "Created",
      ],
      ...dataToExport.map((msg) => [
        msg.message_id,
        msg.conversation_id,
        msg.author_type || "",
        msg.author_name || "",
        msg.part_type || "",
        (msg.body || "").replace(/"/g, '""').substring(0, 500), // Escape quotes and limit length
        formatValue(msg.created_at, "dateTime"),
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intercom-messages-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
  };

  const refreshData = async () => {
    setSyncing(true);
    try {
      await fetchMessages();
    } finally {
      setSyncing(false);
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  // Pagination
  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedMessages = filteredMessages.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Get unique values for filters
  const uniqueAuthorTypes = [
    ...new Set(messages.map((msg) => msg.author_type).filter(Boolean)),
  ];
  const uniquePartTypes = [
    ...new Set(messages.map((msg) => msg.part_type).filter(Boolean)),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading messages...</p>
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
              <MessageSquare className="h-6 w-6 text-blue-600" />
              Intercom Messages
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredMessages.length} messages found
              {selectedMessages.size > 0 &&
                ` • ${selectedMessages.size} selected`}
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
              onClick={exportMessages}
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
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Conversation Filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Filter by conversation ID..."
              value={conversationFilter}
              onChange={(e) => setConversationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Author Type Filter */}
          <select
            value={authorTypeFilter}
            onChange={(e) => setAuthorTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Authors</option>
            {uniqueAuthorTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>

          {/* Part Type Filter */}
          <select
            value={partTypeFilter}
            onChange={(e) => setPartTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {uniquePartTypes.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="created_at">Sort by Date</option>
            <option value="message_index">Sort by Index</option>
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
        {selectedMessages.size > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {selectedMessages.size} message
              {selectedMessages.size !== 1 ? "s" : ""} selected
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

      {/* Messages List */}
      <div className="space-y-4">
        {paginatedMessages.map((message) => (
          <div
            key={message.message_id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedMessages.has(message.message_id)}
                    onChange={() => toggleMessageSelection(message.message_id)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />

                  <div className="flex-1 min-w-0">
                    {/* Message Header */}
                    <div className="flex items-center gap-2 mb-2">
                      {message.author_type === "admin" ||
                      message.author_type === "bot" ? (
                        <Bot className="h-4 w-4 text-purple-600" />
                      ) : (
                        <User className="h-4 w-4 text-blue-600" />
                      )}

                      <span className="font-medium text-gray-900">
                        {message.author_name ||
                          message.author_email ||
                          `${message.author_type} ${message.author_id.slice(
                            -6
                          )}`}
                      </span>

                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          AUTHOR_TYPE_COLORS[
                            message.author_type as keyof typeof AUTHOR_TYPE_COLORS
                          ] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {message.author_type}
                      </span>

                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          PART_TYPE_COLORS[
                            message.part_type as keyof typeof PART_TYPE_COLORS
                          ] || "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {message.part_type}
                      </span>

                      <div className="flex items-center text-xs text-gray-500 ml-auto">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatValue(message.created_at, "dateTime")}
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="mb-3">
                      {message.body ? (
                        <div className="text-gray-900">
                          {expandedMessage === message.message_id ? (
                            <div className="whitespace-pre-wrap break-words">
                              {message.body}
                            </div>
                          ) : (
                            <div>
                              {truncateText(message.body, 200)}
                              {message.body.length > 200 && (
                                <button
                                  onClick={() =>
                                    setExpandedMessage(message.message_id)
                                  }
                                  className="text-blue-600 hover:text-blue-700 ml-2 text-sm"
                                >
                                  Show more
                                </button>
                              )}
                            </div>
                          )}
                          {expandedMessage === message.message_id &&
                            message.body.length > 200 && (
                              <button
                                onClick={() => setExpandedMessage(null)}
                                className="text-blue-600 hover:text-blue-700 mt-2 text-sm"
                              >
                                Show less
                              </button>
                            )}
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">
                          No message body
                        </div>
                      )}
                    </div>

                    {/* Message Footer */}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-4">
                        <span>Message #{message.message_index}</span>
                        <span>ID: {message.message_id.slice(-12)}...</span>
                        <button
                          onClick={() =>
                            setConversationFilter(message.conversation_id)
                          }
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Conversation: {message.conversation_id.slice(-8)}...
                        </button>
                      </div>

                      {message.redacted && (
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
                          Redacted
                        </span>
                      )}
                    </div>

                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-2 p-2 bg-gray-50 rounded">
                        <div className="text-xs text-gray-600">
                          📎 {message.attachments.length} attachment
                          {message.attachments.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
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
      {filteredMessages.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No messages found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ||
            conversationFilter ||
            authorTypeFilter !== "all" ||
            partTypeFilter !== "all"
              ? "Try adjusting your filters or search term"
              : "No messages have been synced yet"}
          </p>
        </div>
      )}
    </div>
  );
}
