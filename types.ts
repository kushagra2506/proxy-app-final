
export interface UserSession {
  id: string;
  name: string;
  stuId: string;
  connectSid: string;
  lastUsed?: number;
}

export interface RequestLog {
  id: string;
  timestamp: number;
  userName: string;
  attendanceId: string;
  status: 'pending' | 'success' | 'failed';
  message: string;
}

export interface AttendancePayload {
  attendanceId: string;
  StuId: string;
  offQrCdEnbld: boolean;
}
