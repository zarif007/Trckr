# Dashboard

The dashboard is the main workspace for projects, modules, and trackers. It uses **SSR + TanStack Query** for fast first paint and cached client navigation.

## Structure

```
app/dashboard/
├── README.md                 # This file
├── layout.tsx                # Server layout: fetches projects, passes to client
├── page.tsx                  # Dashboard (project list) page
├── dashboard-context.tsx     # Projects list from TanStack Query + UI state
├── query-keys.ts             # TanStack Query key factory
├── hooks/                    # Shared hooks (rename/delete context menu, etc.)
├── components/               # Modular UI components
│   ├── layout/               # Shell and providers
│   │   ├── QueryClientProviderWrapper.tsx
│   │   └── DashboardLayoutClient.tsx  # Sidebar + DashboardProvider
│   ├── project/              # Project folder view
│   │   └── ProjectContent.tsx
│   ├── module/               # Module view
│   │   └── ModuleContent.tsx
│   └── file/                 # Project file view (e.g. Teams, Settings)
│       └── ProjectFileContent.tsx
├── [projectId]/
│   ├── page.tsx              # Server: fetch project → ProjectContent
│   ├── file/[fileId]/page.tsx
│   └── module/[moduleId]/page.tsx
```

**Server data** is loaded in `lib/dashboard-data.ts` (server-only). Pages are **Server Components** that call helpers like `getProjectForUser`, `getModuleAndProjectNameForUser`, then pass `initialData` to client components.

## Data flow

- **Layout**: Server fetches `getProjectsForUser()` → `DashboardLayoutClient` → `DashboardProvider` uses it as `initialData` for the `['projects']` query. Sidebar reads from the same cache.
- **Project page**: Server fetches project → `ProjectContent` with `useQuery(['project', id], { initialData })`. Mutations invalidate `project` and `projects`.
- **Module page**: Server fetches module + project name in one call → `ModuleContent` with `useQuery(['module', id], { initialData })`.
- **File page**: Server fetches project, finds file → `ProjectFileContent` reuses project cache.

Redirects on 404 are done in **useEffect** (not inside `queryFn` or during render) to avoid sudden redirects and keep the UI predictable.

## Conventions

- **Route `page.tsx`**: Async Server Component; fetches data, redirects if missing, renders one client content component.
- **Content components** live under `components/<area>/` and use `useQuery` with `initialData` from the server. They handle loading, errors, and mutations and invalidate the relevant query keys.
- **Query keys**: Use `dashboardQueryKeys` from `query-keys.ts` so cache invalidation stays consistent.
