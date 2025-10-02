"use client";

import { useState, useEffect } from "react";
import {
  MessageCircle,
  Users,
  Shield,
  Tag,
  TrendingUp,
  Clock,
  Activity,
  BarChart3,
  RefreshCw,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatValue } from "@/lib/formatters";
import Link from "next/link";

interface DashboardStats {
  conversations: {
    total: number;
    open: number;
    closed: number;
    unassigned: number;
    recent: Array<{
      conversation_id: string;
      state: string;
      created_at: string;
      updated_at: string;
    }>;
  };
  messages: {
    total: number;
    byAuthorType: Array<{ author_type: string; count: number }>;
    recent: Array<{
      message_id: string;
      conversation_id: string;
      author_type: string;
      author_name?: string;
      created_at: string;
      body?: string;
    }>;
  };
  users: {
    total: number;
    byType: Array<{ type: string; count: number }>;
    active: number;
    emailSubscribed: number;
  };
  admins: {
    total: number;
    available: number;
    away: number;
    withInboxSeat: number;
  };
  tags: {
    total: number;
    mostUsed: Array<{ tag_name: string; usage_count: number }>;
  };
  syncStats: {
    lastSyncTime: string;
    totalDataPoints: number;
  };
}

export default function IntercomDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState("7d");

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardStats();
  }, [timeRange]);

  const fetchDashboardStats = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      const daysAgo =
        timeRange === "24h"
          ? 1
          : timeRange === "7d"
          ? 7
          : timeRange === "30d"
          ? 30
          : 90;
      const startDate = new Date(
        now.getTime() - daysAgo * 24 * 60 * 60 * 1000
      ).toISOString();

      // Fetch conversations stats
      const [
        conversationsResult,
        conversationsByStateResult,
        recentConversationsResult,
      ] = await Promise.all([
        supabase
          .from("intercom_conversations")
          .select("conversation_id", { count: "exact" }),
        supabase
          .from("intercom_conversations")
          .select("state", { count: "exact" }),
        supabase
          .from("intercom_conversations")
          .select("conversation_id, state, created_at, updated_at")
          .order("updated_at", { ascending: false })
          .limit(5),
      ]);

      // Fetch messages stats
      const [messagesResult, messagesByAuthorResult, recentMessagesResult] =
        await Promise.all([
          supabase
            .from("intercom_messages")
            .select("message_id", { count: "exact" }),
          supabase
            .from("intercom_messages")
            .select("author_type", { count: "exact" }),
          supabase
            .from("intercom_messages")
            .select(
              "message_id, conversation_id, author_type, author_name, created_at, body"
            )
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

      // Fetch users stats
      const [usersResult, usersByTypeResult] = await Promise.all([
        supabase.from("intercom_users").select("user_id", { count: "exact" }),
        supabase.from("intercom_users").select("type", { count: "exact" }),
      ]);

      // Get additional user stats
      const [activeUsersResult, subscribedUsersResult] = await Promise.all([
        supabase
          .from("intercom_users")
          .select("user_id", { count: "exact" })
          .not("last_seen_at", "is", null),
        supabase
          .from("intercom_users")
          .select("user_id", { count: "exact" })
          .eq("unsubscribed_from_emails", false),
      ]);

      // Fetch admins stats
      const [
        adminsResult,
        availableAdminsResult,
        awayAdminsResult,
        inboxAdminsResult,
      ] = await Promise.all([
        supabase.from("intercom_admins").select("admin_id", { count: "exact" }),
        supabase
          .from("intercom_admins")
          .select("admin_id", { count: "exact" })
          .eq("away_mode_enabled", false),
        supabase
          .from("intercom_admins")
          .select("admin_id", { count: "exact" })
          .eq("away_mode_enabled", true),
        supabase
          .from("intercom_admins")
          .select("admin_id", { count: "exact" })
          .eq("has_inbox_seat", true),
      ]);

      // Fetch tags stats
      const [tagsResult, tagUsageResult] = await Promise.all([
        supabase.from("intercom_tags").select("tag_id", { count: "exact" }),
        supabase
          .from("intercom_conversation_tags")
          .select("tag_id", { count: "exact" }),
      ]);

      // Process conversation states
      const stateGroups =
        conversationsByStateResult.data?.reduce((acc: any, item: any) => {
          acc[item.state] = (acc[item.state] || 0) + 1;
          return acc;
        }, {}) || {};

      // Process message author types
      const authorGroups =
        messagesByAuthorResult.data?.reduce((acc: any, item: any) => {
          acc[item.author_type] = (acc[item.author_type] || 0) + 1;
          return acc;
        }, {}) || {};

      // Process user types
      const userTypeGroups =
        usersByTypeResult.data?.reduce((acc: any, item: any) => {
          acc[item.type] = (acc[item.type] || 0) + 1;
          return acc;
        }, {}) || {};

      // Calculate most recent sync time
      const syncTimes = [
        ...(conversationsResult.data || []),
        ...(messagesResult.data || []),
        ...(usersResult.data || []),
        ...(adminsResult.data || []),
        ...(tagsResult.data || []),
      ];
      const lastSyncTime = new Date().toISOString(); // Approximate

      // Build dashboard stats
      const dashboardStats: DashboardStats = {
        conversations: {
          total: conversationsResult.count || 0,
          open: stateGroups.open || 0,
          closed: stateGroups.closed || 0,
          unassigned: stateGroups.unassigned || 0,
          recent: recentConversationsResult.data || [],
        },
        messages: {
          total: messagesResult.count || 0,
          byAuthorType: Object.entries(authorGroups).map(([type, count]) => ({
            author_type: type,
            count: count as number,
          })),
          recent: recentMessagesResult.data || [],
        },
        users: {
          total: usersResult.count || 0,
          byType: Object.entries(userTypeGroups).map(([type, count]) => ({
            type,
            count: count as number,
          })),
          active: activeUsersResult.count || 0,
          emailSubscribed: subscribedUsersResult.count || 0,
        },
        admins: {
          total: adminsResult.count || 0,
          available: availableAdminsResult.count || 0,
          away: awayAdminsResult.count || 0,
          withInboxSeat: inboxAdminsResult.count || 0,
        },
        tags: {
          total: tagsResult.count || 0,
          mostUsed: [], // TODO: Calculate tag usage
        },
        syncStats: {
          lastSyncTime,
          totalDataPoints:
            (conversationsResult.count || 0) +
            (messagesResult.count || 0) +
            (usersResult.count || 0) +
            (adminsResult.count || 0) +
            (tagsResult.count || 0),
        },
      };

      setStats(dashboardStats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await fetchDashboardStats();
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Failed to load dashboard data</p>
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
              <BarChart3 className="h-6 w-6 text-blue-600" />
              Intercom Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Overview of your Intercom data and sync status
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>

            <button
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Link href="/intercom-conversations" className="group">
          <div className="bg-white rounded-lg shadow-sm p-6 group-hover:shadow-md transition-shadow border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.conversations.total}
                </p>
                <p className="text-sm text-gray-600">Conversations</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-green-600">
                {stats.conversations.open} open
              </span>
              <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-blue-600" />
            </div>
          </div>
        </Link>

        <Link href="/intercom-messages" className="group">
          <div className="bg-white rounded-lg shadow-sm p-6 group-hover:shadow-md transition-shadow border-l-4 border-green-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MessageCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.messages.total}
                </p>
                <p className="text-sm text-gray-600">Messages</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-blue-600">
                {stats.messages.byAuthorType.find(
                  (t) => t.author_type === "user"
                )?.count || 0}{" "}
                from users
              </span>
              <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-green-600" />
            </div>
          </div>
        </Link>

        <Link href="/intercom-users" className="group">
          <div className="bg-white rounded-lg shadow-sm p-6 group-hover:shadow-md transition-shadow border-l-4 border-purple-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.users.total}
                </p>
                <p className="text-sm text-gray-600">Users</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-green-600">
                {stats.users.active} active
              </span>
              <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-purple-600" />
            </div>
          </div>
        </Link>

        <Link href="/intercom-tags" className="group">
          <div className="bg-white rounded-lg shadow-sm p-6 group-hover:shadow-md transition-shadow border-l-4 border-orange-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Tag className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.tags.total}
                </p>
                <p className="text-sm text-gray-600">Tags</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-blue-600">Available</span>
              <ExternalLink className="h-3 w-3 text-gray-400 group-hover:text-orange-600" />
            </div>
          </div>
        </Link>
      </div>

      {/* Charts and Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Conversation States */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Conversation States
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Open</span>
              <span className="text-sm font-medium text-green-600">
                {stats.conversations.open}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width:
                    stats.conversations.total > 0
                      ? `${
                          (stats.conversations.open /
                            stats.conversations.total) *
                          100
                        }%`
                      : "0%",
                }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Closed</span>
              <span className="text-sm font-medium text-gray-600">
                {stats.conversations.closed}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-600 h-2 rounded-full"
                style={{
                  width:
                    stats.conversations.total > 0
                      ? `${
                          (stats.conversations.closed /
                            stats.conversations.total) *
                          100
                        }%`
                      : "0%",
                }}
              ></div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Unassigned</span>
              <span className="text-sm font-medium text-red-600">
                {stats.conversations.unassigned}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-red-600 h-2 rounded-full"
                style={{
                  width:
                    stats.conversations.total > 0
                      ? `${
                          (stats.conversations.unassigned /
                            stats.conversations.total) *
                          100
                        }%`
                      : "0%",
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Message Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Message Distribution
          </h3>
          <div className="space-y-3">
            {stats.messages.byAuthorType.map((author, index) => {
              const colors = [
                "bg-blue-600",
                "bg-green-600",
                "bg-purple-600",
                "bg-orange-600",
              ];
              const textColors = [
                "text-blue-600",
                "text-green-600",
                "text-purple-600",
                "text-orange-600",
              ];

              return (
                <div key={author.author_type}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">
                      {author.author_type}
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        textColors[index % textColors.length]
                      }`}
                    >
                      {author.count}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        colors[index % colors.length]
                      }`}
                      style={{
                        width:
                          stats.messages.total > 0
                            ? `${(author.count / stats.messages.total) * 100}%`
                            : "0%",
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Team Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Link href="/intercom-admins" className="group">
          <div className="bg-white rounded-lg shadow-sm p-6 group-hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Team Status
              </h3>
              <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-purple-600 ml-auto" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500">Total</div>
                <div className="font-medium">{stats.admins.total}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Available</div>
                <div className="font-medium text-green-600">
                  {stats.admins.available}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Away</div>
                <div className="font-medium text-orange-600">
                  {stats.admins.away}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">With Inbox</div>
                <div className="font-medium text-blue-600">
                  {stats.admins.withInboxSeat}
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* User Types */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">User Types</h3>
          </div>
          <div className="space-y-2 text-sm">
            {stats.users.byType.map((userType) => (
              <div
                key={userType.type}
                className="flex items-center justify-between"
              >
                <span className="text-gray-600 capitalize">
                  {userType.type}
                </span>
                <span className="font-medium">{userType.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sync Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Sync Status</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Total Data Points</div>
              <div className="font-medium text-green-600">
                {stats.syncStats.totalDataPoints.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Last Updated</div>
              <div className="font-medium">
                {formatValue(stats.syncStats.lastSyncTime, "dateTime")}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600">Active Sync</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Conversations */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Conversations
            </h3>
            <Link
              href="/intercom-conversations"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.conversations.recent.map((conv) => (
              <div
                key={conv.conversation_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {conv.conversation_id.slice(-12)}...
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatValue(conv.updated_at, "dateTime")}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    conv.state === "open"
                      ? "bg-green-100 text-green-800"
                      : conv.state === "closed"
                      ? "bg-gray-100 text-gray-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {conv.state}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Messages */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Recent Messages
            </h3>
            <Link
              href="/intercom-messages"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              View all <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {stats.messages.recent.slice(0, 5).map((msg) => (
              <div key={msg.message_id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium text-gray-900">
                    {msg.author_name ||
                      `${msg.author_type} ${msg.conversation_id.slice(-6)}`}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      msg.author_type === "user"
                        ? "bg-blue-100 text-blue-800"
                        : msg.author_type === "admin"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {msg.author_type}
                  </span>
                </div>
                {msg.body && (
                  <div className="text-xs text-gray-600 truncate mb-1">
                    {msg.body.substring(0, 100)}...
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  {formatValue(msg.created_at, "dateTime")}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
