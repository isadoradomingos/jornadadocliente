// Camada de persistência. Todo adapter segue o mesmo contrato assíncrono:
//   load(key)        -> Promise<object | null>
//   save(key, data)  -> Promise<void>
//   remove(key)      -> Promise<void>
// Para integrar ao Supabase (ou outra API), crie um adapter com esse contrato
// e troque a instância em js/main.js — o resto da aplicação não muda.

export class LocalStorageAdapter {
  async load(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err) {
      console.warn('[storage] não foi possível salvar', err);
    }
  }

  async remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignora */
    }
  }
}

// Esqueleto para o Supabase: tabela `journey_state (key text primary key, data jsonb)`.
// Uso: new SupabaseStorageAdapter(createClient(SUPABASE_URL, SUPABASE_ANON_KEY))
export class SupabaseStorageAdapter {
  constructor(client, table = 'journey_state') {
    this.client = client;
    this.table = table;
  }

  async load(key) {
    const { data, error } = await this.client.from(this.table).select('data').eq('key', key).maybeSingle();
    if (error) throw error;
    return data?.data ?? null;
  }

  async save(key, data) {
    const { error } = await this.client.from(this.table).upsert({ key, data });
    if (error) throw error;
  }

  async remove(key) {
    const { error } = await this.client.from(this.table).delete().eq('key', key);
    if (error) throw error;
  }
}
