/* =====================================================================
   CellGestor no celular (PWA) - versão 1.0
   Mesmo banco (Supabase) e mesmas regras do app do computador:
   login igual, permissões pelo banco (dono vê tudo, funcionário só a loja dele),
   status da OS, "pronto para retirada" + WhatsApp, e OS nova (com assinatura).
   Sem bibliotecas externas: fala com o Supabase direto (auth + REST).
   ===================================================================== */
"use strict";

const VERSAO_APP = "1.0";
const CFG = window.CELLGESTOR || {};
const URL_SB = String(CFG.SUPABASE_URL || "").replace(/\/+$/, "");
const CHAVE = String(CFG.SUPABASE_CHAVE || "");
const URL_ACOMPANHAR = String(CFG.URL_ACOMPANHAR || "");

const STATUS_PRONTO = "Pronto para Retirada";
const STATUS_ABERTOS = ["Em Aberto", "Em Andamento", "Aguardando Peça", "Em Terceiro", STATUS_PRONTO];
const CAMPOS_OS = "id,loja_nome,loja_id,cliente_nome,cliente_telefone,aparelho_modelo,defeito_relatado,observacoes," +
  "valor_estimado,status,created_at,senha_aparelho,imei,prazo_data,prazo_dias,pronto_em,entregue_em,garantia_dias," +
  "token_publico,assinatura_entrada_em,peca_nao_original";
const DECLARACAO_ENTRADA = "Declaro que deixei o aparelho descrito nesta ordem de serviço, que conferi o estado dele na entrada " +
  "e que concordo com o orçamento e com os termos de garantia e condições.";
const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const DIAS_EXT = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MESES_EXT = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/* ------------------------------------------------------------ ícones */
const ICONES = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  lista: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4M12 16h4M8 11h.01M8 16h.01"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  busca: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  voltar: '<path d="m15 18-6-6 6-6"/>',
  atualizar: '<path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  telefone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  ferramenta: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  pacote: '<path d="m7.5 4.3 9 5.2"/><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
  ok: '<path d="M20 6 9 17l-5-5"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  lixo: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  externo: '<path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>',
  baixar: '<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
  festa: '<path d="M5.8 11.3 2 22l10.7-3.8"/><path d="M4 3h.01M22 8h.01M15 2h.01M22 20h.01"/><path d="m22 2-2.2.8a2.9 2.9 0 0 0-1.8 3.4 2.9 2.9 0 0 1-1.8 3.4L14 10.3"/><path d="M9 9.3 14.7 15a1 1 0 0 1-.4 1.6L6 20 4 18l3.4-8.3A1 1 0 0 1 9 9.3z"/>',
};
const WHATS_SVG = '<svg class="i" viewBox="0 0 24 24" style="fill:currentColor;stroke:none"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.3c0-.1-.2-.2-.5-.3Z"/></svg>';
const ic = (nome, estilo) => `<svg class="i" viewBox="0 0 24 24"${estilo ? ` style="${estilo}"` : ""} aria-hidden="true">${ICONES[nome] || ""}</svg>`;

/* ------------------------------------------------------------ utilidades */
const $ = (sel, raiz) => (raiz || document).querySelector(sel);
const $$ = (sel, raiz) => Array.from((raiz || document).querySelectorAll(sel));
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const enc = encodeURIComponent;
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hoje = () => ymd(new Date());
const brl = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const semAcento = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const digitos = (t) => String(t || "").replace(/\D/g, "");
const guardar = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };
const ler = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };

function dataLocal(iso) {            // "2026-11-13T18:20:00Z" -> "2026-11-13" (no fuso do celular)
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  return isNaN(d) ? null : ymd(d);
}
function diasEntre(a, b) {           // b - a, em dias ("YYYY-MM-DD")
  const [y1, m1, d1] = a.split("-").map(Number), [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
function dataBR(s, curta) {
  if (!s) return "";
  const [y, m, d] = String(s).slice(0, 10).split("-");
  return curta ? `${d}/${m}` : `${d}/${m}/${y}`;
}
function dataComSemana(s) {          // igual ao app do computador: "seg, 16/11/2026"
  const [y, m, d] = s.split("-").map(Number);
  return `${DIAS_SEMANA[new Date(y, m - 1, d).getDay()]}, ${dataBR(s)}`;
}
function somarDiasUteis(inicio, dias) {
  const [y, m, d] = inicio.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  while (dias > 0) { dt.setDate(dt.getDate() + 1); if (dt.getDay() !== 0 && dt.getDay() !== 6) dias--; }
  return ymd(dt);
}
function telefoneWhats(tel) {        // "(11) 98765-4321" -> "5511987654321" ("" se não parecer celular)
  let d = digitos(tel).replace(/^0+/, "");
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return (d.length === 12 || d.length === 13) && d.startsWith("55") ? d : "";
}
function digitosTelefone(tel) {      // mesma regra do banco (clientes.telefone_digitos)
  let d = digitos(tel).replace(/^0+/, "");
  if ((d.length === 12 || d.length === 13) && d.startsWith("55")) d = d.slice(2);
  return d;
}
function mascaraTelefone(v) {
  const d = digitos(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
function itensServico(o) {           // "Troca de tela (R$ 230.00) | Película (R$ 30.00)" -> [{desc, valor}]
  return String(o.defeito_relatado || "").split(" | ").map((p) => p.trim()).filter(Boolean).map((p) => {
    const m = p.match(/^(.*)\(R\$ ?([\d.,]+)\)\s*$/);
    return m ? { desc: m[1].trim(), valor: parseFloat(m[2].replace(/,(?=\d{2}$)/, ".").replace(/,/g, "")) } : { desc: p, valor: null };
  });
}
function linkAcompanhamento(o) {
  return o && o.token_publico && URL_ACOMPANHAR ? `${URL_ACOMPANHAR.replace(/\/+$/, "")}/?os=${o.token_publico}` : null;
}

/* padronização dos textos (igual ao texto_padrao.py do computador) */
const SIGLAS = { usb: "USB", "usb-c": "USB-C", "tipo-c": "Tipo-C", "type-c": "Type-C", lcd: "LCD", oled: "OLED", amoled: "AMOLED", led: "LED", hd: "HD",
  ssd: "SSD", gb: "GB", tb: "TB", mb: "MB", mah: "mAh", nfc: "NFC", pix: "PIX", cpf: "CPF", cnpj: "CNPJ", tv: "TV", pc: "PC", os: "OS", imei: "IMEI", sim: "SIM",
  wifi: "Wi-Fi", "wi-fi": "Wi-Fi", jbl: "JBL", lg: "LG", tcl: "TCL", zte: "ZTE", hmd: "HMD", ps4: "PS4", ps5: "PS5", sd: "SD", iphone: "iPhone", ipad: "iPad",
  ipod: "iPod", imac: "iMac", macbook: "MacBook", airpods: "AirPods", applewatch: "Apple Watch", iwatch: "iWatch", ios: "iOS", xiaomi: "Xiaomi", redmi: "Redmi",
  poco: "Poco", motorola: "Motorola", moto: "Moto", samsung: "Samsung", galaxy: "Galaxy", realme: "Realme", oneplus: "OnePlus", max: "Max", pro: "Pro",
  plus: "Plus", mini: "Mini", ultra: "Ultra", lite: "Lite" };
const ACENTOS = { pelicula: "película", peliculas: "películas", acessorio: "acessório", acessorios: "acessórios", servico: "serviço", servicos: "serviços",
  manutencao: "manutenção", orcamento: "orçamento", botao: "botão", botoes: "botões", camera: "câmera", cameras: "câmeras", audio: "áudio", oxidacao: "oxidação",
  magnetico: "magnético", magnetica: "magnética", ceramica: "cerâmica", conexao: "conexão", nao: "não", sao: "são", tambem: "também", liquido: "líquido",
  agua: "água", reparacao: "reparação", joao: "joão", jose: "josé", antonio: "antônio", conceicao: "conceição", sebastiao: "sebastião", fabio: "fábio",
  flavio: "flávio", marcio: "márcio", claudio: "cláudio", vinicius: "vinícius", lucia: "lúcia", leticia: "letícia", patricia: "patrícia", julia: "júlia",
  andre: "andré", numero: "número", proximo: "próximo" };
const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "com", "sem", "para", "pra", "p/", "c/", "s/", "em", "na", "no", "nas", "nos",
  "a", "o", "as", "ao", "à", "por", "ou", "x"]);
function _palavra(p, primeira) {
  if (!p) return p;
  const low = p.toLowerCase();
  if (SIGLAS[low]) return SIGLAS[low];
  if (/^\d+x$/i.test(p)) return low;
  if (/^[\d.,/:-]+$/.test(p)) return p;
  if (/\d/.test(p)) return low.endsWith("mah") ? p.slice(0, -3).toUpperCase() + "mAh" : p.toUpperCase();
  if (MINUSCULAS.has(low) && !primeira) return low;
  const base = ACENTOS[low] || low;
  if (p !== low && p !== p.toUpperCase() && p.slice(1) !== p.slice(1).toLowerCase()) return p;
  return base.charAt(0).toUpperCase() + base.slice(1);
}
function _token(t, primeira) {
  if (SIGLAS[t.toLowerCase()]) return SIGLAS[t.toLowerCase()];
  for (const sep of ["-", "/"]) {
    if (t.includes(sep) && t.length > 2 && !MINUSCULAS.has(t.toLowerCase())) return t.split(sep).map((x, i) => _palavra(x, primeira && i === 0)).join(sep);
  }
  return _palavra(t, primeira);
}
function padronizar(texto, frase) {
  texto = String(texto || "").replace(/\s+/g, " ").trim();
  if (!texto) return texto;
  const palavras = texto.split(" ");
  if (frase) {
    const s = palavras.map((p) => {
      const low = p.toLowerCase();
      if (SIGLAS[low]) return SIGLAS[low];
      if (/\d/.test(p) && !/^[\d.,/:-]+$/.test(p) && !/^\d+x$/i.test(p)) return p.toUpperCase();
      if ((p === p.toUpperCase() && p.length > 1) || p === low) return ACENTOS[low] || low;
      return p;
    });
    s[0] = s[0].charAt(0).toUpperCase() + s[0].slice(1);
    return s.join(" ");
  }
  return palavras.map((p, i) => _token(p, i === 0)).join(" ");
}

/* ------------------------------------------------------------ Supabase (auth + REST) */
let sessao = ler("cg_sessao");
let renovando = null;

class ErroApp extends Error {
  constructor(msg, extra) { super(msg); Object.assign(this, extra || {}); }
}

async function chamarAuth(caminho, corpo, tokenAcesso) {
  const cab = { apikey: CHAVE, "Content-Type": "application/json" };
  if (tokenAcesso) cab.Authorization = "Bearer " + tokenAcesso;
  let r;
  try { r = await fetch(`${URL_SB}/auth/v1/${caminho}`, { method: "POST", headers: cab, body: JSON.stringify(corpo || {}) }); }
  catch (e) { throw new ErroApp("Sem conexão. Verifique a internet.", { rede: true }); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroApp(j.error_description || j.msg || j.message || `Erro ${r.status}`, { status: r.status });
  return j;
}
function guardarSessao(j) {
  sessao = { access_token: j.access_token, refresh_token: j.refresh_token, user: j.user || (sessao && sessao.user),
             expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600) };
  guardar("cg_sessao", sessao);
}
function renovarSessao() {
  if (!renovando) {
    renovando = chamarAuth("token?grant_type=refresh_token", { refresh_token: sessao && sessao.refresh_token })
      .then(guardarSessao)
      .catch((e) => { if (!e.rede) { encerrarSessaoLocal(); setTimeout(() => telaLogin("Sua sessão expirou. Entre de novo."), 0); } throw e; })
      .finally(() => { renovando = null; });
  }
  return renovando;
}
async function tokenAtual() {
  if (!sessao) throw new ErroApp("Entre de novo.", { semSessao: true });
  if (!sessao.expires_at || sessao.expires_at - 90 < Date.now() / 1000) await renovarSessao();
  return sessao.access_token;
}
async function rest(caminho, op = {}, tentativa = 0) {
  const cab = { apikey: CHAVE, Authorization: "Bearer " + (await tokenAtual()) };
  if (op.corpo !== undefined) cab["Content-Type"] = "application/json";
  if (op.prefer) cab.Prefer = op.prefer;
  let r;
  try {
    r = await fetch(`${URL_SB}/rest/v1/${caminho}`, { method: op.metodo || "GET", headers: cab, cache: "no-store",
                                                      body: op.corpo === undefined ? undefined : JSON.stringify(op.corpo) });
  } catch (e) { throw new ErroApp("Sem conexão. Verifique a internet.", { rede: true }); }
  if (r.status === 401 && tentativa === 0) { await renovarSessao(); return rest(caminho, op, 1); }
  const texto = await r.text();
  let j = null;
  try { j = texto ? JSON.parse(texto) : null; } catch (e) { j = null; }
  if (!r.ok) throw new ErroApp((j && (j.message || j.hint)) || `Erro ${r.status}`, { status: r.status, detalhe: j });
  return j;
}
const rpc = (nome, args) => rest(`rpc/${nome}`, { metodo: "POST", corpo: args || {} });
function encerrarSessaoLocal() {
  sessao = null;
  guardar("cg_sessao", null);
  Object.assign(E, estadoInicial());
}

/* ------------------------------------------------------------ estado */
function estadoInicial() {
  return { info: null, empresa: {}, lojas: [], dono: false, abertas: null, abertasEm: 0, vendas: null, vendasEm: 0,
           loja: "todas", filtro: "todas", modo: "abertas", busca: "", todas: null, detalhes: {}, rascunho: null, limite: 60 };
}
const E = estadoInicial();
const opcao = (chave, padrao) => {
  const o = (E.empresa && E.empresa.opcoes) || {};
  return o[chave] === undefined || o[chave] === null || o[chave] === "" ? padrao : o[chave];
};
const nomeEmpresa = () => E.empresa.nome_fantasia || E.empresa.nome || (E.info && E.info.empresa) || "";
const primeiroNome = () => String((E.info && E.info.nome) || "").split(" ")[0];

/* ------------------------------------------------------------ toast e folha */
let timerToast = null;
function toast(msg, erro) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "mostrar" + (erro ? " erro" : "");
  clearTimeout(timerToast);
  timerToast = setTimeout(() => { t.className = ""; }, erro ? 4200 : 2600);
}
function abrirFolha(html, aoMontar) {
  const f = $("#folha");
  $("#toast").className = "";
  f.innerHTML = html;
  f.hidden = false;
  $("#folha-fundo").hidden = false;
  if (aoMontar) aoMontar(f);
}
function fecharFolha() {
  $("#folha").hidden = true;
  $("#folha-fundo").hidden = true;
  $("#folha").innerHTML = "";
}

/* ------------------------------------------------------------ regras da OS (iguais ao computador) */
function classificar(o, h) {
  h = h || hoje();
  if (o.status === STATUS_PRONTO) return "pronto";
  if (o.status === "Em Terceiro") return "terceiro";
  const prev = o.prazo_data ? String(o.prazo_data).slice(0, 10) : null;
  if (prev && prev < h) return "atrasada";
  if (prev && prev === h) return "hoje";
  if (o.status === "Aguardando Peça") return "peca";
  return "normal";
}
function situacao(o, h) {              // [texto, classe do selo]
  h = h || hoje();
  if (o.status === "Entregue" || o.status === "Concluído") return ["Entregue", "entregue"];
  if (o.status === "Cancelado") return ["Cancelada", "cancelado"];
  const g = classificar(o, h);
  const prev = o.prazo_data ? String(o.prazo_data).slice(0, 10) : null;
  if (g === "pronto") {
    const p = dataLocal(o.pronto_em);
    const d = p ? diasEntre(p, h) : 0;
    return ["Pronto" + (d > 0 ? ` há ${d} dia(s)` : ""), "pronto"];
  }
  if (g === "terceiro") return ["Em terceiro", "terceiro"];
  if (g === "atrasada") return [`Atrasada ${diasEntre(prev, h)} dia(s)`, "atrasada"];
  if (g === "hoje") return ["Vence hoje", "hoje"];
  if (o.status === "Aguardando Peça") return ["Aguardando peça" + (prev ? ` • ${dataBR(prev, true)}` : ""), "peca"];
  if (o.status === "Em Andamento") return ["Em andamento" + (prev ? ` • ${dataBR(prev, true)}` : ""), ""];
  if (prev) return [`Até ${dataBR(prev, true)}`, ""];
  return [o.status || "Em aberto", ""];
}
function mensagensWhats(o, comLink) {
  const nome = String(o.cliente_nome || "").split(" ")[0] || "cliente";
  const aparelho = o.aparelho_modelo || "aparelho";
  const id = o.id;
  const total = brl(o.valor_estimado);
  const loja = nomeEmpresa() || o.loja_nome || "nossa loja";
  const servicos = itensServico(o).map((i) => i.desc).join(", ") || "diagnóstico";
  const garantia = parseInt(o.garantia_dias || E.empresa.garantia_dias || 90, 10);
  const linhaGarantia = `Garantia: ${garantia} dias para o serviço realizado.\n`;
  const prev = o.prazo_data ? String(o.prazo_data).slice(0, 10) : null;
  const linhaPrazo = prev ? `Previsão para ficar pronto: ${dataComSemana(prev)}\n` : "";
  const msgs = {
    "Aparelho recebido": `Olá, ${nome}! Aqui é da ${loja}.\n\nRecebemos seu ${aparelho}.\nOrdem de serviço nº ${id}\nServiço: ${servicos}\nValor estimado: ${total}\n${linhaPrazo}\nAvisaremos por aqui assim que estiver pronto. Qualquer dúvida é só chamar!`,
    "Ainda no prazo": `Olá, ${nome}! Aqui é da ${loja}.\n\nSeu ${aparelho} (OS nº ${id}) segue em reparo, dentro do prazo combinado${prev ? `, com previsão para ${dataComSemana(prev)}` : ""}.\n\nAssim que ficar pronto, avisamos você por aqui. Obrigado pela paciência!`,
    "Orçamento": `Olá, ${nome}! Aqui é da ${loja}.\n\nO orçamento do seu ${aparelho} (OS nº ${id}) ficou assim:\n${servicos}\nTotal: ${total}\n\nPodemos seguir com o serviço? Responda SIM para autorizar.`,
    "Aguardando peça": `Olá, ${nome}! Aqui é da ${loja}.\n\nEstamos aguardando a chegada da peça para o seu ${aparelho} (OS nº ${id}). Assim que chegar, damos andamento e te avisamos.`,
    "Pronto para retirada": `Olá, ${nome}! Aqui é da ${loja}.\n\nSeu ${aparelho} está PRONTO para retirada!\nOS nº ${id}\nValor: ${total}\n${linhaGarantia}\nTraga a ordem de serviço ou um documento com foto. Te esperamos!`,
    "Aparelho entregue": `Olá, ${nome}! Aqui é da ${loja}.\n\nObrigado pela preferência! Seu ${aparelho} foi entregue.\nOS nº ${id}\nValor pago: ${total}\n${linhaGarantia}\nQualquer coisa, é só chamar. Se puder, indica a gente para os amigos!`,
    "Mensagem livre": `Olá, ${nome}! Aqui é da ${loja}.\n\n`,
  };
  const link = comLink ? linkAcompanhamento(o) : null;
  if (link) for (const k of Object.keys(msgs)) if (k !== "Mensagem livre") msgs[k] += `\n\nAcompanhe sua OS pelo celular:\n${link}`;
  return msgs;
}
const urlWhats = (numero, texto) => `https://wa.me/${numero}?text=${enc(texto)}`;

/* ------------------------------------------------------------ dados */
async function carregarConta() {
  const info = await rpc("status_assinatura");
  let bloqueio = null;
  if (!info || !info.tem_perfil || !info.empresa) bloqueio = "Este usuário não está vinculado a nenhuma empresa. Fale com o dono da loja.";
  else if (!info.usuario_ativo) bloqueio = "Este usuário foi desativado. Fale com o dono da loja.";
  else if (!info.liberado) bloqueio = info.valido_ate ? `Assinatura vencida em ${dataBR(info.valido_ate)}. Renove para continuar usando.` : "Assinatura suspensa. Fale com o suporte do CellGestor.";
  if (bloqueio) throw new ErroApp(bloqueio, { bloqueio: true });
  E.info = info;
  E.dono = info.role === "admin";
  const [emp, lojas] = await Promise.all([
    rest("empresas?select=id,nome,nome_fantasia,telefone,garantia_dias,opcoes&limit=1")
      .catch(() => rest("empresas?select=id,nome,nome_fantasia,telefone,garantia_dias&limit=1")).catch(() => []),
    rest("lojas?select=id,nome&order=nome").catch(() => []),
  ]);
  E.empresa = (emp && emp[0]) || {};
  E.lojas = lojas || [];
}
async function buscarOS(filtro) {
  try { return await rest(`ordens_servico?select=${CAMPOS_OS}&${filtro}`); }
  catch (e) {
    if (e.status === 400 && /column/i.test(e.message)) return rest(`ordens_servico?select=*&${filtro}`);   // SQL antigo
    throw e;
  }
}
async function carregarAbertas(forcar) {
  if (!forcar && E.abertas && Date.now() - E.abertasEm < 15000) return E.abertas;
  const st = enc(`(${STATUS_ABERTOS.map((s) => `"${s}"`).join(",")})`);
  E.abertas = (await buscarOS(`status=in.${st}&order=id.desc&limit=3000`)) || [];
  E.abertasEm = Date.now();
  return E.abertas;
}
async function carregarVendasMes(forcar) {
  if (!E.dono) return null;
  if (!forcar && E.vendas && Date.now() - E.vendasEm < 30000) return E.vendas;
  const h = hoje(), ini = h.slice(0, 8) + "01";
  let todas = [], desloc = 0;
  for (;;) {
    const parte = (await rest(`vendas?select=valor,created_at,loja_id&created_at=gte.${enc(ini + "T00:00:00-03:00")}` +
      `&created_at=lte.${enc(h + "T23:59:59.999-03:00")}&order=created_at.desc&limit=1000&offset=${desloc}`)) || [];
    todas = todas.concat(parte);
    if (parte.length < 1000) break;
    desloc += 1000;
  }
  E.vendas = todas;
  E.vendasEm = Date.now();
  return todas;
}
function atualizarNoCache(o) {
  if (E.abertas) {
    const i = E.abertas.findIndex((x) => x.id === o.id);
    const aberta = STATUS_ABERTOS.includes(o.status);
    if (i >= 0 && aberta) E.abertas[i] = { ...E.abertas[i], ...o };
    else if (i >= 0) E.abertas.splice(i, 1);
    else if (aberta) E.abertas.unshift(o);
  }
  if (E.todas) { const j = E.todas.findIndex((x) => x.id === o.id); if (j >= 0) E.todas[j] = { ...E.todas[j], ...o }; }
  E.detalhes[o.id] = { ...(E.detalhes[o.id] || {}), ...o };
}
const daLoja = (item) => E.loja === "todas" || String(item.loja_id) === String(E.loja);

/* ------------------------------------------------------------ moldura (topo + abas) */
function moldura(aba, topoHTML, corpoHTML) {
  const abas = [["inicio", "#/inicio", "inicio", "Início"], ["os", "#/os", "lista", "OS"], ["nova", "#/nova", "mais", "Nova OS"], ["conta", "#/conta", "usuario", "Conta"]];
  $("#app").innerHTML = `
    <header class="topo">${topoHTML}</header>
    <main class="conteudo" id="conteudo">${corpoHTML}</main>
    <nav class="abas">${abas.map(([k, href, icone, rot]) => k === "nova"
      ? `<a href="${href}" class="nova${aba === k ? " ativo" : ""}"><span class="bolha">${ic(icone)}</span>${rot}</a>`
      : `<a href="${href}" class="${aba === k ? "ativo" : ""}">${ic(icone)}${rot}</a>`).join("")}</nav>`;
  window.scrollTo(0, 0);
}
function topoPadrao(titulo, sub, direita) {
  return `<div class="titulo"><h1>${esc(titulo)}</h1>${sub ? `<small>${esc(sub)}</small>` : ""}</div>${direita || ""}`;
}
const carregandoHTML = '<div class="vazio"><div class="roda" style="margin:0 auto"></div></div>';
const erroHTML = (msg) => `<div class="card" style="text-align:center"><p style="color:var(--vermelho);margin:0 0 12px">${esc(msg)}</p>
  <button class="btn contorno peq" data-acao="tentar">${ic("atualizar")} Tentar de novo</button></div>`;

function chipsLojas() {
  if (!E.dono || E.lojas.length < 2) return "";
  return `<div class="chips" id="chips-loja">${[["todas", "Todas as lojas"], ...E.lojas.map((l) => [String(l.id), l.nome])].map(([id, nome]) =>
    `<button class="chip${String(E.loja) === id ? " ativo" : ""}" data-loja="${esc(id)}">${esc(nome)}</button>`).join("")}</div>`;
}
function ligarChipsLojas(redesenhar) {
  $$("#chips-loja .chip").forEach((b) => b.addEventListener("click", () => {
    E.loja = b.dataset.loja;
    $$("#chips-loja .chip").forEach((x) => x.classList.toggle("ativo", x === b));
    redesenhar();
  }));
}
function itemOS(o) {
  const [txt, cls] = situacao(o);
  const servico = itensServico(o)[0];
  const mostrarLoja = E.dono && E.lojas.length > 1 && o.loja_nome;
  return `<a class="os-item" href="#/os/${o.id}">
    <div class="l1"><span class="num">#${o.id}</span><span class="valor">${brl(o.valor_estimado)}</span></div>
    <div class="ap">${esc(o.aparelho_modelo || "-")}${servico ? ` <span style="color:var(--muted);font-weight:500">• ${esc(servico.desc)}</span>` : ""}</div>
    <div class="cli">${esc(o.cliente_nome || "-")}</div>
    <div class="l3"><span class="selo ${cls}">${esc(txt)}</span>${mostrarLoja ? `<span class="loja">${esc(o.loja_nome)}</span>` : ""}</div>
  </a>`;
}

/* ------------------------------------------------------------ INÍCIO */
async function vInicio() {
  const d = new Date();
  const saud = d.getHours() < 12 ? "Bom dia" : d.getHours() < 18 ? "Boa tarde" : "Boa noite";
  const nome = primeiroNome();
  let sub = `${DIAS_EXT[d.getDay()].charAt(0).toUpperCase() + DIAS_EXT[d.getDay()].slice(1)}, ${d.getDate()} de ${MESES_EXT[d.getMonth()]}`;
  if (!E.dono && E.info.loja_nome) sub += ` • ${E.info.loja_nome}`;
  moldura("inicio", topoPadrao(nomeEmpresa() || "CellGestor", E.dono ? "Dono" : "Funcionário",
    `<button class="btn-icone" data-acao="atualizar" aria-label="Atualizar">${ic("atualizar")}</button>`),
    `<p class="ola">${saud}${nome ? ", " + esc(nome) : ""}!</p><p class="data">${esc(sub)}</p>${chipsLojas()}<div id="painel">${carregandoHTML}</div>`);
  ligarChipsLojas(desenharPainel);
  $('[data-acao="atualizar"]').addEventListener("click", () => recarregarPainel(true));
  if (E.abertas) desenharPainel();
  recarregarPainel(false);
}
async function recarregarPainel(forcar) {
  const botao = $('[data-acao="atualizar"]');
  if (botao && forcar) botao.innerHTML = '<div class="roda peq"></div>';
  try {
    await Promise.all([carregarAbertas(forcar), carregarVendasMes(forcar).catch(() => null)]);
    if (rotaAtual() === "inicio") desenharPainel();
  } catch (e) {
    if (!E.abertas && $("#painel")) { $("#painel").innerHTML = erroHTML(e.message); $('[data-acao="tentar"]').onclick = () => recarregarPainel(true); }
    else if (forcar) toast(e.message, true);
  } finally {
    if (botao && botao.isConnected) botao.innerHTML = ic("atualizar");
  }
}
function desenharPainel() {
  const alvo = $("#painel");
  if (!alvo || !E.abertas) return;
  const h = hoje();
  const lista = E.abertas.filter(daLoja);
  const g = { atrasada: [], hoje: [], pronto: [], terceiro: [], peca: [], normal: [] };
  lista.forEach((o) => g[classificar(o, h)].push(o));
  let html = "";

  // ---- vendas e meta (dono) ----
  if (E.dono && E.vendas) {
    const vendas = E.vendas.filter(daLoja);
    const mes = vendas.reduce((s, v) => s + Number(v.valor || 0), 0);
    const deHoje = vendas.filter((v) => dataLocal(v.created_at) === h);
    const valorHoje = deHoje.reduce((s, v) => s + Number(v.valor || 0), 0);
    const meta = E.loja === "todas" ? Number(opcao("meta_mensal", 0)) : 0;
    if (meta > 0) {
      const pct = Math.min(100, Math.round((mes / meta) * 100));
      const r = 44, c = 2 * Math.PI * r;
      html += `<section class="card"><h2>Meta do mês</h2><div class="meta">
        <div class="anel"><svg viewBox="0 0 104 104"><circle cx="52" cy="52" r="${r}" stroke="#1C2B57" stroke-width="10" fill="none"/>
          <circle cx="52" cy="52" r="${r}" stroke="${pct >= 100 ? "#34D399" : "#3B82F6"}" stroke-width="10" fill="none" stroke-linecap="round"
          stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}"/></svg><b>${pct}%</b></div>
        <div class="info"><div class="valor">${brl(mes)}</div><small>de ${brl(meta)}</small></div></div>
        <div class="mini3"><div><small>Hoje</small><b>${brl(valorHoje)}</b></div><div><small>Vendas hoje</small><b>${deHoje.length}</b></div>
        <div><small>Falta</small><b>${brl(Math.max(0, meta - mes))}</b></div></div></section>`;
    } else {
      html += `<section class="card"><h2>Vendas</h2><div class="meta"><div class="info"><small>No mês</small><div class="valor">${brl(mes)}</div></div></div>
        <div class="mini3"><div><small>Hoje</small><b>${brl(valorHoje)}</b></div><div><small>Vendas hoje</small><b>${deHoje.length}</b></div>
        <div><small>Ticket médio</small><b>${brl(vendas.length ? mes / vendas.length : 0)}</b></div></div></section>`;
    }
  }

  // ---- números das OS ----
  html += `<div class="kpis">
    <button class="kpi" data-filtro="todas"><b>${lista.length}</b><span>OS abertas</span></button>
    <button class="kpi vermelho" data-filtro="atrasada"><b>${g.atrasada.length}</b><span>Atrasadas</span></button>
    <button class="kpi amarelo" data-filtro="hoje"><b>${g.hoje.length}</b><span>Vencem hoje</span></button>
    <button class="kpi verde" data-filtro="pronto"><b>${g.pronto.length}</b><span>Prontas p/ retirada</span></button></div>`;

  // ---- por loja (dono, várias lojas) ----
  if (E.dono && E.lojas.length > 1 && E.loja === "todas") {
    html += `<section class="card"><h2>Por loja</h2>${E.lojas.map((l) => {
      const os = E.abertas.filter((o) => String(o.loja_id) === String(l.id));
      const atr = os.filter((o) => classificar(o, h) === "atrasada").length;
      const pr = os.filter((o) => o.status === STATUS_PRONTO).length;
      const vh = (E.vendas || []).filter((v) => String(v.loja_id) === String(l.id) && dataLocal(v.created_at) === h).reduce((s, v) => s + Number(v.valor || 0), 0);
      return `<button class="loja-linha" data-loja-ir="${esc(l.id)}"><div><b>${esc(l.nome)}</b>
        <small>${os.length} OS abertas${atr ? ` • <span style="color:var(--vermelho)">${atr} atrasada(s)</span>` : ""}${pr ? ` • <span style="color:var(--verde)">${pr} pronta(s)</span>` : ""}</small></div>
        ${E.vendas ? `<span class="vh"><small>Hoje</small>${brl(vh)}</span>` : ""}</button>`;
    }).join("")}</section>`;
  }

  // ---- precisa de atenção ----
  const atencao = g.atrasada.concat(g.hoje, g.pronto.filter((o) => diasEntre(dataLocal(o.pronto_em) || h, h) >= 3));
  html += `<h2 class="sec">Precisa de atenção hoje <a class="btn fantasma peq" href="#/os">Ver todas</a></h2>`;
  html += atencao.length ? atencao.slice(0, 8).map(itemOS).join("") + (atencao.length > 8 ? `<p class="mais">+ ${atencao.length - 8} OS. Toque em "Ver todas".</p>` : "")
    : `<div class="card vazio">${ic("ok")}Tudo em dia! Nenhuma OS atrasada ou vencendo hoje.</div>`;

  alvo.innerHTML = html;
  $$("[data-loja-ir]", alvo).forEach((b) => b.addEventListener("click", () => {
    E.loja = b.dataset.lojaIr;
    $$("#chips-loja .chip").forEach((x) => x.classList.toggle("ativo", x.dataset.loja === E.loja));
    desenharPainel(); window.scrollTo({ top: 0, behavior: "smooth" });
  }));
  $$(".kpi", alvo).forEach((b) => b.addEventListener("click", () => { E.filtro = b.dataset.filtro; E.modo = "abertas"; location.hash = "#/os"; }));
}

/* ------------------------------------------------------------ LISTA DE OS */
const FILTROS = [["todas", "Todas"], ["atrasada", "Atrasadas"], ["hoje", "Vencem hoje"], ["pronto", "Prontas"], ["terceiro", "Em terceiro"], ["peca", "Aguardando peça"]];
function vListaOS() {
  moldura("os", topoPadrao("Ordens de serviço", nomeEmpresa(), `<button class="btn-icone" data-acao="atualizar" aria-label="Atualizar">${ic("atualizar")}</button>`),
    `<div class="seg"><button data-modo="abertas" class="${E.modo === "abertas" ? "ativo" : ""}">Abertas</button>
      <button data-modo="todas" class="${E.modo === "todas" ? "ativo" : ""}">Todas / histórico</button></div>
     <div class="busca">${ic("busca")}<input class="campo" id="busca" type="search" placeholder="Nome, telefone, aparelho ou nº da OS" value="${esc(E.busca)}" autocomplete="off"></div>
     ${chipsLojas()}<div class="chips" id="chips-filtro"></div><div id="lista">${carregandoHTML}</div>`);
  ligarChipsLojas(desenharLista);
  $$(".seg button").forEach((b) => b.addEventListener("click", () => {
    E.modo = b.dataset.modo; E.limite = 60;
    $$(".seg button").forEach((x) => x.classList.toggle("ativo", x === b));
    recarregarLista(false);
  }));
  let timer = null;
  $("#busca").addEventListener("input", (ev) => {
    E.busca = ev.target.value; E.limite = 60;
    clearTimeout(timer);
    timer = setTimeout(() => (E.modo === "todas" ? recarregarLista(true) : desenharLista()), E.modo === "todas" ? 450 : 120);
  });
  $('[data-acao="atualizar"]').addEventListener("click", () => recarregarLista(true));
  if ((E.modo === "abertas" && E.abertas) || (E.modo === "todas" && E.todas)) desenharLista();
  recarregarLista(false);
}
function filtroBusca(o) {
  const b = semAcento(E.busca).trim().replace(/^#/, "");
  if (!b) return true;
  if (/^\d+$/.test(b)) {
    if (String(o.id) === b) return true;
    if (b.length >= 4 && digitos(o.cliente_telefone).includes(b)) return true;
  }
  return semAcento(`${o.cliente_nome} ${o.aparelho_modelo} ${o.defeito_relatado} ${o.loja_nome}`).includes(b);
}
async function recarregarLista(forcar) {
  const botao = $('[data-acao="atualizar"]');
  if (botao && forcar) botao.innerHTML = '<div class="roda peq"></div>';
  try {
    if (E.modo === "abertas") await carregarAbertas(forcar);
    else {
      const b = String(E.busca || "").trim().replace(/^#/, "").replace(/[(),*%\\"]/g, " ").trim();
      let filtro = "order=id.desc&limit=200";
      if (b) {
        const partes = [`cliente_nome.ilike.*${b}*`, `aparelho_modelo.ilike.*${b}*`];
        if (/^\d+$/.test(b)) { partes.push(`id.eq.${b}`); if (b.length >= 4) partes.push(`cliente_telefone.ilike.*${b.slice(-4)}*`); }
        filtro = `or=${enc(`(${partes.join(",")})`)}&${filtro}`;
      }
      E.todas = (await buscarOS(filtro)) || [];
    }
    if (rotaAtual() === "os") desenharLista();
  } catch (e) {
    if ($("#lista") && !((E.modo === "abertas" && E.abertas) || (E.modo === "todas" && E.todas))) {
      $("#lista").innerHTML = erroHTML(e.message); $('[data-acao="tentar"]').onclick = () => recarregarLista(true);
    } else if (forcar) toast(e.message, true);
  } finally {
    if (botao && botao.isConnected) botao.innerHTML = ic("atualizar");
  }
}
function desenharLista() {
  const alvo = $("#lista"), chips = $("#chips-filtro");
  if (!alvo) return;
  const h = hoje();
  let lista;
  if (E.modo === "abertas") {
    if (!E.abertas) return;
    const base = E.abertas.filter(daLoja).filter(filtroBusca);
    const cont = { todas: base.length };
    base.forEach((o) => { const g = classificar(o, h); cont[g] = (cont[g] || 0) + 1; });
    chips.hidden = false;
    chips.innerHTML = FILTROS.map(([k, rot]) => `<button class="chip${E.filtro === k ? " ativo" : ""}" data-f="${k}">${rot}<span class="n">${cont[k] || 0}</span></button>`).join("");
    $$(".chip", chips).forEach((b) => b.addEventListener("click", () => { E.filtro = b.dataset.f; E.limite = 60; desenharLista(); }));
    lista = E.filtro === "todas" ? base : base.filter((o) => classificar(o, h) === E.filtro);
  } else {
    if (!E.todas) return;
    chips.hidden = true;
    lista = E.todas.filter(daLoja).filter(filtroBusca);
  }
  if (!lista.length) {
    alvo.innerHTML = `<div class="card vazio">${E.busca ? "Nenhuma OS encontrada." : E.modo === "abertas" && E.filtro !== "todas" ? "Nenhuma OS neste filtro." : "Nenhuma OS por aqui."}</div>`;
    return;
  }
  alvo.innerHTML = lista.slice(0, E.limite).map(itemOS).join("") +
    (lista.length > E.limite ? `<button class="btn contorno bloco" id="ver-mais">Mostrar mais (${lista.length - E.limite})</button>` : "");
  const vm = $("#ver-mais");
  if (vm) vm.addEventListener("click", () => { E.limite += 60; desenharLista(); });
}

/* ------------------------------------------------------------ DETALHE DA OS */
function acharOS(id) {
  return E.detalhes[id] || (E.abertas || []).find((o) => o.id === id) || (E.todas || []).find((o) => o.id === id) || null;
}
async function vDetalhe(id) {
  const voltar = `<button class="btn-icone" data-acao="voltar" aria-label="Voltar">${ic("voltar")}</button>`;
  moldura("os", voltar + topoPadrao(`OS #${id}`, ""), carregandoHTML);
  $('[data-acao="voltar"]').addEventListener("click", () => (history.length > 1 ? history.back() : (location.hash = "#/os")));
  const naMao = acharOS(id);
  if (naMao) desenharDetalhe(naMao);
  try {
    const r = await buscarOS(`id=eq.${id}&limit=1`);
    if (!r || !r.length) { $("#conteudo").innerHTML = `<div class="card vazio">OS #${id} não encontrada (ou é de outra loja).</div>`; return; }
    atualizarNoCache(r[0]);
    if (rotaAtual() === "detalhe" && rotaId() === id) desenharDetalhe(E.detalhes[id]);
  } catch (e) {
    if (!naMao) { $("#conteudo").innerHTML = erroHTML(e.message); $('[data-acao="tentar"]').onclick = () => vDetalhe(id); }
  }
}
function desenharDetalhe(o) {
  const alvo = $("#conteudo");
  if (!alvo) return;
  const h = hoje();
  const [txt, cls] = situacao(o, h);
  const aberta = STATUS_ABERTOS.includes(o.status);
  const st = o.status;
  const passo = st === "Entregue" || st === "Concluído" ? 4 : st === STATUS_PRONTO ? 3 : ["Em Andamento", "Aguardando Peça", "Em Terceiro"].includes(st) ? 2 : 1;
  const prev = o.prazo_data ? String(o.prazo_data).slice(0, 10) : null;
  const corPrev = !aberta || st === STATUS_PRONTO ? "" : prev && prev < h ? "vermelho" : prev === h ? "amarelo" : "";
  const itens = itensServico(o);
  const tel = telefoneWhats(o.cliente_telefone);
  const link = linkAcompanhamento(o);
  const sub = $(".topo small") || null;
  if (!sub) { const t = $(".topo .titulo"); if (t) t.insertAdjacentHTML("beforeend", `<small>${esc(o.loja_nome || "")}</small>`); }
  else sub.textContent = o.loja_nome || "";

  let caixas = `<div class="caixa"><small>Orçamento</small><b>${brl(o.valor_estimado)}</b></div>
    <div class="caixa"><small>Previsão</small><b class="${corPrev}">${prev ? dataBR(prev) : "Sem prazo"}</b></div>
    <div class="caixa"><small>Entrada</small><b>${dataBR(dataLocal(o.created_at)) || "-"}</b></div>`;
  if (st === STATUS_PRONTO && o.pronto_em) caixas += `<div class="caixa"><small>Pronto desde</small><b class="verde">${dataBR(dataLocal(o.pronto_em))}</b></div>`;
  else if (o.entregue_em) caixas += `<div class="caixa"><small>Entregue em</small><b>${dataBR(dataLocal(o.entregue_em))}</b></div>`;
  else caixas += `<div class="caixa"><small>Assinatura</small><b>${o.assinatura_entrada_em ? "Sim" : "Não"}</b></div>`;
  if (o.senha_aparelho) caixas += `<div class="caixa larga senha"><div><small>Senha / padrão</small><b id="senha-txt">••••••</b></div>
    <button class="btn fantasma peq" id="ver-senha">${ic("olho")} Ver</button></div>`;
  if (o.imei) caixas += `<div class="caixa larga"><small>IMEI / nº de série</small><b>${esc(o.imei)}</b></div>`;

  const botaoSt = (valor, rot, icone) => `<button class="st-btn${st === valor ? " atual" : ""}" data-st="${esc(valor)}">${ic(icone)}${rot}</button>`;
  const statusHTML = aberta ? `<section class="card"><h2>Mudar status</h2>
      ${st === "Em Terceiro" ? `<p class="declaracao">Está com o terceiro. Ao marcar como pronto, sai da lista de terceirizados.</p>` : ""}
      <div class="status-grade">
        ${botaoSt("Em Aberto", "Na fila", "relogio")}${botaoSt("Em Andamento", "Em andamento", "ferramenta")}
        ${botaoSt("Aguardando Peça", "Aguardando peça", "pacote")}
        ${st === "Em Terceiro" ? botaoSt("Em Terceiro", "Em terceiro", "externo") : `<button class="st-btn" data-acao="whats">${WHATS_SVG}Mensagem</button>`}
        <button class="st-btn pronto${st === STATUS_PRONTO ? " atual" : ""}" data-st="${STATUS_PRONTO}">${ic("ok")}${st === STATUS_PRONTO ? "Pronto para retirada" : "Marcar como pronto"}</button>
      </div>
      <p class="aviso-pc">Entregar, receber e imprimir: no computador.</p></section>` : "";

  alvo.innerHTML = `
    <section class="card">
      <div class="det-topo"><b>#${o.id}</b><span class="selo ${cls}">${esc(txt)}</span></div>
      <p class="det-ap">${esc(o.aparelho_modelo || "-")}</p>
      <p class="det-cli">${esc(o.cliente_nome || "-")}${o.cliente_telefone ? ` • ${esc(o.cliente_telefone)}` : ""}</p>
      ${st === "Cancelado" ? "" : `<ol class="passos">${["Recebido", "Em reparo", "Pronto", "Entregue"].map((p, i) =>
        `<li class="${i + 1 <= passo ? "feito" : ""}${i + 1 === passo ? " atual" + (passo === 3 ? " ok" : "") : ""}">${p}</li>`).join("")}</ol>`}
    </section>
    ${statusHTML}
    <section class="card"><div class="acoes">
      <button class="btn whats" data-acao="whats" ${tel ? "" : "disabled"}>${WHATS_SVG}WhatsApp</button>
      <a class="btn contorno" ${o.cliente_telefone ? `href="tel:${esc(digitos(o.cliente_telefone))}"` : "aria-disabled=\"true\" style=\"opacity:.5\""}>${ic("telefone")}Ligar</a>
      <button class="btn contorno" data-acao="copiar" ${link ? "" : "disabled"}>${ic("link")}Copiar link</button>
      <a class="btn contorno" ${link ? `href="${esc(link)}" target="_blank" rel="noopener"` : "aria-disabled=\"true\" style=\"opacity:.5\""}>${ic("externo")}Ver como cliente</a>
    </div>${tel ? "" : '<p class="aviso-pc">Sem celular válido nesta OS para o WhatsApp.</p>'}</section>
    <section class="card"><div class="caixas">${caixas}</div></section>
    <section class="card"><h2>Serviços</h2><ul class="servicos">${itens.length ? itens.map((i) =>
      `<li><span>${esc(i.desc)}</span><span>${i.valor !== null ? brl(i.valor) : ""}</span></li>`).join("") : "<li><span>-</span><span></span></li>"}</ul></section>
    ${o.observacoes ? `<section class="card"><h2>Acessórios / observações</h2><p class="texto-livre">${esc(o.observacoes)}</p></section>` : ""}
    ${o.peca_nao_original ? `<section class="card"><h2>Peça</h2><p class="texto-livre" style="color:var(--amarelo)">Cliente autorizou peça não original (compatível).</p></section>` : ""}`;

  const vs = $("#ver-senha");
  if (vs) vs.addEventListener("click", () => {
    const t = $("#senha-txt"); const mostrando = t.textContent !== "••••••";
    t.textContent = mostrando ? "••••••" : o.senha_aparelho; vs.innerHTML = `${ic("olho")} ${mostrando ? "Ver" : "Esconder"}`;
  });
  $$("[data-st]", alvo).forEach((b) => b.addEventListener("click", () => mudarStatus(o, b.dataset.st, b)));
  $$('[data-acao="whats"]', alvo).forEach((b) => b.addEventListener("click", () => folhaWhats(o)));
  const cp = $('[data-acao="copiar"]', alvo);
  if (cp) cp.addEventListener("click", () => copiar(link, `Link da OS #${o.id} copiado!`));
}
async function copiar(texto, msg) {
  try { await navigator.clipboard.writeText(texto); toast(msg); }
  catch (e) {
    const t = document.createElement("textarea"); t.value = texto; document.body.appendChild(t); t.select();
    try { document.execCommand("copy"); toast(msg); } catch (e2) { toast("Não foi possível copiar.", true); }
    t.remove();
  }
}
async function mudarStatus(o, novo, botao) {
  if (novo === o.status || novo === "Em Terceiro") return;
  const dados = { status: novo };
  if (novo === STATUS_PRONTO) dados.pronto_em = new Date().toISOString();
  const botoes = $$("[data-st]");
  botoes.forEach((b) => { b.disabled = true; });
  const original = botao.innerHTML;
  botao.innerHTML = '<div class="roda peq"></div>';
  try {
    const r = await rest(`ordens_servico?id=eq.${o.id}`, { metodo: "PATCH", corpo: dados, prefer: "return=representation" });
    if (!r || !r.length) throw new ErroApp("Sem permissão para alterar esta OS.");
    const anterior = o.status;
    const nova = { ...o, ...r[0] };
    if (anterior === "Em Terceiro" && novo === STATUS_PRONTO) {
      rest(`terceirizados?os_id=eq.${o.id}&status=eq.${enc("Em Terceiro")}`, { metodo: "PATCH", corpo: { status: "Concluído" } }).catch(() => {});
    }
    atualizarNoCache(nova);
    desenharDetalhe(E.detalhes[o.id]);
    const tel = telefoneWhats(nova.cliente_telefone);
    if (novo === STATUS_PRONTO) {
      toast(`OS #${o.id} pronta!`);
      if (tel) enviarWhatsDireto(nova, "Pronto para retirada");
    } else if (novo === "Aguardando Peça" && tel) {
      abrirFolha(`<h3>Status: aguardando peça</h3><p class="sub">Quer avisar o cliente no WhatsApp?</p>
        <div class="botoes-folha"><button class="btn whats bloco" id="f-sim">${WHATS_SVG}Avisar o cliente</button>
        <button class="btn contorno bloco" id="f-nao">Agora não</button></div>`, (f) => {
        $("#f-sim", f).onclick = () => { fecharFolha(); enviarWhatsDireto(nova, "Aguardando peça"); };
        $("#f-nao", f).onclick = fecharFolha;
      });
    } else toast(`OS #${o.id}: ${novo.toLowerCase()}`);
  } catch (e) {
    toast(e.message || "Erro ao mudar o status.", true);
    botoes.forEach((b) => { b.disabled = false; });
    botao.innerHTML = original;
  }
}
function enviarWhatsDireto(o, modelo) {
  const tel = telefoneWhats(o.cliente_telefone);
  const texto = mensagensWhats(o, true)[modelo];
  const url = urlWhats(tel, texto);
  const janela = window.open(url, "_blank");   // (com "noopener" o navegador sempre devolve null)
  if (janela) { try { janela.opener = null; } catch (e) { /* ok */ } }
  else {   // o navegador segurou a janela: um toque a mais
    abrirFolha(`<h3>Mensagem pronta</h3><p class="sub">${esc(o.cliente_nome || "")} • ${esc(o.cliente_telefone || "")}</p>
      <div class="botoes-folha"><a class="btn whats bloco" href="${esc(url)}" target="_blank" rel="noopener" id="f-ir">${WHATS_SVG}Abrir WhatsApp</a>
      <button class="btn contorno bloco" id="f-fechar">Fechar</button></div>`, (f) => {
      $("#f-ir", f).addEventListener("click", () => setTimeout(fecharFolha, 300));
      $("#f-fechar", f).onclick = fecharFolha;
    });
  }
}
function folhaWhats(o) {
  const tel = o.cliente_telefone || "";
  const temLink = !!linkAcompanhamento(o);
  const sugestao = o.status === STATUS_PRONTO ? "Pronto para retirada" : o.status === "Aguardando Peça" ? "Aguardando peça"
    : o.status === "Entregue" ? "Aparelho entregue" : "Ainda no prazo";
  let atual = sugestao;
  abrirFolha(`<h3>Mensagem para o cliente</h3><p class="sub">${esc(o.cliente_nome || "-")}</p>
    <div class="modelos">${Object.keys(mensagensWhats(o, false)).map((k) => `<button class="chip${k === atual ? " ativo" : ""}" data-m="${esc(k)}">${esc(k)}</button>`).join("")}</div>
    <textarea class="campo" id="w-texto" rows="8"></textarea>
    ${temLink ? `<label class="check"><input type="checkbox" id="w-link" checked><div><b>Link de acompanhamento</b><small>O cliente acompanha a OS pelo celular</small></div></label>` : ""}
    <label class="rot" for="w-tel">Celular (com DDD)</label><input class="campo" id="w-tel" type="tel" inputmode="tel" value="${esc(tel)}">
    <div class="botoes-folha"><button class="btn whats bloco" id="w-enviar">${WHATS_SVG}Abrir WhatsApp</button>
    <button class="btn contorno bloco" id="w-fechar">Fechar</button></div>`, (f) => {
    const preencher = () => { $("#w-texto", f).value = mensagensWhats(o, !$("#w-link", f) || $("#w-link", f).checked)[atual]; };
    preencher();
    $$("[data-m]", f).forEach((b) => b.addEventListener("click", () => {
      atual = b.dataset.m; $$("[data-m]", f).forEach((x) => x.classList.toggle("ativo", x === b)); preencher();
    }));
    if ($("#w-link", f)) $("#w-link", f).addEventListener("change", preencher);
    $("#w-tel", f).addEventListener("input", (ev) => { ev.target.value = mascaraTelefone(ev.target.value); });
    $("#w-fechar", f).onclick = fecharFolha;
    $("#w-enviar", f).onclick = () => {
      const numero = telefoneWhats($("#w-tel", f).value);
      if (!numero) { toast("Celular inválido. Use DDD + número.", true); return; }
      const j = window.open(urlWhats(numero, $("#w-texto", f).value), "_blank");
      if (j) { try { j.opener = null; } catch (e) { /* ok */ } } else location.href = urlWhats(numero, $("#w-texto", f).value);
      fecharFolha();
    };
  });
}

/* ------------------------------------------------------------ NOVA OS */
function rascunhoVazio() {
  return { loja: E.dono ? (E.info.loja_nome || (E.lojas[0] && E.lojas[0].nome) || "") : (E.info.loja_nome || ""),
           telefone: "", nome: "", cpf: "", endereco: "", aparelho: "", imei: "", senha: "", obs: "", servicos: [], prazo: null,
           pecaParalela: false, assinar: opcao("assinatura", "sempre") === "sempre" };
}
function vNova() {
  if (!E.rascunho) E.rascunho = rascunhoVazio();
  const R = E.rascunho;
  const modoAssin = opcao("assinatura", "sempre");
  const lojaCampo = E.dono && E.lojas.length > 1
    ? `<select class="campo" id="n-loja">${E.lojas.map((l) => `<option${l.nome === R.loja ? " selected" : ""}>${esc(l.nome)}</option>`).join("")}</select>`
    : `<input class="campo" id="n-loja" value="${esc(R.loja)}" ${E.dono ? "" : "readonly"}>`;
  moldura("nova", topoPadrao("Nova OS", R.loja || nomeEmpresa(), `<button class="btn fantasma peq" data-acao="limpar">Limpar</button>`), `
    <section class="card"><h2>Cliente</h2>
      <label class="rot" for="n-tel">Telefone / WhatsApp</label><input class="campo" id="n-tel" type="tel" inputmode="tel" placeholder="(00) 00000-0000" value="${esc(R.telefone)}">
      <div class="cli-achado" id="n-achado"></div>
      <label class="rot" for="n-nome">Nome completo *</label><input class="campo" id="n-nome" placeholder="Ex: João da Silva" value="${esc(R.nome)}" autocapitalize="words">
    </section>
    <section class="card"><h2>Aparelho</h2>
      <label class="rot" for="n-ap">Modelo *</label><input class="campo" id="n-ap" placeholder="Ex: iPhone 11 64GB preto" value="${esc(R.aparelho)}">
      <div class="linha2"><div><label class="rot" for="n-imei">IMEI / série</label><input class="campo" id="n-imei" inputmode="numeric" placeholder="Opcional" value="${esc(R.imei)}"></div>
      <div><label class="rot" for="n-senha">Senha / padrão</label><input class="campo" id="n-senha" placeholder="Opcional" value="${esc(R.senha)}"></div></div>
      <label class="rot" for="n-obs">Acessórios / observações</label><input class="campo" id="n-obs" placeholder="Ex: Deixou com capinha e chip" value="${esc(R.obs)}">
      <label class="rot" for="n-loja">Loja</label>${lojaCampo}
    </section>
    <section class="card"><h2>Serviços *</h2>
      <div class="serv-add"><input class="campo" id="n-sdesc" placeholder="Ex: Troca de tela"><input class="campo" id="n-sval" inputmode="decimal" placeholder="R$ 0,00">
      <button class="btn" id="n-sadd" aria-label="Adicionar serviço">${ic("mais")}</button></div>
      <div class="serv-lista" id="n-slista"></div>
      <div class="total"><span>Orçamento</span><b id="n-total">R$ 0,00</b></div>
    </section>
    <section class="card"><h2>Prazo de entrega</h2>
      <div class="prazos" id="n-prazos">${[[null, "Sem prazo"], [0, "Hoje"], [1, "1 dia"], [2, "2 dias"], [3, "3 dias"], [5, "5 dias"], [7, "7 dias"]].map(([v, r]) =>
        `<button class="chip${R.prazo === v ? " ativo" : ""}" data-p="${v === null ? "" : v}">${r}</button>`).join("")}</div>
      <p class="declaracao" id="n-prev" style="margin:10px 2px 0"></p>
      <label class="check"><input type="checkbox" id="n-peca" ${R.pecaParalela ? "checked" : ""}><div><b>Peça não original</b><small>Paralela/compatível: o cliente autoriza</small></div></label>
      ${modoAssin === "marcar" ? `<label class="check"><input type="checkbox" id="n-assinar" ${R.assinar ? "checked" : ""}><div><b>Colher assinatura</b><small>O cliente assina com o dedo na tela</small></div></label>` : ""}
    </section>
    <section class="card" id="n-assin-card" ${modoAssin === "nunca" || (modoAssin === "marcar" && !R.assinar) ? "hidden" : ""}><h2>Assinatura do cliente</h2>
      <p class="declaracao" id="n-decl"></p>
      <div class="assin-wrap"><canvas id="n-canvas"></canvas><div class="linha"></div><div class="dica" id="n-dica">Assine aqui com o dedo</div></div>
      <div style="display:flex;justify-content:space-between;margin-top:8px"><button class="btn fantasma peq" id="n-assin-limpar">Limpar assinatura</button>
      <small style="color:var(--fraco);align-self:center">Pode deixar em branco para pular</small></div>
    </section>
    <button class="btn verde bloco" id="n-salvar" style="min-height:56px;font-size:17px">${ic("ok")}Criar OS</button>`);

  // ---- liga os campos ao rascunho ----
  const liga = (id, chave, formatar) => {
    const el = $(id);
    el.addEventListener("input", () => { if (formatar) el.value = formatar(el.value); R[chave] = el.value; });
  };
  liga("#n-tel", "telefone", mascaraTelefone); liga("#n-nome", "nome"); liga("#n-ap", "aparelho"); liga("#n-imei", "imei");
  liga("#n-senha", "senha"); liga("#n-obs", "obs");
  const loja = $("#n-loja");
  loja.addEventListener(loja.tagName === "SELECT" ? "change" : "input", () => { R.loja = loja.value; });
  ["#n-nome", "#n-ap"].forEach((id) => $(id).addEventListener("blur", (ev) => { ev.target.value = padronizar(ev.target.value); R[id === "#n-nome" ? "nome" : "aparelho"] = ev.target.value; }));
  $("#n-obs").addEventListener("blur", (ev) => { ev.target.value = padronizar(ev.target.value, true); R.obs = ev.target.value; });
  $("#n-tel").addEventListener("input", () => buscarCliente(R));
  $('[data-acao="limpar"]').addEventListener("click", () => { E.rascunho = rascunhoVazio(); vNova(); });

  // ---- serviços ----
  const desenharServicos = () => {
    $("#n-slista").innerHTML = R.servicos.map((s, i) => `<div class="item"><span>${esc(s.descricao)}</span><b>${brl(s.valor)}</b>
      <button data-rem="${i}" aria-label="Remover">${ic("lixo")}</button></div>`).join("");
    $("#n-total").textContent = brl(R.servicos.reduce((t, s) => t + s.valor, 0));
    $$("[data-rem]").forEach((b) => b.addEventListener("click", () => { R.servicos.splice(Number(b.dataset.rem), 1); desenharServicos(); atualizarDeclaracao(); }));
  };
  const adicionar = () => {
    const desc = padronizar($("#n-sdesc").value);
    const bruto = $("#n-sval").value.replace(/[R$\s]/g, "");
    const valor = bruto ? parseFloat(bruto.includes(",") ? bruto.replace(/\./g, "").replace(",", ".") : bruto) : 0;
    if (!desc) { toast("Digite o serviço ou defeito.", true); $("#n-sdesc").focus(); return; }
    if (isNaN(valor) || valor < 0) { toast("Valor inválido. Ex: 150 ou 150,00", true); return; }
    R.servicos.push({ descricao: desc, valor: Math.round(valor * 100) / 100 });
    $("#n-sdesc").value = ""; $("#n-sval").value = "";
    desenharServicos(); $("#n-sdesc").focus();
  };
  $("#n-sadd").addEventListener("click", adicionar);
  $("#n-sval").addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); adicionar(); } });
  $("#n-sdesc").addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); $("#n-sval").focus(); } });
  desenharServicos();

  // ---- prazo, peça, assinatura ----
  const atualizarDeclaracao = () => {
    let d = DECLARACAO_ENTRADA;
    if (R.pecaParalela) d = d.replace(/\.$/, "") + " e autorizo o uso de peça não original (compatível) no conserto.";
    if (R.prazo !== null) d += ` Prazo combinado: até ${R.prazo} dia(s) úteis (previsão ${dataBR(somarDiasUteis(hoje(), R.prazo))}).`;
    $("#n-decl").textContent = d;
    $("#n-prev").textContent = R.prazo === null ? "" : `Previsão: ${dataComSemana(somarDiasUteis(hoje(), R.prazo))}`;
    return d;
  };
  $$("#n-prazos .chip").forEach((b) => b.addEventListener("click", () => {
    R.prazo = b.dataset.p === "" ? null : Number(b.dataset.p);
    $$("#n-prazos .chip").forEach((x) => x.classList.toggle("ativo", x === b)); atualizarDeclaracao();
  }));
  $("#n-peca").addEventListener("change", (ev) => { R.pecaParalela = ev.target.checked; atualizarDeclaracao(); });
  const chkAssinar = $("#n-assinar");
  const quadro = criarQuadroAssinatura($("#n-canvas"), () => { $("#n-dica").hidden = true; });
  if (chkAssinar) chkAssinar.addEventListener("change", (ev) => { R.assinar = ev.target.checked; $("#n-assin-card").hidden = !R.assinar; if (R.assinar) quadro.ajustar(); });
  $("#n-assin-limpar").addEventListener("click", () => { quadro.limpar(); $("#n-dica").hidden = false; });
  atualizarDeclaracao();
  if (R.telefone) buscarCliente(R);

  $("#n-salvar").addEventListener("click", () => salvarOS(R, quadro, atualizarDeclaracao, modoAssin));
}
let timerCliente = null;
function buscarCliente(R) {
  clearTimeout(timerCliente);
  const dig = digitosTelefone(R.telefone);
  const alvo = $("#n-achado");
  if (dig.length < 10) { if (alvo) alvo.textContent = ""; return; }
  timerCliente = setTimeout(async () => {
    try {
      const r = await rest(`clientes?select=nome,cpf,endereco,ultima_visita&telefone_digitos=eq.${dig}&limit=1`);
      const c = r && r[0];
      if (!c || !$("#n-achado")) return;
      $("#n-achado").innerHTML = `${ic("ok", "width:16px;height:16px;vertical-align:-3px")} Cliente já cadastrado: <b>${esc(c.nome)}</b>`;
      if (!R.nome) { R.nome = c.nome; $("#n-nome").value = c.nome; }
      R.cpf = c.cpf || ""; R.endereco = c.endereco || "";
    } catch (e) { /* sem cadastro de clientes: segue normal */ }
  }, 350);
}
function criarQuadroAssinatura(canvas, aoDesenhar) {
  const ctx = canvas.getContext("2d");
  let tracos = [], atual = null;
  const desenharTudo = () => {
    const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    ctx.strokeStyle = "#0F172A"; ctx.fillStyle = "#0F172A"; ctx.lineWidth = 2.6; ctx.lineCap = "round"; ctx.lineJoin = "round";
    for (const t of tracos) {
      if (t.length === 1) { ctx.beginPath(); ctx.arc(t[0][0], t[0][1], 1.4, 0, Math.PI * 2); ctx.fill(); continue; }
      ctx.beginPath(); ctx.moveTo(t[0][0], t[0][1]);
      for (let i = 1; i < t.length; i++) ctx.lineTo(t[i][0], t[i][1]);
      ctx.stroke();
    }
  };
  const ajustar = () => {
    const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    if (!r.width) return;
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    desenharTudo();
  };
  const ponto = (ev) => { const r = canvas.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
  canvas.addEventListener("pointerdown", (ev) => { ev.preventDefault(); canvas.setPointerCapture(ev.pointerId); atual = [ponto(ev)]; tracos.push(atual); desenharTudo(); aoDesenhar(); });
  canvas.addEventListener("pointermove", (ev) => { if (!atual) return; ev.preventDefault(); atual.push(ponto(ev)); desenharTudo(); });
  const fim = () => { atual = null; };
  canvas.addEventListener("pointerup", fim); canvas.addEventListener("pointercancel", fim);
  window.addEventListener("resize", ajustar);
  setTimeout(ajustar, 0);
  return {
    ajustar,
    limpar: () => { tracos = []; desenharTudo(); },
    vazio: () => !tracos.some((t) => t.length > 0),
    png: () => {   // recorta a área assinada, fundo branco, até 600x200 (igual ao computador)
      const pts = tracos.flat();
      if (!pts.length) return null;
      const m = 12, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      const x0 = Math.max(0, Math.min(...xs) - m), y0 = Math.max(0, Math.min(...ys) - m);
      const x1 = Math.max(...xs) + m, y1 = Math.max(...ys) + m;
      const w = x1 - x0, h = y1 - y0, esc2 = Math.min(3, 600 / w, 200 / h);
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w * esc2)); c.height = Math.max(1, Math.round(h * esc2));
      const k = c.getContext("2d");
      k.fillStyle = "#fff"; k.fillRect(0, 0, c.width, c.height);
      k.setTransform(esc2, 0, 0, esc2, -x0 * esc2, -y0 * esc2);
      k.strokeStyle = "#0F172A"; k.fillStyle = "#0F172A"; k.lineWidth = 3; k.lineCap = "round"; k.lineJoin = "round";
      for (const t of tracos) {
        if (t.length === 1) { k.beginPath(); k.arc(t[0][0], t[0][1], 1.6, 0, Math.PI * 2); k.fill(); continue; }
        k.beginPath(); k.moveTo(t[0][0], t[0][1]); for (let i = 1; i < t.length; i++) k.lineTo(t[i][0], t[i][1]); k.stroke();
      }
      return c.toDataURL("image/png").split(",")[1];
    },
  };
}
async function salvarOS(R, pad, declaracao, modoAssin) {
  R.nome = padronizar($("#n-nome").value); R.aparelho = padronizar($("#n-ap").value);
  if (!R.nome || !R.aparelho || !R.servicos.length) { toast("Preencha nome do cliente, aparelho e pelo menos 1 serviço.", true); return; }
  if (!R.loja) { toast("Escolha a loja.", true); return; }
  const botao = $("#n-salvar");
  botao.disabled = true; botao.innerHTML = '<div class="roda peq"></div> Salvando...';
  const total = R.servicos.reduce((t, s) => t + s.valor, 0);
  const dados = {
    loja_nome: R.loja, cliente_nome: R.nome, cliente_cpf: R.cpf || "", cliente_telefone: R.telefone.trim(), cliente_endereco: R.endereco || "",
    aparelho_modelo: R.aparelho, defeito_relatado: R.servicos.map((s) => `${s.descricao} (R$ ${s.valor.toFixed(2)})`).join(" | "),
    observacoes: padronizar(R.obs, true), valor_estimado: Math.round(total * 100) / 100, status: "Em Aberto",
    user_id: sessao && sessao.user && sessao.user.id, imei: R.imei.trim(), senha_aparelho: R.senha.trim(),
    incluir_termos: !!opcao("garantia_no_pdf", false), peca_nao_original: !!R.pecaParalela,
  };
  if (R.prazo !== null) { dados.prazo_dias = R.prazo; dados.prazo_data = somarDiasUteis(hoje(), R.prazo); }
  const vaiAssinar = modoAssin === "sempre" || (modoAssin === "marcar" && R.assinar);
  if (vaiAssinar && !pad.vazio()) {
    dados.assinatura_entrada = pad.png();
    dados.assinatura_entrada_em = new Date().toISOString();
    dados.assinatura_entrada_nome = R.nome;
    dados.assinatura_colhida_por = (E.info && E.info.nome) || String((sessao.user && sessao.user.email) || "").split("@")[0];
  }
  try {
    const r = await rest("ordens_servico", { metodo: "POST", corpo: dados, prefer: "return=representation" });
    const os = r && r[0];
    if (!os) throw new ErroApp("A OS não voltou do banco.");
    if (digitosTelefone(os.cliente_telefone).length >= 10) {
      rpc("registrar_cliente", { p_nome: os.cliente_nome || "", p_telefone: os.cliente_telefone || "", p_cpf: os.cliente_cpf || null, p_endereco: os.cliente_endereco || null }).catch(() => {});
    }
    delete os.assinatura_entrada;
    atualizarNoCache(os);
    E.rascunho = null;
    telaSucesso(os, vaiAssinar && !dados.assinatura_entrada);
  } catch (e) {
    toast(e.message || "Erro ao salvar a OS.", true);
    botao.disabled = false; botao.innerHTML = `${ic("ok")}Criar OS`;
  }
}
function telaSucesso(os, semAssinatura) {
  const tel = telefoneWhats(os.cliente_telefone);
  const link = linkAcompanhamento(os);
  moldura("nova", topoPadrao("OS criada", os.loja_nome || ""), `
    <section class="card sucesso"><div class="ok">${ic("ok")}</div><h2>OS #${os.id} criada!</h2>
      <p class="data" style="margin:0">${esc(os.aparelho_modelo)} • ${esc(os.cliente_nome)} • ${brl(os.valor_estimado)}</p>
      ${semAssinatura ? '<p class="aviso-pc" style="color:var(--amarelo)">Sem assinatura do cliente nesta OS.</p>' : ""}</section>
    <div class="botoes-folha">
      <button class="btn whats bloco" id="s-whats" ${tel ? "" : "disabled"}>${WHATS_SVG}Avisar o cliente (aparelho recebido)</button>
      ${link ? `<button class="btn contorno bloco" id="s-link">${ic("link")}Copiar link de acompanhamento</button>` : ""}
      <a class="btn contorno bloco" href="#/os/${os.id}">${ic("lista")}Ver a OS</a>
      <a class="btn bloco" href="#/nova">${ic("mais")}Nova OS</a>
    </div>
    <p class="aviso-pc" style="margin-top:14px">O PDF para imprimir sai pelo computador (Histórico de OS).</p>`);
  if (tel) $("#s-whats").addEventListener("click", () => enviarWhatsDireto(os, "Aparelho recebido"));
  if (link) $("#s-link").addEventListener("click", () => copiar(link, "Link copiado!"));
}

/* ------------------------------------------------------------ CONTA */
let pedidoInstalar = null;
window.addEventListener("beforeinstallprompt", (ev) => { ev.preventDefault(); pedidoInstalar = ev; if (rotaAtual() === "conta") vConta(); });
const instalado = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
function vConta() {
  const i = E.info;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let instalar = "";
  if (!instalado()) {
    instalar = `<section class="card instalar"><h2 style="color:#fff">Instalar no celular</h2>
      ${pedidoInstalar ? `<p class="declaracao" style="color:#D6E2FF">Coloque o CellGestor na tela inicial e abra como um app.</p>
        <button class="btn bloco" id="c-instalar">${ic("baixar")}Instalar app</button>`
      : ios ? `<p class="declaracao" style="color:#D6E2FF;margin:0">No Safari, toque em <b>Compartilhar</b> (o quadrado com a seta) e depois em <b>Adicionar à Tela de Início</b>.</p>`
      : `<p class="declaracao" style="color:#D6E2FF;margin:0">No Chrome, toque nos <b>3 pontinhos</b> e depois em <b>Instalar app</b> (ou "Adicionar à tela inicial").</p>`}</section>`;
  }
  moldura("conta", topoPadrao("Conta", nomeEmpresa()), `${instalar}
    <section class="card">
      <div class="conta-linha"><span>Nome</span><b>${esc(i.nome || "-")}</b></div>
      <div class="conta-linha"><span>Acesso</span><b>${E.dono ? "Dono" : "Funcionário"}</b></div>
      <div class="conta-linha"><span>Empresa</span><b>${esc(nomeEmpresa() || "-")}</b></div>
      ${i.loja_nome ? `<div class="conta-linha"><span>Loja</span><b>${esc(i.loja_nome)}</b></div>` : ""}
      ${i.valido_ate ? `<div class="conta-linha"><span>Assinatura até</span><b>${dataBR(i.valido_ate)}</b></div>` : ""}
    </section>
    <div class="botoes-folha">
      <button class="btn contorno bloco" id="c-atualizar">${ic("atualizar")}Atualizar dados</button>
      <button class="btn perigo bloco" id="c-sair">${ic("sair")}Sair</button>
    </div>
    <p class="aviso-pc" style="margin-top:16px">CellGestor no celular • versão ${VERSAO_APP}</p>`);
  const bi = $("#c-instalar");
  if (bi) bi.addEventListener("click", async () => { pedidoInstalar.prompt(); await pedidoInstalar.userChoice.catch(() => null); pedidoInstalar = null; vConta(); });
  $("#c-atualizar").addEventListener("click", async () => {
    try { await carregarConta(); E.abertasEm = 0; E.vendasEm = 0; toast("Dados atualizados."); vConta(); }
    catch (e) { toast(e.message, true); }
  });
  $("#c-sair").addEventListener("click", sair);
}
async function sair() {
  const t = sessao && sessao.access_token;
  encerrarSessaoLocal();
  if (t) chamarAuth("logout", {}, t).catch(() => {});
  telaLogin();
}

/* ------------------------------------------------------------ LOGIN */
function telaLogin(mensagem) {
  fecharFolha();
  $("#app").innerHTML = `<div class="tela-cheia"><form class="login" id="f-login" autocomplete="on">
    <img class="logo" src="icones/icone-192.png" alt="">
    <h1>CellGestor</h1><p class="sub">Entre com o mesmo usuário do computador</p>
    ${mensagem ? `<div class="erro-login">${esc(mensagem)}</div>` : ""}
    <div class="erro-login" id="l-erro" hidden></div>
    <label class="rot" for="l-usuario">Usuário</label>
    <input class="campo" id="l-usuario" name="username" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" value="${esc(ler("cg_usuario") || "")}" required>
    <label class="rot" for="l-senha">Senha</label>
    <input class="campo" id="l-senha" name="password" type="password" autocomplete="current-password" required>
    <button class="btn bloco" id="l-entrar" style="margin-top:20px">Entrar</button>
  </form></div>`;
  $("#f-login").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const usuario = $("#l-usuario").value.trim().toLowerCase();
    const senha = $("#l-senha").value;
    const erro = $("#l-erro"), botao = $("#l-entrar");
    if (!usuario || !senha) return;
    erro.hidden = true;
    botao.disabled = true; botao.textContent = "Entrando...";
    const email = usuario.includes("@") ? usuario : `${usuario.replace(/\s+/g, "")}@sistema.local`;
    try {
      guardarSessao(await chamarAuth("token?grant_type=password", { email, password: senha }));
      guardar("cg_usuario", usuario);
      await carregarConta();
      if (!location.hash || location.hash === "#/") location.hash = "#/inicio";
      rota();
    } catch (e) {
      if (e.bloqueio) encerrarSessaoLocal();
      else if (!e.rede && sessao && !E.info) encerrarSessaoLocal();
      erro.textContent = e.status === 400 ? "Usuário ou senha incorretos." : e.message;
      erro.hidden = false;
      botao.disabled = false; botao.textContent = "Entrar";
    }
  });
}

/* ------------------------------------------------------------ rotas */
function rotaAtual() {
  const h = location.hash || "#/inicio";
  if (/^#\/os\/\d+/.test(h)) return "detalhe";
  return (h.match(/^#\/(\w+)/) || [, "inicio"])[1];
}
const rotaId = () => Number((location.hash.match(/^#\/os\/(\d+)/) || [])[1]);
function rota() {
  if (!sessao || !E.info) return;
  fecharFolha();
  const r = rotaAtual();
  if (r === "detalhe") return vDetalhe(rotaId());
  if (r === "os") return vListaOS();
  if (r === "nova") return vNova();
  if (r === "conta") return vConta();
  return vInicio();
}

/* ------------------------------------------------------------ atualização automática (a cada 1 min, com a tela aberta) */
setInterval(() => {
  if (document.visibilityState !== "visible" || !sessao || !E.info || !$("#folha").hidden) return;
  const r = rotaAtual();
  const busca = document.activeElement && document.activeElement.id === "busca";
  if (r === "inicio") recarregarPainel(true).catch(() => {});
  else if (r === "os" && E.modo === "abertas" && !busca) recarregarLista(true).catch(() => {});
}, 60000);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && sessao && E.info && Date.now() - E.abertasEm > 60000) {
    const r = rotaAtual();
    if (r === "inicio") recarregarPainel(true).catch(() => {});
    else if (r === "os") recarregarLista(true).catch(() => {});
  }
});

/* ------------------------------------------------------------ início do app */
async function iniciar() {
  $("#folha-fundo").addEventListener("click", fecharFolha);
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  if (!URL_SB || URL_SB.startsWith("COLE_") || !CHAVE || CHAVE.startsWith("COLE_")) {
    $("#app").innerHTML = '<div class="tela-cheia"><div class="card" style="max-width:380px;text-align:center"><h2>App não configurado</h2>' +
      '<p class="data" style="margin:0">Preencha o arquivo config.js com a URL e a chave pública do Supabase.</p></div></div>';
    return;
  }
  window.addEventListener("hashchange", rota);
  if (!sessao) return telaLogin();
  try {
    await carregarConta();
    rota();
  } catch (e) {
    if (e.bloqueio) { encerrarSessaoLocal(); telaLogin(e.message); }
    else if (e.rede) {
      $("#app").innerHTML = `<div class="tela-cheia"><div class="card" style="max-width:380px;text-align:center">
        <p style="margin:0 0 14px">Sem conexão com a internet.</p><button class="btn bloco" id="b-tentar">${ic("atualizar")}Tentar de novo</button></div></div>`;
      $("#b-tentar").onclick = iniciar;
    } else if (!sessao) telaLogin("Sua sessão expirou. Entre de novo.");
    else { encerrarSessaoLocal(); telaLogin(e.message); }
  }
}
iniciar();
