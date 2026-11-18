// NEVER put the service_role / secret key here.
(function () {
  var SUPABASE_URL = 'https://syuskixgldpzdghrvvfm.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_anE-2WrhxidcH01tpVpnVQ_lZTCFqjH';
  window.HB_DB = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();
