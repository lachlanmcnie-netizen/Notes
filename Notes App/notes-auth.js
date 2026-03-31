(function () {
  const CONFIG = window.NOTES_CLOUD_CONFIG || {};

  function hasConfig() {
    return Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey) &&
      !CONFIG.supabaseUrl.includes("YOUR_PROJECT") &&
      !CONFIG.supabaseAnonKey.includes("YOUR_SUPABASE");
  }

  function getClient() {
    if (!hasConfig()) {
      throw new Error("Missing Supabase config in notes-cloud-config.js");
    }

    if (!window.supabase?.createClient) {
      throw new Error("Supabase client library failed to load.");
    }

    if (!window.NotesSupabaseClient) {
      window.NotesSupabaseClient = window.supabase.createClient(
        CONFIG.supabaseUrl,
        CONFIG.supabaseAnonKey
      );
    }

    return window.NotesSupabaseClient;
  }

  window.NotesAuth = {
    hasConfig,
    getClient
  };
})();
