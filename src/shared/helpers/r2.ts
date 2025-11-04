/**
 * R2 Storage Helper Functions
 * 
 * Provides abstraction layer for R2 object storage operations including:
 * - Screenshot uploads with organized path structure
 * - Log file management with append functionality
 * - Artifact retrieval with public URL generation
 * 
 * All functions return DbResult<T> for consistent error handling.
 */

import type { DbResult, TestArtifact, ScreenshotMetadata } from '../types';
import { STORAGE_PATHS, LogType, Phase } from '../constants';

/**
 * Generates a screenshot path from template
 * 
 * @param testId - UUID of the test run
 * @param phase - Test pipeline phase (phase1-phase4)
 * @param action - Description of the action (e.g., 'click-play-button')
 * @param timestamp - Optional timestamp (defaults to Date.now())
 * @returns Complete R2 object key for the screenshot
 * 
 * @example
 * ```typescript
 * const key = generateScreenshotPath(
 *   '550e8400-e29b-41d4-a716-446655440000',
 *   Phase.PHASE3,
 *   'click-play-button'
 * );
 * // Returns: 'tests/550e8400-e29b-41d4-a716-446655440000/screenshots/1699104850000-phase3-click-play-button.png'
 * ```
 */
export function generateScreenshotPath(
  testId: string,
  phase: Phase,
  action: string,
  timestamp?: number
): string {
  const ts = timestamp ?? Date.now();
  return STORAGE_PATHS.SCREENSHOT
    .replace('{test_id}', testId)
    .replace('{timestamp}', ts.toString())
    .replace('{phase}', phase)
    .replace('{action}', action);
}

/**
 * Generates a log file path from template
 * 
 * @param testId - UUID of the test run
 * @param logType - Type of log file (console, network, or agent-decisions)
 * @returns Complete R2 object key for the log file
 * 
 * @example
 * ```typescript
 * const key = generateLogPath(
 *   '550e8400-e29b-41d4-a716-446655440000',
 *   LogType.CONSOLE
 * );
 * // Returns: 'tests/550e8400-e29b-41d4-a716-446655440000/logs/console.log'
 * ```
 */
export function generateLogPath(testId: string, logType: LogType): string {
  return STORAGE_PATHS.LOG
    .replace('{test_id}', testId)
    .replace('{log_type}', logType);
}

/**
 * Generates a public URL for an R2 object
 * 
 * Relies on the `R2_PUBLIC_URL` environment variable, which should point to the
 * public R2.dev domain or a custom domain configured for the bucket.
 * 
 * Note: The bucket must have public access enabled for these URLs to work.
 * Configure via Cloudflare dashboard: R2 > [bucket] > Settings > Public Access
 * 
 * @param key - R2 object key
 * @param env - Cloudflare environment object
 * @returns Public URL for accessing the object
 * 
 * @example
 * ```typescript
 * const url = getPublicUrl(
 *   'tests/123/screenshots/1699104850000-phase3-action.png',
 *   env
 * );
 * // Returns: 'https://evidence.adamwhite.work/tests/123/screenshots/1699104850000-phase3-action.png'
 * ```
 */
function resolvePublicBaseUrl(env: Env): string {
  const rawBase = env.R2_PUBLIC_URL;
  if (!rawBase) {
    throw new Error(
      'R2_PUBLIC_URL environment variable is not configured. Public artifact URLs cannot be generated.'
    );
  }

  return rawBase.endsWith('/') ? rawBase.slice(0, -1) : rawBase;
}

export function getPublicUrl(key: string, env: Env): string {
  const baseUrl = resolvePublicBaseUrl(env);
  return `${baseUrl}/${key}`;
}

/**
 * Uploads a screenshot to R2 storage
 * 
 * Organizes screenshots by test ID with timestamp-based naming for chronological sorting.
 * Sets proper Content-Type header for PNG images.
 * 
 * @param r2 - R2 bucket binding from Workers environment
 * @param testId - UUID of the test run
 * @param phase - Test pipeline phase (phase1-phase4)
 * @param action - Description of the action being captured
 * @param buffer - PNG image data as ArrayBuffer
 * @returns DbResult containing the R2 object key on success
 * 
 * @example
 * ```typescript
 * const result = await uploadScreenshot(
 *   env.EVIDENCE_BUCKET,
 *   '550e8400-e29b-41d4-a716-446655440000',
 *   Phase.PHASE3,
 *   'click-play-button',
 *   pngBuffer
 * );
 * 
 * if (result.success) {
 *   console.log('Screenshot uploaded:', result.data);
 * } else {
 *   console.error('Upload failed:', result.error);
 * }
 * ```
 */
export async function uploadScreenshot(
  r2: R2Bucket,
  testId: string,
  phase: Phase,
  action: string,
  buffer: ArrayBuffer
): Promise<DbResult<string>> {
  try {
    const key = generateScreenshotPath(testId, phase, action);
    
    await r2.put(key, buffer, {
      httpMetadata: {
        contentType: 'image/png',
      },
    });
    
    return { success: true, data: key };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to upload screenshot: ${message}`,
    };
  }
}

/**
 * Uploads or appends content to a log file in R2 storage
 * 
 * Uses fetch-modify-put pattern to append to existing log files.
 * Creates new log file if it doesn't exist.
 * Sets proper Content-Type header for text files.
 * 
 * @param r2 - R2 bucket binding from Workers environment
 * @param testId - UUID of the test run
 * @param logType - Type of log (console, network, or agent-decisions)
 * @param content - Log content to append
 * @returns DbResult containing the R2 object key on success
 * 
 * @example
 * ```typescript
 * const result = await uploadLog(
 *   env.EVIDENCE_BUCKET,
 *   '550e8400-e29b-41d4-a716-446655440000',
 *   LogType.CONSOLE,
 *   '[INFO] Game loaded successfully'
 * );
 * 
 * if (result.success) {
 *   console.log('Log entry added:', result.data);
 * }
 * ```
 */
export async function uploadLog(
  r2: R2Bucket,
  testId: string,
  logType: LogType,
  content: string
): Promise<DbResult<string>> {
  try {
    const key = generateLogPath(testId, logType);
    
    // Check if log file exists
    const existing = await r2.head(key);
    let logContent = content;
    
    if (existing) {
      // Fetch existing content and append
      const currentLog = await r2.get(key);
      if (currentLog) {
        const currentText = await currentLog.text();
        logContent = currentText + '\n' + content;
      }
    }
    
    // Upload (create or replace) log file
    await r2.put(key, logContent, {
      httpMetadata: {
        contentType: 'text/plain; charset=utf-8',
      },
    });
    
    return { success: true, data: key };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to upload log: ${message}`,
    };
  }
}

/**
 * Parses screenshot metadata from an R2 object key
 * 
 * Extracts timestamp, phase, and action from screenshot paths.
 * 
 * @param key - R2 object key for a screenshot
 * @returns ScreenshotMetadata or null if parsing fails
 * 
 * @example
 * ```typescript
 * const metadata = parseScreenshotMetadata(
 *   'tests/123/screenshots/1699104850000-phase3-click-play-button.png'
 * );
 * // Returns: { timestamp: 1699104850000, phase: 'phase3', action: 'click-play-button' }
 * ```
 */
function parseScreenshotMetadata(key: string): ScreenshotMetadata | null {
  // Expected format: tests/{test_id}/screenshots/{timestamp}-{phase}-{action}.png
  const match = key.match(/screenshots\/(\d+)-(phase\d+)-(.+)\.png$/);
  if (!match) return null;

  const timestamp = Number.parseInt(match[1], 10);
  const phaseCandidate = match[2];

  if (!isPhase(phaseCandidate)) {
    return null;
  }

  return {
    timestamp,
    phase: phaseCandidate,
    action: match[3],
  };
}

function parseLogType(key: string): LogType | null {
  // Expected format: tests/{test_id}/logs/{log_type}.log
  const match = key.match(/logs\/([^.\/]+)\.log$/);
  if (!match) return null;

  const typeCandidate = match[1];
  return isLogType(typeCandidate) ? typeCandidate : null;
}

function isPhase(value: string): value is Phase {
  return (Object.values(Phase) as string[]).includes(value);
}

function isLogType(value: string): value is LogType {
  return (Object.values(LogType) as string[]).includes(value);
}

/**
 * Retrieves all artifacts (screenshots and logs) for a test run
 * 
 * Lists all objects under the test's R2 prefix and generates public URLs.
 * Returns artifacts sorted by timestamp (screenshots descending, logs alphabetically).
 * 
 * @param r2 - R2 bucket binding from Workers environment
 * @param testId - UUID of the test run
 * @param env - Cloudflare environment object with R2_PUBLIC_URL configured
 * @returns DbResult containing array of TestArtifact objects
 * 
 * @example
 * ```typescript
 * const result = await getTestArtifacts(
 *   env.EVIDENCE_BUCKET,
 *   '550e8400-e29b-41d4-a716-446655440000'
 * );
 * 
 * if (result.success) {
 *   result.data.forEach(artifact => {
 *     console.log(`${artifact.type}: ${artifact.url}`);
 *   });
 * }
 * ```
 */
export async function getTestArtifacts(
  r2: R2Bucket,
  testId: string,
  env: Env
): Promise<DbResult<TestArtifact[]>> {
  try {
    const publicBaseUrl = resolvePublicBaseUrl(env);
    const prefix = `tests/${testId}/`;
    const listed = await r2.list({ prefix });
    
    const artifacts: TestArtifact[] = listed.objects.map((obj) => {
      const uploadedAt = obj.uploaded.getTime();

      if (obj.key.includes('/screenshots/')) {
        const metadata = parseScreenshotMetadata(obj.key);
        if (!metadata) {
          throw new Error(`Unable to parse screenshot metadata from key: ${obj.key}`);
        }

        return {
          key: obj.key,
          type: 'screenshot',
          url: `${publicBaseUrl}/${obj.key}`,
          uploaded_at: uploadedAt,
          metadata,
        };
      }

      const logType = parseLogType(obj.key);
      if (!logType) {
        throw new Error(`Unable to parse log type from key: ${obj.key}`);
      }

      return {
        key: obj.key,
        type: 'log',
        url: `${publicBaseUrl}/${obj.key}`,
        uploaded_at: uploadedAt,
        metadata: {
          logType,
        },
      };
    });
    
    // Sort artifacts: screenshots by timestamp DESC, logs alphabetically
    artifacts.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'screenshot' ? -1 : 1; // Screenshots before logs
      }
      if (a.type === 'screenshot') {
        return b.uploaded_at - a.uploaded_at; // Most recent screenshot first
      }
      // Both are logs, sort alphabetically
      return a.key.localeCompare(b.key);
    });
    
    return { success: true, data: artifacts };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to retrieve test artifacts: ${message}`,
    };
  }
}

