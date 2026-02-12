# Habit Tracker

A mobile habit tracking app built with Expo and Supabase.

## Tech Stack

- **Frontend**: Expo (React Native) with Expo Router
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Analytics**: PostHog (placeholder for v2)

## Getting Started

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the schema in `supabase/schema.sql`
3. (Optional) For profile picture uploads, create a Storage bucket:
   - Go to Storage → New Bucket
   - Name: `avatars`
   - Set to public
4. Copy your project URL and anon key from Settings → API

### 2. Environment Variables

Create a `.env` file in the project root:

```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Install & Run

```bash
npm install
npx expo start
```

Then press `i` for iOS simulator or `a` for Android emulator, or scan the QR code with Expo Go.

## Project Structure

```
app/
├── _layout.tsx              # Root layout with auth routing
├── (auth)/                  # Auth screens
│   ├── sign-in.tsx
│   └── sign-up.tsx
├── (onboarding)/            # Onboarding flow
│   └── index.tsx
└── (tabs)/                  # Main app tabs
    ├── index.tsx            # Today's Priorities
    ├── habits.tsx           # My Habits (CRUD)
    └── profile.tsx          # Profile settings

components/
├── HabitForm.tsx            # Reusable habit creation/edit form
├── HabitItem.tsx            # Habit card for My Habits view
└── PriorityItem.tsx         # Checkable item for Today's view

contexts/
└── AuthContext.tsx           # Auth state management

lib/
├── supabase.ts              # Supabase client
├── habits.ts                # Habit CRUD operations
├── theme.ts                 # App theme/colors
└── types.ts                 # TypeScript types

supabase/
└── schema.sql               # Database schema
```

## Features

- **Auth**: Email/password sign-up and sign-in
- **Onboarding**: Guided habit creation after signup
- **Today's Priorities**: Daily view showing scheduled habits with check-off
- **My Habits**: Full CRUD for managing habits with flexible scheduling
- **Profile**: Name, avatar, and account management
# habit-tracker-mobile-app
