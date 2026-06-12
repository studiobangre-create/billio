/* ============================================================
   Billio — shared accounting data (SYSCOHADA, Système Normal)
   One source of truth: balanced journal entries → ledger → trial balance.
   Single entity · Studio Wend SARL · exercice 2026 · F CFA
   ============================================================ */
(function () {
  "use strict";

  /* ---------- account classes ---------- */
  var CLASSES = {
    1: { name: "Ressources durables", short: "Financement", color: "var(--c1)" },
    2: { name: "Actif immobilisé", short: "Immobilisations", color: "var(--c2)" },
    3: { name: "Stocks", short: "Stocks", color: "var(--c3)" },
    4: { name: "Comptes de tiers", short: "Tiers", color: "var(--c4)" },
    5: { name: "Trésorerie", short: "Trésorerie", color: "var(--c5)" },
    6: { name: "Charges", short: "Charges", color: "var(--c6)" },
    7: { name: "Produits", short: "Produits", color: "var(--c7)" },
    8: { name: "Autres charges et produits (HAO)", short: "HAO", color: "var(--c8)" },
    9: { name: "Engagements & comptabilité analytique", short: "Analytique", color: "var(--c9)" }
  };

  /* ---------- chart of accounts ---------- */
  /* nature: D = débit (actif/charges), C = crédit (passif/produits). Contra-accounts keep their statutory nature. */
  var ACCOUNTS = [
    { num: "101",  label: "Capital social",                                  nature: "C" },
    { num: "106",  label: "Réserves",                                        nature: "C" },
    { num: "110",  label: "Report à nouveau créditeur",                      nature: "C" },
    { num: "162",  label: "Emprunts auprès des établissements de crédit",    nature: "C" },
    { num: "211",  label: "Logiciels et licences",                           nature: "D" },
    { num: "2441", label: "Matériel de bureau",                              nature: "D" },
    { num: "2451", label: "Matériel de transport",                           nature: "D" },
    { num: "281",  label: "Amortissements des immobilisations incorporelles",nature: "C" },
    { num: "2818", label: "Amortissements du matériel",                      nature: "C" },
    { num: "311",  label: "Marchandises",                                    nature: "D" },
    { num: "401",  label: "Fournisseurs",                                    nature: "C" },
    { num: "411",  label: "Clients",                                         nature: "D" },
    { num: "421",  label: "Personnel, rémunérations dues",                   nature: "C" },
    { num: "431",  label: "Sécurité sociale",                                nature: "C" },
    { num: "443",  label: "État, TVA facturée",                              nature: "C" },
    { num: "445",  label: "État, TVA récupérable",                           nature: "D" },
    { num: "521",  label: "Banques",                                         nature: "D" },
    { num: "571",  label: "Caisse",                                          nature: "D" },
    { num: "601",  label: "Achats de marchandises",                          nature: "D" },
    { num: "605",  label: "Autres achats",                                   nature: "D" },
    { num: "627",  label: "Services bancaires et assimilés",                 nature: "D" },
    { num: "661",  label: "Rémunérations directes versées au personnel",     nature: "D" },
    { num: "671",  label: "Intérêts des emprunts",                           nature: "D" },
    { num: "681",  label: "Dotations aux amortissements d'exploitation",     nature: "D" },
    { num: "701",  label: "Ventes de marchandises",                          nature: "C" },
    { num: "706",  label: "Services vendus",                                 nature: "C" }
  ];

  /* ---------- opening balances (à-nouveaux au 01/06/2026), signed: débit + / crédit − ---------- */
  var OPENING = {
    "211": 1800000, "2441": 2400000, "2451": 6500000, "311": 1250000,
    "411": 3420000, "521": 4180000, "571": 320000,
    "101": -5000000, "106": -1200000, "110": -870000, "162": -8180000,
    "2818": -2100000, "281": -600000, "401": -1920000
  };

  /* ---------- journals ---------- */
  var JOURNALS = {
    VE: { code: "VE", name: "Ventes",              icon: "ti-receipt",          color: "var(--c7)" },
    AC: { code: "AC", name: "Achats",              icon: "ti-truck-delivery",   color: "var(--c6)" },
    BQ: { code: "BQ", name: "Banque",              icon: "ti-building-bank",    color: "var(--c5)" },
    CA: { code: "CA", name: "Caisse",              icon: "ti-cash",             color: "var(--c3)" },
    OD: { code: "OD", name: "Opérations diverses", icon: "ti-arrows-exchange",  color: "var(--c2)" }
  };

  /* ---------- journal entries (each balanced) ---------- */
  var ENTRIES = [
    { id: "VE-0042", journal: "VE", date: "2026-06-02", piece: "FACT INV-0042", label: "Facture client — TechKonsult", posted: true,
      lines: [ { acct: "411", d: 908600, c: 0 }, { acct: "706", d: 0, c: 770000 }, { acct: "443", d: 0, c: 138600 } ] },
    { id: "AC-0118", journal: "AC", date: "2026-06-03", piece: "BL FRN-0461", label: "Fournitures de bureau — Sahel Office", posted: true,
      lines: [ { acct: "605", d: 250000, c: 0 }, { acct: "445", d: 45000, c: 0 }, { acct: "401", d: 0, c: 295000 } ] },
    { id: "BQ-0233", journal: "BQ", date: "2026-06-04", piece: "VIR 2026-0233", label: "Règlement reçu — Sahel Banque (INV-0040)", posted: true,
      lines: [ { acct: "521", d: 1200000, c: 0 }, { acct: "411", d: 0, c: 1200000 } ] },
    { id: "VE-0043", journal: "VE", date: "2026-06-06", piece: "FACT INV-0043", label: "Facture client — AgroMali SA", posted: true,
      lines: [ { acct: "411", d: 531000, c: 0 }, { acct: "706", d: 0, c: 450000 }, { acct: "443", d: 0, c: 81000 } ] },
    { id: "AC-0119", journal: "AC", date: "2026-06-08", piece: "BL FRN-0462", label: "Achat marchandises — BurkinaFarm", posted: true,
      lines: [ { acct: "601", d: 600000, c: 0 }, { acct: "445", d: 108000, c: 0 }, { acct: "401", d: 0, c: 708000 } ] },
    { id: "CA-0051", journal: "CA", date: "2026-06-10", piece: "PC 2026-051", label: "Carburant & menues dépenses", posted: true,
      lines: [ { acct: "605", d: 35000, c: 0 }, { acct: "445", d: 6300, c: 0 }, { acct: "571", d: 0, c: 41300 } ] },
    { id: "BQ-0234", journal: "BQ", date: "2026-06-12", piece: "VIR 2026-0234", label: "Règlement fournisseur — Sahel Office", posted: true,
      lines: [ { acct: "401", d: 900000, c: 0 }, { acct: "521", d: 0, c: 900000 } ] },
    { id: "BQ-0235", journal: "BQ", date: "2026-06-12", piece: "AVIS 2026-0235", label: "Frais & commissions bancaires", posted: true,
      lines: [ { acct: "627", d: 12000, c: 0 }, { acct: "445", d: 2160, c: 0 }, { acct: "521", d: 0, c: 14160 } ] },
    { id: "VE-0044", journal: "VE", date: "2026-06-15", piece: "FACT INV-0044", label: "Facture client — Orange Télécoms", posted: true,
      lines: [ { acct: "411", d: 377600, c: 0 }, { acct: "706", d: 0, c: 320000 }, { acct: "443", d: 0, c: 57600 } ] },
    { id: "OD-0027", journal: "OD", date: "2026-06-28", piece: "PAIE 2026-06", label: "Paie du mois de juin", posted: true,
      lines: [ { acct: "661", d: 850000, c: 0 }, { acct: "421", d: 0, c: 720000 }, { acct: "431", d: 0, c: 130000 } ] },
    { id: "OD-0028", journal: "OD", date: "2026-06-30", piece: "OD 2026-028", label: "Dotation aux amortissements — juin", posted: true,
      lines: [ { acct: "681", d: 180000, c: 0 }, { acct: "2818", d: 0, c: 150000 }, { acct: "281", d: 0, c: 30000 } ] },
    { id: "BQ-0236", journal: "BQ", date: "2026-06-30", piece: "ÉCH 2026-06", label: "Échéance emprunt — capital + intérêts", posted: true,
      lines: [ { acct: "162", d: 250000, c: 0 }, { acct: "671", d: 45000, c: 0 }, { acct: "521", d: 0, c: 295000 } ] },
    { id: "OD-0029", journal: "OD", date: "2026-06-30", piece: "OD 2026-029", label: "Régularisation TVA — brouillon", posted: false,
      lines: [ { acct: "443", d: 277200, c: 0 }, { acct: "445", d: 0, c: 161460 }, { acct: "521", d: 0, c: 115740 } ] }
  ];

  /* ---------- helpers ---------- */
  function fmt(n) {
    var s = Math.abs(Math.round(n)).toLocaleString("fr-FR").replace(/\u202f/g, " ").replace(/\u00a0/g, " ");
    return (n < 0 ? "−" : "") + s;
  }
  function fmtCompact(n) {
    var a = Math.abs(n);
    if (a >= 1e6) return (n / 1e6).toFixed(a % 1e6 === 0 ? 0 : 1) + "M";
    if (a >= 1e3) return Math.round(n / 1e3) + "K";
    return String(Math.round(n));
  }
  function acct(num) { return ACCOUNTS.find(function (a) { return a.num === num; }); }
  function clsOf(num) { return parseInt(num[0], 10); }

  /* movements over POSTED entries only */
  function movementsOf(num, includeDraft) {
    var d = 0, c = 0;
    ENTRIES.forEach(function (e) {
      if (!includeDraft && !e.posted) return;
      e.lines.forEach(function (l) { if (l.acct === num) { d += l.d; c += l.c; } });
    });
    return { debit: d, credit: c };
  }
  function openingOf(num) { return OPENING[num] || 0; }
  function closingSigned(num, includeDraft) {
    var m = movementsOf(num, includeDraft);
    return openingOf(num) + m.debit - m.credit;
  }
  /* all postings touching an account, chronological, with running balance */
  function ledgerOf(num, includeDraft) {
    var rows = [];
    var running = openingOf(num);
    ENTRIES.slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; }).forEach(function (e) {
      if (!includeDraft && !e.posted) return;
      e.lines.forEach(function (l) {
        if (l.acct !== num) return;
        running += l.d - l.c;
        rows.push({ entry: e, d: l.d, c: l.c, running: running });
      });
    });
    return rows;
  }
  function accountsUsedIn(entry) {
    return entry.lines.map(function (l) { return l.acct; });
  }

  /* ---------- shared sidebar ---------- */
  function renderSidebar(activeKey) {
    var overdue = 2;
    var nav = [
      { sec: "Workspace" },
      { key: "dashboard", label: "Dashboard", icon: "ti-layout-dashboard", href: "Billio Dashboard.html" },
      { key: "invoices",  label: "Invoices",  icon: "ti-receipt", href: "Billio Dashboard.html", badge: overdue },
      { key: "clients",   label: "Clients",   icon: "ti-users", href: "Billio Clients.html" },
      { key: "products",  label: "Products",  icon: "ti-package", href: "Billio Products.html" },
      { sec: "Accounting" },
      { key: "coa",        label: "Chart of accounts",    icon: "ti-book",              href: "Billio Chart of Accounts.html" },
      { key: "journals",   label: "Journals",             icon: "ti-notebook",          href: "Billio Journals.html" },
      { key: "ledger",     label: "Trial balance",        icon: "ti-book-2",            href: "Billio Trial Balance.html" },
      { key: "suppliers",  label: "Suppliers",            icon: "ti-truck-delivery",    href: "Billio Suppliers.html" },
      { key: "tax",        label: "Tax",                  icon: "ti-building-bank",     href: "Billio Tax.html" },
      { key: "assets",     label: "Fixed assets",         icon: "ti-building-warehouse",href: "Billio Fixed Assets.html" },
      { key: "statements", label: "Financial statements", icon: "ti-report-money",      href: "Billio Financial Statements.html" },
      { key: "closing",    label: "Period closing",       icon: "ti-lock",              href: "Billio Period Closing.html" },
      { sec: "Finance" },
      { key: "reports",  label: "Reports",  icon: "ti-chart-bar", href: "Billio Reports.html" },
      { key: "payments", label: "Payments", icon: "ti-credit-card", href: "Billio Payments.html" },
      { sec: "Account" },
      { key: "settings", label: "Settings", icon: "ti-settings", href: "Billio Settings.html" }
    ];
    var items = nav.map(function (n) {
      if (n.sec) return '<div class="nav-section">' + n.sec + "</div>";
      var cls = "nav-item" + (n.key === activeKey ? " active" : "") + (n.soon ? " soon" : "");
      var right = n.badge ? '<span class="nav-badge">' + n.badge + "</span>"
                : n.soon ? '<span class="nav-soon">Soon</span>' : "";
      var tag = n.soon ? "div" : "a";
      var href = n.soon ? "" : ' href="' + n.href + '"';
      return "<" + tag + ' class="' + cls + '"' + href + "><i class=\"ti " + n.icon + "\"></i> " + n.label + right + "</" + tag + ">";
    }).join("");

    return '' +
      '<div class="sidebar-logo"><div class="logo-mark">' +
        '<div class="logo-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none">' +
        '<path d="M5.5 3.2h10.2c.6 0 1.1.2 1.5.6l3 3c.4.4.6.9.6 1.5v12c0 .7-.6 1.1-1.2.8l-1.6-.8-1.7.9c-.3.2-.7.2-1 0l-1.6-.9-1.7.9c-.3.2-.7.2-1 0l-1.6-.9-1.7.9c-.3.2-.7.2-1 0l-1.6-.9-1.6.8c-.6.3-1.3-.1-1.3-.8V4.7c0-.8.7-1.5 1.5-1.5z" fill="#fff" fill-opacity="0.96"/>' +
        '<path d="M8 8.2h6M8 11.4h7M8 14.6h4" stroke="#185FA5" stroke-width="1.6" stroke-linecap="round"/></svg></div>' +
        '<div><div class="logo-text">Billio</div><div class="logo-tag">Accounting</div></div>' +
      "</div></div>" +
      '<nav class="sidebar-nav">' + items + "</nav>" +
      '<div class="sidebar-bottom"><div class="user-pill" onclick="window.location.href=\'Billio Auth.html\'" title="Sign out">' +
        '<div class="avatar">SW</div><div><div class="user-name">Serge W.</div><div class="user-plan">Comptable · Pro</div></div>' +
        '<i class="ti ti-logout"></i></div></div>';
  }

  window.ACC = {
    CLASSES: CLASSES, ACCOUNTS: ACCOUNTS, OPENING: OPENING, JOURNALS: JOURNALS, ENTRIES: ENTRIES,
    fmt: fmt, fmtCompact: fmtCompact, acct: acct, clsOf: clsOf,
    movementsOf: movementsOf, openingOf: openingOf, closingSigned: closingSigned,
    ledgerOf: ledgerOf, accountsUsedIn: accountsUsedIn, renderSidebar: renderSidebar
  };
})();
