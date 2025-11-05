import React from 'react';
import { Card, CardContent } from './ui/card';
import { formatDuration } from '../lib/utils';

interface AgentStatusHeaderProps {
  status: string;
  phase?: string;
  progress?: number;
  duration?: number;
  screenshotCount?: number;
  isActive: boolean;
  confidence?: number; // Pass from test data
}

const AgentStatusHeader: React.FC<AgentStatusHeaderProps> = ({
  status,
  phase,
  progress = 0,
  duration,
  screenshotCount = 0,
  isActive,
  confidence,
}) => {
  const getStatusMessage = (): string => {
    if (status === 'completed') return 'Test Complete';
    if (status === 'failed') return 'Test Failed';
    if (status === 'queued') return 'Agent is starting...';
    
    // Running status - show phase-specific message
    switch (phase) {
      case 'phase1':
        return 'Agent is loading the game...';
      case 'phase2':
        return 'Agent is discovering controls...';
      case 'phase3':
        return 'Agent is exploring gameplay...';
      case 'phase4':
        return 'Agent is evaluating quality...';
      default:
        return 'Agent is working...';
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/20 to-primary/5 border border-primary/30 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isActive && (
            <div className="w-4 h-4 bg-primary rounded-full animate-pulse" />
          )}
          <h2 className="text-2xl font-bold text-white">
            {getStatusMessage()}
          </h2>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface/50 rounded-md p-3">
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">
            Progress
          </div>
          <div className="text-primary text-lg font-bold">
            {progress > 0 ? `${progress}/4` : 'Starting'}
          </div>
        </div>

        <div className="bg-surface/50 rounded-md p-3">
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">
            Duration
          </div>
          <div className="text-white text-lg font-bold">
            {duration ? formatDuration(duration) : '0s'}
          </div>
        </div>

        <div className="bg-surface/50 rounded-md p-3">
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">
            Screenshots
          </div>
          <div className="text-white text-lg font-bold">{screenshotCount}</div>
        </div>

        <div className="bg-surface/50 rounded-md p-3">
          <div className="text-gray-400 text-xs uppercase tracking-wide mb-1">
            Confidence
          </div>
          <div className="text-white text-lg font-bold">
            {confidence ? `${confidence}%` : '--'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentStatusHeader;

