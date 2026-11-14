// ============================ CONFIG ============================
// Mesmos dados do .env do app do computador:
//  - SUPABASE_URL: a "Project URL"
//  - SUPABASE_CHAVE: a chave PÚBLICA (anon / publishable). NUNCA a service_role / secret.
//  - URL_ACOMPANHAR: a página onde o cliente acompanha a OS.
window.CELLGESTOR = {
  SUPABASE_URL: "https://mruyvrgxnbllbbmvumzo.supabase.co",
  SUPABASE_CHAVE: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ydXl2cmd4bmJsbGJibXZ1bXpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwNDI5MDEsImV4cCI6MjA5ODYxODkwMX0.CassncXJzhFIb-Fb9VeS-z3Wp4bfl8Urz0HM3CGLsco",
  URL_ACOMPANHAR: "https://glaydsonaguiar.github.io/acompanhar/",
  // chave PÚBLICA das notificações (a privada fica só no Supabase: sql/15_notificacoes.sql)
  VAPID_PUBLICA: "BEHOskbzvSbQa4dbbOIuEO2PfmaI2Ry8_qN65kEXmZxPIaSBw73d_74Onqt8HB6Zvxp1nZqautjf7H68_-2n2Ko",
};
