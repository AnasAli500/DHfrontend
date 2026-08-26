const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://dhbackend-2.onrender.com';
const WAKE_TIMEOUT_MS = 90000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function wakeServer(maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), WAKE_TIMEOUT_MS);

      const response = await fetch(`${BACKEND_URL}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      if (response.ok) return true;
    } catch {
      // Render free tier may need a few seconds to wake up.
    }

    if (attempt < maxAttempts - 1) {
      await sleep(4000);
    }
  }

  return false;
}

export function isNetworkError(error) {
  return (
    !error?.response &&
    (error?.code === 'ECONNABORTED' ||
      error?.code === 'ERR_NETWORK' ||
      error?.message?.toLowerCase().includes('network') ||
      error?.message?.toLowerCase().includes('timeout'))
  );
}
