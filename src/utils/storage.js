/* ─────────────────────────────────────────────────────────────────────────────
   storage.js  —  Supabase backend layer for DairyLedger

   Tables used:
     dl_users      → registered accounts (id, name, code, role, created_at)
     dl_receipts   → milk collection receipts (all fields + uploaded_by FK)

   Session:
     Still stored in localStorage (just a local cache of the logged-in user
     object — no secrets involved, so this is safe).

   Note on RLS:
     This file uses the anon key. The included schema.sql disables RLS for
     simplicity. For a fully public production app, add proper RLS policies
     in the Supabase dashboard before going live.
   ───────────────────────────────────────────────────────────────────────────── */

import { supabase } from "./supabaseClient";

const SESSION_KEY = "dl_session";
const ADMIN_CODE  = import.meta.env.VITE_ADMIN_CODE || "ADMIN0000";

// ─── Admin seed ───────────────────────────────────────────────────────────────

/**
 * Ensure the admin account exists in dl_users.
 * Called once on app start — safe to call repeatedly (upsert on id).
 */
export const seedAdmin = async () => {
  try {
    await supabase.from("dl_users").upsert(
      {
        id:         "admin-001",
        name:       "Admin",
        code:       ADMIN_CODE,
        role:       "admin",
        created_at: new Date().toISOString(),
      },
      { onConflict: "id", ignoreDuplicates: true }
    );
  } catch (e) {
    console.warn("[seedAdmin]", e.message);
  }
};

// ─── Users ────────────────────────────────────────────────────────────────────

/** Fetch all users ordered by creation date. */
export const getUsers = async () => {
  const { data, error } = await supabase
    .from("dl_users")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) { console.error("[getUsers]", error.message); return []; }
  return data ?? [];
};

/**
 * Register a new user.
 * @returns {{ user: object } | { error: string }}
 */
export const registerUser = async (name, code) => {
  const trimName = name.trim();
  const trimCode = code.trim().toUpperCase();

  if (!trimName)            return { error: "Name is required." };
  if (!trimCode)            return { error: "Code is required." };
  if (trimCode.length < 4) return { error: "Code must be at least 4 characters." };

  // Check uniqueness first (friendlier message than a raw DB constraint error)
  const { data: existing } = await supabase
    .from("dl_users")
    .select("id")
    .eq("code", trimCode)
    .maybeSingle();

  if (existing) return { error: "That code is already taken — choose a different one." };

  const newUser = {
    id:         `U-${Date.now()}`,
    name:       trimName,
    code:       trimCode,
    role:       "uploader",
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("dl_users").insert(newUser);
  if (error) return { error: error.message };
  return { user: newUser };
};

/**
 * Login with code only.
 * @returns {{ user: object } | { error: string }}
 */
export const loginUser = async (code) => {
  const trimCode = code.trim().toUpperCase();
  if (!trimCode) return { error: "Please enter your code." };

  const { data, error } = await supabase
    .from("dl_users")
    .select("*")
    .eq("code", trimCode)
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "No account found with that code." };
  return { user: data };
};

/**
 * Update a user's role (admin-only action).
 * Returns the updated user object.
 */
export const updateUserRole = async (userId, role) => {
  const { data, error } = await supabase
    .from("dl_users")
    .update({ role })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

// ─── Receipts ─────────────────────────────────────────────────────────────────

/**
 * Fetch all receipts, newest first.
 * imageUrl is never stored in the DB — it lives in memory during the session.
 */
export const getReceipts = async () => {
  const { data, error } = await supabase
    .from("dl_receipts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.error("[getReceipts]", error.message); return []; }
  return data ?? [];
};

/** Insert a new receipt. imageUrl is stripped before persisting. */
export const addReceipt = async (receipt) => {
  // eslint-disable-next-line no-unused-vars
  const { imageUrl, ...row } = receipt;   // never persist base64 image to DB
  const { error } = await supabase.from("dl_receipts").insert(row);
  if (error) throw new Error(error.message);
};

/** Patch an existing receipt by id. */
export const updateReceipt = async (id, patch) => {
  // eslint-disable-next-line no-unused-vars
  const { imageUrl, ...row } = patch;
  const { error } = await supabase
    .from("dl_receipts")
    .update(row)
    .eq("id", id);
  if (error) throw new Error(error.message);
};

// ─── Session (localStorage cache — no secrets stored) ────────────────────────

export const getSession   = ()     => { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } };
export const saveSession  = (user) => localStorage.setItem(SESSION_KEY, JSON.stringify(user));
export const clearSession = ()     => localStorage.removeItem(SESSION_KEY);

/**
 * Re-fetch the user from Supabase (e.g. after a role change) and refresh
 * the local session cache so the UI reflects the latest role.
 */
export const refreshSession = async (userId) => {
  const { data } = await supabase
    .from("dl_users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (data) saveSession(data);
  return data ?? null;
};
