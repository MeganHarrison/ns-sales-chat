"use client";

import { useState, useEffect } from "react";
import {
  Tag,
  Hash,
  Calendar,
  TrendingUp,
  RefreshCw,
  Download,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatValue } from "@/lib/formatters";

interface IntercomTag {
  tag_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  synced_at: string;
}

interface TagUsage {
  tag_id: string;
  tag_name: string;
  conversation_count: number;
}

export default function IntercomTagsPage() {
  const [tags, setTags] = useState<IntercomTag[]>([]);
  const [tagUsage, setTagUsage] = useState<TagUsage[]>([]);
  const [filteredTags, setFilteredTags] = useState<IntercomTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "created_at" | "usage">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchTags();
    fetchTagUsage();
  }, []);

  useEffect(() => {
    filterAndSortTags();
  }, [tags, tagUsage, searchTerm, sortBy, sortOrder]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("intercom_tags")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;

      setTags(data || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTagUsage = async () => {
    try {
      // Get tag usage from conversation_tags junction table
      const { data, error } = await supabase
        .from("intercom_conversation_tags")
        .select("tag_id");

      if (error) throw error;

      // Count usage by tag_id
      const usageMap = new Map<string, number>();
      data?.forEach((item) => {
        const count = usageMap.get(item.tag_id) || 0;
        usageMap.set(item.tag_id, count + 1);
      });

      // Convert to array with tag names
      const usageData: TagUsage[] = [];
      tags.forEach((tag) => {
        usageData.push({
          tag_id: tag.tag_id,
          tag_name: tag.name,
          conversation_count: usageMap.get(tag.tag_id) || 0,
        });
      });

      setTagUsage(usageData);
    } catch (error) {
      console.error("Error fetching tag usage:", error);
      setTagUsage([]);
    }
  };

  const filterAndSortTags = () => {
    let filtered = [...tags];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (tag) =>
          tag.tag_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tag.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (sortBy) {
        case "name":
          compareValue = a.name.localeCompare(b.name);
          break;
        case "created_at":
          compareValue =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "usage":
          const aUsage =
            tagUsage.find((usage) => usage.tag_id === a.tag_id)
              ?.conversation_count || 0;
          const bUsage =
            tagUsage.find((usage) => usage.tag_id === b.tag_id)
              ?.conversation_count || 0;
          compareValue = aUsage - bUsage;
          break;
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    setFilteredTags(filtered);
  };

  const toggleTagSelection = (tagId: string) => {
    const newSelection = new Set(selectedTags);
    if (newSelection.has(tagId)) {
      newSelection.delete(tagId);
    } else {
      newSelection.add(tagId);
    }
    setSelectedTags(newSelection);
  };

  const selectAll = () => {
    setSelectedTags(new Set(filteredTags.map((tag) => tag.tag_id)));
  };

  const clearSelection = () => {
    setSelectedTags(new Set());
  };

  const exportTags = () => {
    const dataToExport =
      selectedTags.size > 0
        ? filteredTags.filter((tag) => selectedTags.has(tag.tag_id))
        : filteredTags;

    const csv = [
      ["Tag ID", "Name", "Conversations", "Created", "Updated"],
      ...dataToExport.map((tag) => {
        const usage = tagUsage.find((u) => u.tag_id === tag.tag_id);
        return [
          tag.tag_id,
          tag.name,
          usage?.conversation_count?.toString() || "0",
          formatValue(tag.created_at, "dateTime"),
          formatValue(tag.updated_at, "dateTime"),
        ];
      }),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `intercom-tags-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const refreshData = async () => {
    setSyncing(true);
    try {
      await fetchTags();
      await fetchTagUsage();
    } finally {
      setSyncing(false);
    }
  };

  // Calculate statistics
  const totalTags = tags.length;
  const totalUsage = tagUsage.reduce(
    (sum, usage) => sum + usage.conversation_count,
    0
  );
  const mostUsedTag = tagUsage.reduce(
    (max, current) =>
      current.conversation_count > max.conversation_count ? current : max,
    { tag_name: "None", conversation_count: 0 }
  );
  const averageUsage = totalTags > 0 ? totalUsage / totalTags : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tags...</p>
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
              <Tag className="h-6 w-6 text-green-600" />
              Intercom Tags
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredTags.length} tags found
              {selectedTags.size > 0 && ` • ${selectedTags.size} selected`}
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
              onClick={exportTags}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <Hash className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">Total Tags</h3>
          </div>
          <p className="text-2xl font-bold text-blue-600">{totalTags}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-900">Total Usage</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">{totalUsage}</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <Tag className="h-5 w-5 text-purple-600" />
            <h3 className="font-semibold text-gray-900">Most Used</h3>
          </div>
          <p className="text-sm font-medium text-purple-600 truncate">
            {mostUsedTag.tag_name}
          </p>
          <p className="text-xs text-gray-500">
            {mostUsedTag.conversation_count} conversations
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900">Avg Usage</h3>
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {averageUsage.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="name">Sort by Name</option>
            <option value="created_at">Sort by Created</option>
            <option value="usage">Sort by Usage</option>
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

          {/* Bulk Actions */}
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Select All
            </button>
            {selectedTags.size > 0 && (
              <button
                onClick={clearSelection}
                className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700"
              >
                Clear ({selectedTags.size})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tags Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTags.map((tag) => {
          const usage = tagUsage.find((u) => u.tag_id === tag.tag_id);
          const conversationCount = usage?.conversation_count || 0;

          return (
            <div
              key={tag.tag_id}
              className={`bg-white rounded-lg shadow-sm border-2 transition-all hover:shadow-md cursor-pointer ${
                selectedTags.has(tag.tag_id)
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200"
              }`}
              onClick={() => toggleTagSelection(tag.tag_id)}
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-4 w-4 text-green-600" />
                      <h3 className="font-medium text-gray-900 truncate">
                        {tag.name}
                      </h3>
                    </div>
                    <p className="text-xs text-gray-500">ID: {tag.tag_id}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedTags.has(tag.tag_id)}
                    onChange={() => toggleTagSelection(tag.tag_id)}
                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* Usage Stats */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Conversations</span>
                    <span className="font-medium text-gray-900">
                      {conversationCount}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width:
                          totalUsage > 0
                            ? `${Math.min(
                                (conversationCount / totalUsage) * 100 * 10,
                                100
                              )}%`
                            : "0%",
                      }}
                    ></div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatValue(tag.created_at, "date")}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetails(
                        showDetails === tag.tag_id ? null : tag.tag_id
                      );
                    }}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {showDetails === tag.tag_id ? "Hide" : "Details"}
                  </button>
                </div>

                {/* Expanded Details */}
                {showDetails === tag.tag_id && (
                  <div
                    className="mt-3 p-3 bg-gray-50 rounded text-xs space-y-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <strong>Tag ID:</strong> {tag.tag_id}
                    </div>
                    <div>
                      <strong>Name:</strong> {tag.name}
                    </div>
                    <div>
                      <strong>Created:</strong>{" "}
                      {formatValue(tag.created_at, "dateTime")}
                    </div>
                    <div>
                      <strong>Updated:</strong>{" "}
                      {formatValue(tag.updated_at, "dateTime")}
                    </div>
                    <div>
                      <strong>Synced:</strong>{" "}
                      {formatValue(tag.synced_at, "dateTime")}
                    </div>
                    <div>
                      <strong>Conversations:</strong> {conversationCount}
                    </div>
                    {conversationCount > 0 && (
                      <div>
                        <strong>Usage %:</strong>{" "}
                        {((conversationCount / totalUsage) * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredTags.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No tags found
          </h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? "Try adjusting your search term"
              : "No tags have been synced yet"}
          </p>
        </div>
      )}

      {/* Usage Distribution Chart */}
      {filteredTags.length > 0 && (
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tag Usage Distribution
          </h3>
          <div className="space-y-2">
            {tagUsage
              .sort((a, b) => b.conversation_count - a.conversation_count)
              .slice(0, 10)
              .map((usage, index) => (
                <div key={usage.tag_id} className="flex items-center gap-3">
                  <div className="w-4 text-xs text-gray-500">{index + 1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {usage.tag_name}
                      </span>
                      <span className="text-sm text-gray-600">
                        {usage.conversation_count}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width:
                            totalUsage > 0
                              ? `${
                                  (usage.conversation_count / totalUsage) * 100
                                }%`
                              : "0%",
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
