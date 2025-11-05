// Re-export types from shared types
export type {
  TestRunSummary,
  TestReport,
  MetricScore,
  TestEvent,
  TestReportScreenshot,
} from '../../shared/types';

// Frontend-specific types
export interface WebSocketMessage {
  type: 'status' | 'progress' | 'complete' | 'error';
  status?: string;
  phase?: string;
  message?: string;
  data?: any;
}

export type ViewMode = 'card' | 'table';

export interface QuickSubmitData {
  gameUrl: string;
  inputSchema?: string;
}

