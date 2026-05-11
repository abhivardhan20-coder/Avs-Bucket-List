# Supabase Migration & Setup Guide

## Quick Start (5 minutes)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project (choose a region close to your users)
3. Copy your project credentials:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon Key: `eyJhbGci...` (starts with `eyJ`)

### Step 2: Deploy Database Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the entire contents of `docs/supabase-schema.sql`
4. Paste into the query editor
5. Click **Run**
6. Verify success (no errors)

### Step 3: Configure Google OAuth
1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Click **Google**
3. Get your Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com):
   - Create OAuth 2.0 credentials (Web application)
   - Copy **Client ID** and **Client Secret**
4. Paste into Supabase Google provider settings
5. Add redirect URI: `https://yourproject.supabase.co/auth/v1/callback`

### Step 4: Configure App Environment
Create `.env.local` in project root:
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com  # (optional, for direct Google login)
```

### Step 5: Install & Run
```bash
npm install
npm run dev
```

---

## Detailed Configuration

### Supabase Project Setup

#### Authentication Settings
- **Provider**: Google OAuth (required)
- **Redirect URLs**: 
  - Local: `http://localhost:3000`
  - Production: `https://yourdomain.com`
- **Additional**: Enable email confirmations (optional)

#### Database Settings
- **SQL Editor**: All tables created via `supabase-schema.sql`
- **RLS Policies**: Enforced automatically (row_level_security enabled)
- **Backups**: Enabled by default (daily snapshots)

### Environment Variables

| Variable | Value | Required? |
|----------|-------|-----------|
| `VITE_SUPABASE_URL` | Your project URL | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | Public anon key | ✅ Yes |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth ID | ✅ Yes |

### Row-Level Security (RLS)

All policies enforce: `auth.uid() = user_id`

This means:
- Users can only see/modify their own data
- No admin override needed (RLS is unbypassable)
- Enforced at database level, not application level

---

## Migrating from Google Apps Script

### Option A: One-Time Automatic Migration (Recommended)

1. Deploy Supabase schema
2. Configure Google OAuth
3. Log in with Google (first time)
4. App automatically checks for old GAS data
5. If found, pulls and inserts into Supabase
6. Done!

**Note**: This only works if your old GAS endpoint is still available. See `src/lib/migrationService.ts` for details.

### Option B: Manual Export/Import

If GAS is no longer available:

1. **Export from GAS** (if still have access):
   ```javascript
   // Run in GAS editor:
   function exportAllData() {
     const sheet = SpreadsheetApp.getSheets()[0];
     const data = sheet.getDataRange().getValues();
     Logger.log(JSON.stringify(data));
   }
   ```

2. **Convert to Supabase format**:
   ```typescript
   // Transform GAS rows to media_items format
   const items = gasData.map(row => ({
     id: row.id,
     user_id: uuid,
     status: row.status,
     // ... other fields
   }));
   ```

3. **Insert via Supabase Dashboard**:
   ```sql
   INSERT INTO media_items (id, user_id, status, ...)
   VALUES (...)
   ON CONFLICT(id) DO NOTHING;
   ```

---

## Testing the Setup

### 1. Authentication Test
```bash
npm run dev
# Go to http://localhost:3000
# Click "Sign In"
# Verify Google login works
```

### 2. Data Sync Test
```bash
# While signed in:
# 1. Add a movie to watchlist
# 2. Wait 1 second
# 3. Verify in Supabase: Dashboard > SQL Editor > SELECT * FROM media_items;
```

### 3. Offline Test
```bash
# 1. Load the app
# 2. Open DevTools > Network
# 3. Click "Offline" checkbox
# 4. Verify you can still browse your library
# 5. Add/edit an item
# 6. Go back online
# 7. Verify sync happens automatically
```

### 4. Conflict Test
```bash
# 1. Open app on two different browsers
# 2. Edit the SAME item in both
# 3. Save in both
# 4. Go to Conflict Review modal
# 5. Verify conflict appears
# 6. Resolve it
# 7. Check Supabase sync_conflicts table
```

---

## Troubleshooting

### "Missing Supabase credentials"
- Check `.env.local` exists
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart dev server after changing `.env.local`

### "Google OAuth failed"
- Check Google Client ID is correct
- Verify redirect URI matches in Google Cloud Console
- Check Google provider is enabled in Supabase

### "RLS policy error"
- Ensure `auth.uid()` is the current user
- Check user is authenticated (call `supabase.auth.getUser()`)
- Verify `user_id` column matches the authenticated user's UUID

### "Sync is slow"
- Check network tab for slow requests
- Verify Supabase project is in a nearby region
- Check for large payloads (>1MB items)

### "Conflicts keep appearing"
- Normal if editing on multiple devices
- Use "Merge" resolution strategy (keeps max progress, unions episode lists)
- Check `sync_conflicts` table for history

---

## Production Deployment

### Before Going Live

1. **Set up custom domain** (optional):
   - In Supabase Settings > Custom Domain
   - Point DNS to Supabase

2. **Enable email confirmations**:
   - Auth > Providers > Email
   - Users must verify email on signup

3. **Backup strategy**:
   - Enable Supabase backups (Settings > Backup)
   - Daily backups retained 7 days by default
   - Export critical data weekly

4. **Monitor usage**:
   - Supabase Dashboard > Usage
   - Set up cost alerts

5. **Security review**:
   - Check RLS policies are correct
   - Audit table access logs
   - Enable MFA for your Supabase account

### Environment for Production

```bash
# .env.production
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
```

### Deployment Checklist
- [ ] Supabase schema deployed
- [ ] Google OAuth configured
- [ ] Environment variables set
- [ ] SSL certificate valid
- [ ] RLS policies tested
- [ ] Backup tested
- [ ] Monitoring enabled
- [ ] Data retention policy documented

---

## Advanced: Realtime Sync

The app now supports realtime updates from Supabase:

```typescript
// SyncProvider.tsx listens for changes:
const channel = supabase
  .channel(`media_items:user_id=eq.${userId}`)
  .on('postgres_changes', { event: '*' }, (payload) => {
    // Update local Dexie from remote changes
    if (payload.new) {
      db.watchlist.put(payload.new);
    }
  })
  .subscribe();
```

This means changes made on one device appear on another within milliseconds.

---

## FAQ

**Q: Can I use Supabase with my existing Google Sheets data?**  
A: Yes! The app includes automatic one-time migration. See "Migrating from Google Apps Script" section above.

**Q: Is my data secure?**  
A: Yes. RLS policies ensure you can only access your own data. Supabase uses enterprise-grade encryption and backups.

**Q: What's the cost?**  
A: Supabase Free tier includes 500MB database, 1GB/month bandwidth. Plenty for 1 user with 10,000+ items.

**Q: Can I export my data?**  
A: Yes. Use Supabase Dashboard > Export or run `SELECT * FROM media_items` and download as CSV.

**Q: What if Supabase goes down?**  
A: Your app still works offline. When connection is restored, data syncs automatically.

---

## Support & Documentation

- **Supabase Docs**: https://supabase.com/docs
- **GitHub Issues**: [Report bugs here]
- **Community Forum**: Supabase Discord

---

**Last Updated**: 2026-05-11  
**Status**: ✅ Production Ready
