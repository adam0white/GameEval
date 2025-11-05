import React, { useEffect, useRef } from 'react';
import type { TestEvent } from '../types';

interface LiveFeedTimelineProps {
  events: TestEvent[];
  isLive?: boolean;
}

const LiveFeedTimeline: React.FC<LiveFeedTimelineProps> = ({
  events,
  isLive = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasUserScrolled, setHasUserScrolled] = React.useState(false);
  const prevEventsLengthRef = useRef(events.length);

  // Track user scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setHasUserScrolled(true);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to latest only if user hasn't manually scrolled
  useEffect(() => {
    if (!containerRef.current || !isLive || !(containerRef.current instanceof HTMLElement)) return;
    
    // Only auto-scroll if new events arrived and user hasn't scrolled
    if (events.length > prevEventsLengthRef.current && !hasUserScrolled) {
      containerRef.current.scrollTop = 0;
    }
    
    prevEventsLengthRef.current = events.length;
  }, [events, isLive, hasUserScrolled]);

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        {isLive ? 'Waiting for agent updates...' : 'No events recorded'}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="max-h-[500px] overflow-y-auto flex flex-col-reverse gap-2 pr-2"
    >
      {/* Reverse order to show latest first */}
      {[...events].reverse().map((event, index) => {
        const timestamp = new Date(event.timestamp).toLocaleTimeString();
        const isPhaseTransition = event.phase && event.description.toLowerCase().includes('phase');

        return (
          <div
            key={`${event.timestamp}-${index}`}
            className={`border-l-3 pl-4 py-2 ${
              isPhaseTransition
                ? 'border-primary bg-primary/10'
                : 'border-gray-600 bg-surface/30'
            } rounded-r-md`}
          >
            <div className="flex items-start gap-3">
              <span className="text-gray-500 text-xs font-mono min-w-[70px]">
                {timestamp}
              </span>
              <div className="flex-1">
                {event.phase && (
                  <span className="text-primary font-semibold text-sm mr-2">
                    [{event.phase.toUpperCase()}]
                  </span>
                )}
                <span className="text-gray-200 text-sm">
                  {event.description}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LiveFeedTimeline;

