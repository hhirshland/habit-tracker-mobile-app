import { Habit } from '../types';

// Mock supabase before importing habits
jest.mock('../supabase');
jest.mock('../health');

import {
  getHabitsForDay,
  isHabitRequiredToday,
  formatDate,
  getTodayDate,
  getCurrentWeekRange,
  getHabits,
  toggleHabitCompletion,
  getStreak,
} from '../habits';
import { supabase } from '../supabase';

// ── Test helpers ──────────────────────────────────

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    user_id: 'user-1',
    name: 'Exercise',
    description: null,
    frequency_per_week: 5,
    specific_days: null,
    is_active: true,
    metric_type: null,
    metric_threshold: null,
    auto_complete: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// ── formatDate ───────────────────────────────────

describe('formatDate', () => {
  it('formats a date to YYYY-MM-DD', () => {
    const date = new Date(2025, 0, 15); // Jan 15, 2025
    expect(formatDate(date)).toBe('2025-01-15');
  });

  it('zero-pads single-digit months and days', () => {
    const date = new Date(2025, 2, 5); // Mar 5, 2025
    expect(formatDate(date)).toBe('2025-03-05');
  });

  it('handles December 31 correctly', () => {
    const date = new Date(2025, 11, 31);
    expect(formatDate(date)).toBe('2025-12-31');
  });

  it('handles January 1 correctly', () => {
    const date = new Date(2025, 0, 1);
    expect(formatDate(date)).toBe('2025-01-01');
  });
});

// ── getTodayDate ─────────────────────────────────

describe('getTodayDate', () => {
  it('returns a string matching YYYY-MM-DD format', () => {
    expect(getTodayDate()).toMatch(DATE_REGEX);
  });
});

// ── getCurrentWeekRange ──────────────────────────

describe('getCurrentWeekRange', () => {
  it('returns start and end keys', () => {
    const range = getCurrentWeekRange();
    expect(range).toHaveProperty('start');
    expect(range).toHaveProperty('end');
  });

  it('returns dates in YYYY-MM-DD format', () => {
    const range = getCurrentWeekRange();
    expect(range.start).toMatch(DATE_REGEX);
    expect(range.end).toMatch(DATE_REGEX);
  });

  it('start is a Sunday and end is a Saturday (6 days apart)', () => {
    const range = getCurrentWeekRange();
    const start = new Date(range.start + 'T12:00:00');
    const end = new Date(range.end + 'T12:00:00');

    expect(start.getDay()).toBe(0); // Sunday
    expect(end.getDay()).toBe(6); // Saturday

    const dayDiff = (end.getTime() - start.getTime()) / 86400000;
    expect(dayDiff).toBe(6);
  });
});

// ── getHabitsForDay ──────────────────────────────

describe('getHabitsForDay', () => {
  it('returns only active habits', () => {
    const habits = [
      makeHabit({ id: '1', is_active: true }),
      makeHabit({ id: '2', is_active: false }),
    ];
    const result = getHabitsForDay(habits, 1); // Monday
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by specific_days when set', () => {
    const habits = [
      makeHabit({ id: '1', specific_days: [1, 3, 5] }), // Mon, Wed, Fri
    ];
    expect(getHabitsForDay(habits, 1)).toHaveLength(1); // Monday — included
    expect(getHabitsForDay(habits, 2)).toHaveLength(0); // Tuesday — excluded
  });

  it('returns all active habits when no specific_days', () => {
    const habits = [
      makeHabit({ id: '1', specific_days: null }),
      makeHabit({ id: '2', specific_days: [] }),
    ];
    const result = getHabitsForDay(habits, 4); // Thursday
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no habits match', () => {
    const habits = [
      makeHabit({ id: '1', specific_days: [0] }), // Sunday only
    ];
    expect(getHabitsForDay(habits, 3)).toHaveLength(0);
  });
});

// ── isHabitRequiredToday ─────────────────────────

describe('isHabitRequiredToday', () => {
  it('returns true for specific-day habit when today is in specific_days', () => {
    const habit = makeHabit({ specific_days: [1, 3, 5] }); // Mon, Wed, Fri
    expect(isHabitRequiredToday(habit, 1, 0, false)).toBe(true);
  });

  it('returns false for specific-day habit when today is not in specific_days', () => {
    const habit = makeHabit({ specific_days: [1, 3, 5] });
    expect(isHabitRequiredToday(habit, 2, 0, false)).toBe(false);
  });

  it('returns false when weekly goal is already met', () => {
    const habit = makeHabit({ frequency_per_week: 3 });
    // 3 completions already, on Wednesday (day 3)
    expect(isHabitRequiredToday(habit, 3, 3, false)).toBe(false);
  });

  it('returns true when remaining days equals completions still needed', () => {
    const habit = makeHabit({ frequency_per_week: 5 });
    // Day 4 (Thursday): remaining = 7-4 = 3 days (Thu, Fri, Sat)
    // 2 completions so far, still need 3 more = 3 remaining days → required
    expect(isHabitRequiredToday(habit, 4, 2, false)).toBe(true);
  });

  it('returns false when there are skip days remaining', () => {
    const habit = makeHabit({ frequency_per_week: 3 });
    // Day 0 (Sunday): remaining = 7 days, still need 3 → not required (can skip 4)
    expect(isHabitRequiredToday(habit, 0, 0, false)).toBe(false);
  });

  it('daily habit (freq=7) is always required', () => {
    const habit = makeHabit({ frequency_per_week: 7 });
    // On any day with 0 completions, stillNeeded=7, remaining = 7-day
    // Sunday: stillNeeded=7, remaining=7 → required
    expect(isHabitRequiredToday(habit, 0, 0, false)).toBe(true);
    // Wednesday: stillNeeded=7-3=4, remaining=7-3=4 → required (if 3 done)
    expect(isHabitRequiredToday(habit, 3, 3, false)).toBe(true);
    // Saturday: stillNeeded=7-6=1, remaining=1 → required
    expect(isHabitRequiredToday(habit, 6, 6, false)).toBe(true);
  });

  it('accounts for isCompletedToday when calculating completions', () => {
    const habit = makeHabit({ frequency_per_week: 5 });
    // Day 5 (Friday): remaining = 2 days (Fri, Sat)
    // weekCompletions=4, isCompletedToday=true → excluding today = 3, still need 2 = 2 remaining → required
    expect(isHabitRequiredToday(habit, 5, 4, true)).toBe(true);
    // weekCompletions=5, isCompletedToday=true → excluding today = 4, still need 1 = 2 remaining → not required
    expect(isHabitRequiredToday(habit, 5, 5, true)).toBe(false);
  });
});

// ── getHabits (Supabase mock) ────────────────────

describe('getHabits', () => {
  const mockFrom = supabase.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns habits array on success', async () => {
    const mockHabits = [makeHabit({ id: '1' }), makeHabit({ id: '2' })];
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: mockHabits, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getHabits();
    expect(result).toEqual(mockHabits);
    expect(mockFrom).toHaveBeenCalledWith('habits');
  });

  it('throws on Supabase error', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(getHabits()).rejects.toThrow('DB error');
  });

  it('returns empty array when data is null', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getHabits();
    expect(result).toEqual([]);
  });
});

// ── toggleHabitCompletion (Supabase mock) ────────

describe('toggleHabitCompletion', () => {
  const mockFrom = supabase.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes completion when already completed', async () => {
    const chain = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
    // Last eq in chain resolves
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ error: null });
    mockFrom.mockReturnValue(chain);

    await toggleHabitCompletion('habit-1', 'user-1', '2025-01-15', true);

    expect(mockFrom).toHaveBeenCalledWith('habit_completions');
    expect(chain.delete).toHaveBeenCalled();
  });

  it('inserts completion when not completed', async () => {
    const chain = {
      insert: jest.fn().mockResolvedValue({ error: null }),
    };
    mockFrom.mockReturnValue(chain);

    await toggleHabitCompletion('habit-1', 'user-1', '2025-01-15', false);

    expect(mockFrom).toHaveBeenCalledWith('habit_completions');
    expect(chain.insert).toHaveBeenCalledWith({
      habit_id: 'habit-1',
      user_id: 'user-1',
      completed_date: '2025-01-15',
    });
  });
});

// ── getStreak (Supabase mock) ────────────────────

describe('getStreak', () => {
  const mockFrom = supabase.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-15T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 0 streak and earnedToday=false for empty data', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getStreak();
    expect(result).toEqual({ streakCount: 0, earnedToday: false });
  });

  it('counts streak from today when today is completed', async () => {
    const completions = [
      { completed_date: '2025-06-15' }, // today
      { completed_date: '2025-06-14' },
      { completed_date: '2025-06-13' },
    ];
    const chain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: completions, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getStreak();
    expect(result.streakCount).toBe(3);
    expect(result.earnedToday).toBe(true);
  });

  it('counts streak from yesterday when today is not completed', async () => {
    const completions = [
      { completed_date: '2025-06-14' }, // yesterday
      { completed_date: '2025-06-13' },
    ];
    const chain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: completions, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getStreak();
    expect(result.streakCount).toBe(2);
    expect(result.earnedToday).toBe(false);
  });

  it('breaks streak on gap', async () => {
    const completions = [
      { completed_date: '2025-06-15' }, // today
      { completed_date: '2025-06-14' },
      // gap on June 13
      { completed_date: '2025-06-12' },
    ];
    const chain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: completions, error: null }),
    };
    mockFrom.mockReturnValue(chain);

    const result = await getStreak();
    expect(result.streakCount).toBe(2); // only today + yesterday
    expect(result.earnedToday).toBe(true);
  });

  it('throws on Supabase error', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') }),
    };
    mockFrom.mockReturnValue(chain);

    await expect(getStreak()).rejects.toThrow('DB error');
  });
});
