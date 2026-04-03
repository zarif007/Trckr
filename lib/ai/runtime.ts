import {
  withLogPrefix,
  type RequestLogContext,
} from "@/lib/api/request-context";

export interface RunWithTimeoutOptions {
  timeoutMs: number;
  timeoutMessage: string;
}

export async function runWithTimeout<T>(
  run: Promise<T>,
  options: RunWithTimeoutOptions,
): Promise<T> {
  const timeout = new Promise<never>((_resolve, reject) => {
    setTimeout(
      () => reject(new Error(options.timeoutMessage)),
      options.timeoutMs,
    );
  });
  return Promise.race([run, timeout]);
}

export function logAiStage(
  context: RequestLogContext,
  stage: string,
  message: string,
  details?: unknown,
): void {
  const prefix = withLogPrefix(context, stage);
  if (details === undefined) {
    console.info(prefix, message);
    return;
  }
  console.info(prefix, message, details);
}

export function logAiError(
  context: RequestLogContext,
  stage: string,
  error: unknown,
): void {
  const prefix = withLogPrefix(context, stage);
  console.error(
    prefix,
    error instanceof Error ? error.message : String(error),
    error,
  );
}
