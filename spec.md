# Multi-Tenant Theme Provider & Dynamic Top Navigation Bar

## Overview

White-labeled education platform with dynamic tenant branding and role-based horizontal navigation. The system supports three user roles — `SUPER_ADMIN`, `COUNSELOR`, `STUDENT` — each with its own navigation set. Student nav items are gated by counselor-controlled feature flags.

---

## 1. TenantThemeProvider

**File:** `components/providers/TenantThemeProvider.tsx`

A client-side context provider that receives tenant branding details and injects them as CSS custom properties into the DOM root. All Tailwind color references (`--tenant-primary`, `--tenant-accent`) adapt automatically per tenant.

### Interface — `TenantBrand`

| Property      | Type     | Description                        |
|---------------|----------|------------------------------------|
| `id`          | `string` | Tenant identifier                  |
| `name`        | `string` | Display brand name                 |
| `logoUrl`     | `string` | URL to tenant logo image           |
| `primaryColor`| `string` | Primary color in hex (e.g. `#0F172A`) |
| `accentColor` | `string` | Accent color in hex (e.g. `#3B82F6`) |
| `subdomain`   | `string` | Tenant subdomain slug              |

### Behaviour

- Wraps the application layout
- On mount, sets `--tenant-primary` and `--tenant-accent` CSS vars on `document.documentElement`
- Makes tenant config available via `useTenant()` hook
- Throws if `useTenant()` is called outside the provider

### Usage

```tsx
import { TenantThemeProvider } from '@/components/providers/TenantThemeProvider';

<TenantThemeProvider tenant={tenant}>
  {children}
</TenantThemeProvider>
```

### Hook — `useTenant()`

```ts
const tenant = useTenant();
// => { id, name, logoUrl, primaryColor, accentColor, subdomain }
```

---

## 2. TopNav

**File:** `components/navigation/TopNav.tsx`

A sticky horizontal top navigation bar that adapts to the tenant brand, user role, student presence status, and feature flag permissions.

### Props — `TopNavProps`

| Prop                      | Type              | Required | Description                                 |
|---------------------------|-------------------|----------|---------------------------------------------|
| `user`                    | `UserInfo`        | Yes      | Current user details                        |
| `status`                  | `OnlineStatus`    | No       | Real-time presence state (default `ONLINE`) |
| `currentTestTitle`        | `string`          | No       | Test name shown during `IN_TEST` status     |
| `featureFlags`            | `FeatureFlags`    | No       | Student feature toggles (counselor-gated)   |
| `unreadNotificationsCount`| `number`          | No       | Badge count for notification bell           |

### Types

#### `UserInfo`

```ts
{
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'COUNSELOR' | 'STUDENT';
  avatarUrl?: string;
}
```

#### `OnlineStatus`

```ts
'ONLINE' | 'IN_TEST' | 'OFFLINE'
```

#### `FeatureFlags`

```ts
{
  canAccessCollegeSearch: boolean;
  canAccessAIOddsCalc: boolean;
  canAccessMockTests: boolean;
  canAccessScholarships: boolean;
  canAccessCareerExplorer: boolean;
  canAccessAppointments: boolean;
}
```

### Navigation Structure

| Section   | Content                                                      |
|-----------|--------------------------------------------------------------|
| **LEFT**  | Tenant logo (or name fallback), linked to `/`               |
| **CENTER**| Role-based horizontal nav links (hidden on mobile via `md:flex`) |
| **RIGHT** | Presence badge (students only), notification bell, avatar dropdown |

### Role-based Nav Items

#### SUPER_ADMIN / COUNSELOR

| Label       | Route                    | Icon       |
|-------------|--------------------------|------------|
| Overview    | `/dashboard`             | `BarChart2`|
| Students    | `/dashboard/students`    | `Users`    |
| Permissions | `/dashboard/permissions` | `Sliders`  |
| Calendar    | `/dashboard/calendar`    | `Calendar` |
| Webinars    | `/dashboard/webinars`    | `Video`    |

All counselor items are always unlocked.

#### STUDENT

| Label        | Route                        | Icon       | Gated By                       |
|--------------|------------------------------|------------|--------------------------------|
| Home         | `/student`                   | `Compass`  | Always unlocked                |
| Colleges     | `/student/colleges`          | `BookOpen` | `canAccessCollegeSearch`       |
| AI Odds      | `/student/ai-odds`           | `Target`   | `canAccessAIOddsCalc`          |
| Mock Tests   | `/student/tests`             | `FileText` | `canAccessMockTests`           |
| Scholarships | `/student/scholarships`      | `Award`    | `canAccessScholarships`        |
| Appointments | `/student/appointments`      | `Calendar` | `canAccessAppointments`        |

Locked items render with a `Lock` icon, `opacity-60`, and `cursor-not-allowed`. No pointer events.

### Presence Badge (Student Only)

| Status    | Visual                                       |
|-----------|----------------------------------------------|
| `ONLINE`  | Green pulsing dot + "Online" text            |
| `IN_TEST` | Amber pulsing dot + "In-Test: {testTitle}"   |
| `OFFLINE` | Grey dot + "Offline" text                    |

### Notification Bell

- Shows a red numbered badge when `unreadNotificationsCount > 0`
- Caps display at `9+` for counts above 9
- Accessible via `aria-label="Notifications"`

### User Dropdown

| Item              | Action                        |
|-------------------|-------------------------------|
| User info header  | Name, email, role badge       |
| Profile Settings  | Link to `/profile`            |
| Sign Out          | Calls `alert('Signing out...')` (placeholder) |

### Usage Example

```tsx
import { TopNav } from '@/components/navigation/TopNav';

<TopNav
  user={{
    name: 'Alex Miller',
    email: 'alex@student.com',
    role: 'STUDENT',
  }}
  status="ONLINE"
  featureFlags={{
    canAccessCollegeSearch: true,
    canAccessAIOddsCalc: true,
    canAccessMockTests: false,
    canAccessScholarships: false,
    canAccessCareerExplorer: true,
    canAccessAppointments: true,
  }}
  unreadNotificationsCount={2}
/>
```

### Styling Notes

- Uses Tailwind CSS v3 with `dark:` variants
- Header is `sticky top-0 z-50` with `backdrop-blur` frosted glass effect
- Active nav link gets a bottom border in the tenant's accent color
- All states include `hover`, `active`, and `focus-visible` ring styles
- Fully responsive: nav items hidden on mobile (`hidden md:flex`)

---

## 3. Root Layout Wiring

**File:** `app/layout.tsx`

```tsx
import { TenantThemeProvider } from '@/components/providers/TenantThemeProvider';
import { TopNav } from '@/components/navigation/TopNav';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = {
    id: 'tenant-123',
    name: 'Zenith Education',
    logoUrl: 'https://placehold.co/150x40/0f172a/ffffff?text=Zenith+Edu',
    primaryColor: '#0F172A',
    accentColor: '#3B82F6',
    subdomain: 'zenith',
  };

  const currentUser = {
    name: 'Alex Miller',
    email: 'alex@student.com',
    role: 'STUDENT' as const,
  };

  const studentFeatureFlags = {
    canAccessCollegeSearch: true,
    canAccessAIOddsCalc: true,
    canAccessMockTests: false,
    canAccessScholarships: false,
    canAccessCareerExplorer: true,
    canAccessAppointments: true,
  };

  return (
    <html lang="en">
      <body>
        <TenantThemeProvider tenant={tenant}>
          <TopNav
            user={currentUser}
            status="ONLINE"
            featureFlags={studentFeatureFlags}
            unreadNotificationsCount={2}
          />
          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
        </TenantThemeProvider>
      </body>
    </html>
  );
}
```

---

## Dependencies

| Package        | Purpose                           |
|----------------|-----------------------------------|
| `next`         | App Router, Link, usePathname     |
| `react`        | Context, hooks, JSX               |
| `lucide-react` | Icon components                   |
| `tailwindcss`  | Utility-first CSS framework       |
