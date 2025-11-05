import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface QuickSubmitInputProps {
  onSubmitSuccess?: (testId: string) => void;
}

const QuickSubmitInput: React.FC<QuickSubmitInputProps> = ({ onSubmitSuccess }) => {
  const [gameUrl, setGameUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const validateURL = (url: string): string | null => {
    if (!url || url.trim() === '') {
      return 'Game URL is required';
    }
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(url)) {
      return 'Game URL must be a valid HTTP or HTTPS URL';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validateURL(gameUrl);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/rpc/submitTest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameUrl: gameUrl.trim(),
        }),
      });

      const data = await response.json() as { error?: string; testId?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit test');
      }

      if (!data.testId) {
        throw new Error('No test ID returned');
      }

      // Reset form
      setGameUrl('');

      // Call success callback if provided
      if (onSubmitSuccess) {
        onSubmitSuccess(data.testId);
      }

      // Navigate to Agent Focus Mode
      navigate(`/test/${data.testId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit test');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="https://example.com/game.html"
              value={gameUrl}
              onChange={(e) => setGameUrl(e.target.value)}
              disabled={isSubmitting}
              className="w-full"
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="px-8">
            {isSubmitting ? 'Starting...' : 'Start Test'}
          </Button>
        </div>
        {error && (
          <div className="text-error text-sm">{error}</div>
        )}
      </div>
    </form>
  );
};

export default QuickSubmitInput;

