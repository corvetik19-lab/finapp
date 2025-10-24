# 📎 Storage Testing Guide

## ✅ Setup Complete!

### Created Infrastructure:

1. **Bucket:** `attachments` (private, 10MB limit)
2. **Bucket:** `backups` (private, 50MB limit)
3. **4 RLS Policies** for each bucket
4. **File structure:** `{user_id}/filename.ext`

---

## 🧪 Test File Upload

### Option 1: Test via Supabase Dashboard

1. Go to Storage:
   ```
   https://supabase.com/dashboard/project/gwqvolspdzhcutvzsdbo/storage/buckets/attachments
   ```

2. Create a test folder with your user ID (get from Auth > Users)

3. Upload a test file to `{user_id}/test.jpg`

---

### Option 2: Test via JavaScript Code

Create `scripts/test-upload.js`:

```javascript
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testUpload() {
  // 1. Sign in (replace with your test user)
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'testpassword123'
  });

  if (authError) {
    console.error('Auth error:', authError);
    return;
  }

  const userId = authData.user.id;
  console.log('Logged in as:', userId);

  // 2. Upload test file
  const fileContent = Buffer.from('Test file content');
  const fileName = `${userId}/test-${Date.now()}.txt`;

  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(fileName, fileContent, {
      contentType: 'text/plain',
      upsert: false
    });

  if (error) {
    console.error('Upload error:', error);
  } else {
    console.log('✅ Upload successful:', data);
  }

  // 3. List files
  const { data: files, error: listError } = await supabase.storage
    .from('attachments')
    .list(userId);

  if (listError) {
    console.error('List error:', listError);
  } else {
    console.log('📁 Your files:', files);
  }

  // 4. Get public URL
  const { data: urlData } = supabase.storage
    .from('attachments')
    .getPublicUrl(fileName);

  console.log('🔗 File URL:', urlData.publicUrl);

  // 5. Download file
  const { data: downloadData, error: downloadError } = await supabase.storage
    .from('attachments')
    .download(fileName);

  if (downloadError) {
    console.error('Download error:', downloadError);
  } else {
    console.log('📥 Downloaded:', await downloadData.text());
  }

  // 6. Delete file
  const { error: deleteError } = await supabase.storage
    .from('attachments')
    .remove([fileName]);

  if (deleteError) {
    console.error('Delete error:', deleteError);
  } else {
    console.log('🗑️  File deleted');
  }
}

testUpload().catch(console.error);
```

Run:
```bash
node scripts/test-upload.js
```

---

## 🔐 Security Features

### What RLS Policies Enforce:

✅ **Users can only:**
- Upload files to `{their_user_id}/` folder
- View/download their own files
- Update their own files
- Delete their own files

❌ **Users cannot:**
- Access other users' files
- Upload to other users' folders
- List files outside their folder

### Test Security:

Try accessing another user's file:
```javascript
// Should fail with permission error
const { data, error } = await supabase.storage
  .from('attachments')
  .download('another-user-id/file.txt');

console.log(error); // Should show "Policy violation"
```

---

## 📊 Storage Limits

| Bucket | Max File Size | Total Limit |
|--------|--------------|-------------|
| attachments | 10 MB | Free tier: 1 GB |
| backups | 50 MB | Free tier: 1 GB |

---

## 🚀 Integration in App

### Upload Component Example:

```typescript
// components/FileUpload.tsx
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function FileUpload() {
  const [uploading, setUploading] = useState(false);
  const supabase = createClientComponentClient();

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('attachments')
        .upload(fileName, file);

      if (error) throw error;

      console.log('✅ Uploaded:', data);
      
      // Save to database
      await supabase.from('attachments').insert({
        user_id: user.id,
        file_name: file.name,
        file_path: data.path,
        file_size: file.size,
        mime_type: file.type
      });

    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

---

## ✅ Next Steps:

1. ✅ Test upload via Dashboard or script
2. ✅ Integrate FileUpload component in app
3. ✅ Create attachments UI in transactions
4. ✅ Add file preview/download features

---

## 🎯 Summary

**Storage is fully configured and secured!**

- ✅ Buckets created
- ✅ RLS policies active
- ✅ File size limits set
- ✅ Ready for production use

**Happy coding!** 🚀📎
