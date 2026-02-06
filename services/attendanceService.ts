import { GoogleGenAI } from "@google/genai";
import { AttendancePayload } from "../types";

/**
 * In a real-world scenario, you would use this to explain 
 * the structure of the request or generate documentation for the API.
 */
export const analyzeRequestStructure = async (rawRequest: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this HTTP request and extract the parameters needed for a batch script. 
      Identify headers and body fields. 
      Request: \n\n${rawRequest}`,
    });
    return response.text;
  } catch (err) {
    console.error("AI Analysis failed", err);
    return null;
  }
};

/**
 * Mock function representing the actual fetch call.
 * Note: Browser CORS will block this if executed directly from the web app
 * to student.bennetterp.camu.in.
 */
export const sendAttendanceRequest = async (
  attendanceId: string, // Extracted from QR code
  cmStuId: string, // Provided by user
  connectSid: string
) => {
  const url = 'https://student.bennetterp.camu.in/api/Attendance/record-online-attendance';

  // Construct the payload
  const payload = {
    attendanceId: attendanceId, // Map attendanceId explicitly
    CmStuId: cmStuId, // Map CmStuId explicitly
    offQrCdEnbld: true
  };

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `connect.sid=${connectSid}`,
      'User-Agent': navigator.userAgent,
      'Origin': 'https://student.bennetterp.camu.in',
      'Referer': 'https://student.bennetterp.camu.in/v2/timetable',
    },
    body: JSON.stringify(payload)
  };

  try {
    console.log("Sending request to backend with payload:", payload);
    const response = await fetch(url, options);

    if (!response.ok) {
      const errorResponse = await response.text();
      console.error("Backend error response:", errorResponse);
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorResponse}`);
    }

    const data = await response.json();
    console.log("Request successful. Response:", data);
    return data;
  } catch (error) {
    console.error("Error sending attendance request:", error);
    throw error;
  }
};
