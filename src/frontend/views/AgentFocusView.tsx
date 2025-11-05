import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import AgentStatusHeader from '../components/AgentStatusHeader';
import LiveFeedTimeline from '../components/LiveFeedTimeline';
import ScreenshotGallery from '../components/ScreenshotGallery';
import type { TestReport, WebSocketMessage } from '../types';

const AgentFocusView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [testReport, setTestReport] = useState<TestReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

  // Fetch test report
  const fetchTestReport = async () => {
    if (!id) return;

    try {
      const response = await fetch(`/rpc/getTestReport?testId=${id}`);
      if (!response.ok) {
        throw new Error('Failed to load test report');
      }
      const data: TestReport = await response.json();
      setTestReport(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test report');
    } finally {
      setIsLoading(false);
    }
  };

  // Connect WebSocket for live updates
  useEffect(() => {
    if (!id || !testReport) return;

    // Only connect WebSocket for active tests
    if (testReport.status !== 'queued' && testReport.status !== 'running') {
      return;
    }

    if (typeof window === 'undefined') return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?testId=${id}`;
    const websocket = new WebSocket(wsUrl);

    websocket.addEventListener('open', () => {
      console.log('WebSocket connected');
    });

    websocket.addEventListener('message', (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data as string);
        console.log('WebSocket message:', message);

        // Update test report based on message
        if (message.type === 'status' || message.type === 'progress' || message.type === 'complete') {
          // Refetch test report to get updated data
          fetchTestReport();
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    });

    websocket.addEventListener('error', (error: Event) => {
      console.error('WebSocket error:', error);
    });

    websocket.addEventListener('close', () => {
      console.log('WebSocket closed');
    });

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [id, testReport?.status]);

  // Update elapsed time for running tests
  useEffect(() => {
    if (!testReport || testReport.status !== 'running') return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - testReport.timestamps.createdAt;
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [testReport]);

  // Initial fetch
  useEffect(() => {
    fetchTestReport();

    // Poll for updates every 5 seconds (backup to WebSocket)
    const interval = setInterval(fetchTestReport, 5000);

    return () => clearInterval(interval);
  }, [id]);

  const handleExportJSON = () => {
    if (!id || typeof window === 'undefined') return;
    window.location.href = `/rpc/exportTestJSON?testId=${id}`;
  };

  const getProgress = (): number => {
    if (!testReport || !testReport.events) return 0;
    
    const latestEvent = testReport.events[testReport.events.length - 1];
    if (!latestEvent) return 0;

    const phase = latestEvent.phase.toLowerCase();
    if (phase === 'phase1') return 1;
    if (phase === 'phase2') return 2;
    if (phase === 'phase3') return 3;
    if (phase === 'phase4') return 4;
    return 0;
  };

  const getCurrentPhase = (): string | undefined => {
    if (!testReport || !testReport.events) return undefined;
    
    const latestEvent = testReport.events[testReport.events.length - 1];
    return latestEvent?.phase;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-white text-xl">Loading test report...</div>
      </div>
    );
  }

  if (error || !testReport) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <div className="text-error text-xl">{error || 'Test not found'}</div>
        <Button onClick={() => navigate('/')}>Back to Dashboard</Button>
      </div>
    );
  }

  const isActive = testReport.status === 'queued' || testReport.status === 'running';
  const duration = testReport.status === 'running' 
    ? elapsedTime 
    : testReport.timestamps.duration || 0;

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Back Button */}
      <div className="max-w-[1600px] mx-auto mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          ← Back to Dashboard
        </Button>

        {/* Agent Status Header */}
        <AgentStatusHeader
          status={testReport.status}
          phase={getCurrentPhase()}
          progress={getProgress()}
          duration={duration}
          screenshotCount={testReport.screenshots.length}
          isActive={isActive}
          confidence={testReport.overallScore ?? undefined}
        />

        {/* Split View: Live Feed (Left) + Screenshots (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Live Feed Timeline */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-xl font-semibold text-primary mb-4">
              {isActive ? 'Live Feed' : 'Timeline'}
            </h3>
            <LiveFeedTimeline events={testReport.events} isLive={isActive} />
          </div>

          {/* Screenshot Gallery */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-xl font-semibold text-primary mb-4">
              Screenshot Gallery
            </h3>
            <ScreenshotGallery screenshots={testReport.screenshots} />
          </div>
        </div>

        {/* Final Report (if completed) */}
        {testReport.status === 'completed' && testReport.overallScore !== null && (
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-xl font-semibold text-primary mb-6">
              Test Report
            </h3>

            {/* Overall Score */}
            <div className="text-center mb-8">
              <div className="text-gray-400 text-sm uppercase mb-2">
                Overall Quality Score
              </div>
              <div className={`text-6xl font-bold ${
                testReport.overallScore > 70 ? 'text-success' :
                testReport.overallScore >= 50 ? 'text-yellow-500' :
                'text-error'
              }`}>
                {testReport.overallScore}/100
              </div>
            </div>

            {/* Individual Metrics */}
            {testReport.metrics && testReport.metrics.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {testReport.metrics.map((metric) => (
                  metric.name !== 'overall' && (
                    <div key={metric.name} className="bg-background/50 border-l-3 border-primary rounded-md p-4">
                      <div className="font-semibold text-white capitalize mb-1">
                        {metric.name}
                      </div>
                      <div className="text-primary text-2xl font-bold mb-2">
                        {metric.score}/100
                      </div>
                      <div className="text-sm text-gray-400">
                        {metric.justification}
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}

            {/* Export Button */}
            <div className="flex gap-4">
              <Button onClick={handleExportJSON}>
                Export Test Report JSON
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentFocusView;

