const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function fetchCreatorAgentByParamWith(fetcher, param, isUnavailable) {
  const normalized = param.trim();
  if (!normalized) return null;

  const path = UUID_PATTERN.test(normalized)
    ? `/api/v1/creator/agents/${encodeURIComponent(normalized)}`
    : `/api/v1/creator/agents/by-slug/${encodeURIComponent(normalized)}`;

  try {
    return await fetcher(path);
  } catch (error) {
    if (isUnavailable(error)) return null;
    throw error;
  }
}

export async function fetchCreatorAgentPagesWith(
  fetchPage,
  visibilities,
  { limit = 100, maxConcurrency = 4 } = {},
) {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RangeError("limit must be a positive integer");
  }
  const schedule = createFailFastScheduler(maxConcurrency);

  return Promise.all(
    visibilities.map(async (visibility) => {
      const first = await schedule(() => fetchPage(visibility, limit, 0));
      const pages = [first];
      const total = pageTotal(first);

      const offsets = [];
      for (let offset = limit; offset < total; offset += limit) {
        offsets.push(offset);
      }
      if (offsets.length > 0) {
        const rest = await mapWithScheduler(
          offsets,
          maxConcurrency,
          (offset) => schedule(() => fetchPage(visibility, limit, offset)),
        );
        pages.push(...rest);
      }

      return { visibility, pages };
    }),
  );
}

function pageTotal(page) {
  if (Array.isArray(page)) return page.length;
  return page.total ?? page.items?.length ?? 0;
}

async function mapWithScheduler(values, workerCount, task) {
  const results = new Array(values.length);
  let cursor = 0;

  const workers = Array.from(
    { length: Math.min(workerCount, values.length) },
    async () => {
      while (cursor < values.length) {
        const index = cursor;
        cursor += 1;
        results[index] = await task(values[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

function createFailFastScheduler(maxConcurrency) {
  if (!Number.isInteger(maxConcurrency) || maxConcurrency <= 0) {
    throw new RangeError("maxConcurrency must be a positive integer");
  }

  let active = 0;
  let failed = false;
  let firstError;
  const queue = [];

  const rejectQueued = () => {
    while (queue.length > 0) {
      queue.shift().reject(firstError);
    }
  };

  const drain = () => {
    if (failed) return;
    while (active < maxConcurrency && queue.length > 0) {
      const entry = queue.shift();
      active += 1;
      Promise.resolve()
        .then(entry.task)
        .then(entry.resolve)
        .catch((error) => {
          if (!failed) {
            failed = true;
            firstError = error;
            entry.reject(error);
            rejectQueued();
            return;
          }
          entry.reject(firstError);
        })
        .finally(() => {
          active -= 1;
          drain();
        });
    }
  };

  return (task) =>
    new Promise((resolve, reject) => {
      if (failed) {
        reject(firstError);
        return;
      }
      queue.push({ task, resolve, reject });
      drain();
    });
}
