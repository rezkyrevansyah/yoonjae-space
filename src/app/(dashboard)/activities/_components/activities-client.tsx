"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ChevronDown, ChevronLeft, ChevronRight, Activity } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import type { ActivityLog } from "@/lib/types/database";

const supabase = createClient();
const PAGE_SIZE = 25;

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  LOGIN:  "bg-purple-100 text-purple-700",
};

const ENTITY_LABELS: Record<string, string> = {
  bookings: "Booking",
  customers: "Customer",
  expenses: "Expense",
  vendors: "Vendor",
  commissions: "Komisi",
  booking_reminders: "Reminder",
  users: "User",
  roles: "Role",
  settings_general: "Pengaturan",
  settings_studio_info: "Info Studio",
  settings_reminder_templates: "Template Reminder",
};

function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Baru saja";
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  return new Date(isoStr).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function absoluteTime(isoStr: string): string {
  return new Date(isoStr).toLocaleString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function ActivitiesClient() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterEntity, setFilterEntity] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("activity_log")
      .select("id, user_id, user_name, user_role, action, entity, entity_id, description, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (search) {
      query = query.or(`description.ilike.%${search}%,user_name.ilike.%${search}%`);
    }
    if (filterEntity) query = query.eq("entity", filterEntity);
    if (filterAction) query = query.eq("action", filterAction);

    const { data, count } = await query;
    setLogs(data ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  }, [page, search, filterEntity, filterAction]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [search, filterEntity, filterAction]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
  }

  // Collect unique entities for filter dropdown
  const ENTITY_OPTIONS = Object.entries(ENTITY_LABELS);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Activities</h1>
        <p className="text-sm text-gray-500">Log semua aktivitas sistem</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onBlur={() => setSearch(searchInput)}
            placeholder="Cari deskripsi atau user..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 focus:border-[#8B1A1A]"
          />
        </form>

        {/* Entity filter */}
        <div className="relative">
          <select
            value={filterEntity}
            onChange={e => setFilterEntity(e.target.value)}
            className="appearance-none text-sm font-medium border border-gray-200 rounded-xl pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 cursor-pointer"
          >
            <option value="">Semua Entitas</option>
            {ENTITY_OPTIONS.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        </div>

        {/* Action filter */}
        <div className="relative">
          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="appearance-none text-sm font-medium border border-gray-200 rounded-xl pl-3 pr-8 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#8B1A1A]/30 cursor-pointer"
          >
            <option value="">Semua Aksi</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="LOGIN">Login</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        </div>
      </div>

      {/* Log list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm text-gray-400">Tidak ada aktivitas ditemukan</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100">
                    <th className="px-4 py-3 text-left font-medium">Waktu</th>
                    <th className="px-4 py-3 text-left font-medium">User</th>
                    <th className="px-4 py-3 text-left font-medium">Aksi</th>
                    <th className="px-4 py-3 text-left font-medium">Entitas</th>
                    <th className="px-4 py-3 text-left font-medium">Deskripsi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs font-medium text-gray-700">{relativeTime(log.created_at)}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{absoluteTime(log.created_at)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-900">{log.user_name}</p>
                        {log.user_role && (
                          <p className="text-xs text-gray-400">{log.user_role}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {ENTITY_LABELS[log.entity] ?? log.entity}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700 max-w-xs">
                        <span className="line-clamp-2">{log.description}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile timeline */}
            <div className="md:hidden divide-y divide-gray-50">
              {logs.map(log => (
                <div key={log.id} className="px-4 py-3 flex gap-3">
                  {/* Action dot */}
                  <div className={`flex-shrink-0 mt-0.5 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                    {log.action[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-900 truncate">{log.user_name}</p>
                      <p className="flex-shrink-0 text-xs text-gray-400">{relativeTime(log.created_at)}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{log.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex px-1.5 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[log.action] ?? "bg-gray-100 text-gray-600"}`}>
                        {log.action}
                      </span>
                      <span className="text-xs text-gray-400">
                        {ENTITY_LABELS[log.entity] ?? log.entity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} dari {total} aktivitas
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-xs font-medium text-gray-600">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
