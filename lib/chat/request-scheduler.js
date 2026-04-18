'use babel';

function defaultNow() {
  return Date.now();
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toFiniteDelay(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : fallback;
}

export function createRequestScheduler({
  getMinGapMs = () => 0,
  nowImpl = defaultNow,
  sleepImpl = defaultSleep
} = {}) {
  let queue = Promise.resolve();
  let nextAvailableAt = 0;

  async function waitForAvailability() {
    const now = nowImpl();
    const delayMs = nextAvailableAt - now;
    if (delayMs > 0) {
      await sleepImpl(delayMs);
    }
  }

  function applySuccessCooldown() {
    nextAvailableAt = Math.max(nextAvailableAt, nowImpl()) + toFiniteDelay(getMinGapMs(), 0);
  }

  function applyErrorCooldown(error) {
    const retryAfterMs = toFiniteDelay(error?.retryAfterMs, 0);
    if (retryAfterMs > 0) {
      nextAvailableAt = Math.max(nextAvailableAt, nowImpl() + retryAfterMs);
    }
  }

  function enqueue(task) {
    const runTask = async () => {
      await waitForAvailability();

      try {
        const result = await task();
        applySuccessCooldown();
        return result;
      } catch (error) {
        applyErrorCooldown(error);
        throw error;
      }
    };

    const scheduledTask = queue.then(runTask, runTask);
    queue = scheduledTask.catch(() => undefined);
    return scheduledTask;
  }

  return {
    enqueue,
    getNextAvailableAt() {
      return nextAvailableAt;
    },
    reset() {
      queue = Promise.resolve();
      nextAvailableAt = 0;
    }
  };
}
