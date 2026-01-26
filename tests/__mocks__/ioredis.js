// Shared Redis mock for all tests
const mockRedisStore = new Map();

class RedisMock {
  constructor() {
    this.on = jest.fn();
    this.once = jest.fn();
    this.ping = jest.fn().mockResolvedValue('PONG');
  }

  hgetall(key) {
    const data = mockRedisStore.get(key);
    if (!data) return Promise.resolve({});
    try {
      return Promise.resolve(JSON.parse(data));
    } catch (e) {
      return Promise.resolve({});
    }
  }

  hmset(key, ...args) {
    // Get existing data
    const existing = mockRedisStore.get(key);
    const existingData = existing ? JSON.parse(existing) : {};

    // Parse new data
    let newData;
    if (args.length === 1 && typeof args[0] === 'object') {
      newData = args[0];
    } else {
      newData = {};
      for (let i = 0; i < args.length; i += 2) {
        newData[args[i]] = args[i + 1];
      }
    }

    // Merge with existing data
    const merged = { ...existingData, ...newData };
    mockRedisStore.set(key, JSON.stringify(merged));
    return Promise.resolve('OK');
  }

  del(key) {
    const existed = mockRedisStore.has(key);
    mockRedisStore.delete(key);
    return Promise.resolve(existed ? 1 : 0);
  }

  sadd(key, member) {
    const set = mockRedisStore.get(key);
    if (set) {
      const parsed = JSON.parse(set);
      if (!parsed.includes(member)) {
        parsed.push(member);
        mockRedisStore.set(key, JSON.stringify(parsed));
      }
    } else {
      mockRedisStore.set(key, JSON.stringify([member]));
    }
    return Promise.resolve(1);
  }

  srem(key, member) {
    const set = mockRedisStore.get(key);
    if (set) {
      const parsed = JSON.parse(set);
      const filtered = parsed.filter((m) => m !== member);
      mockRedisStore.set(key, JSON.stringify(filtered));
      return Promise.resolve(1);
    }
    return Promise.resolve(0);
  }

  smembers(key) {
    const set = mockRedisStore.get(key);
    return Promise.resolve(set ? JSON.parse(set) : []);
  }

  pipeline() {
    const commands = [];
    const pipelineObj = {
      hgetall: (key) => {
        commands.push({ cmd: 'hgetall', key });
        return pipelineObj;
      },
      exec: async () => {
        return commands.map(({ cmd, key }) => {
          if (cmd === 'hgetall') {
            const data = mockRedisStore.get(key);
            try {
              return [null, data ? JSON.parse(data) : {}];
            } catch (e) {
              return [null, {}];
            }
          }
          return [null, null];
        });
      },
    };
    return pipelineObj;
  }

  // Additional methods for integration tests
  get(key) {
    return Promise.resolve(mockRedisStore.get(key) || null);
  }

  set(key, value) {
    mockRedisStore.set(key, value);
    return Promise.resolve('OK');
  }

  setex(key, ttl, value) {
    mockRedisStore.set(key, value);
    return Promise.resolve('OK');
  }

  exists(key) {
    return Promise.resolve(mockRedisStore.has(key) ? 1 : 0);
  }

  ttl() {
    return Promise.resolve(86400);
  }

  // Sorted set operations
  zadd(key, ...args) {
    // zadd key score member [score member ...]
    const sortedSet = mockRedisStore.get(key);
    const parsed = sortedSet ? JSON.parse(sortedSet) : [];

    for (let i = 0; i < args.length; i += 2) {
      const score = parseFloat(args[i]);
      const member = args[i + 1];

      // Remove existing member if present
      const index = parsed.findIndex((item) => item.member === member);
      if (index !== -1) {
        parsed.splice(index, 1);
      }

      // Add with new score
      parsed.push({ score, member });
    }

    // Sort by score ascending
    parsed.sort((a, b) => a.score - b.score);

    mockRedisStore.set(key, JSON.stringify(parsed));
    return Promise.resolve(args.length / 2);
  }

  zrevrange(key, start, stop) {
    const sortedSet = mockRedisStore.get(key);
    if (!sortedSet) return Promise.resolve([]);

    const parsed = JSON.parse(sortedSet);
    // Reverse for descending order
    const reversed = [...parsed].reverse();

    // Handle negative indices
    const len = reversed.length;
    const startIdx = start < 0 ? Math.max(0, len + start) : start;
    const stopIdx = stop < 0 ? len + stop : stop;

    const slice = reversed.slice(startIdx, stopIdx + 1);
    return Promise.resolve(slice.map((item) => item.member));
  }

  zrange(key, start, stop) {
    const sortedSet = mockRedisStore.get(key);
    if (!sortedSet) return Promise.resolve([]);

    const parsed = JSON.parse(sortedSet);
    const len = parsed.length;
    const startIdx = start < 0 ? Math.max(0, len + start) : start;
    const stopIdx = stop < 0 ? len + stop : stop;

    const slice = parsed.slice(startIdx, stopIdx + 1);
    return Promise.resolve(slice.map((item) => item.member));
  }

  // List operations
  rpush(key, ...values) {
    const list = mockRedisStore.get(key);
    const parsed = list ? JSON.parse(list) : [];
    parsed.push(...values);
    mockRedisStore.set(key, JSON.stringify(parsed));
    return Promise.resolve(parsed.length);
  }

  lpush(key, ...values) {
    const list = mockRedisStore.get(key);
    const parsed = list ? JSON.parse(list) : [];
    parsed.unshift(...values);
    mockRedisStore.set(key, JSON.stringify(parsed));
    return Promise.resolve(parsed.length);
  }

  lrange(key, start, stop) {
    const list = mockRedisStore.get(key);
    if (!list) return Promise.resolve([]);

    const parsed = JSON.parse(list);
    const len = parsed.length;
    const startIdx = start < 0 ? Math.max(0, len + start) : start;
    const stopIdx = stop < 0 ? len + stop + 1 : stop + 1;

    return Promise.resolve(parsed.slice(startIdx, stopIdx));
  }

  llen(key) {
    const list = mockRedisStore.get(key);
    if (!list) return Promise.resolve(0);
    const parsed = JSON.parse(list);
    return Promise.resolve(parsed.length);
  }
}

// Export mock store for test access
RedisMock.mockStore = mockRedisStore;

module.exports = RedisMock;
