import { getSupabase, isSupabaseConfigured } from './supabaseClient';
import {
  FoundationConfig,
  Member,
  Designation,
  Activity,
  Notice,
  GalleryItem,
  ExpenseRecord,
  ContactMessage,
  SocialLink,
} from '../types';

export interface OperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: string;
  hint?: string;
  isSchemaMissing?: boolean;
}

export interface ItemizedEntityMigration {
  entity: string;
  label: string;
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  error?: string;
  debugDetails?: string;
}

export interface MigrationSummary {
  successful: number;
  failed: number;
  skipped: number;
  total: number;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  schemaNotInstalled?: boolean;
  counts: {
    config: number;
    designations: number;
    members: number;
    activities: number;
    notices: number;
    gallery: number;
    expenses: number;
    messages: number;
    social: number;
  };
  summary: MigrationSummary;
  itemizedSummary: ItemizedEntityMigration[];
  verifiedCounts: Record<string, number>;
  verified?: boolean;
  errors: string[];
  debugDetails: string[];
}

/**
 * Checks if a database/PostgREST error signifies a missing table or schema
 */
export function isTableMissingError(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  const details = String(error.details || '').toLowerCase();
  const hint = String(error.hint || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    code === 'PGRST204' ||
    code === 'PGRST200' ||
    code === 'PGRST116' ||
    msg.includes('could not find the table') ||
    (msg.includes('relation') && msg.includes('does not exist')) ||
    msg.includes('schema cache') ||
    (msg.includes('site_settings') && (msg.includes('does not exist') || msg.includes('not find'))) ||
    details.includes('does not exist') ||
    details.includes('relation') ||
    hint.includes('does not exist')
  );
}

export const supabaseService = {
  isAvailable(): boolean {
    return isSupabaseConfigured() && getSupabase() !== null;
  },

  // --------------------------------------------------------------------------
  // 1. SITE CONFIG / CMS
  // --------------------------------------------------------------------------
  async fetchConfig(): Promise<FoundationConfig | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('config')
        .eq('id', 'foundation_primary_config')
        .maybeSingle();

      if (error) {
        console.warn('Database fetchConfig error:', error.message);
        return null;
      }
      return (data?.config as FoundationConfig) || null;
    } catch (e) {
      console.warn('Database fetchConfig exception:', e);
      return null;
    }
  },

  async saveConfig(config: FoundationConfig): Promise<boolean> {
    const res = await this.saveConfigDetailed(config);
    return res.success;
  },

  /**
   * Safely saves site_settings:
   * - Checks if table exists (detects missing schema)
   * - Safe UPSERT when supported, fallback to UPDATE then INSERT
   * - Never fails because record already exists
   * - Verifies the saved row by reading it back
   * - Returns clear error codes and developer details
   */
  async saveConfigDetailed(config: FoundationConfig): Promise<OperationResult<FoundationConfig>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ ক্লায়েন্ট ইনিশিয়ালাইজ করা যায়নি। সংযোগ সেটিংস চেক করুন।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      // 1. Check existing record & verify table existence
      const { data: existingRow, error: checkError } = await supabase
        .from('site_settings')
        .select('id, updated_at')
        .eq('id', 'foundation_primary_config')
        .maybeSingle();

      if (checkError) {
        if (isTableMissingError(checkError)) {
          return {
            success: false,
            isSchemaMissing: true,
            error: 'site_settings টেবিল ডাটাবেজে পাওয়া যায়নি। প্রথমে supabase_schema.sql স্ক্রিপ্ট রান করে ডাটাবেজ টেবিল তৈরি করুন।',
            code: checkError.code || 'PGRST205',
            details: checkError.message,
            hint: 'ডাটাবেজ কনসোল SQL Editor এ গিয়ে সম্পূর্ণ supabase_schema.sql স্ক্রিপ্টটি চালান।',
          };
        }

        if (checkError.code === '42501' || checkError.message?.toLowerCase().includes('permission')) {
          return {
            success: false,
            error: 'site_settings টেবিলে এক্সেস পারমিশন নেই (RLS Policy ব্লক করেছে)।',
            code: checkError.code,
            details: checkError.message,
            hint: 'supabase_schema.sql রান করে "Allow write site_settings" RLS পলিসি প্রয়োগ করুন।',
          };
        }
      }

      const now = new Date().toISOString();
      const sanitizedConfig = { ...config };
      // Sanitize any secrets before persisting
      delete (sanitizedConfig as any).password;
      delete (sanitizedConfig as any).adminPassword;
      delete (sanitizedConfig as any).salt;
      delete (sanitizedConfig as any).hash;
      delete (sanitizedConfig as any).token;

      // 2. Safe UPSERT with onConflict 'id' and immediate select verification
      const { data: upsertData, error: upsertErr } = await supabase
        .from('site_settings')
        .upsert(
          {
            id: 'foundation_primary_config',
            config: sanitizedConfig,
            updated_at: now,
          },
          { onConflict: 'id' }
        )
        .select('id, config, updated_at')
        .maybeSingle();

      if (!upsertErr && upsertData?.id === 'foundation_primary_config' && upsertData.config) {
        return {
          success: true,
          data: upsertData.config as FoundationConfig,
        };
      }

      let writeError: any = upsertErr;

      if (upsertErr) {
        if (isTableMissingError(upsertErr)) {
          return {
            success: false,
            isSchemaMissing: true,
            error: 'site_settings টেবিল ডাটাবেজে পাওয়া যায়নি।',
            code: upsertErr.code,
            details: upsertErr.message,
            hint: 'ডাটাবেজ SQL Editor এ গিয়ে supabase_schema.sql স্ক্রিপ্টটি চালান।',
          };
        }

        if (upsertErr.code === '42501' || upsertErr.message?.toLowerCase().includes('policy')) {
          return {
            success: false,
            error: 'site_settings টেবিলে রাইট পারমিশন নেই (RLS Policy ব্লক করেছে)।',
            code: upsertErr.code,
            details: upsertErr.message,
            hint: 'supabase_schema.sql স্ক্রিপ্টটি ডাটাবেজ SQL Editor-এ রান করে RLS পলিসি হালনাগাদ করুন।',
          };
        }

        // Fallback: If existing row was found, try UPDATE; else try INSERT then UPDATE on conflict
        if (existingRow?.id) {
          const { data: updateData, error: updateErr } = await supabase
            .from('site_settings')
            .update({
              config: sanitizedConfig,
              updated_at: now,
            })
            .eq('id', 'foundation_primary_config')
            .select('id, config, updated_at')
            .maybeSingle();

          if (!updateErr && updateData?.id === 'foundation_primary_config') {
            return {
              success: true,
              data: updateData.config as FoundationConfig,
            };
          }
          writeError = updateErr;
        } else {
          const { data: insertData, error: insertErr } = await supabase
            .from('site_settings')
            .insert({
              id: 'foundation_primary_config',
              config: sanitizedConfig,
              updated_at: now,
            })
            .select('id, config, updated_at')
            .maybeSingle();

          if (!insertErr && insertData?.id === 'foundation_primary_config') {
            return {
              success: true,
              data: insertData.config as FoundationConfig,
            };
          }

          if (insertErr && (insertErr.code === '23505' || insertErr.message?.includes('duplicate'))) {
            // Concurrently inserted row: perform update
            const { data: retryData, error: retryErr } = await supabase
              .from('site_settings')
              .update({
                config: sanitizedConfig,
                updated_at: now,
              })
              .eq('id', 'foundation_primary_config')
              .select('id, config, updated_at')
              .maybeSingle();

            if (!retryErr && retryData?.id === 'foundation_primary_config') {
              return {
                success: true,
                data: retryData.config as FoundationConfig,
              };
            }
            writeError = retryErr;
          } else {
            writeError = insertErr;
          }
        }
      }

      // 3. Verification of the saved row in database
      const { data: verifiedRow, error: verifyError } = await supabase
        .from('site_settings')
        .select('id, config, updated_at')
        .eq('id', 'foundation_primary_config')
        .maybeSingle();

      if (verifyError) {
        return {
          success: false,
          isSchemaMissing: isTableMissingError(verifyError),
          error: `যাচাইকরণে ত্রুটি: ${verifyError.message}`,
          code: verifyError.code,
          details: verifyError.details || verifyError.hint,
          hint: isTableMissingError(verifyError)
            ? 'supabase_schema.sql স্ক্রিপ্ট চালিয়ে site_settings টেবিল তৈরি করুন।'
            : 'site_settings টেবিল ও RLS পলিসি চেক করুন।',
        };
      }

      if (!verifiedRow || !verifiedRow.config) {
        return {
          success: false,
          error: writeError?.message || 'site_settings টেবিলে কনফিগারেশন সংরক্ষণ বা যাচাই করা সম্ভব হয়নি।',
          code: writeError?.code || 'NO_ROW_VERIFIED',
          details: writeError?.details || 'Saved row could not be read back from site_settings.',
          hint: 'ডাটাবেজে site_settings টেবিলের স্কিমা ও RLS পলিসি নিশ্চিত করতে supabase_schema.sql স্ক্রিপ্টটি চালান।',
        };
      }

      return {
        success: true,
        data: verifiedRow.config as FoundationConfig,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || String(e),
        details: 'Exception occurred during saveConfigDetailed',
      };
    }
  },

  // --------------------------------------------------------------------------
  // 2. DESIGNATIONS
  // --------------------------------------------------------------------------
  async fetchDesignations(): Promise<Designation[] | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('designations')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        console.warn('Supabase fetchDesignations error:', error.message);
        return null;
      }

      return (data || []).map((row) => ({
        id: row.id,
        name:
          typeof row.name === 'object' && row.name !== null
            ? row.name
            : { bn: row.name || '', en: row.name || '', ar: row.name || '' },
        textColor: row.text_color || '#2D3630',
        bgColor: row.bg_color || '#F7F5F0',
        borderColor: row.border_color || '#EBE8E0',
        accentColor: row.accent_color || '#2D5A41',
        badgeStyle: row.badge_style || 'soft',
        fontWeight: row.font_weight || 'semibold',
        sortOrder: Number(row.sort_order) || 0,
        isEnabled: row.is_enabled !== undefined ? Boolean(row.is_enabled) : true,
        isPredefined: Boolean(row.is_predefined),
      }));
    } catch (e) {
      console.warn('Supabase fetchDesignations exception:', e);
      return null;
    }
  },

  async saveDesignationDetailed(d: Designation): Promise<OperationResult<Designation>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      const now = new Date().toISOString();
      const payload = {
        id: d.id,
        name: d.name,
        sort_order: d.sortOrder,
        text_color: d.textColor || '#2D3630',
        bg_color: d.bgColor || '#F7F5F0',
        border_color: d.borderColor || '#EBE8E0',
        accent_color: d.accentColor || '#2D5A41',
        badge_style: d.badgeStyle || 'soft',
        font_weight: d.fontWeight || 'semibold',
        is_enabled: d.isEnabled !== false,
        is_predefined: Boolean(d.isPredefined),
        updated_at: now,
      };

      const { error } = await supabase.from('designations').upsert(payload, { onConflict: 'id' });
      if (error) {
        return {
          success: false,
          error: `পদবী সংরক্ষণ ব্যর্থ: ${error.message}`,
          code: error.code,
          details: error.details || error.message,
        };
      }

      const { data: verified, error: verifyErr } = await supabase
        .from('designations')
        .select('*')
        .eq('id', d.id)
        .maybeSingle();

      if (verifyErr || !verified) {
        return {
          success: false,
          error: 'পদবী সংরক্ষণ যাচাইকরণ ব্যর্থ হয়েছে।',
          details: verifyErr?.message,
        };
      }

      return {
        success: true,
        data: {
          id: verified.id,
          name: typeof verified.name === 'object' && verified.name !== null
            ? verified.name
            : { bn: verified.name || '', en: verified.name || '', ar: verified.name || '' },
          textColor: verified.text_color || '#2D3630',
          bgColor: verified.bg_color || '#F7F5F0',
          borderColor: verified.border_color || '#EBE8E0',
          accentColor: verified.accent_color || '#2D5A41',
          badgeStyle: verified.badge_style || 'soft',
          fontWeight: verified.font_weight || 'semibold',
          sortOrder: Number(verified.sort_order) || 0,
          isEnabled: verified.is_enabled !== false,
          isPredefined: Boolean(verified.is_predefined),
        },
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'পদবী সংরক্ষণে ত্রুটি ঘটেছে।',
        details: String(e),
      };
    }
  },

  async deleteDesignationDetailed(id: string): Promise<OperationResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      const { error } = await supabase.from('designations').delete().eq('id', id);
      if (error) {
        return {
          success: false,
          error: `পদবী মুছে ফেলা ব্যর্থ: ${error.message}`,
          code: error.code,
          details: error.details,
        };
      }

      const { data: check } = await supabase.from('designations').select('id').eq('id', id).maybeSingle();
      if (check) {
        return {
          success: false,
          error: 'ডাটাবেজ থেকে পদবী মুছে ফেলা যাচাইকরণ ব্যর্থ।',
        };
      }

      return { success: true, data: true };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'পদবী মুছে ফেলতে ত্রুটি ঘটেছে।',
        details: String(e),
      };
    }
  },

  async saveDesignation(d: Designation): Promise<boolean> {
    const res = await this.saveDesignationDetailed(d);
    return res.success;
  },

  async deleteDesignation(id: string): Promise<boolean> {
    const res = await this.deleteDesignationDetailed(id);
    return res.success;
  },

  // --------------------------------------------------------------------------
  // 3. MEMBERS
  // --------------------------------------------------------------------------
  async fetchMembers(): Promise<Member[] | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('serial', { ascending: true });

      if (error) {
        console.warn('Supabase fetchMembers error:', error.message);
        return null;
      }

      return (data || []).map((row) => ({
        id: row.id,
        serial: Number(row.serial) || 0,
        name: row.name,
        gender: row.gender,
        designationId: row.designation_id,
        role: row.role,
        photoUrl: row.photo_url || row.image,
        phone: row.phone,
        email: row.email,
        location: row.location,
        address: row.address,
        joiningDate: row.joining_date,
        bio: row.bio,
        responsibilities: row.responsibilities,
        isActive: row.is_active !== false,
        isFamilyMember: Boolean(row.is_family_member),
        imageShape: row.image_shape || 'rounded',
        imageFit: row.image_fit || 'cover',
        imagePosition: row.image_position,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('Supabase fetchMembers exception:', e);
      return null;
    }
  },

  async saveMemberDetailed(m: Member): Promise<OperationResult<Member>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      const now = new Date().toISOString();
      let payload: Record<string, any> = {
        id: m.id,
        serial: Number(m.serial) || 0,
        name: m.name,
        gender: m.gender || null,
        designation_id: m.designationId || null,
        role: m.role || null,
        photo_url: m.photoUrl || (m as any).image || null,
        image: (m as any).image || m.photoUrl || null,
        phone: m.phone || null,
        email: m.email || null,
        location: m.location || null,
        address: m.address || null,
        joining_date: m.joiningDate || null,
        bio: m.bio || null,
        responsibilities: m.responsibilities || null,
        is_active: m.isActive !== false,
        is_family_member: Boolean(m.isFamilyMember),
        image_shape: m.imageShape || 'rounded',
        image_fit: m.imageFit || 'cover',
        image_position: m.imagePosition || null,
        created_at: m.createdAt || now,
        updated_at: now,
      };

      let { error } = await supabase.from('members').upsert(payload, { onConflict: 'id' });

      // Schema mismatch fallback
      if (error && (error.message?.includes('column') || error.code === 'PGRST204')) {
        const errMsg = error.message.toLowerCase();
        if (errMsg.includes('image_position')) delete payload.image_position;
        if (errMsg.includes('image_fit')) delete payload.image_fit;
        if (errMsg.includes('image_shape')) delete payload.image_shape;
        if (errMsg.includes('is_family_member')) delete payload.is_family_member;
        if (errMsg.includes('photo_url')) delete payload.photo_url;
        if (errMsg.includes('image')) delete payload.image;
        const retry = await supabase.from('members').upsert(payload, { onConflict: 'id' });
        error = retry.error;
      }

      if (error) {
        return {
          success: false,
          error: `সদস্য তথ্য সংরক্ষণ ব্যর্থ: ${error.message}`,
          code: error.code,
          details: error.details || error.message,
        };
      }

      const { data: verified, error: verifyErr } = await supabase
        .from('members')
        .select('*')
        .eq('id', m.id)
        .maybeSingle();

      if (verifyErr || !verified) {
        return {
          success: false,
          error: 'সদস্য সংরক্ষণ যাচাইকরণ ব্যর্থ হয়েছে।',
          details: verifyErr?.message,
        };
      }

      const verifiedMember: Member = {
        id: verified.id,
        serial: Number(verified.serial) || 0,
        name: verified.name,
        gender: verified.gender || undefined,
        designationId: verified.designation_id || undefined,
        role: verified.role || undefined,
        photoUrl: verified.photo_url || verified.image || undefined,
        phone: verified.phone || undefined,
        email: verified.email || undefined,
        location: verified.location || undefined,
        address: verified.address || undefined,
        joiningDate: verified.joining_date || undefined,
        bio: verified.bio || undefined,
        responsibilities: verified.responsibilities || undefined,
        isActive: verified.is_active !== false,
        isFamilyMember: Boolean(verified.is_family_member),
        imageShape: verified.image_shape || 'rounded',
        imageFit: verified.image_fit || 'cover',
        imagePosition: verified.image_position || undefined,
        createdAt: verified.created_at || now,
      };

      return {
        success: true,
        data: verifiedMember,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'সদস্য সংরক্ষণে ত্রুটি ঘটেছে।',
        details: String(e),
      };
    }
  },

  async deleteMemberDetailed(id: string): Promise<OperationResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      if (error) {
        return {
          success: false,
          error: `সদস্য মুছে ফেলা ব্যর্থ: ${error.message}`,
          code: error.code,
          details: error.details,
        };
      }

      const { data: check } = await supabase.from('members').select('id').eq('id', id).maybeSingle();
      if (check) {
        return {
          success: false,
          error: 'ডাটাবেজ থেকে সদস্য মুছে ফেলা যাচাইকরণ ব্যর্থ।',
        };
      }

      return { success: true, data: true };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'সদস্য মুছে ফেলতে ত্রুটি ঘটেছে।',
        details: String(e),
      };
    }
  },

  async saveMember(m: Member): Promise<boolean> {
    const res = await this.saveMemberDetailed(m);
    return res.success;
  },

  async deleteMember(id: string): Promise<boolean> {
    const res = await this.deleteMemberDetailed(id);
    return res.success;
  },

  // --------------------------------------------------------------------------
  // 4. ACTIVITIES
  // --------------------------------------------------------------------------
  async fetchActivities(): Promise<Activity[] | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .order('date', { ascending: false });

      if (error) return null;

      return (data || []).map((row) => ({
        id: row.id,
        slug: row.slug || row.id,
        title:
          typeof row.title === 'object' && row.title !== null
            ? row.title
            : { bn: row.title || '', en: row.title || '', ar: row.title || '' },
        summary:
          typeof row.summary === 'object' && row.summary !== null
            ? row.summary
            : {
                bn: row.summary || (row.description && row.description.bn) || '',
                en: row.summary || (row.description && row.description.en) || '',
                ar: row.summary || (row.description && row.description.ar) || '',
              },
        description:
          typeof row.description === 'object' && row.description !== null
            ? row.description
            : { bn: row.description || '', en: row.description || '', ar: row.description || '' },
        date: row.date,
        category: row.category || 'humanitarian',
        coverImage: row.cover_image || row.image,
        images: Array.isArray(row.images) ? row.images : [],
        galleryImages: Array.isArray(row.gallery_images) ? row.gallery_images : [],
        isPublished: row.is_published !== false,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch {
      return null;
    }
  },

  async saveActivityDetailed(a: Activity): Promise<OperationResult<Activity>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      const now = new Date().toISOString();
      const payload: Record<string, any> = {
        id: a.id,
        slug: a.slug || a.id,
        title: a.title,
        summary: a.summary || a.description,
        description: a.description,
        date: a.date,
        category: a.category || 'humanitarian',
        cover_image: a.coverImage || null,
        image: a.coverImage || (a.images && a.images[0]) || null,
        images: a.images || [],
        gallery_images: a.galleryImages || [],
        is_published: a.isPublished !== false,
        created_at: a.createdAt || now,
        updated_at: now,
      };

      const { error } = await supabase.from('activities').upsert(payload, { onConflict: 'id' });
      if (error) {
        return {
          success: false,
          error: `কার্যক্রম সংরক্ষণ ব্যর্থ: ${error.message}`,
          code: error.code,
          details: error.details || error.message,
        };
      }

      const { data: verified, error: verifyErr } = await supabase
        .from('activities')
        .select('*')
        .eq('id', a.id)
        .maybeSingle();

      if (verifyErr || !verified) {
        return {
          success: false,
          error: 'কার্যক্রম সংরক্ষণ যাচাইকরণ ব্যর্থ হয়েছে।',
          details: verifyErr?.message,
        };
      }

      const verifiedActivity: Activity = {
        id: verified.id,
        slug: verified.slug || verified.id,
        title: typeof verified.title === 'object' && verified.title !== null
          ? verified.title
          : { bn: verified.title || '', en: verified.title || '', ar: verified.title || '' },
        summary: typeof verified.summary === 'object' && verified.summary !== null
          ? verified.summary
          : {
              bn: verified.summary || (verified.description && verified.description.bn) || '',
              en: verified.summary || (verified.description && verified.description.en) || '',
              ar: verified.summary || (verified.description && verified.description.ar) || '',
            },
        description: typeof verified.description === 'object' && verified.description !== null
          ? verified.description
          : { bn: verified.description || '', en: verified.description || '', ar: verified.description || '' },
        date: verified.date,
        category: verified.category || 'humanitarian',
        coverImage: verified.cover_image || verified.image || undefined,
        images: Array.isArray(verified.images) ? verified.images : [],
        galleryImages: Array.isArray(verified.gallery_images) ? verified.gallery_images : [],
        isPublished: verified.is_published !== false,
        createdAt: verified.created_at || now,
      };

      return {
        success: true,
        data: verifiedActivity,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'কার্যক্রম সংরক্ষণে ত্রুটি ঘটেছে।',
        details: String(e),
      };
    }
  },

  async deleteActivityDetailed(id: string): Promise<OperationResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      if (error) {
        return {
          success: false,
          error: `কার্যক্রম মুছে ফেলা ব্যর্থ: ${error.message}`,
          code: error.code,
          details: error.details,
        };
      }

      const { data: check } = await supabase.from('activities').select('id').eq('id', id).maybeSingle();
      if (check) {
        return {
          success: false,
          error: 'ডাটাবেজ থেকে কার্যক্রম মুছে ফেলা যাচাইকরণ ব্যর্থ।',
        };
      }

      return { success: true, data: true };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'কার্যক্রম মুছে ফেলতে ত্রুটি ঘটেছে।',
        details: String(e),
      };
    }
  },

  async saveActivity(a: Activity): Promise<boolean> {
    const res = await this.saveActivityDetailed(a);
    return res.success;
  },

  async deleteActivity(id: string): Promise<boolean> {
    const res = await this.deleteActivityDetailed(id);
    return res.success;
  },

  // --------------------------------------------------------------------------
  // 5. NOTICES
  // --------------------------------------------------------------------------
  async fetchNotices(): Promise<Notice[] | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .order('date', { ascending: false });

      if (error) return null;

      return (data || []).map((row) => ({
        id: row.id,
        title:
          typeof row.title === 'object' && row.title !== null
            ? row.title
            : { bn: row.title || '', en: row.title || '', ar: row.title || '' },
        body:
          typeof row.body === 'object' && row.body !== null
            ? row.body
            : typeof row.content === 'object' && row.content !== null
            ? row.content
            : {
                bn: row.body || row.content || '',
                en: row.body || row.content || '',
                ar: row.body || row.content || '',
              },
        date: row.date,
        link: row.link,
        attachmentUrl: row.attachment_url || row.attachment,
        isImportant: Boolean(row.is_important || row.is_pinned),
        isPublished: row.is_published !== false,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch {
      return null;
    }
  },

  async saveNoticeDetailed(n: Notice): Promise<OperationResult<Notice>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      const now = new Date().toISOString();
      const titleObj =
        typeof n.title === 'object' && n.title !== null
          ? n.title
          : { bn: String(n.title || ''), en: String(n.title || ''), ar: String(n.title || '') };
      const bodyObj =
        typeof n.body === 'object' && n.body !== null
          ? n.body
          : { bn: String(n.body || ''), en: String(n.body || ''), ar: String(n.body || '') };

      let payload: Record<string, any> = {
        id: n.id,
        title: titleObj,
        content: bodyObj,
        body: bodyObj,
        date: n.date || now.split('T')[0],
        link: n.link || null,
        is_pinned: Boolean(n.isImportant),
        is_important: Boolean(n.isImportant),
        is_published: n.isPublished !== false,
        attachment: n.attachmentUrl || null,
        attachment_url: n.attachmentUrl || null,
        created_at: n.createdAt || now,
        updated_at: now,
      };

      let { error } = await supabase.from('notices').upsert(payload, { onConflict: 'id' });

      // Schema mismatch progressive fallback for missing columns
      while (error && (error.message?.includes('column') || error.code === 'PGRST204' || (error as any).code === '42703')) {
        const errMsg = error.message.toLowerCase();
        let stripped = false;
        if (errMsg.includes('attachment_url') && 'attachment_url' in payload) {
          delete payload.attachment_url;
          stripped = true;
        }
        if (errMsg.includes('attachment') && 'attachment' in payload) {
          delete payload.attachment;
          stripped = true;
        }
        if (errMsg.includes('body') && 'body' in payload) {
          delete payload.body;
          stripped = true;
        }
        if (errMsg.includes('link') && 'link' in payload) {
          delete payload.link;
          stripped = true;
        }
        if (errMsg.includes('is_important') && 'is_important' in payload) {
          delete payload.is_important;
          stripped = true;
        }
        if (errMsg.includes('is_pinned') && 'is_pinned' in payload) {
          delete payload.is_pinned;
          stripped = true;
        }
        if (!stripped) {
          const match = error.message.match(/column ['"]?([a-zA-Z0-9_]+)['"]?/i);
          if (match && match[1] && match[1] in payload) {
            delete payload[match[1]];
            stripped = true;
          } else {
            break;
          }
        }
        const retry = await supabase.from('notices').upsert(payload, { onConflict: 'id' });
        error = retry.error;
      }

      if (error) {
        return {
          success: false,
          error: `বিজ্ঞপ্তি সংরক্ষণ ব্যর্থ: ${error.message}`,
          code: error.code,
          details: error.details || error.message,
        };
      }

      const { data: verified, error: verifyErr } = await supabase
        .from('notices')
        .select('*')
        .eq('id', n.id)
        .maybeSingle();

      if (verifyErr || !verified) {
        return {
          success: false,
          error: 'বিজ্ঞপ্তি সংরক্ষণ যাচাইকরণ ব্যর্থ হয়েছে।',
          details: verifyErr?.message,
        };
      }

      const verifiedNotice: Notice = {
        id: verified.id,
        title: verified.title,
        body: verified.body || verified.content,
        date: verified.date,
        link: verified.link || undefined,
        attachmentUrl: verified.attachment_url || verified.attachment || undefined,
        isImportant: Boolean(verified.is_important || verified.is_pinned),
        isPublished: verified.is_published !== false,
        createdAt: verified.created_at || now,
      };

      return {
        success: true,
        data: verifiedNotice,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'বিজ্ঞপ্তি সংরক্ষণে ত্রুটি ঘটেছে।',
        details: String(e),
      };
    }
  },

  async deleteNoticeDetailed(id: string): Promise<OperationResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      const { error } = await supabase.from('notices').delete().eq('id', id);
      if (error) {
        return {
          success: false,
          error: `বিজ্ঞপ্তি মুছে ফেলা ব্যর্থ: ${error.message}`,
          code: error.code,
          details: error.details,
        };
      }

      const { data: check } = await supabase.from('notices').select('id').eq('id', id).maybeSingle();
      if (check) {
        return {
          success: false,
          error: 'ডাটাবেজ থেকে বিজ্ঞপ্তি মুছে ফেলা যাচাইকরণ ব্যর্থ।',
        };
      }

      return { success: true, data: true };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'বিজ্ঞপ্তি মুছে ফেলতে ত্রুটি ঘটেছে।',
        details: String(e),
      };
    }
  },

  async saveNotice(n: Notice): Promise<boolean> {
    const res = await this.saveNoticeDetailed(n);
    return res.success;
  },

  async deleteNotice(id: string): Promise<boolean> {
    const res = await this.deleteNoticeDetailed(id);
    return res.success;
  },

  // --------------------------------------------------------------------------
  // 6. GALLERY ITEMS
  // --------------------------------------------------------------------------
  async fetchGallery(): Promise<GalleryItem[] | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return null;

      return (data || []).map((row) => ({
        id: row.id,
        type: row.type || 'image',
        mediaUrl: row.media_url || row.url || '',
        url: row.url || row.media_url,
        thumbnailUrl: row.thumbnail_url,
        title:
          typeof row.title === 'object' && row.title !== null
            ? row.title
            : { bn: row.title || '', en: row.title || '', ar: row.title || '' },
        description:
          typeof row.description === 'object' && row.description !== null
            ? row.description
            : undefined,
        caption:
          typeof row.caption === 'object' && row.caption !== null
            ? row.caption
            : undefined,
        category: row.category || 'general',
        year: row.year || new Date().getFullYear(),
        isPublished: row.is_published !== false,
        createdAt: row.created_at || new Date().toISOString(),
      }));
    } catch {
      return null;
    }
  },

  async saveGalleryItemDetailed(g: GalleryItem): Promise<OperationResult<GalleryItem>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      const now = new Date().toISOString();
      let payload: Record<string, any> = {
        id: g.id,
        type: g.type || 'image',
        media_url: g.mediaUrl || g.url || '',
        url: g.url || g.mediaUrl || '',
        thumbnail_url: g.thumbnailUrl || null,
        title: g.title,
        description: g.description || null,
        caption: g.caption || null,
        category: g.category || 'general',
        year: g.year ? Number(g.year) : new Date().getFullYear(),
        date: (g as any).date || null,
        is_published: g.isPublished !== false,
        created_at: g.createdAt || now,
        updated_at: now,
      };

      let { error } = await supabase.from('gallery_items').upsert(payload, { onConflict: 'id' });

      // Schema mismatch fallback
      if (error && (error.message?.includes('column') || error.code === 'PGRST204')) {
        const errMsg = error.message.toLowerCase();
        if (errMsg.includes('media_url')) delete payload.media_url;
        if (errMsg.includes('thumbnail_url')) delete payload.thumbnail_url;
        if (errMsg.includes('description')) delete payload.description;
        if (errMsg.includes('caption')) delete payload.caption;
        if (errMsg.includes('year')) delete payload.year;
        if (errMsg.includes('date')) delete payload.date;
        const retry = await supabase.from('gallery_items').upsert(payload, { onConflict: 'id' });
        error = retry.error;
      }

      if (error) {
        return {
          success: false,
          error: `গ্যালারি আইটেম সংরক্ষণ ব্যর্থ: ${error.message}`,
          code: error.code,
          details: error.details || error.message,
        };
      }

      const { data: verified, error: verifyErr } = await supabase
        .from('gallery_items')
        .select('*')
        .eq('id', g.id)
        .maybeSingle();

      if (verifyErr || !verified) {
        return {
          success: false,
          error: 'গ্যালারি আইটেম সংরক্ষণ যাচাইকরণ ব্যর্থ হয়েছে।',
          details: verifyErr?.message,
        };
      }

      const verifiedItem: GalleryItem = {
        id: verified.id,
        title: typeof verified.title === 'object' && verified.title !== null
          ? verified.title
          : { bn: verified.title || '', en: verified.title || '', ar: verified.title || '' },
        url: verified.url || verified.media_url || '',
        mediaUrl: verified.media_url || verified.url || undefined,
        thumbnailUrl: verified.thumbnail_url || undefined,
        type: verified.type || 'image',
        category: verified.category || 'general',
        year: verified.year ? Number(verified.year) : new Date().getFullYear(),
        description: verified.description || undefined,
        caption: verified.caption || undefined,
        isPublished: verified.is_published !== false,
        createdAt: verified.created_at || now,
      };

      return {
        success: true,
        data: verifiedItem,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'গ্যালারি সংরক্ষণে ত্রুটি ঘটেছে।',
        details: String(e),
      };
    }
  },

  async deleteGalleryItemDetailed(id: string): Promise<OperationResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      const { error } = await supabase.from('gallery_items').delete().eq('id', id);
      if (error) {
        return {
          success: false,
          error: `গ্যালারি আইটেম মুছে ফেলা ব্যর্থ: ${error.message}`,
          code: error.code,
          details: error.details,
        };
      }

      const { data: check } = await supabase.from('gallery_items').select('id').eq('id', id).maybeSingle();
      if (check) {
        return {
          success: false,
          error: 'ডাটাবেজ থেকে গ্যালারি আইটেম মুছে ফেলা যাচাইকরণ ব্যর্থ।',
        };
      }

      return { success: true, data: true };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'গ্যালারি আইটেম মুছে ফেলতে ত্রুটি ঘটেছে।',
        details: String(e),
      };
    }
  },

  async saveGalleryItem(g: GalleryItem): Promise<boolean> {
    const res = await this.saveGalleryItemDetailed(g);
    return res.success;
  },

  async deleteGalleryItem(id: string): Promise<boolean> {
    const res = await this.deleteGalleryItemDetailed(id);
    return res.success;
  },

  // --------------------------------------------------------------------------
  // 7. EXPENSES
  // --------------------------------------------------------------------------
  async fetchExpenses(): Promise<ExpenseRecord[] | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) return null;

      return (data || []).map((row) => ({
        id: row.id,
        date: row.date,
        amount: Number(row.amount) || 0,
        title: row.title || row.purpose || 'সহায়তা ব্যয়',
        category: row.category || 'other',
        customCategory: row.custom_category,
        description: row.description,
        recipient: row.recipient,
        isRecipientPublic: Boolean(row.is_recipient_public),
        location: row.location,
        receiptUrl: row.receipt_url,
        isVerified: Boolean(row.is_verified || row.verified_by),
        isPublic: row.is_public !== false,
        year: row.year || undefined,
        createdAt: row.created_at || new Date().toISOString(),
        updatedAt: row.updated_at,
      }));
    } catch {
      return null;
    }
  },

  async saveExpenseDetailed(e: ExpenseRecord): Promise<OperationResult<ExpenseRecord>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      const now = new Date().toISOString();
      const yr = e.year || (e.date ? parseInt(e.date.slice(0, 4), 10) : new Date().getFullYear());
      let payload: Record<string, any> = {
        id: e.id,
        date: e.date,
        amount: Number(e.amount) || 0,
        title: e.title,
        purpose: (e as any).purpose || { bn: e.title, en: e.title, ar: e.title },
        category: e.category || 'other',
        custom_category: e.customCategory || null,
        description: e.description || null,
        recipient: e.recipient || null,
        is_recipient_public: Boolean(e.isRecipientPublic),
        location: e.location || null,
        receipt_url: e.receiptUrl || null,
        verified_by: (e as any).verifiedBy || (e.isVerified ? 'Verified' : null),
        is_verified: Boolean(e.isVerified),
        is_public: e.isPublic !== false,
        year: yr,
        created_at: e.createdAt || now,
        updated_at: now,
      };

      let { error } = await supabase.from('expenses').upsert(payload, { onConflict: 'id' });

      // Progressive fallback if live Postgres table doesn't have certain columns
      while (error && (error.message?.includes('column') || error.code === 'PGRST204' || (error as any).code === '42703')) {
        const errMsg = error.message.toLowerCase();
        let stripped = false;
        if (errMsg.includes('is_recipient_public') && 'is_recipient_public' in payload) {
          delete payload.is_recipient_public;
          stripped = true;
        }
        if (errMsg.includes('purpose') && 'purpose' in payload) {
          delete payload.purpose;
          stripped = true;
        }
        if (errMsg.includes('verified_by') && 'verified_by' in payload) {
          delete payload.verified_by;
          stripped = true;
        }
        if (errMsg.includes('receipt_url') && 'receipt_url' in payload) {
          delete payload.receipt_url;
          stripped = true;
        }
        if (errMsg.includes('custom_category') && 'custom_category' in payload) {
          delete payload.custom_category;
          stripped = true;
        }
        if (errMsg.includes('is_verified') && 'is_verified' in payload) {
          delete payload.is_verified;
          stripped = true;
        }
        if (errMsg.includes('is_public') && 'is_public' in payload) {
          delete payload.is_public;
          stripped = true;
        }
        if (errMsg.includes('year') && 'year' in payload) {
          delete payload.year;
          stripped = true;
        }
        if (!stripped) {
          const match = error.message.match(/column ['"]?([a-zA-Z0-9_]+)['"]?/i);
          if (match && match[1] && match[1] in payload) {
            delete payload[match[1]];
            stripped = true;
          } else {
            break;
          }
        }
        const retry = await supabase.from('expenses').upsert(payload, { onConflict: 'id' });
        error = retry.error;
      }

      if (error) {
        return {
          success: false,
          error: `ব্যয় রেকর্ড সংরক্ষণ ব্যর্থ: ${error.message}`,
          code: error.code,
          details: error.details || error.message,
        };
      }

      const { data: verified, error: verifyErr } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', e.id)
        .maybeSingle();

      if (verifyErr || !verified) {
        return {
          success: false,
          error: 'ব্যয় রেকর্ড সংরক্ষণ যাচাইকরণ ব্যর্থ হয়েছে।',
          details: verifyErr?.message,
        };
      }

      const verifiedExpense: ExpenseRecord = {
        id: verified.id,
        date: verified.date,
        amount: Number(verified.amount) || 0,
        title: verified.title || verified.purpose || 'সহায়তা ব্যয়',
        category: verified.category || 'other',
        customCategory: verified.custom_category || undefined,
        description: verified.description || undefined,
        recipient: verified.recipient || undefined,
        isRecipientPublic: Boolean(verified.is_recipient_public),
        location: verified.location || undefined,
        receiptUrl: verified.receipt_url || undefined,
        isVerified: Boolean(verified.is_verified || verified.verified_by),
        isPublic: verified.is_public !== false,
        year: verified.year || undefined,
        createdAt: verified.created_at || now,
        updatedAt: verified.updated_at || now,
      };

      return {
        success: true,
        data: verifiedExpense,
      };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'ব্যয় রেকর্ড সংরক্ষণে ত্রুটি ঘটেছে।',
        details: String(e),
      };
    }
  },

  async deleteExpenseDetailed(id: string): Promise<OperationResult<boolean>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) {
        return {
          success: false,
          error: `ব্যয় রেকর্ড মুছে ফেলা ব্যর্থ: ${error.message}`,
          code: error.code,
          details: error.details,
        };
      }

      const { data: check } = await supabase.from('expenses').select('id').eq('id', id).maybeSingle();
      if (check) {
        return {
          success: false,
          error: 'ডাটাবেজ থেকে ব্যয় রেকর্ড মুছে ফেলা যাচাইকরণ ব্যর্থ।',
        };
      }

      return { success: true, data: true };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'ব্যয় রেকর্ড মুছে ফেলতে ত্রুটি ঘটেছে।',
        details: String(e),
      };
    }
  },

  async saveExpense(e: ExpenseRecord): Promise<boolean> {
    const res = await this.saveExpenseDetailed(e);
    return res.success;
  },

  async deleteExpense(id: string): Promise<boolean> {
    const res = await this.deleteExpenseDetailed(id);
    return res.success;
  },

  // --------------------------------------------------------------------------
  // 8. CONTACT MESSAGES (INBOX)
  // --------------------------------------------------------------------------
  async fetchContactMessages(): Promise<ContactMessage[] | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) return null;

      return (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        subject: row.subject,
        message: row.message,
        submittedAt: row.submitted_at,
        isRead: Boolean(row.is_read),
        isArchived: Boolean(row.is_archived),
      }));
    } catch {
      return null;
    }
  },

  async saveContactMessage(msg: Partial<ContactMessage> & { name: string; email: string; message: string }): Promise<ContactMessage | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    const id = msg.id || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const submittedAt = msg.submittedAt || new Date().toISOString();

    try {
      const { error } = await supabase.from('contact_messages').upsert({
        id,
        name: msg.name,
        email: msg.email,
        phone: msg.phone || null,
        subject: msg.subject || null,
        message: msg.message,
        submitted_at: submittedAt,
        is_read: Boolean(msg.isRead),
        is_archived: Boolean(msg.isArchived),
      });

      if (error) {
        console.warn('Supabase saveContactMessage error:', error.message);
        return null;
      }

      return {
        id,
        name: msg.name,
        email: msg.email,
        phone: msg.phone,
        subject: msg.subject,
        message: msg.message,
        submittedAt,
        isRead: Boolean(msg.isRead),
        isArchived: Boolean(msg.isArchived),
      };
    } catch {
      return null;
    }
  },

  async updateMessageStatus(id: string, isRead?: boolean, isArchived?: boolean): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const updates: Record<string, boolean> = {};
      if (isRead !== undefined) updates.is_read = isRead;
      if (isArchived !== undefined) updates.is_archived = isArchived;

      const { error } = await supabase.from('contact_messages').update(updates).eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  async deleteContactMessage(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('contact_messages').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  // --------------------------------------------------------------------------
  // 9. SOCIAL LINKS
  // --------------------------------------------------------------------------
  async fetchSocialLinks(): Promise<SocialLink[] | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase.from('social_links').select('*').order('sort_order', { ascending: true });
      if (error) return null;

      return (data || []).map((row) => ({
        id: row.id,
        platform: row.platform,
        label: row.label || row.platform,
        url: row.url,
        icon: row.icon || row.platform,
        isEnabled: row.is_enabled !== undefined ? Boolean(row.is_enabled) : true,
        sortOrder: Number(row.sort_order) || 0,
      }));
    } catch {
      return null;
    }
  },

  async saveSocialLinksDetailed(links: SocialLink[]): Promise<OperationResult<SocialLink[]>> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        success: false,
        error: 'ডাটাবেজ সংযোগ সক্রিয় নেই।',
        details: 'getSupabase() returned null',
      };
    }

    try {
      const rows = links.map((l) => ({
        id: l.id,
        platform: l.platform,
        label: l.label || l.platform,
        url: l.url,
        icon: l.icon || l.platform,
        is_enabled: l.isEnabled !== false,
        sort_order: l.sortOrder,
      }));

      const { error } = await supabase.from('social_links').upsert(rows);
      if (error) {
        return {
          success: false,
          error: `সোশ্যাল লিংক সংরক্ষণ ব্যর্থ: ${error.message}`,
          code: error.code,
          details: error.details,
        };
      }

      const { data: verified, error: verifyErr } = await supabase
        .from('social_links')
        .select('*')
        .order('sort_order', { ascending: true });

      if (verifyErr || !verified) {
        return {
          success: false,
          error: 'সোশ্যাল লিংক সংরক্ষণ যাচাইকরণ ব্যর্থ হয়েছে।',
          details: verifyErr?.message,
        };
      }

      const list: SocialLink[] = (verified || []).map((row) => ({
        id: row.id,
        platform: row.platform,
        label: row.label || row.platform,
        url: row.url,
        icon: row.icon || row.platform,
        isEnabled: row.is_enabled !== false,
        sortOrder: Number(row.sort_order) || 0,
      }));

      return { success: true, data: list };
    } catch (e: any) {
      return {
        success: false,
        error: e?.message || 'সোশ্যাল লিংক সংরক্ষণে ত্রুটি ঘটেছে।',
        details: String(e),
      };
    }
  },

  async saveSocialLinks(links: SocialLink[]): Promise<boolean> {
    const res = await this.saveSocialLinksDetailed(links);
    return res.success;
  },

  async deleteSocialLink(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('social_links').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
  },

  // --------------------------------------------------------------------------
  // 10. MEDIA STORAGE UPLOAD & MANAGEMENT
  // --------------------------------------------------------------------------
  async uploadMedia(
    file: File,
    bucketName: string = 'gallery',
    folder: string = ''
  ): Promise<string | null> {
    const supabase = getSupabase();
    if (!supabase) return null;

    // Safety checks for file size (5MB for images/receipts, 10MB for documents/gallery)
    const maxSizeBytes = bucketName === 'gallery' || bucketName === 'notices' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      console.warn(`File size ${file.size} exceeds maximum ${maxSizeBytes} bytes for bucket ${bucketName}`);
      return null;
    }

    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const filePath = folder ? `${folder.replace(/\/+$/, '')}/${cleanName}` : cleanName;

      const { error } = await supabase.storage.from(bucketName).upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (error) {
        console.warn('Storage upload error (will fallback):', error.message);
        return null;
      }

      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      return data?.publicUrl || null;
    } catch (e) {
      console.warn('Storage upload exception:', e);
      return null;
    }
  },

  async deleteMedia(urlOrPath: string, bucketName: string = 'gallery'): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase || !urlOrPath) return false;

    try {
      let path = urlOrPath;
      let targetBucket = bucketName;

      if (urlOrPath.includes('/storage/v1/object/public/')) {
        const parts = urlOrPath.split('/storage/v1/object/public/');
        if (parts[1]) {
          const subParts = parts[1].split('/');
          targetBucket = subParts[0] || bucketName;
          path = subParts.slice(1).join('/');
        }
      }

      const { error } = await supabase.storage.from(targetBucket).remove([path]);
      return !error;
    } catch {
      return false;
    }
  },

  // --------------------------------------------------------------------------
  // 11. LOCAL DATA INSPECTION & COUNTS
  // --------------------------------------------------------------------------
  getLocalDataCounts(): {
    members: number;
    activities: number;
    notices: number;
    gallery: number;
    expenses: number;
    cms: number;
    inbox: number;
    designations: number;
    social: number;
    settings: number;
    total: number;
  } {
    const readLen = (key: string): number => {
      try {
        const item = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
        if (!item) return 0;
        const parsed = JSON.parse(item);
        return Array.isArray(parsed) ? parsed.length : (parsed ? 1 : 0);
      } catch {
        return 0;
      }
    };

    const members = readLen('sf_foundation_members');
    const activities = readLen('sf_foundation_activities');
    const notices = readLen('sf_foundation_notices');
    const gallery = readLen('sf_foundation_gallery');
    const expenses = readLen('sf_foundation_expenses');
    const cms = readLen('sf_foundation_config');
    const inbox = readLen('sf_foundation_inbox');
    const designations = readLen('sf_foundation_designations');
    const social = readLen('sf_foundation_social');
    const settings = cms;
    const total = members + activities + notices + gallery + expenses + cms + inbox + designations + social;

    return {
      members,
      activities,
      notices,
      gallery,
      expenses,
      cms,
      inbox,
      designations,
      social,
      settings,
      total,
    };
  },

  /**
   * Explicitly checks if all required database tables exist in Supabase.
   * Detects whether supabase_schema.sql has been executed.
   */
  async checkSchemaInstalled(): Promise<{
    isInstalled: boolean;
    missingTables: string[];
    details?: string;
  }> {
    const supabase = getSupabase();
    if (!supabase) {
      return {
        isInstalled: false,
        missingTables: ['site_settings'],
        details: 'Supabase URL বা Anon Key কনফিগার করা হয়নি।',
      };
    }

    const requiredTables = [
      'site_settings',
      'content',
      'designations',
      'members',
      'activities',
      'notices',
      'gallery_categories',
      'gallery_items',
      'expenses',
      'fund_settings',
      'contact_messages',
      'social_links',
    ];

    const missingTables: string[] = [];
    let firstErrorDetails = '';

    for (const tbl of requiredTables) {
      try {
        const { error } = await supabase.from(tbl).select('id').limit(1);
        if (error && isTableMissingError(error)) {
          missingTables.push(tbl);
          if (!firstErrorDetails) {
            firstErrorDetails = `Table '${tbl}': ${error.message} (code: ${error.code || 'unknown'})`;
          }
        }
      } catch (e: any) {
        missingTables.push(tbl);
        if (!firstErrorDetails) {
          firstErrorDetails = `Table '${tbl}': ${e?.message || e}`;
        }
      }
    }

    return {
      isInstalled: missingTables.length === 0,
      missingTables,
      details: firstErrorDetails,
    };
  },

  // --------------------------------------------------------------------------
  // 12. DIAGNOSTICS & HEALTH CHECK
  // --------------------------------------------------------------------------
  async checkCloudStatus(): Promise<{
    connected: boolean;
    latencyMs: number;
    tables: Record<string, boolean>;
    allTablesExist: boolean;
    buckets: string[];
    error?: string;
    timestamp: string;
  }> {
    const supabase = getSupabase();
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    if (!supabase) {
      return {
        connected: false,
        latencyMs: 0,
        tables: {},
        allTablesExist: false,
        buckets: [],
        error: 'Supabase URL বা Anon Key কনফিগার করা হয়নি।',
        timestamp,
      };
    }

    try {
      const tableNames = [
        'site_settings',
        'content',
        'designations',
        'members',
        'activities',
        'notices',
        'gallery_items',
        'gallery_categories',
        'expenses',
        'contact_messages',
        'social_links',
        'fund_settings',
        'admin_profiles',
      ];

      const tablesStatus: Record<string, boolean> = {};

      const { error: pingError } = await supabase.from('site_settings').select('id').limit(1);
      const latencyMs = Date.now() - startTime;

      if (pingError && (pingError.message.includes('FetchError') || pingError.message.includes('Failed to fetch'))) {
        return {
          connected: false,
          latencyMs,
          tables: {},
          allTablesExist: false,
          buckets: [],
          error: `কানেকশন সমস্যা: ${pingError.message}`,
          timestamp,
        };
      }

      tablesStatus['site_settings'] = !pingError || !isTableMissingError(pingError);

      await Promise.all(
        tableNames.slice(1).map(async (t) => {
          try {
            const { error } = await supabase.from(t).select('id').limit(1);
            tablesStatus[t] = !error || !isTableMissingError(error);
          } catch {
            tablesStatus[t] = false;
          }
        })
      );

      let buckets: string[] = [];
      try {
        const { data: bucketList } = await supabase.storage.listBuckets();
        if (bucketList) {
          buckets = bucketList.map((b) => b.name);
        }
      } catch {
        // ignore
      }

      const allTablesExist = Object.values(tablesStatus).every(Boolean);

      return {
        connected: true,
        latencyMs,
        tables: tablesStatus,
        allTablesExist,
        buckets,
        timestamp,
      };
    } catch (err: any) {
      return {
        connected: false,
        latencyMs: Date.now() - startTime,
        tables: {},
        allTablesExist: false,
        buckets: [],
        error: err?.message || 'Supabase ক্লাউড টেস্টে ত্রুটি',
        timestamp,
      };
    }
  },

  // --------------------------------------------------------------------------
  // 13. REALTIME CROSS-DEVICE SUBSCRIPTIONS
  // --------------------------------------------------------------------------
  subscribeToChanges(callback: (payload: { table: string; eventType: string }) => void): () => void {
    const supabase = getSupabase();
    if (!supabase) return () => {};

    try {
      const channel = supabase
        .channel('public:db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload) => {
            callback({ table: payload.table, eventType: payload.eventType });
          }
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch {
          // ignore
        }
      };
    } catch (e) {
      console.warn('Realtime subscription notice:', e);
      return () => {};
    }
  },

  // --------------------------------------------------------------------------
  // 14. SAFE DATA MIGRATION WITH VERIFICATION
  // --------------------------------------------------------------------------
  async migrateLocalData(customData?: Partial<{
    config: FoundationConfig;
    designations: Designation[];
    members: Member[];
    activities: Activity[];
    notices: Notice[];
    gallery: GalleryItem[];
    expenses: ExpenseRecord[];
    messages: ContactMessage[];
    social: SocialLink[];
  }>): Promise<MigrationResult> {
    const supabase = getSupabase();
    const result: MigrationResult = {
      success: false,
      message: '',
      counts: {
        config: 0,
        designations: 0,
        members: 0,
        activities: 0,
        notices: 0,
        gallery: 0,
        expenses: 0,
        messages: 0,
        social: 0,
      },
      summary: {
        successful: 0,
        failed: 0,
        skipped: 0,
        total: 0,
      },
      itemizedSummary: [],
      verifiedCounts: {},
      errors: [],
      debugDetails: [],
    };

    if (!supabase) {
      result.message = 'Supabase সংযোগ কনফিগার করা হয়নি। দয়া করে VITE_SUPABASE_URL এবং VITE_SUPABASE_ANON_KEY প্রদান করুন।';
      result.errors.push('Supabase client is not configured.');
      result.debugDetails.push('getSupabase() returned null. Please check environment variables.');
      return result;
    }

    // Step 1: Preflight check if database schema is installed
    const schemaCheck = await this.checkSchemaInstalled();
    if (!schemaCheck.isInstalled) {
      result.success = false;
      result.schemaNotInstalled = true;
      result.message = 'Database schema is not installed yet.';
      result.errors.push(
        'Database schema is not installed yet. (ডাটাবেজ স্কিমা এখনও ইনস্টল করা হয়নি)',
        `অনুপস্থিত টেবিলসমূহ: ${schemaCheck.missingTables.join(', ')}`,
        'মাইগ্রেশন শুরু করার পূর্বে Supabase SQL Editor এ গিয়ে সম্পূর্ণ supabase_schema.sql স্ক্রিপ্টটি রান করা আবশ্যক।'
      );
      if (schemaCheck.details) {
        result.debugDetails.push(`Schema validation failure: ${schemaCheck.details}`);
      }
      return result;
    }

    const readLocal = <T>(key: string, fallback: T): T => {
      try {
        const item = typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
        return item ? JSON.parse(item) : fallback;
      } catch {
        return fallback;
      }
    };

    const localData = {
      config: customData?.config || readLocal<FoundationConfig | null>('sf_foundation_config', null),
      designations: customData?.designations || readLocal<Designation[]>('sf_foundation_designations', []),
      members: customData?.members || readLocal<Member[]>('sf_foundation_members', []),
      activities: customData?.activities || readLocal<Activity[]>('sf_foundation_activities', []),
      notices: customData?.notices || readLocal<Notice[]>('sf_foundation_notices', []),
      gallery: customData?.gallery || readLocal<GalleryItem[]>('sf_foundation_gallery', []),
      expenses: customData?.expenses || readLocal<ExpenseRecord[]>('sf_foundation_expenses', []),
      messages: customData?.messages || readLocal<ContactMessage[]>('sf_foundation_inbox', []),
      social: customData?.social || readLocal<SocialLink[]>('sf_foundation_social', []),
    };

    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalItems = 0;
    let siteSettingsFailed = false;

    const itemized: ItemizedEntityMigration[] = [];

    try {
      // ----------------------------------------------------------------------
      // 1. Site Settings (Config) - Must be upserted safely & verified
      // ----------------------------------------------------------------------
      if (localData.config) {
        totalItems++;
        const configRes = await this.saveConfigDetailed(localData.config);
        if (configRes.success) {
          totalSuccessful++;
          result.counts.config = 1;
          itemized.push({
            entity: 'site_settings',
            label: 'Site Settings (সাইট কনফিগারেশন)',
            total: 1,
            successful: 1,
            failed: 0,
            skipped: 0,
          });
        } else {
          totalFailed++;
          siteSettingsFailed = true;
          if (configRes.isSchemaMissing) {
            result.schemaNotInstalled = true;
            result.message =
              'ডাটাবেজে site_settings টেবিল পাওয়া যায়নি। অনুগ্রহ করে প্রথমে supabase_schema.sql স্ক্রিপ্টটি ডাটাবেজ SQL Editor-এ চালান।';
            result.errors.push(
              'সাইট কনফিগারেশন সংরক্ষণ ব্যর্থ হয়েছে: site_settings টেবিল বিদ্যমান নেই। প্রথমে supabase_schema.sql স্ক্রিপ্ট রান করুন।'
            );
          } else {
            result.errors.push(
              `সাইট কনফিগারেশন (site_settings) সংরক্ষণ ব্যর্থ হয়েছে: ${configRes.error || 'Unknown error'}${configRes.details ? ` (${configRes.details})` : ''}`
            );
          }
          itemized.push({
            entity: 'site_settings',
            label: 'Site Settings (সাইট কনফিগারেশন)',
            total: 1,
            successful: 0,
            failed: 1,
            skipped: 0,
            error: configRes.error || 'Failed to save or verify site_settings',
            debugDetails: `Code: ${configRes.code || 'N/A'}, Details: ${configRes.details || 'None'}, Hint: ${configRes.hint || 'None'}`,
          });
          result.debugDetails.push(
            `[site_settings] Error: ${configRes.error} | Code: ${configRes.code || 'None'} | Details: ${configRes.details || 'None'} | Hint: ${configRes.hint || 'None'}`
          );
        }
      } else {
        totalSkipped++;
        itemized.push({
          entity: 'site_settings',
          label: 'Site Settings (সাইট কনফিগারেশন)',
          total: 1,
          successful: 0,
          failed: 0,
          skipped: 1,
        });
      }

      // ----------------------------------------------------------------------
      // 2. Designations
      // ----------------------------------------------------------------------
      if (localData.designations && localData.designations.length > 0) {
        let dSuccess = 0;
        let dFailed = 0;
        let dFirstError = '';
        let dFirstDetails = '';

        for (const d of localData.designations) {
          totalItems++;
          try {
            const { error } = await supabase.from('designations').upsert(
              {
                id: d.id,
                name: d.name,
                short_code: (d as any).shortCode || null,
                sort_order: d.sortOrder,
                text_color: d.textColor || '#2D3630',
                bg_color: d.bgColor || '#F7F5F0',
                border_color: d.borderColor || '#EBE8E0',
                accent_color: d.accentColor || '#2D5A41',
                badge_style: d.badgeStyle || 'soft',
                font_weight: d.fontWeight || 'semibold',
                is_enabled: d.isEnabled !== false,
                is_predefined: Boolean(d.isPredefined),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );

            if (!error) {
              dSuccess++;
              totalSuccessful++;
              result.counts.designations++;
            } else {
              dFailed++;
              totalFailed++;
              if (!dFirstError) {
                dFirstError = error.message;
                dFirstDetails = `Code: ${error.code}, Details: ${error.details || error.hint || 'None'}`;
              }
              result.errors.push(`পদবী (${d.name?.bn || d.id}) সংরক্ষণ ব্যর্থ: ${error.message}`);
              result.debugDetails.push(`[designations id=${d.id}] Error: ${error.message} (code: ${error.code})`);
            }
          } catch (e: any) {
            dFailed++;
            totalFailed++;
            if (!dFirstError) dFirstError = e?.message || String(e);
            result.debugDetails.push(`[designations id=${d.id}] Exception: ${e?.message || e}`);
          }
        }

        itemized.push({
          entity: 'designations',
          label: 'Designations (পদবীসমূহ)',
          total: localData.designations.length,
          successful: dSuccess,
          failed: dFailed,
          skipped: 0,
          error: dFirstError || undefined,
          debugDetails: dFirstDetails || undefined,
        });
      } else {
        itemized.push({
          entity: 'designations',
          label: 'Designations (পদবীসমূহ)',
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        });
      }

      // ----------------------------------------------------------------------
      // 3. Members
      // ----------------------------------------------------------------------
      if (localData.members && localData.members.length > 0) {
        let mSuccess = 0;
        let mFailed = 0;
        let mFirstError = '';
        let mFirstDetails = '';

        for (const m of localData.members) {
          totalItems++;
          try {
            const { error } = await supabase.from('members').upsert(
              {
                id: m.id,
                serial: m.serial,
                name: m.name,
                gender: m.gender || null,
                designation_id: m.designationId || null,
                role: m.role || null,
                photo_url: m.photoUrl || (m as any).image || null,
                image: (m as any).image || m.photoUrl || null,
                phone: m.phone || null,
                email: m.email || null,
                location: m.location || null,
                address: m.address || null,
                joining_date: m.joiningDate || null,
                bio: m.bio || null,
                responsibilities: m.responsibilities || null,
                is_active: m.isActive !== false,
                is_family_member: Boolean(m.isFamilyMember),
                image_shape: m.imageShape || 'rounded',
                image_fit: m.imageFit || 'cover',
                image_position: m.imagePosition || null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );

            if (!error) {
              mSuccess++;
              totalSuccessful++;
              result.counts.members++;
            } else {
              mFailed++;
              totalFailed++;
              if (!mFirstError) {
                mFirstError = error.message;
                mFirstDetails = `Code: ${error.code}, Details: ${error.details || error.hint || 'None'}`;
              }
              result.errors.push(`সদস্য (${m.name || m.id}) সংরক্ষণ ব্যর্থ: ${error.message}`);
              result.debugDetails.push(`[members id=${m.id}] Error: ${error.message} (code: ${error.code})`);
            }
          } catch (e: any) {
            mFailed++;
            totalFailed++;
            if (!mFirstError) mFirstError = e?.message || String(e);
            result.debugDetails.push(`[members id=${m.id}] Exception: ${e?.message || e}`);
          }
        }

        itemized.push({
          entity: 'members',
          label: 'Members (সদস্যবৃন্দ)',
          total: localData.members.length,
          successful: mSuccess,
          failed: mFailed,
          skipped: 0,
          error: mFirstError || undefined,
          debugDetails: mFirstDetails || undefined,
        });
      } else {
        itemized.push({
          entity: 'members',
          label: 'Members (সদস্যবৃন্দ)',
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        });
      }

      // ----------------------------------------------------------------------
      // 4. Activities
      // ----------------------------------------------------------------------
      if (localData.activities && localData.activities.length > 0) {
        let aSuccess = 0;
        let aFailed = 0;
        let aFirstError = '';
        let aFirstDetails = '';

        for (const a of localData.activities) {
          totalItems++;
          try {
            const { error } = await supabase.from('activities').upsert(
              {
                id: a.id,
                title: a.title,
                description: a.description,
                date: a.date,
                category: a.category || 'humanitarian',
                cover_image: a.coverImage || null,
                image: a.coverImage || (a.images && a.images[0]) || (a as any).image || null,
                images: a.images || [],
                gallery_images: a.galleryImages || [],
                is_published: a.isPublished !== false,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );

            if (!error) {
              aSuccess++;
              totalSuccessful++;
              result.counts.activities++;
            } else {
              aFailed++;
              totalFailed++;
              if (!aFirstError) {
                aFirstError = error.message;
                aFirstDetails = `Code: ${error.code}, Details: ${error.details || error.hint || 'None'}`;
              }
              result.errors.push(`কার্যক্রম (${a.title?.bn || a.id}) সংরক্ষণ ব্যর্থ: ${error.message}`);
              result.debugDetails.push(`[activities id=${a.id}] Error: ${error.message} (code: ${error.code})`);
            }
          } catch (e: any) {
            aFailed++;
            totalFailed++;
            if (!aFirstError) aFirstError = e?.message || String(e);
            result.debugDetails.push(`[activities id=${a.id}] Exception: ${e?.message || e}`);
          }
        }

        itemized.push({
          entity: 'activities',
          label: 'Activities (কার্যক্রমসমূহ)',
          total: localData.activities.length,
          successful: aSuccess,
          failed: aFailed,
          skipped: 0,
          error: aFirstError || undefined,
          debugDetails: aFirstDetails || undefined,
        });
      } else {
        itemized.push({
          entity: 'activities',
          label: 'Activities (কার্যক্রমসমূহ)',
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        });
      }

      // ----------------------------------------------------------------------
      // 5. Notices
      // ----------------------------------------------------------------------
      if (localData.notices && localData.notices.length > 0) {
        let nSuccess = 0;
        let nFailed = 0;
        let nFirstError = '';
        let nFirstDetails = '';

        for (const n of localData.notices) {
          totalItems++;
          try {
            const { error } = await supabase.from('notices').upsert(
              {
                id: n.id,
                title: n.title,
                content: (n as any).content || n.body,
                body: n.body,
                date: n.date,
                link: n.link || null,
                is_pinned: Boolean((n as any).isPinned || n.isImportant),
                is_published: n.isPublished !== false,
                is_important: Boolean(n.isImportant || (n as any).isPinned),
                attachment: (n as any).attachment || n.attachmentUrl || null,
                attachment_url: n.attachmentUrl || (n as any).attachment || null,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );

            if (!error) {
              nSuccess++;
              totalSuccessful++;
              result.counts.notices++;
            } else {
              nFailed++;
              totalFailed++;
              if (!nFirstError) {
                nFirstError = error.message;
                nFirstDetails = `Code: ${error.code}, Details: ${error.details || error.hint || 'None'}`;
              }
              result.errors.push(`বিজ্ঞপ্তি (${n.title?.bn || n.id}) সংরক্ষণ ব্যর্থ: ${error.message}`);
              result.debugDetails.push(`[notices id=${n.id}] Error: ${error.message} (code: ${error.code})`);
            }
          } catch (e: any) {
            nFailed++;
            totalFailed++;
            if (!nFirstError) nFirstError = e?.message || String(e);
            result.debugDetails.push(`[notices id=${n.id}] Exception: ${e?.message || e}`);
          }
        }

        itemized.push({
          entity: 'notices',
          label: 'Notices (বিজ্ঞপ্তিসমূহ)',
          total: localData.notices.length,
          successful: nSuccess,
          failed: nFailed,
          skipped: 0,
          error: nFirstError || undefined,
          debugDetails: nFirstDetails || undefined,
        });
      } else {
        itemized.push({
          entity: 'notices',
          label: 'Notices (বিজ্ঞপ্তিসমূহ)',
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        });
      }

      // ----------------------------------------------------------------------
      // 6. Gallery Categories & Items
      // ----------------------------------------------------------------------
      if (localData.gallery && localData.gallery.length > 0) {
        let gSuccess = 0;
        let gFailed = 0;
        let gFirstError = '';
        let gFirstDetails = '';

        // Save categories first
        const uniqueCats = Array.from(new Set(localData.gallery.map((g) => g.category).filter(Boolean)));
        for (const cat of uniqueCats) {
          try {
            await supabase.from('gallery_categories').upsert(
              {
                id: `cat_${cat}`,
                name: { bn: cat, en: cat },
                sort_order: 1,
                is_active: true,
              },
              { onConflict: 'id' }
            );
          } catch {
            // non-blocking for categories
          }
        }

        for (const g of localData.gallery) {
          totalItems++;
          try {
            const { error } = await supabase.from('gallery_items').upsert(
              {
                id: g.id,
                title: g.title,
                url: g.url || g.mediaUrl || '',
                media_url: g.mediaUrl || g.url || '',
                thumbnail_url: g.thumbnailUrl || null,
                type: g.type || 'image',
                category: g.category || 'general',
                date: (g as any).date || null,
                year: g.year ? String(g.year) : null,
                description: g.description || null,
                caption: g.caption || null,
                is_published: g.isPublished !== false,
              },
              { onConflict: 'id' }
            );

            if (!error) {
              gSuccess++;
              totalSuccessful++;
              result.counts.gallery++;
            } else {
              gFailed++;
              totalFailed++;
              if (!gFirstError) {
                gFirstError = error.message;
                gFirstDetails = `Code: ${error.code}, Details: ${error.details || error.hint || 'None'}`;
              }
              result.errors.push(`গ্যালারি আইটেম (${g.title?.bn || g.id}) সংরক্ষণ ব্যর্থ: ${error.message}`);
              result.debugDetails.push(`[gallery_items id=${g.id}] Error: ${error.message} (code: ${error.code})`);
            }
          } catch (e: any) {
            gFailed++;
            totalFailed++;
            if (!gFirstError) gFirstError = e?.message || String(e);
            result.debugDetails.push(`[gallery_items id=${g.id}] Exception: ${e?.message || e}`);
          }
        }

        itemized.push({
          entity: 'gallery_items',
          label: 'Gallery (গ্যালারি আইটেমসমূহ)',
          total: localData.gallery.length,
          successful: gSuccess,
          failed: gFailed,
          skipped: 0,
          error: gFirstError || undefined,
          debugDetails: gFirstDetails || undefined,
        });
      } else {
        itemized.push({
          entity: 'gallery_items',
          label: 'Gallery (গ্যালারি আইটেমসমূহ)',
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        });
      }

      // ----------------------------------------------------------------------
      // 7. Expenses
      // ----------------------------------------------------------------------
      if (localData.expenses && localData.expenses.length > 0) {
        let eSuccess = 0;
        let eFailed = 0;
        let eFirstError = '';
        let eFirstDetails = '';

        for (const e of localData.expenses) {
          totalItems++;
          try {
            const { error } = await supabase.from('expenses').upsert(
              {
                id: e.id,
                date: e.date,
                amount: Number(e.amount) || 0,
                title: e.title,
                purpose: (e as any).purpose || { bn: e.title, en: e.title, ar: e.title },
                category: e.category || 'other',
                custom_category: e.customCategory || null,
                description: e.description || null,
                recipient: e.recipient || null,
                is_recipient_public: Boolean(e.isRecipientPublic),
                location: e.location || null,
                receipt_url: e.receiptUrl || null,
                verified_by: (e as any).verifiedBy || (e.isVerified ? 'Verified' : null),
                is_verified: Boolean(e.isVerified || (e as any).verifiedBy),
                is_public: e.isPublic !== false,
                year: Number(e.year) || (e.date ? parseInt(e.date.slice(0, 4), 10) : undefined),
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'id' }
            );

            if (!error) {
              eSuccess++;
              totalSuccessful++;
              result.counts.expenses++;
            } else {
              eFailed++;
              totalFailed++;
              if (!eFirstError) {
                eFirstError = error.message;
                eFirstDetails = `Code: ${error.code}, Details: ${error.details || error.hint || 'None'}`;
              }
              result.errors.push(`ব্যয় রেকর্ড (${e.title || (e as any).purpose?.bn || e.id}) সংরক্ষণ ব্যর্থ: ${error.message}`);
              result.debugDetails.push(`[expenses id=${e.id}] Error: ${error.message} (code: ${error.code})`);
            }
          } catch (err: any) {
            eFailed++;
            totalFailed++;
            if (!eFirstError) eFirstError = err?.message || String(err);
            result.debugDetails.push(`[expenses id=${e.id}] Exception: ${err?.message || err}`);
          }
        }

        itemized.push({
          entity: 'expenses',
          label: 'Expenses (ব্যয় বিবরণীসমূহ)',
          total: localData.expenses.length,
          successful: eSuccess,
          failed: eFailed,
          skipped: 0,
          error: eFirstError || undefined,
          debugDetails: eFirstDetails || undefined,
        });
      } else {
        itemized.push({
          entity: 'expenses',
          label: 'Expenses (ব্যয় বিবরণীসমূহ)',
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        });
      }

      // ----------------------------------------------------------------------
      // 8. Contact Messages (Inbox)
      // ----------------------------------------------------------------------
      if (localData.messages && localData.messages.length > 0) {
        let msgSuccess = 0;
        let msgFailed = 0;
        let msgFirstError = '';
        let msgFirstDetails = '';

        for (const msg of localData.messages) {
          totalItems++;
          try {
            const { error } = await supabase.from('contact_messages').upsert(
              {
                id: msg.id,
                name: msg.name,
                email: msg.email,
                phone: msg.phone || null,
                subject: msg.subject || null,
                message: msg.message,
                submitted_at: msg.submittedAt || new Date().toISOString(),
                is_read: Boolean(msg.isRead),
                is_archived: Boolean(msg.isArchived),
              },
              { onConflict: 'id' }
            );

            if (!error) {
              msgSuccess++;
              totalSuccessful++;
              result.counts.messages++;
            } else {
              msgFailed++;
              totalFailed++;
              if (!msgFirstError) {
                msgFirstError = error.message;
                msgFirstDetails = `Code: ${error.code}, Details: ${error.details || error.hint || 'None'}`;
              }
              result.errors.push(`বার্তা (${msg.name || msg.id}) সংরক্ষণ ব্যর্থ: ${error.message}`);
              result.debugDetails.push(`[contact_messages id=${msg.id}] Error: ${error.message} (code: ${error.code})`);
            }
          } catch (e: any) {
            msgFailed++;
            totalFailed++;
            if (!msgFirstError) msgFirstError = e?.message || String(e);
            result.debugDetails.push(`[contact_messages id=${msg.id}] Exception: ${e?.message || e}`);
          }
        }

        itemized.push({
          entity: 'contact_messages',
          label: 'Contact Messages (ইনবক্স বার্তাসমূহ)',
          total: localData.messages.length,
          successful: msgSuccess,
          failed: msgFailed,
          skipped: 0,
          error: msgFirstError || undefined,
          debugDetails: msgFirstDetails || undefined,
        });
      } else {
        itemized.push({
          entity: 'contact_messages',
          label: 'Contact Messages (ইনবক্স বার্তাসমূহ)',
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        });
      }

      // ----------------------------------------------------------------------
      // 9. Social Links
      // ----------------------------------------------------------------------
      if (localData.social && localData.social.length > 0) {
        let sSuccess = 0;
        let sFailed = 0;
        let sFirstError = '';
        let sFirstDetails = '';

        for (const s of localData.social) {
          totalItems++;
          try {
            const { error } = await supabase.from('social_links').upsert(
              {
                id: s.id,
                platform: s.platform,
                label: s.label || s.platform,
                url: s.url,
                icon: s.icon || s.platform,
                is_enabled: s.isEnabled !== false,
                sort_order: s.sortOrder || 0,
              },
              { onConflict: 'id' }
            );

            if (!error) {
              sSuccess++;
              totalSuccessful++;
              result.counts.social++;
            } else {
              sFailed++;
              totalFailed++;
              if (!sFirstError) {
                sFirstError = error.message;
                sFirstDetails = `Code: ${error.code}, Details: ${error.details || error.hint || 'None'}`;
              }
              result.errors.push(`সোশ্যাল লিঙ্ক (${s.platform}) সংরক্ষণ ব্যর্থ: ${error.message}`);
              result.debugDetails.push(`[social_links id=${s.id}] Error: ${error.message} (code: ${error.code})`);
            }
          } catch (e: any) {
            sFailed++;
            totalFailed++;
            if (!sFirstError) sFirstError = e?.message || String(e);
            result.debugDetails.push(`[social_links id=${s.id}] Exception: ${e?.message || e}`);
          }
        }

        itemized.push({
          entity: 'social_links',
          label: 'Social Links (সামাজিক যোগাযোগ লিঙ্কসমূহ)',
          total: localData.social.length,
          successful: sSuccess,
          failed: sFailed,
          skipped: 0,
          error: sFirstError || undefined,
          debugDetails: sFirstDetails || undefined,
        });
      } else {
        itemized.push({
          entity: 'social_links',
          label: 'Social Links (সামাজিক যোগাযোগ লিঙ্কসমূহ)',
          total: 0,
          successful: 0,
          failed: 0,
          skipped: 0,
        });
      }

      // ----------------------------------------------------------------------
      // 10. VERIFICATION: Query live row counts directly from Supabase
      // ----------------------------------------------------------------------
      const verifiedCounts: Record<string, number> = {};
      try {
        const [cRes, dRes, mRes, aRes, nRes, gRes, eRes] = await Promise.all([
          supabase.from('site_settings').select('id', { count: 'exact', head: true }),
          supabase.from('designations').select('id', { count: 'exact', head: true }),
          supabase.from('members').select('id', { count: 'exact', head: true }),
          supabase.from('activities').select('id', { count: 'exact', head: true }),
          supabase.from('notices').select('id', { count: 'exact', head: true }),
          supabase.from('gallery_items').select('id', { count: 'exact', head: true }),
          supabase.from('expenses').select('id', { count: 'exact', head: true }),
        ]);

        if (typeof cRes.count === 'number') verifiedCounts.config = cRes.count;
        if (typeof dRes.count === 'number') verifiedCounts.designations = dRes.count;
        if (typeof mRes.count === 'number') verifiedCounts.members = mRes.count;
        if (typeof aRes.count === 'number') verifiedCounts.activities = aRes.count;
        if (typeof nRes.count === 'number') verifiedCounts.notices = nRes.count;
        if (typeof gRes.count === 'number') verifiedCounts.gallery = gRes.count;
        if (typeof eRes.count === 'number') verifiedCounts.expenses = eRes.count;
      } catch (vErr: any) {
        result.debugDetails.push(`Verification query error: ${vErr?.message || vErr}`);
      }

      result.summary = {
        successful: totalSuccessful,
        failed: totalFailed,
        skipped: totalSkipped,
        total: totalItems,
      };
      result.itemizedSummary = itemized;
      result.verifiedCounts = verifiedCounts;
      result.verified = Object.keys(verifiedCounts).length > 0;

      // STRICT COMPLETION CRITERIA:
      // Never claim migration success when site_settings failed
      if (siteSettingsFailed) {
        result.success = false;
        result.message = 'মাইগ্রেশন ব্যর্থ: সাইট কনফিগারেশন (site_settings) ক্লাউড ডাটাবেজে সংরক্ষণ বা যাচাই করা যায়নি।';
      } else if (totalFailed > 0) {
        result.success = false;
        result.message = `মাইগ্রেশনে কিছু অসংগতি দেখা গেছে: ${totalFailed} টি রেকর্ড সংরক্ষণ ব্যর্থ হয়েছে। বিস্তারিত নিচে দেখুন।`;
      } else {
        result.success = true;
        result.message = `সকল লোকাল ডাটা সফলভাবে সেন্ট্রাল ডাটাবেজে মাইগ্রেট ও ভেরিফাই করা হয়েছে! (সফল: ${totalSuccessful}, স্কিপড: ${totalSkipped})`;
      }

      return result;
    } catch (err: any) {
      result.success = false;
      result.message = `মাইগ্রেশন ব্যাহত হয়েছে: ${err.message || err}`;
      result.errors.push(err.message || String(err));
      result.debugDetails.push(`Fatal migration exception: ${err.stack || err.message || err}`);
      result.summary = {
        successful: totalSuccessful,
        failed: totalFailed,
        skipped: totalSkipped,
        total: totalItems,
      };
      result.itemizedSummary = itemized;
      return result;
    }
  },
};
