# Route map

The app uses Next.js App Router.

| URL | File | Layout |
| --- | --- | --- |
| `/home` | `app/home/page.tsx` | `AppShell` |
| `/wardrobe` | `app/wardrobe/page.tsx` | `AppShell` |
| `/stylist` | `app/stylist/page.tsx` | `AppShell` |
| `/stylist/create-look` | `app/stylist/create-look/page.tsx` | `AppShell` |
| `/stylist/match` | `app/stylist/match/page.tsx` | `AppShell` |
| `/outfit/[id]` | `app/outfit/[id]/page.tsx` | `AppShell` |
| `/outfit/[id]/preview` | `app/outfit/[id]/preview/page.tsx` | `AppShell` |
| `/profile` | `app/profile/page.tsx` | `AppShell` |
| `/support` | `app/support/page.tsx` | `AppShell` |
| `/login` | `app/login/page.tsx` | root layout |

The target page is `/outfit/[id]/preview`. It authenticates server-side, renders contextual guidance, then mounts `LookPreviewClient` inside the shared application shell.
