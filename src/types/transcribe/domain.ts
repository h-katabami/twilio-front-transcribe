export type UserInput = {
  questionId: string;
  input: string;
  createdAt: string;
};

export type InputPoint = {
  questionId: string;
  createdAt?: string;
  startTime?: number | string;
  endTime?: number | string;
  input?: string;
  success?: boolean;
};

export type LogHistory = {
  callSid: string;
  company: string;
  startedAt: string;
  callFrom: string;
  callTo: string;
  duration: string;
  minutes: number;
  status: string;
  userStatus: string;
  memo: string;
  recordingUrls: string[];
  userInputs: UserInput[];
  inputPoints: InputPoint[];
};

export type LogSummary = {
  callSid: string;
  company: string;
  startedAt: string;
  callFrom: string;
  minutes: number;
  status: string;
  memo: string;
  inputPreview: string;
};

export type LogDetail = {
  callSid: string;
  history: LogHistory;
};

export type LogFilters = {
  startDate: string;
  endDate: string;
  statusCheckpoint: string;
};