import React, { useState, useEffect, useRef } from "react";
import {
  Users,
  QrCode,
  Terminal,
  Plus,
  Trash2,
  Play,
  History,
  Cpu,
  FileJson,
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
  Key,
  UserCheck,
  Camera,
} from "lucide-react";
import { UserSession, RequestLog } from "./types";
import { sendAttendanceRequest } from "./services/attendanceService";
import jsQR from "jsqr";

// ... (keep your QRScanner component exactly as it is)

const STORAGE_KEY = "attendance_users_v1";

const App: React.FC = () => {
  const [users, setUsers] = useState<UserSession[]>([]);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [attendanceId, setAttendanceId] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [autoExecute, setAutoExecute] = useState(false);

  const [quickStuId, setQuickStuId] = useState("");
  const [quickSid, setQuickSid] = useState("");
  const [bulkJson, setBulkJson] = useState("");

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setUsers(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load users", e);
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  // Auto-execute when new attendanceId appears (if enabled)
  useEffect(() => {
    if (autoExecute && attendanceId.length > 5 && !isProcessing && users.length > 0) {
      const timer = setTimeout(() => runBatch(), 800);
      return () => clearTimeout(timer);
    }
  }, [attendanceId, autoExecute, isProcessing, users.length]);

  const handleQuickAdd = () => {
    if (!quickSid.trim()) return;

    const user: UserSession = {
      id: crypto.randomUUID(),
      name: `User ${users.length + 1}`,
      connectSid: quickSid.trim(),
      // stuId is no longer required
    };

    setUsers([...users, user]);
    setQuickStuId("");
    setQuickSid("");

    // Optional: save to your backend
    saveUserData(null, quickSid.trim()).catch(console.error);
  };

  const handleBulkImport = () => {
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) throw new Error("Must be an array");

      const validated = parsed
        .map((u: any) => ({
          id: u.id || crypto.randomUUID(),
          name: u.name || `User ${Math.floor(Math.random() * 1000)}`,
          connectSid: (u.connectSid || u.connect_sid || "").trim(),
        }))
        .filter((u) => u.connectSid);

      setUsers((prev) => [...prev, ...validated]);
      setShowBulkImport(false);
      setBulkJson("");
    } catch (e) {
      alert("Invalid JSON format or missing connect.sid");
    }
  };

  const deleteUser = (id: string) => {
    setUsers(users.filter((u) => u.id !== id));
  };

  const addLog = (log: Omit<RequestLog, "id" | "timestamp">) => {
    const newLog: RequestLog = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 100));
  };

  const runBatch = async () => {
    if (!attendanceId.trim()) {
      alert("No attendance ID set");
      return;
    }

    setIsProcessing(true);
    const currentAttendanceId = attendanceId.trim();

    for (const user of users) {
      addLog({
        userName: user.name,
        attendanceId: currentAttendanceId,
        status: "pending",
        message: `Marking attendance for ${user.name} (SID: ${user.connectSid.substring(0, 8)}...)`,
      });

      try {
        // Add small delay to avoid rate-limiting / IP block
        await new Promise((r) => setTimeout(r, 1200));

        await sendAttendanceRequest(currentAttendanceId, user.connectSid);

        addLog({
          userName: user.name,
          attendanceId: currentAttendanceId,
          status: "success",
          message: "Attendance marked successfully",
        });

        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, lastUsed: Date.now() } : u
          )
        );
      } catch (err: any) {
        addLog({
          userName: user.name,
          attendanceId: currentAttendanceId,
          status: "failed",
          message: err.message || "Request failed",
        });
      }
    }

    setIsProcessing(false);
    if (autoExecute) setAttendanceId("");
  };

  const onScanSuccess = (scanned: string) => {
    setAttendanceId(scanned.trim());
    setIsScanning(false);
  };

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 relative">
      {isScanning && <QRScanner onScan={onScanSuccess} onClose={() => setIsScanning(false)} />}

      {/* ... rest of your header, buttons, quick add, bulk import, profile matrix, logs ... */}

      {/* Example: keep your existing UI structure */}
      {/* Just make sure runBatch is called when you press "Start Execution" */}

      <button
        disabled={isProcessing || users.length === 0 || !attendanceId.trim()}
        onClick={runBatch}
        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition ${
          isProcessing || users.length === 0 || !attendanceId.trim()
            ? "bg-slate-700 text-slate-500 cursor-not-allowed"
            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40"
        }`}
      >
        <Play size={18} fill="currentColor" />
        {isProcessing ? "Processing..." : "Start Execution"}
      </button>

      {/* ... rest of your JSX (logs, user cards, etc.) ... */}
    </div>
  );
};

export default App;