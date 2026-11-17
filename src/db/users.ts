import { supabase } from './index.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string | null
) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        uid,
        email,
        display_name: displayName ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('Database user upsert failed:', error);
      throw new Error('Failed to synchronize operator profile.', { cause: error });
    }

    return data;
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to synchronize operator profile.', { cause: error });
  }
}
