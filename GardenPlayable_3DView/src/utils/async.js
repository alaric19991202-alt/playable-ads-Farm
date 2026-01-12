export async function runWithConcurrency(tasks, limit = 4) {
  const results = [];
  const executing = new Set();

  for (const task of tasks) {
    const p = Promise.resolve().then(task);
    results.push(p);
    executing.add(p);
    const cleanup = () => executing.delete(p);
    p.then(cleanup).catch(cleanup);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  return Promise.all(results);
}
