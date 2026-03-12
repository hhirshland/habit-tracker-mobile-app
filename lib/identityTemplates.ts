export interface SuggestedHabit {
  name: string;
  frequency_per_week: number;
}

export interface IdentityTemplate {
  id: string;
  statement: string;
  emoji: string;
  categoryId: string;
  suggestedHabits: SuggestedHabit[];
}

export interface IdentityCategory {
  id: string;
  label: string;
  icon: string;
  templates: IdentityTemplate[];
}

export const IDENTITY_CATEGORIES: IdentityCategory[] = [
  {
    id: 'health',
    label: 'Health & Fitness',
    icon: 'heartbeat',
    templates: [
      {
        id: 'athlete',
        statement: 'I am an Athlete',
        emoji: '💪',
        categoryId: 'health',
        suggestedHabits: [
          { name: 'Workout', frequency_per_week: 5 },
          { name: 'Run', frequency_per_week: 3 },
          { name: 'Stretch', frequency_per_week: 7 },
        ],
      },
      {
        id: 'healthy_eater',
        statement: 'I am a Healthy Eater',
        emoji: '🥗',
        categoryId: 'health',
        suggestedHabits: [
          { name: 'Cook at home', frequency_per_week: 5 },
          { name: 'Meal prep', frequency_per_week: 2 },
          { name: 'Drink 8 glasses of water', frequency_per_week: 7 },
        ],
      },
    ],
  },
  {
    id: 'mindfulness',
    label: 'Mindfulness',
    icon: 'leaf',
    templates: [
      {
        id: 'mindful',
        statement: 'I am a Mindful Person',
        emoji: '🧘',
        categoryId: 'mindfulness',
        suggestedHabits: [
          { name: 'Meditate', frequency_per_week: 7 },
          { name: 'Breathwork', frequency_per_week: 5 },
          { name: 'Digital detox (1 hr)', frequency_per_week: 7 },
        ],
      },
      {
        id: 'at_peace',
        statement: 'I am at Peace',
        emoji: '☮️',
        categoryId: 'mindfulness',
        suggestedHabits: [
          { name: 'Journal', frequency_per_week: 7 },
          { name: 'Gratitude practice', frequency_per_week: 7 },
          { name: 'Walk in nature', frequency_per_week: 3 },
        ],
      },
    ],
  },
  {
    id: 'learning',
    label: 'Learning & Growth',
    icon: 'graduation-cap',
    templates: [
      {
        id: 'learner',
        statement: 'I am a Lifelong Learner',
        emoji: '🎓',
        categoryId: 'learning',
        suggestedHabits: [
          { name: 'Study', frequency_per_week: 5 },
          { name: 'Practice a skill', frequency_per_week: 5 },
          { name: 'Listen to a podcast', frequency_per_week: 3 },
        ],
      },
      {
        id: 'reader',
        statement: 'I am a Reader',
        emoji: '📚',
        categoryId: 'learning',
        suggestedHabits: [
          { name: 'Read 30 minutes', frequency_per_week: 7 },
          { name: 'Take reading notes', frequency_per_week: 3 },
        ],
      },
    ],
  },
  {
    id: 'productivity',
    label: 'Productivity',
    icon: 'rocket',
    templates: [
      {
        id: 'disciplined',
        statement: 'I am Disciplined',
        emoji: '⚡',
        categoryId: 'productivity',
        suggestedHabits: [
          { name: 'Deep work block', frequency_per_week: 5 },
          { name: 'Plan tomorrow', frequency_per_week: 7 },
          { name: 'No social media before noon', frequency_per_week: 7 },
        ],
      },
      {
        id: 'early_riser',
        statement: 'I am an Early Riser',
        emoji: '🌅',
        categoryId: 'productivity',
        suggestedHabits: [
          { name: 'Wake by 6am', frequency_per_week: 7 },
          { name: 'Morning routine', frequency_per_week: 7 },
        ],
      },
    ],
  },
  {
    id: 'relationships',
    label: 'Relationships',
    icon: 'users',
    templates: [
      {
        id: 'good_partner',
        statement: 'I am a Good Partner',
        emoji: '❤️',
        categoryId: 'relationships',
        suggestedHabits: [
          { name: 'Quality time', frequency_per_week: 7 },
          { name: 'Date night', frequency_per_week: 1 },
          { name: 'Acts of kindness', frequency_per_week: 3 },
        ],
      },
      {
        id: 'caring_friend',
        statement: 'I am a Caring Friend',
        emoji: '🤝',
        categoryId: 'relationships',
        suggestedHabits: [
          { name: 'Check in on a friend', frequency_per_week: 3 },
          { name: 'Plan a hangout', frequency_per_week: 1 },
        ],
      },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: 'line-chart',
    templates: [
      {
        id: 'financially_free',
        statement: 'I am Financially Free',
        emoji: '💰',
        categoryId: 'finance',
        suggestedHabits: [
          { name: 'Review budget', frequency_per_week: 1 },
          { name: 'No-spend day', frequency_per_week: 3 },
          { name: 'Track expenses', frequency_per_week: 7 },
        ],
      },
      {
        id: 'intentional_money',
        statement: 'I am Intentional with Money',
        emoji: '📊',
        categoryId: 'finance',
        suggestedHabits: [
          { name: 'Save before spending', frequency_per_week: 1 },
          { name: 'Review subscriptions', frequency_per_week: 1 },
        ],
      },
    ],
  },
  {
    id: 'creativity',
    label: 'Creativity',
    icon: 'paint-brush',
    templates: [
      {
        id: 'creator',
        statement: 'I am a Creator',
        emoji: '🎨',
        categoryId: 'creativity',
        suggestedHabits: [
          { name: 'Write', frequency_per_week: 5 },
          { name: 'Build something', frequency_per_week: 3 },
          { name: 'Brainstorm ideas', frequency_per_week: 2 },
        ],
      },
      {
        id: 'artist',
        statement: 'I am an Artist',
        emoji: '🎵',
        categoryId: 'creativity',
        suggestedHabits: [
          { name: 'Practice instrument', frequency_per_week: 5 },
          { name: 'Draw or sketch', frequency_per_week: 3 },
        ],
      },
    ],
  },
];

export const ALL_IDENTITY_TEMPLATES: IdentityTemplate[] = IDENTITY_CATEGORIES.flatMap(
  (cat) => cat.templates,
);

export const DEFAULT_CUSTOM_EMOJI = '✨';

const _statementCategoryMap = new Map<string, string>();
for (const cat of IDENTITY_CATEGORIES) {
  for (const t of cat.templates) {
    _statementCategoryMap.set(t.statement.toLowerCase(), cat.id);
  }
}

export function getCategoryIdForStatement(statement: string): string {
  return _statementCategoryMap.get(statement.toLowerCase()) ?? 'custom';
}
