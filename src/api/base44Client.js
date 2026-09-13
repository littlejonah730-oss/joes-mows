// This app used to run on the Base44 platform SDK. It now runs on Supabase —
// this file keeps the same `base44.*` shape so the rest of the app (pages,
// components, hooks) didn't need to change call sites, but every call is now
// backed by Supabase (Postgres, Auth, Storage, Edge Functions) instead.
import { supabase } from '@/lib/supabaseClient';
import { entities } from '@/api/entitiesClient';
import { auth } from '@/api/authClient';

async function UploadFile({ file }) {
  const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`;
  const { error } = await supabase.storage.from('uploads').upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from('uploads').getPublicUrl(path);
  return { file_url: data.publicUrl };
}

async function invoke(functionName, payload) {
  const { data, error } = await supabase.functions.invoke(functionName, { body: payload });
  if (error) throw error;
  return { data };
}

// Requires the `invite-user` Supabase Edge Function (service-role) — see
// supabase/functions/invite-user. Without it deployed, this will fail; invite
// admins/employees directly from the Supabase dashboard in the meantime.
async function inviteUser(email, role) {
  const { data, error } = await supabase.functions.invoke('invite-user', { body: { email, role } });
  if (error) throw error;
  return data;
}

export const base44 = {
  entities,
  auth,
  integrations: {
    Core: { UploadFile },
  },
  functions: { invoke },
  users: { inviteUser },
};
