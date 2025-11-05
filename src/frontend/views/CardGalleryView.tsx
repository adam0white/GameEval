import React, { useEffect, useState } from 'react';
import QuickSubmitInput from '../components/QuickSubmitInput';
import TestCard from '../components/TestCard';
import type { TestRunSummary } from '../types';

const CardGalleryView: React.FC = () => {
  const [tests, setTests] = useState<TestRunSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTests = async () => {
    try {
      const response = await fetch('/rpc/listTests');
      if (!response.ok) {
        throw new Error('Failed to fetch tests');
      }
      const data = await response.json() as TestRunSummary[];
      setTests(data);
    } catch (error) {
      console.error('Error fetching tests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();

    // Poll for updates every 3 seconds (Story 3.2 spec)
    const interval = setInterval(fetchTests, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <header className="text-center mb-8 pb-6 border-b-2 border-primary">
        <h1 className="text-4xl font-bold text-primary mb-2">
          GameEval QA Pipeline
        </h1>
        <p className="text-gray-400 text-lg">
          Autonomous Browser Game QA Testing
        </p>
      </header>

      {/* Quick Submit */}
      <div className="max-w-4xl mx-auto mb-12">
        <QuickSubmitInput onSubmitSuccess={fetchTests} />
      </div>

      {/* Test List */}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-primary">Test Runs</h2>
          {isLoading && (
            <div className="text-gray-400 text-sm">Loading...</div>
          )}
        </div>

        {/* Empty State */}
        {!isLoading && tests.length === 0 && (
          <div className="text-center py-20 text-gray-400 text-lg">
            No tests yet. Submit a game URL to get started!
          </div>
        )}

        {/* Card Grid */}
        {tests.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {tests.map((test) => (
              <TestCard key={test.id} test={test} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CardGalleryView;

