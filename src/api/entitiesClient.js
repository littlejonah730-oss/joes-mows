import { supabase } from '@/lib/supabaseClient';

// Base44 entity name -> Supabase table name.
export const ENTITY_TABLES = {
  Announcement: 'announcements',
  Badge: 'badges',
  BadgeAssignment: 'badge_assignments',
  BusinessSettings: 'business_settings',
  ChatMessage: 'chat_messages',
  Customer: 'customers',
  CustomerInteraction: 'customer_interactions',
  Employee: 'employees',
  Equipment: 'equipment',
  EquipmentUsage: 'equipment_usage',
  Expense: 'expenses',
  Invoice: 'invoices',
  Job: 'jobs',
  JobPhoto: 'job_photos',
  Liability: 'liabilities',
  Message: 'messages',
  Mileage: 'mileage',
  Note: 'notes',
  Notification: 'notifications',
  PresetText: 'preset_texts',
  PushSubscription: 'push_subscriptions',
  Reward: 'rewards',
  Spectator: 'spectators',
  User: 'profiles',
  WaitlistEntry: 'waitlist_entries',
  YardPhoto: 'yard_photos',
};

function parseSort(sort) {
  if (!sort) return { column: 'created_date', ascending: false };
  const descending = sort.startsWith('-');
  return { column: descending ? sort.slice(1) : sort, ascending: !descending };
}

function makeEntity(tableName) {
  return {
    async list(sort = '-created_date', limit = 500) {
      const { column, ascending } = parseSort(sort);
      let query = supabase.from(tableName).select('*').order(column, { ascending });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async filter(filters = {}, sort = '-created_date', limit = 500) {
      const { column, ascending } = parseSort(sort);
      let query = supabase.from(tableName).select('*').match(filters).order(column, { ascending });
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async get(id) {
      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase.from(tableName).insert(payload).select().single();
      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase.from(tableName).update(payload).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(tableName).delete().eq('id', id);
      if (error) throw error;
      return true;
    },

    async deleteMany(filters = {}) {
      const { error } = await supabase.from(tableName).delete().match(filters);
      if (error) throw error;
      return true;
    },

    subscribe(callback) {
      const channel = supabase
        .channel(`${tableName}-changes`)
        .on('postgres_changes', { event: '*', schema: 'public', table: tableName }, callback)
        .subscribe();
      return () => supabase.removeChannel(channel);
    },
  };
}

const entityCache = {};

export const entities = new Proxy(
  {},
  {
    get(_target, entityName) {
      const tableName = ENTITY_TABLES[entityName];
      if (!tableName) {
        throw new Error(`Unknown entity "${String(entityName)}" — add it to ENTITY_TABLES in src/api/entitiesClient.js`);
      }
      if (!entityCache[entityName]) entityCache[entityName] = makeEntity(tableName);
      return entityCache[entityName];
    },
  }
);
