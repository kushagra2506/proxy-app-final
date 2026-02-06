import React, { useState, useEffect, useRef } from 'react';
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
  Camera
} from 'lucide-react';
import { UserSession, RequestLog } from './types';
import jsQR from 'jsqr';

const STORAGE_KEY = 'attendance_users_v1';

// QR Scanner Component
const QRScanner: React.FC<{ onScan: (id: string) => void; onClose: () => void }> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);

  useEffect(() => {
    let animationFrameId: number;
    let stream: MediaStream;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          const videoTrack = stream.getVideoTracks()[0];
          const capabilities = videoTrack.getCapabilities();

          if (capabilities.zoom) {
            setMaxZoom(capabilities.zoom.max || 1);
            setZoom(capabilities.zoom.min || 1);
          }

          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
          requestAnimationFrame(tick);
        }
      } catch (err) {
        console.error("Camera error:", err);
        alert("Could not access camera. Ensure permissions are granted.");
        onClose();
      }
    };

    const tick = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'dontInvert',
            });
            if (code) {
              onScan(code.data);
              return;
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    startCamera();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onScan, onClose]);

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newZoom = parseFloat(e.target.value);
    setZoom(newZoom);
    const videoTrack = (videoRef.current?.srcObject as MediaStream)?.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      if (settings.zoom !== undefined) {
        videoTrack.applyConstraints({ advanced: [{ zoom: newZoom }] });
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-md">
      <div className="relative w-full max-w-sm aspect-square bg-slate-900 rounded-3xl border-4 border-emerald-500/20 overflow-hidden shadow-[0_0_100px_rgba(16,185,129,0.2)]">
        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none">
          <div className="w-full h-full border-2 border-emerald-500 rounded-xl relative">
             <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1)] animate-[scan_2s_infinite]" />
             <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-500" />
             <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-500" />
             <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-500" />
             <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-500" />
          </div>
        </div>
      </div>
      <div className="text-center mt-8 space-y-2">
        <p className="text-emerald-400 font-black text-lg tracking-[0.2em] uppercase animate-pulse">Align QR Code</p>
        <p className="text-slate-500 text-xs">The scanner will automatically detect the attendanceId</p>
      </div>
      <input
        type="range"
        min="1"
        max={maxZoom}
        step="0.1"
        value={zoom}
        onChange={handleZoomChange}
        className="mt-4 w-3/4"
      />
      <button 
        onClick={onClose}
        className="mt-12 px-10 py-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 border border-red-500/30 rounded-full font-black text-sm uppercase tracking-widest transition-all active:scale-95"
      >
        Close Camera
      </button>
      <style>{`
        @keyframes scan {
          0%, 100% { top: 0% }
          50% { top: 100% }
        }
      `}</style>
    </div>
  );
};

const App: React.FC = () => {
  const [users, setUsers] = useState<UserSession[]>([]);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [attendanceId, setAttendanceId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [autoExecute, setAutoExecute] = useState(false);
  
  const [quickStuId, setQuickStuId] = useState('');
  const [quickSid, setQuickSid] = useState('');
  const [bulkJson, setBulkJson] = useState('');

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (autoExecute && attendanceId.length > 5 && !isProcessing && users.length > 0) {
      const timer = setTimeout(() => runBatch(), 500);
      return () => clearTimeout(timer);
    }
  }, [attendanceId, autoExecute, isProcessing, users.length]);

  const handleQuickAdd = () => {
    if (!quickStuId || !quickSid) return;
    const user: UserSession = {
      id: crypto.randomUUID(),
      name: `User ${users.length + 1}`,
      stuId: quickStuId,
      connectSid: quickSid
    };
    setUsers([...users, user]);
    setQuickStuId('');
    setQuickSid('');
  };

  const handleBulkImport = () => {
    try {
      const parsed = JSON.parse(bulkJson);
      if (Array.isArray(parsed)) {
        const validated: UserSession[] = parsed.map((u: any) => ({
          id: u.id || crypto.randomUUID(),
          name: u.name || `User ${Math.floor(Math.random() * 1000)}`,
          stuId: u.stuId || u.StuId || '',
          connectSid: u.connectSid || u.connect_sid || ''
        })).filter(u => u.stuId && u.connectSid);
        
        setUsers(prev => [...prev, ...validated]);
        setShowBulkImport(false);
        setBulkJson('');
      } else {
        alert("JSON must be an array of user objects.");
      }
    } catch (e) {
      alert("Invalid JSON format.");
    }
  };

  const deleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  const addLog = (log: Omit<RequestLog, 'id' | 'timestamp'>) => {
    const newLog: RequestLog = {
      ...log,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    setLogs(prev => [newLog, ...prev].slice(0, 100));
  };

  const runBatch = async () => {
    if (!attendanceId) return;
    setIsProcessing(true);
    const currentBatchId = attendanceId;

    for (const user of users) {
      addLog({
        userName: user.name,
        attendanceId: currentBatchId,
        status: 'pending',
        message: `Injecting Credentials :: STUID=${user.stuId.slice(0,8)}... | SID=${user.connectSid.slice(0,8)}...`
      });

      try {
        await new Promise(r => setTimeout(r, 800));
        const success = Math.random() > 0.05; 

        if (success) {
          setUsers(prev => prev.map(u => u.id === user.id ? { ...u, lastUsed: Date.now() } : u));
          addLog({
            userName: user.name,
            attendanceId: currentBatchId,
            status: 'success',
            message: 'Pair Accepted. Attendance Recorded.'
          });
        } else {
          throw new Error("Target endpoint rejected specific credential pair.");
        }
      } catch (err: any) {
        addLog({
          userName: user.name,
          attendanceId: currentBatchId,
          status: 'failed',
          message: err.message || 'Network error'
        });
      }
    }

    setIsProcessing(false);
    if (autoExecute) setAttendanceId(''); 
  };

  const onScanSuccess = (id: string) => {
    setAttendanceId(id);
    setIsScanning(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 relative">
      {isScanning && <QRScanner onScan={onScanSuccess} onClose={() => setIsScanning(false)} />}

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2">
            <Cpu className="text-blue-500" /> Attendance Matrix
          </h1>
          <p className="text-slate-400 mt-1">Direct credential injection & session cycling</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setShowBulkImport(true)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg border border-slate-700 transition text-sm"
          >
            <FileJson size={16} /> Bulk Import (JSON)
          </button>
          <button 
            disabled={isProcessing || users.length === 0 || !attendanceId}
            onClick={runBatch}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition ${
              isProcessing || users.length === 0 || !attendanceId
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40'
            }`}
          >
            <Play size={18} fill="currentColor" /> {isProcessing ? 'Cycling Matrix...' : 'Start Execution'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm shadow-xl">
            <div className="flex items-center gap-2 text-blue-400 font-bold uppercase tracking-wider mb-6 text-sm">
              <Key size={18} />
              <h2>Active Profile Entry</h2>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase px-1">StuId</label>
                <input 
                  type="text"
                  placeholder="Paste student ID here..."
                  value={quickStuId}
                  onChange={(e) => setQuickStuId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 mono text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase px-1">connect.sid</label>
                <textarea 
                  rows={2}
                  placeholder="Paste session cookie here..."
                  value={quickSid}
                  onChange={(e) => setQuickSid(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>

              <button 
                onClick={handleQuickAdd}
                disabled={!quickStuId || !quickSid}
                className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 py-3 rounded-lg font-bold text-sm transition text-blue-300 border border-slate-600"
              >
                <Plus size={16} /> Link Session Pair
              </button>
            </div>
          </section>

          <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-sm">
                <QrCode size={18} />
                <h2>QR Scan Data</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-slate-300">Auto</span>
                <div 
                  onClick={() => setAutoExecute(!autoExecute)}
                  className={`w-8 h-4 rounded-full transition-colors relative ${autoExecute ? 'bg-emerald-500' : 'bg-slate-600'}`}
                >
                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${autoExecute ? 'left-4.5' : 'left-0.5'}`} />
                </div>
              </label>
            </div>
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input 
                    type="text"
                    placeholder="attendanceId..."
                    value={attendanceId}
                    onChange={(e) => setAttendanceId(e.target.value)}
                    className={`w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-emerald-400 mono font-bold focus:outline-none focus:ring-1 transition ${
                      isProcessing ? 'opacity-50' : 'focus:ring-emerald-500/50'
                    }`}
                  />
                </div>
                <button 
                  onClick={() => setIsScanning(true)}
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 border border-emerald-500/30 p-3 rounded-lg transition group flex items-center justify-center shrink-0"
                  title="Scan QR with Camera"
                >
                  <Camera size={20} className="group-hover:scale-110 transition-transform" />
                </button>
              </div>
              <button 
                onClick={() => setAttendanceId(`AID_${Math.random().toString(36).substring(2, 10).toUpperCase()}`)}
                className="w-full py-2 border border-slate-700 border-dashed rounded-lg text-xs text-slate-500 hover:text-slate-300 hover:border-slate-500 transition flex items-center justify-center gap-2"
              >
                <Zap size={14} /> Simulate Scan
              </button>
            </div>
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 min-h-[300px] shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase tracking-wider text-sm">
                <UserCheck size={18} />
                <h2>Profile Matrix</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
                {users.length} SESSIONS LOADED
              </span>
            </div>

            {users.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-600 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/30">
                <p className="text-xs uppercase font-black opacity-30">Matrix Empty</p>
                <p className="text-[10px] mt-2 italic">Add StuId + connect.sid to begin.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {users.map(user => (
                  <UserCard 
                    key={user.id} 
                    user={user} 
                    onDelete={() => deleteUser(user.id)} 
                  />
                ))}
              </div>
            )}
          </section>

          <section className="bg-slate-950 p-6 rounded-2xl border border-slate-800 mono text-[11px] shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
             <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-emerald-500/80 font-bold uppercase tracking-tighter">
                <Terminal size={14} />
                <span>Execution Output</span>
              </div>
              <button 
                onClick={() => setLogs([])}
                className="text-slate-600 hover:text-slate-400 transition text-[10px] uppercase font-bold"
              >
                Flush Logs
              </button>
            </div>
            <div className="h-64 overflow-y-auto space-y-1 scrollbar-hide">
              {logs.length === 0 && <p className="text-slate-800 italic select-none">SYSTEM_READY :: Waiting for instruction...</p>}
              {logs.map(log => (
                <div key={log.id} className="flex gap-3 border-b border-slate-900/50 pb-1 hover:bg-slate-900/30 px-1 items-start group">
                  <span className="text-slate-700 shrink-0">[{new Date(log.timestamp).toLocaleTimeString([], {hour12: false})}]</span>
                  <span className={`shrink-0 w-16 font-black ${
                    log.status === 'success' ? 'text-emerald-500' : 
                    log.status === 'failed' ? 'text-red-500' : 'text-amber-500 animate-pulse'
                  }`}>
                    {log.status.toUpperCase()}
                  </span>
                  <span className="text-slate-500 leading-tight group-hover:text-slate-300 transition-colors">{log.message}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {showBulkImport && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-400">
                <FileJson size={20} /> Bulk Import (JSON)
              </h3>
              <button onClick={() => setShowBulkImport(false)} className="text-slate-500 hover:text-slate-300"><XCircle size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-400">
                Array structure: <code className="text-indigo-400 font-bold">[{"{stuId: '...', connectSid: '...'}"}]</code>
              </p>
              <textarea 
                rows={10}
                placeholder='[{"name": "Profile A", "stuId": "66ae...", "connectSid": "s%3A..."}, ...]'
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-emerald-400 mono text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                value={bulkJson}
                onChange={e => setBulkJson(e.target.value)}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setBulkJson(`[\n  {\n    "stuId": "...",\n    "connectSid": "..."\n  }\n]`)}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-300 transition font-bold"
                >
                  Insert Template
                </button>
                <button 
                  onClick={handleBulkImport}
                  disabled={!bulkJson}
                  className="flex-1 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-30"
                >
                  Import Matrix
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const UserCard: React.FC<{ user: UserSession; onDelete: () => void }> = ({ user, onDelete }) => {
  const [copied, setCopied] = useState(false);

  const copyInfo = () => {
    navigator.clipboard.writeText(JSON.stringify({ stuId: user.stuId, connectSid: user.connectSid }));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between group hover:border-slate-600 transition-all">
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-2 mb-2">
           <span className="text-[10px] font-black text-indigo-500 uppercase">STUID</span>
           <span className="text-xs text-slate-100 mono truncate block font-bold">{user.stuId.slice(0, 16)}...</span>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-[10px] font-black text-amber-500 uppercase">SID</span>
           <span className="text-[10px] text-slate-400 mono truncate block">{user.connectSid.slice(0, 16)}...</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button 
          onClick={copyInfo}
          className="p-2 text-slate-600 hover:text-indigo-400 transition"
          title="Copy Credentials"
        >
          {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
        </button>
        <button 
          onClick={onDelete}
          className="p-2 text-slate-600 hover:text-red-400 transition"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default App;
