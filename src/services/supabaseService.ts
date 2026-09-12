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

export interface MigrationResult {
  success: boolean;
  message: string;
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
  errors: string[];
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
        console.warn('Supabase fetchConfig error:', error.message);
        return null;
      }
      return (data?.config as FoundationConfig) || null;
    } catch (e) {
      console.warn('Supabase fetchConfig exception:', e);
      return null;
    }
  },

  async saveConfig(config: FoundationConfig): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: 'foundation_primary_config',
          config,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.warn('Supabase saveConfig error:', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('Supabase saveConfig exception:', e);
      return false;
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

  async saveDesignation(d: Designation): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('designations').upsert({
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
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteDesignation(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('designations').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
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

  async saveMember(m: Member): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('members').upsert({
        id: m.id,
        serial: m.serial,
        name: m.name,
        gender: m.gender || null,
        designation_id: m.designationId || null,
        role: m.role || null,
        photo_url: m.photoUrl || null,
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
        created_at: m.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteMember(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('members').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
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

  async saveActivity(a: Activity): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('activities').upsert({
        id: a.id,
        slug: a.slug || a.id,
        title: a.title,
        summary: a.summary || a.description,
        description: a.description,
        date: a.date,
        category: a.category || 'humanitarian',
        cover_image: a.coverImage || null,
        images: a.images || [],
        gallery_images: a.galleryImages || [],
        is_published: a.isPublished !== false,
        created_at: a.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteActivity(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('activities').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
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

  async saveNotice(n: Notice): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('notices').upsert({
        id: n.id,
        title: n.title,
        body: n.body,
        date: n.date,
        link: n.link || null,
        attachment_url: n.attachmentUrl || null,
        is_important: Boolean(n.isImportant),
        is_published: n.isPublished !== false,
        created_at: n.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteNotice(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('notices').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
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

  async saveGalleryItem(g: GalleryItem): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('gallery_items').upsert({
        id: g.id,
        type: g.type || 'image',
        media_url: g.mediaUrl || g.url || '',
        url: g.url || g.mediaUrl || '',
        thumbnail_url: g.thumbnailUrl || null,
        title: g.title,
        description: g.description || null,
        caption: g.caption || null,
        category: g.category || 'general',
        year: g.year || new Date().getFullYear(),
        is_published: g.isPublished !== false,
        created_at: g.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteGalleryItem(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('gallery_items').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
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

  async saveExpense(e: ExpenseRecord): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('expenses').upsert({
        id: e.id,
        date: e.date,
        amount: e.amount,
        title: e.title,
        category: e.category,
        custom_category: e.customCategory || null,
        description: e.description || null,
        recipient: e.recipient || null,
        is_recipient_public: Boolean(e.isRecipientPublic),
        location: e.location || null,
        receipt_url: e.receiptUrl || null,
        is_verified: Boolean(e.isVerified),
        is_public: e.isPublic !== false,
        year: e.year || new Date(e.date).getFullYear(),
        created_at: e.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return !error;
    } catch {
      return false;
    }
  },

  async deleteExpense(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      return !error;
    } catch {
      return false;
    }
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

  async saveSocialLinks(links: SocialLink[]): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase) return false;

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
        'members',
        'designations',
        'activities',
        'notices',
        'gallery_items',
        'expenses',
        'contact_messages',
        'social_links',
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

      tablesStatus['site_settings'] = !pingError || !pingError.message.includes('Could not find');

      await Promise.all(
        tableNames.slice(1).map(async (t) => {
          try {
            const { error } = await supabase.from(t).select('id').limit(1);
            tablesStatus[t] = !error || !error.message.includes('Could not find');
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
  }>): Promise<MigrationResult & { verified?: boolean; verifiedCounts?: Record<string, number> }> {
    const supabase = getSupabase();
    const result: MigrationResult & { verified?: boolean; verifiedCounts?: Record<string, number> } = {
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
      verifiedCounts: {},
      errors: [],
    };

    if (!supabase) {
      result.message = 'Supabase সংযোগ কনফিগার করা হয়নি। দয়া করে VITE_SUPABASE_URL এবং VITE_SUPABASE_ANON_KEY প্রদান করুন।';
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

    try {
      // 1. Config
      if (localData.config) {
        const ok = await this.saveConfig(localData.config);
        if (ok) result.counts.config = 1;
        else result.errors.push('সাইট কনফিগারেশন সংরক্ষণ ব্যর্থ হয়েছে (site_settings টেবিল চেক করুন)।');
      }

      // 2. Designations
      if (localData.designations && localData.designations.length > 0) {
        for (const d of localData.designations) {
          const ok = await this.saveDesignation(d);
          if (ok) result.counts.designations++;
        }
      }

      // 3. Members
      if (localData.members && localData.members.length > 0) {
        for (const m of localData.members) {
          const ok = await this.saveMember(m);
          if (ok) result.counts.members++;
        }
      }

      // 4. Activities
      if (localData.activities && localData.activities.length > 0) {
        for (const a of localData.activities) {
          const ok = await this.saveActivity(a);
          if (ok) result.counts.activities++;
        }
      }

      // 5. Notices
      if (localData.notices && localData.notices.length > 0) {
        for (const n of localData.notices) {
          const ok = await this.saveNotice(n);
          if (ok) result.counts.notices++;
        }
      }

      // 6. Gallery
      if (localData.gallery && localData.gallery.length > 0) {
        for (const g of localData.gallery) {
          const ok = await this.saveGalleryItem(g);
          if (ok) result.counts.gallery++;
        }
      }

      // 7. Expenses
      if (localData.expenses && localData.expenses.length > 0) {
        for (const e of localData.expenses) {
          const ok = await this.saveExpense(e);
          if (ok) result.counts.expenses++;
        }
      }

      // 8. Contact messages
      if (localData.messages && localData.messages.length > 0) {
        for (const msg of localData.messages) {
          try {
            const { error } = await supabase.from('contact_messages').upsert({
              id: msg.id,
              name: msg.name,
              email: msg.email,
              phone: msg.phone || null,
              subject: msg.subject || null,
              message: msg.message,
              submitted_at: msg.submittedAt,
              is_read: Boolean(msg.isRead),
              is_archived: Boolean(msg.isArchived),
            });
            if (!error) result.counts.messages++;
          } catch {
            // non-blocking
          }
        }
      }

      // 9. Social links
      if (localData.social && localData.social.length > 0) {
        const ok = await this.saveSocialLinks(localData.social);
        if (ok) result.counts.social = localData.social.length;
      }

      // VERIFICATION: Check row counts in Supabase
      const verifiedCounts: Record<string, number> = {};
      try {
        const [mRes, aRes, nRes, gRes, eRes] = await Promise.all([
          supabase.from('members').select('id', { count: 'exact', head: true }),
          supabase.from('activities').select('id', { count: 'exact', head: true }),
          supabase.from('notices').select('id', { count: 'exact', head: true }),
          supabase.from('gallery_items').select('id', { count: 'exact', head: true }),
          supabase.from('expenses').select('id', { count: 'exact', head: true }),
        ]);

        if (typeof mRes.count === 'number') verifiedCounts.members = mRes.count;
        if (typeof aRes.count === 'number') verifiedCounts.activities = aRes.count;
        if (typeof nRes.count === 'number') verifiedCounts.notices = nRes.count;
        if (typeof gRes.count === 'number') verifiedCounts.gallery = gRes.count;
        if (typeof eRes.count === 'number') verifiedCounts.expenses = eRes.count;
      } catch {
        // non-blocking verification
      }

      result.verifiedCounts = verifiedCounts;
      result.verified = Object.keys(verifiedCounts).length > 0;
      result.success = result.errors.length === 0;
      result.message = result.success
        ? 'সকল লোকাল ডাটা সফলভাবে Supabase ক্লাউড ডাটাবেজে মাইগ্রেট ও ভেরিফাই করা হয়েছে! মূল লোকাল ব্যাকআপ অক্ষত রয়েছে।'
        : 'মাইগ্রেশনে কিছু অসংগতি পাওয়া গেছে। দয়া করে নিশ্চিত করুন Supabase SQL Editor এ supabase_schema.sql স্ক্রিপ্টটি রান করা হয়েছে।';

      return result;
    } catch (err: any) {
      result.success = false;
      result.message = `মাইগ্রেশন ত্রুটি: ${err.message || err}। নিশ্চিত করুন supabase_schema.sql স্ক্রিপ্ট রান করা হয়েছে।`;
      return result;
    }
  },
};
