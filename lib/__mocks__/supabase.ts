const createChain = () => {
  const chain: any = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'order', 'single', 'limit', 'range',
  ];
  methods.forEach((method) => {
    chain[method] = jest.fn().mockReturnValue(chain);
  });
  // Default resolved value — override per-test with mockResolvedValueOnce
  chain.then = undefined; // make it thenable when needed
  Object.defineProperty(chain, '_mockResolvedValue', {
    value: { data: [], error: null },
    writable: true,
  });
  // Allow awaiting the chain
  chain.then = jest.fn((resolve: any) => resolve(chain._mockResolvedValue));
  return chain;
};

const mockChain = createChain();

export const supabase = {
  from: jest.fn().mockReturnValue(mockChain),
  _chain: mockChain,
  _resetChain: () => {
    Object.values(mockChain).forEach((fn: any) => {
      if (typeof fn?.mockClear === 'function') fn.mockClear();
    });
    mockChain._mockResolvedValue = { data: [], error: null };
  },
};
