"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Download, Trash2, CheckCircle2, AlertTriangle, Shield } from "lucide-react";

interface ProfileFormProps {
  initialUser: {
    id: string;
    displayName: string;
    email: string;
    phoneOptional?: string | null;
    timezone?: string;
    emailVerified: boolean;
  };
}

export function ProfileForm({ initialUser }: ProfileFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialUser.displayName);
  const [phone, setPhone] = useState(initialUser.phoneOptional || "");
  const [timezone, setTimezone] = useState(initialUser.timezone || "UTC");
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          phoneOptional: phone,
          timezone,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus("Profile updated successfully.");
      } else {
        setSaveStatus(data.error || "Failed to update profile.");
      }
    } catch {
      setSaveStatus("Network error occurred.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordStatus("New passwords do not match.");
      return;
    }
    setPasswordSaving(true);
    setPasswordStatus(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: initialUser.email,
          token: "manual-session-change", // Note: will use current session verification
          newPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordStatus("Password changed successfully.");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordStatus(data.error || "Failed to change password.");
      }
    } catch {
      setPasswordStatus("Network error occurred.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleExportData = () => {
    window.open("/api/account/export", "_blank");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE MY ACCOUNT") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE MY ACCOUNT" }),
      });
      if (res.ok) {
        router.push("/register");
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Profile Details Card */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">Personal Information</h2>
            <p className="text-xs text-zinc-500">Manage your profile details and preferences</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={initialUser.email}
                  disabled
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-500 cursor-not-allowed"
                />
                <div className="absolute right-3 top-2.5 flex items-center gap-1">
                  {initialUser.emailVerified ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <a
                      href="/verify-email"
                      className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 hover:bg-amber-100"
                    >
                      Verify Now
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 700 000 000"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="Africa/Nairobi">Africa/Nairobi (UTC+3)</option>
                <option value="UTC">UTC</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="America/New_York">America/New York (EST/EDT)</option>
                <option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
              </select>
            </div>
          </div>

          {saveStatus && (
            <p
              className={`text-xs font-medium p-2.5 rounded-lg ${
                saveStatus.includes("success")
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-rose-50 text-rose-800"
              }`}
            >
              {saveStatus}
            </p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors shadow-2xs disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </form>
      </div>

      {/* Security & Password */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-zinc-100">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-800 flex items-center justify-center font-bold text-sm">
            <Shield className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-900">Security & Credentials</h2>
            <p className="text-xs text-zinc-500">Update your account password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
              minLength={8}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {passwordStatus && (
            <p
              className={`text-xs font-medium p-2.5 rounded-lg ${
                passwordStatus.includes("success")
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-rose-50 text-rose-800"
              }`}
            >
              {passwordStatus}
            </p>
          )}

          <button
            type="submit"
            disabled={passwordSaving}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white transition-colors disabled:opacity-50"
          >
            {passwordSaving ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Account Data & Privacy Zone (FR-010, FR-084) */}
      <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-zinc-900 mb-1">Account Data & Portability</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Download a GDPR-compliant JSON archive of all your owned websites, content revisions, notifications, and security audit logs.
          </p>
          <div className="mt-3">
            <button
              onClick={handleExportData}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors"
            >
              <Download className="w-4 h-4 text-zinc-600" />
              <span>Export Account Data (JSON)</span>
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-rose-100">
          <h3 className="text-sm font-bold text-rose-900 mb-1">Danger Zone</h3>
          <p className="text-xs text-zinc-500 mb-3">
            Permanently deactivate your account. Active websites and pending draft jobs will be scheduled for removal.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md p-6 bg-white rounded-2xl border border-zinc-200 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-zinc-900">Confirm Account Deletion</h3>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              This action cannot be undone. To confirm, type{" "}
              <strong className="text-rose-600 font-mono">DELETE MY ACCOUNT</strong> below:
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE MY ACCOUNT"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-rose-500 font-mono"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== "DELETE MY ACCOUNT" || deleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-40"
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
