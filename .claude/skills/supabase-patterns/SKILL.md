---
name: supabase-patterns
description: Supabase connection patterns, auth flow, storage upload, and performance best practices for Yoonjaespace. Use when setting up Supabase clients, writing queries, handling auth, or uploading files.
---

# Supabase Patterns for Yoonjaespace

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=https://ihjjojscswntqmakacas.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_MsqOVhVVzSmEbbmT6-Yeag_OTBewYVg
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImloampvanNjc3dudHFtYWthY2FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjI4OTE5OSwiZXhwIjoyMDg3ODY1MTk5fQ.UzjbQZq_W6Y7APjYpMMGx8kIevQvq41xaL2fdC5ofi4
```

## 4 Client Types

### 1. Browser Client (`src/utils/supabase/client.ts`)
For Client Components (interactive UI).
```typescript
import { createBrowserClient } from "@supabase/ssr";
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
  );
```

### 2. Server Client (`src/utils/supabase/server.ts`)
For Server Components & Route Handlers.
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
export const createClient = async () => {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch {}
        },
      },
    }
  );
};
```

### 3. Middleware Client (`src/utils/supabase/middleware.ts`)
For auth session refresh + route protection.
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
export const updateSession = async (request: NextRequest) => {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options));
        },
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  const publicRoutes = ['/login', '/customer', '/invoice', '/mua'];
  const isPublic = publicRoutes.some(r => request.nextUrl.pathname.startsWith(r));
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  return supabaseResponse;
};
```

### 4. Admin Client (`src/utils/supabase/admin.ts`)
For server-side only operations (create/delete auth users). NEVER expose to client.
```typescript
import { createClient } from "@supabase/supabase-js";
export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
```

## Performance Patterns

### Parallel Fetches
```typescript
const [packages, backgrounds, addons] = await Promise.all([
  supabase.from('packages').select('id, name, price').eq('is_active', true),
  supabase.from('backgrounds').select('id, name').eq('is_available', true),
  supabase.from('addons').select('id, name, price').eq('is_active', true),
]);
```

### Lean Selects — only columns you need
```typescript
// GOOD
const { data } = await supabase.from('bookings').select('id, booking_number, booking_date, status');
// BAD
const { data } = await supabase.from('bookings').select('*');
```

### Joins
```typescript
const { data } = await supabase.from('bookings').select(`
  id, booking_number, booking_date, start_time, status, total,
  customers(name, phone),
  packages(name, price),
  users!bookings_staff_id_fkey(name)
`);
```

## Storage Pattern (Logo & Foto Studio)
```typescript
// Upload with upsert (old file auto-replaced)
const { data, error } = await supabase.storage
  .from('images-yoonjae')
  .upload('studio/logo', file, { upsert: true });

// Get public URL with cache busting
const { data: { publicUrl } } = supabase.storage
  .from('images-yoonjae')
  .getPublicUrl('studio/logo');
const url = `${publicUrl}?t=${Date.now()}`;
```

## Activity Logging Pattern
```typescript
await supabase.from('activity_log').insert({
  user_id: currentUser.id,
  user_name: currentUser.name,
  user_role: currentUser.role_name,
  action: 'create_booking',
  entity: 'booking',
  entity_id: bookingId,
  description: `Created booking ${bookingNumber} for ${customerName}`,
});
```

## Auth Login/Logout
```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({ email, password });
// Logout
await supabase.auth.signOut();
// Get session user
const { data: { user } } = await supabase.auth.getUser();
```
