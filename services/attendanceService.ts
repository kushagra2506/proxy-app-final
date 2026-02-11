import { AttendancePayload } from "../types"; // adjust path if needed

/**
 * Sends attendance marking request to the Camu ERP endpoint.
 * Uses only attendanceId + session cookie (connect.sid).
 */
export const sendAttendanceRequest = async (
  attendanceId: string,
  connectSid: string
): Promise<any> => {
  const url = "https://student.bennetterp.camu.in/api/Attendance/record-online-attendance";

  const payload = {
    attendanceId: attendanceId.trim(),
    // offQrCdEnbld: true,     // ← uncomment ONLY if you see it's still required
  };

  const headers = {
    "Content-Type": "application/json",
    "Cookie": `connect.sid=${connectSid}`,
    "Origin": "https://student.bennetterp.camu.in",
    "Referer": "https://student.bennetterp.camu.in/v2/timetable",
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "Priority": "u=1, i",
  };

  try {
    console.log("[AttendanceService] Sending request", {
      attendanceId,
      payload,
      cookiePrefix: connectSid.substring(0, 12) + "...",
    });

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      // Note: credentials: "include" usually not helpful here due to cross-origin
    });

    if (!response.ok) {
      let errorBody = "";
      try {
        errorBody = await response.text();
      } catch {}
      console.error("[AttendanceService] Failed", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
      });
      throw new Error(`Attendance request failed: ${response.status} - ${errorBody || "No response body"}`);
    }

    const data = await response.json();
    console.log("[AttendanceService] Success", data);
    return data;
  } catch (err) {
    console.error("[AttendanceService] Error:", err);
    throw err;
  }
};

/**
 * Optional: Save user session to your own backend (if you have one)
 */
export const saveUserData = async (stuId: string | null, connectSid: string) => {
  // If you don't have a backend yet → just return for now
  console.log("[saveUserData] Would save:", { connectSid: connectSid.substring(0, 12) + "..." });
  return { success: true, message: "Saved locally only (no backend)" };

  // Uncomment when you have a real backend:
  /*
  const url = "https://your-backend.com/api/users";
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectSid }),
  });
  if (!response.ok) throw new Error("Failed to save session");
  return response.json();
  */
};