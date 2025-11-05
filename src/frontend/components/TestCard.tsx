import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { formatRelativeTime, formatDuration, getScoreBgColor } from '../lib/utils';
import type { TestRunSummary } from '../types';

interface TestCardProps {
  test: TestRunSummary;
}

const TestCard: React.FC<TestCardProps> = ({ test }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/test/${test.id}`);
  };

  // Determine status variant for badge
  const getStatusVariant = (status: string): 'queued' | 'running' | 'completed' | 'failed' => {
    switch (status) {
      case 'queued':
        return 'queued';
      case 'running':
        return 'running';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      default:
        return 'queued';
    }
  };

  const progressText = test.progress > 0 ? `Phase ${test.progress}/4` : 'Not started';
  const relativeTime = formatRelativeTime(test.createdAt);
  const durationText = test.duration ? formatDuration(test.duration) : '';

  // Get latest screenshot for thumbnail
  const latestScreenshot = test.latestScreenshot;

  return (
    <Card
      className="cursor-pointer transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/20 hover:scale-105 overflow-hidden"
      onClick={handleClick}
    >
      {/* Screenshot Thumbnail */}
      {latestScreenshot && (
        <div className="relative h-40 w-full overflow-hidden bg-surface">
          <img 
            src={latestScreenshot.url} 
            alt="Latest screenshot"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
        </div>
      )}
      
      <CardContent className="p-5">
        {/* Status Indicator - Animated pulse for running */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {test.status === 'running' && (
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
            )}
            <Badge variant={getStatusVariant(test.status)}>
              {test.status}
            </Badge>
          </div>
          {test.overallScore !== undefined && test.overallScore !== null && (
            <div
              className={`text-sm font-bold px-3 py-1 rounded-md ${getScoreBgColor(test.overallScore)} text-white`}
            >
              {test.overallScore}/100
            </div>
          )}
        </div>

        {/* Game URL */}
        <div className="mb-3">
          <div
            className="font-mono text-white text-sm truncate"
            title={test.url}
          >
            {test.url}
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
          <span className="text-primary font-semibold">{progressText}</span>
          <span>{relativeTime}</span>
          {durationText && <span>{durationText}</span>}
        </div>
      </CardContent>
    </Card>
  );
};

export default TestCard;

