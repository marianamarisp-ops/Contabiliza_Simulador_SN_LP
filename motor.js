/* ===== simples.js (cópia do sistema) ===== */
/* =====================================================================
   MOTOR DE CÁLCULO DO SIMPLES NACIONAL: versão "completa"
   Reproduz a lógica da planilha SIMULACAO SIMPLES NACIONAL (HRJ / Armazém 76):
   - Taxa efetiva "cheia" por anexo: (RBT12*aliqNominal - parcelaDeduzir)/RBT12
   - Redução proporcional por tributo excluído (ICMS, PIS/COFINS, ISS retido),
     usando a repartição de tributos de cada faixa.
   As tabelas ficam parametrizadas (nunca fixas na fórmula).
   Base: LC 123/2006 c/ LC 155/2016 · tabelas Anexos I, II, III e V (2026).
   UMD: funciona no navegador (window.SN) e no Node (module.exports).
   ===================================================================== */
(function (root, factory) {
  var SN = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = SN;
  root.SN = SN;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Faixas por anexo. rep = repartição de tributos daquela faixa (frações).
  // Anexo I  → tributos: CPP, CSLL, ICMS, IRPJ, Cofins, PIS
  // Anexo III→ tributos: CPP, ISS,  CSLL, IRPJ, Cofins, PIS
  var ANEXOS = {
    "I": [
      { faixa: 1, ini: 0,          fim: 180000,   aliq: 0.040, pd: 0,      rep: { CPP: .415, CSLL: .035, ICMS: .34,  IRPJ: .055, Cofins: .1274, PIS: .0276 } },
      { faixa: 2, ini: 180000.01,  fim: 360000,   aliq: 0.073, pd: 5940,   rep: { CPP: .415, CSLL: .035, ICMS: .34,  IRPJ: .055, Cofins: .1274, PIS: .0276 } },
      { faixa: 3, ini: 360000.01,  fim: 720000,   aliq: 0.095, pd: 13860,  rep: { CPP: .42,  CSLL: .035, ICMS: .335, IRPJ: .055, Cofins: .1274, PIS: .0276 } },
      { faixa: 4, ini: 720000.01,  fim: 1800000,  aliq: 0.107, pd: 22500,  rep: { CPP: .42,  CSLL: .035, ICMS: .335, IRPJ: .055, Cofins: .1274, PIS: .0276 } },
      { faixa: 5, ini: 1800000.01, fim: 3600000,  aliq: 0.143, pd: 87300,  rep: { CPP: .42,  CSLL: .035, ICMS: .335, IRPJ: .055, Cofins: .1274, PIS: .0276 } },
      { faixa: 6, ini: 3600000.01, fim: 4800000,  aliq: 0.190, pd: 378000, rep: { CPP: .421, CSLL: .10,  ICMS: 0,    IRPJ: .135, Cofins: .2827, PIS: .0613 } }
    ],
    "II": [
      { faixa: 1, ini: 0,          fim: 180000,   aliq: 0.045, pd: 0,      rep: { CPP: .375, CSLL: .035, ICMS: .32, IPI: .075, IRPJ: .055, Cofins: .1151, PIS: .0249 } },
      { faixa: 2, ini: 180000.01,  fim: 360000,   aliq: 0.078, pd: 5940,   rep: { CPP: .375, CSLL: .035, ICMS: .32, IPI: .075, IRPJ: .055, Cofins: .1151, PIS: .0249 } },
      { faixa: 3, ini: 360000.01,  fim: 720000,   aliq: 0.100, pd: 13860,  rep: { CPP: .375, CSLL: .035, ICMS: .32, IPI: .075, IRPJ: .055, Cofins: .1151, PIS: .0249 } },
      { faixa: 4, ini: 720000.01,  fim: 1800000,  aliq: 0.112, pd: 22500,  rep: { CPP: .375, CSLL: .035, ICMS: .32, IPI: .075, IRPJ: .055, Cofins: .1151, PIS: .0249 } },
      { faixa: 5, ini: 1800000.01, fim: 3600000,  aliq: 0.147, pd: 85500,  rep: { CPP: .375, CSLL: .035, ICMS: .32, IPI: .075, IRPJ: .055, Cofins: .1151, PIS: .0249 } },
      { faixa: 6, ini: 3600000.01, fim: 4800000,  aliq: 0.300, pd: 720000, rep: { CPP: .235, CSLL: .075, ICMS: 0, IPI: .35, IRPJ: .085, Cofins: .2096, PIS: .0454 } }
    ],
    "III": [
      { faixa: 1, ini: 0,          fim: 180000,   aliq: 0.060, pd: 0,      rep: { CPP: .434, ISS: .335, CSLL: .035, IRPJ: .04, Cofins: .1282, PIS: .0278 } },
      { faixa: 2, ini: 180000.01,  fim: 360000,   aliq: 0.112, pd: 9360,   rep: { CPP: .434, ISS: .32,  CSLL: .035, IRPJ: .04, Cofins: .1405, PIS: .0305 } },
      { faixa: 3, ini: 360000.01,  fim: 720000,   aliq: 0.135, pd: 17640,  rep: { CPP: .434, ISS: .325, CSLL: .035, IRPJ: .04, Cofins: .1364, PIS: .0296 } },
      { faixa: 4, ini: 720000.01,  fim: 1800000,  aliq: 0.160, pd: 35640,  rep: { CPP: .434, ISS: .325, CSLL: .035, IRPJ: .04, Cofins: .1364, PIS: .0296 } },
      { faixa: 5, ini: 1800000.01, fim: 3600000,  aliq: 0.210, pd: 125640, rep: { CPP: .434, ISS: .335, CSLL: .035, IRPJ: .04, Cofins: .1282, PIS: .0278 } },
      { faixa: 6, ini: 3600000.01, fim: 4800000,  aliq: 0.330, pd: 648000, rep: { CPP: .305, ISS: 0,    CSLL: .15,  IRPJ: .35, Cofins: .1603, PIS: .0347 } }
    ],
    "IV": [
      { faixa: 1, ini: 0,          fim: 180000,   aliq: 0.0450, pd: 0,      rep: { IRPJ: .188, CSLL: .152, Cofins: .1767, PIS: .0383, ISS: .445 } },
      { faixa: 2, ini: 180000.01,  fim: 360000,   aliq: 0.0900, pd: 8100,   rep: { IRPJ: .198, CSLL: .152, Cofins: .2055, PIS: .0445, ISS: .40 } },
      { faixa: 3, ini: 360000.01,  fim: 720000,   aliq: 0.1020, pd: 12420,  rep: { IRPJ: .208, CSLL: .152, Cofins: .1973, PIS: .0427, ISS: .40 } },
      { faixa: 4, ini: 720000.01,  fim: 1800000,  aliq: 0.1400, pd: 39780,  rep: { IRPJ: .178, CSLL: .192, Cofins: .1890, PIS: .0410, ISS: .40 } },
      { faixa: 5, ini: 1800000.01, fim: 3600000,  aliq: 0.2200, pd: 183780, rep: { IRPJ: .188, CSLL: .192, Cofins: .1808, PIS: .0392, ISS: .40 } },
      { faixa: 6, ini: 3600000.01, fim: 4800000,  aliq: 0.3300, pd: 828000, rep: { IRPJ: .535, CSLL: .215, Cofins: .2055, PIS: .0445, ISS: 0 } }
    ],
    "V": [
      { faixa: 1, ini: 0,          fim: 180000,   aliq: 0.155, pd: 0,      rep: { CPP: .2885, ISS: .14,  CSLL: .15,  IRPJ: .25, Cofins: .1410, PIS: .0305 } },
      { faixa: 2, ini: 180000.01,  fim: 360000,   aliq: 0.180, pd: 4500,   rep: { CPP: .2785, ISS: .17,  CSLL: .15,  IRPJ: .23, Cofins: .1410, PIS: .0305 } },
      { faixa: 3, ini: 360000.01,  fim: 720000,   aliq: 0.195, pd: 9900,   rep: { CPP: .2385, ISS: .19,  CSLL: .15,  IRPJ: .24, Cofins: .1492, PIS: .0323 } },
      { faixa: 4, ini: 720000.01,  fim: 1800000,  aliq: 0.205, pd: 17100,  rep: { CPP: .2385, ISS: .21,  CSLL: .15,  IRPJ: .21, Cofins: .1574, PIS: .0341 } },
      { faixa: 5, ini: 1800000.01, fim: 3600000,  aliq: 0.230, pd: 62100,  rep: { CPP: .2385, ISS: .235, CSLL: .125, IRPJ: .23, Cofins: .1410, PIS: .0305 } },
      { faixa: 6, ini: 3600000.01, fim: 4800000,  aliq: 0.305, pd: 540000, rep: { CPP: .295,  ISS: 0,    CSLL: .155, IRPJ: .35, Cofins: .1644, PIS: .0356 } }
    ]
  };

  // Categorias-padrão de faturamento (as 6 da planilha). exclui = tributos
  // que NÃO entram no DAS daquela categoria (recolhidos por fora / retidos).
  var CATEGORIAS_PADRAO = [
    { id: "com_icms_pc",     nome: "Comércio · COM ICMS + PIS/COFINS",   anexo: "I",   exclui: [] },
    { id: "sem_icms_pc",     nome: "Comércio · SEM ICMS + PIS/COFINS",   anexo: "I",   exclui: ["ICMS"] },
    { id: "sem_icms_sem_pc", nome: "Comércio · SEM ICMS + SEM PIS/COFINS", anexo: "I", exclui: ["ICMS", "Cofins", "PIS"] },
    { id: "com_icms_sem_pc", nome: "Comércio · COM ICMS + SEM PIS/COFINS", anexo: "I", exclui: ["Cofins", "PIS"] },
    { id: "serv_sem_iss",    nome: "Serviços · SEM ISS retido",          anexo: "III", exclui: [] },
    { id: "serv_com_iss",    nome: "Serviços · COM ISS retido",          anexo: "III", exclui: ["ISS"] }
  ];

  // SEGREGAÇÕES de receita por anexo. exclui = tributos recolhidos por fora
  // (não entram no DAS). Para adicionar uma nova segregação, basta incluir aqui
  //: nenhuma outra parte do código precisa mudar.
  var SEGREGACOES = {
    "I": [
      { id: "rev_sem_st", nome: "Revenda de mercadorias, exceto para o exterior - Sem substituição tributária/tributação monofásica/antecipação com encerramento de tributação (o substituto tributário do ICMS deve utilizar essa opção)", exclui: [] },
      { id: "rev_com_st", nome: "Revenda de mercadorias, exceto para o exterior - Com substituição tributária/tributação monofásica/antecipação com encerramento de tributação (o substituído tributário do ICMS deve utilizar essa opção)", exclui: ["ICMS", "PIS", "Cofins"], substituivel: true, tributosST: ["ICMS", "PIS", "Cofins"] },
      { id: "rev_exp", nome: "Revenda de mercadorias para o exterior", exclui: ["ICMS", "PIS", "Cofins"] }
    ],
    "II": [
      { id: "ind_sem_st", nome: "Venda de mercadorias industrializadas pelo contribuinte, exceto para o exterior - Sem substituição tributária/tributação monofásica/antecipação com encerramento de tributação (o substituto tributário do ICMS deve utilizar essa opção)", exclui: [] },
      { id: "ind_com_st", nome: "Venda de mercadorias industrializadas pelo contribuinte, exceto para o exterior - Com substituição tributária/tributação monofásica/antecipação com encerramento de tributação (o substituído tributário do ICMS deve utilizar essa opção)", exclui: ["ICMS", "PIS", "Cofins", "IPI"], substituivel: true, tributosST: ["ICMS", "PIS", "Cofins", "IPI"] },
      { id: "ind_exp", nome: "Venda de mercadorias industrializadas pelo contribuinte para o exterior", exclui: ["ICMS", "PIS", "Cofins", "IPI"] },
      // Incidência simultânea de IPI e de ISS: tributa pelo Anexo II SEM a parcela do
      // ICMS, ACRESCIDA da parcela do ISS prevista no Anexo III (Res. CGSN 140/2018).
      { id: "ipi_iss_proprio", nome: "Atividades com incidência simultânea de IPI e de ISS, exceto para o exterior - Sem retenção/substituição tributária de ISS, com ISS devido ao próprio Município do estabelecimento", exclui: [], ipiIss: true },
      { id: "ipi_iss_outro", nome: "Atividades com incidência simultânea de IPI e de ISS, exceto para o exterior - Sem retenção/substituição tributária de ISS, com ISS devido a outro(s) Município(s)", exclui: [], ipiIss: true },
      { id: "ipi_iss_ret", nome: "Atividades com incidência simultânea de IPI e de ISS, exceto para o exterior - Com retenção/substituição tributária de ISS", exclui: ["ISS"], ipiIss: true }
    ],
    "III": [
      { id: "loc", nome: "Locação de bens móveis, exceto para o exterior", exclui: ["ISS"] },
      { id: "contabil", nome: "Escritórios de serviços contábeis autorizados pela legislação municipal a pagar o ISS em valor fixo em guia do Município", exclui: ["ISS"] },
      { id: "fr_proprio", nome: "Prestação de Serviços - Sujeitos ao fator \"r\", sem retenção/substituição tributária de ISS, com ISS devido ao próprio Município do estabelecimento", exclui: [] },
      { id: "fr_outro", nome: "Prestação de Serviços - Sujeitos ao fator \"r\", sem retenção/substituição tributária de ISS, com ISS devido a outro(s) Município(s)", exclui: [] },
      { id: "fr_ret", nome: "Prestação de Serviços - Sujeitos ao fator \"r\", com retenção/substituição tributária de ISS", exclui: ["ISS"] },
      { id: "a3_proprio", nome: "Prestação de Serviços - Não sujeitos ao fator \"r\" e tributados pelo Anexo III, sem retenção/substituição tributária de ISS, com ISS devido ao próprio Município do estabelecimento", exclui: [] },
      { id: "a3_outro", nome: "Prestação de Serviços - Não sujeitos ao fator \"r\" e tributados pelo Anexo III, sem retenção/substituição tributária de ISS, com ISS devido a outro(s) Município(s)", exclui: [] },
      { id: "a3_ret", nome: "Prestação de Serviços - Não sujeitos ao fator \"r\" e tributados pelo Anexo III, com retenção/substituição tributária de ISS", exclui: ["ISS"] },
      { id: "transp_inter", nome: "Transporte INTERMUNICIPAL/INTERESTADUAL de cargas - Anexo III com ICMS no lugar do ISS (§5º-E, LC 123/06)", exclui: [], transpICMS: true },
      // com ST o ICMS já foi recolhido antes: sai do DAS e também não entra na base do Presumido
      { id: "transp_inter_st", nome: "Transporte INTERMUNICIPAL/INTERESTADUAL de cargas - COM substituição tributária do ICMS (ICMS 0%, sem ISS)", exclui: ["ICMS"], transpICMS: true, transpICMSst: true },
      { id: "transp_mun", nome: "Transporte MUNICIPAL de cargas - Anexo III (com ISS, sem retenção)", exclui: [] },
      { id: "transp_mun_ret", nome: "Transporte MUNICIPAL de cargas - Anexo III, com retenção/substituição de ISS", exclui: ["ISS"] },
      { id: "exp", nome: "Exportação de serviços para o exterior", exclui: ["ISS", "PIS", "Cofins"] }
    ],
    "IV": [
      { id: "a4_proprio", nome: "Prestação de Serviços - Tributados pelo Anexo IV, sem retenção/substituição tributária de ISS, com ISS devido ao próprio Município do estabelecimento", exclui: [] },
      { id: "a4_outro", nome: "Prestação de Serviços - Tributados pelo Anexo IV, sem retenção/substituição tributária de ISS, com ISS devido a outro(s) Município(s)", exclui: [] },
      { id: "a4_ret", nome: "Prestação de Serviços - Tributados pelo Anexo IV, com retenção/substituição tributária de ISS", exclui: ["ISS"] },
      { id: "exp", nome: "Exportação de serviços para o exterior", exclui: ["ISS", "PIS", "Cofins"] }
    ],
    "V": [
      { id: "a5_proprio", nome: "Prestação de Serviços - Sujeitos ao fator \"r\" e tributados pelo Anexo V, sem retenção/substituição tributária de ISS, com ISS devido ao próprio Município do estabelecimento", exclui: [] },
      { id: "a5_outro", nome: "Prestação de Serviços - Sujeitos ao fator \"r\" e tributados pelo Anexo V, sem retenção/substituição tributária de ISS, com ISS devido a outro(s) Município(s)", exclui: [] },
      { id: "a5_ret", nome: "Prestação de Serviços - Sujeitos ao fator \"r\" e tributados pelo Anexo V, com retenção/substituição tributária de ISS", exclui: ["ISS"] },
      { id: "exp", nome: "Exportação de serviços para o exterior", exclui: ["ISS", "PIS", "Cofins"] }
    ]
  };
  function segExclui(anexo, segId) {
    var lst = SEGREGACOES[anexo] || [];
    for (var i = 0; i < lst.length; i++) if (lst[i].id === segId) return lst[i].exclui.slice();
    return [];
  }

  var LIMITE = 4800000, SUBLIMITE = 3600000;
  // Ordem dos tributos do DAS (rótulos amigáveis em LABEL_TRIBUTOS)
  var TRIBUTOS = ["IRPJ", "CSLL", "Cofins", "PIS", "CPP", "ICMS", "ISS", "IPI"];
  var LABEL_TRIBUTOS = { IRPJ: "IRPJ", CSLL: "CSLL", Cofins: "COFINS", PIS: "PIS", CPP: "CPP", ICMS: "ICMS", ISS: "ISS", IPI: "IPI" };

  function faixaDe(rbt12, anexo, tabela) {
    var t = (tabela && tabela[anexo]) ? tabela[anexo] : ANEXOS[anexo];
    if (!t) return null;
    for (var i = 0; i < t.length; i++) if (num(rbt12) <= t[i].fim + 1e-6) return t[i];
    return t[t.length - 1];
  }

  // Taxa efetiva cheia de um anexo dado o RBT12.
  function taxaEfetiva(rbt12, anexo, tabela) {
    rbt12 = num(rbt12);
    var f = faixaDe(rbt12, anexo, tabela);
    if (!f) return null;
    var ef = rbt12 > 0 ? (rbt12 * f.aliq - f.pd) / rbt12 : f.aliq;
    return { faixa: f.faixa, aliqNominal: f.aliq, parcelaDeduzir: f.pd, efetivaCheia: Math.max(ef, 0), rep: f.rep };
  }

  // Cálculo de UMA categoria de faturamento.
  function calcularCategoria(rbt12, faturamentoMes, anexo, exclui, tabela) {
    var te = taxaEfetiva(rbt12, anexo, tabela);
    if (!te) return { erro: "Anexo inválido" };
    exclui = exclui || [];
    var reducao = 0;
    exclui.forEach(function (trib) { reducao += num(te.rep[trib]); });
    var efetivaCategoria = te.efetivaCheia * (1 - reducao);
    var das = round2(num(faturamentoMes) * efetivaCategoria);
    return {
      anexo: anexo, faixa: te.faixa, aliqNominal: te.aliqNominal, parcelaDeduzir: te.parcelaDeduzir,
      efetivaCheia: te.efetivaCheia, reducao: reducao, efetivaCategoria: efetivaCategoria,
      faturamentoMes: num(faturamentoMes), das: das, exclui: exclui
    };
  }

  // Cálculo completo de uma competência a partir das linhas de faturamento.
  // linhas: [{ id, nome, anexo, exclui:[], faturamentoMes }]
  function calcularCompetencia(rbt12, linhas, tabela) {
    rbt12 = num(rbt12);
    var detalhes = (linhas || []).map(function (l) {
      var r = calcularCategoria(rbt12, l.faturamentoMes, l.anexo, l.exclui, tabela);
      r.id = l.id; r.nome = l.nome;
      return r;
    });
    var totalFaturamento = detalhes.reduce(function (s, d) { return s + num(d.faturamentoMes); }, 0);
    var totalDAS = round2(detalhes.reduce(function (s, d) { return s + num(d.das); }, 0));
    var efetivaGlobal = totalFaturamento > 0 ? totalDAS / totalFaturamento : 0;
    return {
      rbt12: rbt12, detalhes: detalhes,
      totalFaturamento: round2(totalFaturamento), totalDAS: totalDAS,
      efetivaGlobal: efetivaGlobal, situacao: situacaoLimite(rbt12)
    };
  }

  // APURAÇÃO POR ANEXO: uma seção independente por anexo.
  // secoes: [{ anexo, rbt12, receitaBruta }]  (opcional exclui:[] p/ reduções)
  // Cada anexo tem seu próprio RBT12, alíquota efetiva, DAS e memória.
  function calcularApuracao(secoes, tabela) {
    var detalhes = (secoes || []).map(function (s) {
      var te = taxaEfetiva(s.rbt12, s.anexo, tabela) || {};
      var receita = num(s.receitaBruta);
      var efCheia = te.efetivaCheia || 0;
      var baseRep = te.rep || {};
      var excl = s.exclui || [];
      var dasCheia = receita * efCheia;
      var tributos = {}; TRIBUTOS.forEach(function (t) { tributos[t] = 0; });

      // TRANSPORTE intermunicipal/interestadual de cargas (§5º-E, LC 123/06):
      // Anexo III SEM o ISS, ACRESCIDA a "parcela do ICMS prevista no Anexo I".
      // Essa parcela é a própria parcela de ICMS do Anexo I = (alíquota efetiva
      // do Anexo I) × (% de repartição do ICMS do Anexo I): NÃO o % de ICMS
      // aplicado sobre a efetiva do Anexo III. Com ICMS-ST, a parcela é 0%.
      if (s.transpICMS) {
        var teI = taxaEfetiva(s.rbt12, "I", tabela) || {};
        var icmsFracI = num((teI.rep || {}).ICMS);
        var icmsParcela = s.transpICMSst ? 0 : round2(receita * (teI.efetivaCheia || 0) * icmsFracI);
        TRIBUTOS.forEach(function (t) {
          if (t === "ISS") tributos[t] = 0;
          else if (t === "ICMS") tributos[t] = icmsParcela;
          else tributos[t] = round2(dasCheia * num(baseRep[t]));   // IRPJ/CSLL/Cofins/PIS/CPP do Anexo III
        });
        excl.forEach(function (t) { tributos[t] = 0; });
        var dasT = round2(TRIBUTOS.reduce(function (sm, t) { return sm + num(tributos[t]); }, 0));
        return {
          anexo: s.anexo, rbt12: num(s.rbt12), receitaBruta: receita,
          faixa: te.faixa, aliqNominal: te.aliqNominal, parcelaDeduzir: te.parcelaDeduzir,
          efetivaCheia: efCheia, reducao: 0, efetiva: receita > 0 ? dasT / receita : 0,
          das: dasT, tributos: tributos, exclui: excl, transpICMS: true
        };
      }

      // INCIDÊNCIA SIMULTÂNEA DE IPI E DE ISS (Res. CGSN 140/2018): tributa pelo
      // Anexo II SEM a parcela do ICMS, ACRESCIDA da parcela do ISS prevista no
      // Anexo III. Essa parcela é (efetiva do Anexo III) × (% de ISS do Anexo III),
      // e não o % de ISS aplicado sobre a efetiva do Anexo II.
      if (s.ipiIss) {
        var teIII = taxaEfetiva(s.rbt12, "III", tabela) || {};
        var issFracIII = num((teIII.rep || {}).ISS);
        var issParcela = round2(receita * (teIII.efetivaCheia || 0) * issFracIII);
        TRIBUTOS.forEach(function (t) {
          if (t === "ICMS") tributos[t] = 0;                         // ICMS não incide
          else if (t === "ISS") tributos[t] = issParcela;            // ISS vem do Anexo III
          else tributos[t] = round2(dasCheia * num(baseRep[t]));     // federais + IPI do Anexo II
        });
        excl.forEach(function (t) { tributos[t] = 0; });             // ISS retido, por exemplo
        var dasII = round2(TRIBUTOS.reduce(function (sm, t) { return sm + num(tributos[t]); }, 0));
        return {
          anexo: s.anexo, rbt12: num(s.rbt12), receitaBruta: receita,
          faixa: te.faixa, aliqNominal: te.aliqNominal, parcelaDeduzir: te.parcelaDeduzir,
          efetivaCheia: efCheia, reducao: 0, efetiva: receita > 0 ? dasII / receita : 0,
          das: dasII, tributos: tributos, exclui: excl, transpICMS: false, ipiIss: true
        };
      }

      // Regime normal: reduções (ST/ISS retido/exportação) zeram os tributos indicados.
      var reducao = 0; excl.forEach(function (t) { reducao += num(baseRep[t]); });
      var efetiva = efCheia * (1 - reducao);
      // DAS = SOMA de cada tributo arredondado a 2 casas (metodologia PGDAS-D/DARF).
      // Cada tributo = receita × efetiva cheia × repartição, com precisão total até
      // o arredondamento final de cada parcela. Evita a diferença de centavos que
      // aparecia ao arredondar (receita × efetiva) de uma vez só.
      TRIBUTOS.forEach(function (t) { tributos[t] = (excl.indexOf(t) > -1) ? 0 : round2(dasCheia * num(baseRep[t])); });
      var das = round2(TRIBUTOS.reduce(function (sm, t) { return sm + num(tributos[t]); }, 0));
      return {
        anexo: s.anexo, rbt12: num(s.rbt12), receitaBruta: receita,
        faixa: te.faixa, aliqNominal: te.aliqNominal, parcelaDeduzir: te.parcelaDeduzir,
        efetivaCheia: efCheia, reducao: reducao, efetiva: efetiva,
        das: das, tributos: tributos, exclui: excl, transpICMS: false
      };
    });
    var totalReceita = detalhes.reduce(function (sm, d) { return sm + d.receitaBruta; }, 0);
    var totalDAS = round2(detalhes.reduce(function (sm, d) { return sm + d.das; }, 0));
    var efetivaGlobal = totalReceita > 0 ? totalDAS / totalReceita : 0;
    var rbtMax = detalhes.reduce(function (m, d) { return Math.max(m, d.rbt12); }, 0);
    var totalTributos = {};
    TRIBUTOS.forEach(function (t) { totalTributos[t] = round2(detalhes.reduce(function (sm, d) { return sm + num((d.tributos || {})[t]); }, 0)); });
    return {
      detalhes: detalhes, totalReceita: round2(totalReceita), totalDAS: totalDAS,
      efetivaGlobal: efetivaGlobal, totalTributos: totalTributos, situacao: situacaoLimite(rbtMax)
    };
  }

  // Rateio por receita entre estabelecimentos (matriz + filiais).
  // Garante soma exatamente igual ao valor da guia (ajuste na maior parcela).
  function ratear(valorGuia, unidades) {
    valorGuia = round2(valorGuia);
    var somaBase = unidades.reduce(function (s, u) { return s + num(u.receita); }, 0) || 1;
    var res = unidades.map(function (u) {
      var perc = num(u.receita) / somaBase;
      return { nome: u.nome, receita: num(u.receita), percentual: perc, valor: round2(valorGuia * perc) };
    });
    var soma = res.reduce(function (s, r) { return s + r.valor; }, 0);
    var resid = round2(valorGuia - soma);
    if (Math.abs(resid) >= 0.01 && res.length) {
      var maior = 0;
      for (var i = 1; i < res.length; i++) if (res[i].valor > res[maior].valor) maior = i;
      res[maior].valor = round2(res[maior].valor + resid);
    }
    var totalFinal = round2(res.reduce(function (s, r) { return s + r.valor; }, 0));
    return { valorGuia: valorGuia, unidades: res, total: totalFinal, ajuste: resid, exato: Math.abs(totalFinal - valorGuia) < 0.005 };
  }

  function situacaoLimite(rbt12) {
    rbt12 = num(rbt12);
    var a = [];
    if (rbt12 > LIMITE) a.push("Acima do limite do Simples (R$ 4,8 mi): desenquadramento.");
    else if (rbt12 / LIMITE >= 0.8) a.push("Próxima do limite do Simples (" + Math.round(rbt12 / LIMITE * 100) + "%).");
    if (rbt12 > SUBLIMITE && rbt12 <= LIMITE) a.push("Acima do sublimite (R$ 3,6 mi): ICMS/ISS por fora.");
    return { pctLimite: rbt12 / LIMITE, alertas: a };
  }

  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v == null) return 0;
    var s = String(v).trim().replace(/[R$\s]/g, "");
    if (s.indexOf(",") > -1) s = s.replace(/\./g, "").replace(",", ".");
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  function round2(v) { return Math.round((num(v) + Number.EPSILON) * 100) / 100; }

  return {
    ANEXOS: ANEXOS, CATEGORIAS_PADRAO: CATEGORIAS_PADRAO, LIMITE: LIMITE, SUBLIMITE: SUBLIMITE,
    TRIBUTOS: TRIBUTOS, LABEL_TRIBUTOS: LABEL_TRIBUTOS,
    SEGREGACOES: SEGREGACOES, segExclui: segExclui,
    faixaDe: faixaDe, taxaEfetiva: taxaEfetiva, calcularCategoria: calcularCategoria,
    calcularCompetencia: calcularCompetencia, calcularApuracao: calcularApuracao,
    ratear: ratear, situacaoLimite: situacaoLimite,
    num: num, round2: round2
  };
});

/* ===== reforma.js (cópia do sistema) ===== */
/* =====================================================================
   REFORMA TRIBUTÁRIA: motor de simulação (EC 132/2023 · LC 214/2025)
   Compara, ano a ano da transição (2027→2033), os três caminhos de um
   optante do Simples Nacional:

     1) GUIA ÚNICA: segue no DAS, como hoje (regime unificado)
     2) POR FORA: segue no Simples, mas apura IBS/CBS pelo regime
                      regular (art. 41, §3º da LC 214/2025): "híbrido"
     3) LUCRO PRESUMIDO: sai do Simples

   NÃO recalcula o Simples: recebe a apuração pronta do motor SN
   (simples.js) e usa os tributos já repartidos por faixa. Assim o DAS
   da simulação é exatamente o mesmo da conferência do mês.

   Regra central (LC 214/2025, art. 41 c/c art. 24 da LC 123/2006):
   quem fica na GUIA ÚNICA paga a tabela do Simples cheia: as reduções
   de alíquota, isenções e alíquota zero são regimes diferenciados que
   integram o REGIME REGULAR. O benefício só aparece por fora ou no
   Lucro Presumido. É isso que torna o híbrido atraente para quem tem
   produto ou serviço beneficiado.

   UMD: funciona no navegador (window.REFORMA) e no Node.
   ===================================================================== */
(function (root, factory) {
  var R = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = R;
  root.REFORMA = R;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var ANOS = [2027, 2028, 2029, 2030, 2031, 2032, 2033];
  // IBS entra em teste (0,1%) em 2027/2028 e depois cresce até cheio em 2033
  var IBS_TESTE = 0.001;
  var IBS_FRAC = { 2027: 0, 2028: 0, 2029: 0.10, 2030: 0.20, 2031: 0.30, 2032: 0.40, 2033: 1 };
  // ICMS/ISS reduzem 10% ao ano de 2029 a 2032 e são extintos em 2033
  var RED_FRAC = { 2027: 1, 2028: 1, 2029: 0.9, 2030: 0.8, 2031: 0.7, 2032: 0.6, 2033: 0 };

  // Presunção e alíquotas do Lucro Presumido (mesmos parâmetros do consultivo.js)
  var PRESUNCAO = { mercadorias: { irpj: 0.08, csll: 0.12 }, servicos: { irpj: 0.32, csll: 0.32 } };
  var ALIQ = { irpj: 0.15, irpjAdicional: 0.10, csll: 0.09 };
  var ADICIONAL_FAIXA = 20000; // R$/mês de lucro presumido isento do adicional

  var PADRAO = {
    cbs: 9.21, ibs: 18.70,        // alíquotas de referência para projeção de longo prazo (%) — total 27,91% (estimativa)
    icms: 18, iss: 5, cpp: 28,    // %
    b2b: 60,                      // % para PJ (compatibilidade: vale para os dois quando não há separação)
    b2bMerc: 60, b2bServ: 60,     // % de mercadorias e de serviços vendidos a PJ que toma crédito
    b2bIcms: null,                // % das vendas cujo cliente credita o ICMS (null = segue o de mercadoria)
    compras: 0, custo: 0,         // R$/mês
    presIrpjMerc: 8, presCsllMerc: 12, presIrpjServ: 32, presCsllServ: 32,
    benZeroProd: 0, benRedProd: 0, pctRedProd: 60,
    icmsBenefValor: 0, icmsBenefPct: 0,   // benefícios estaduais de ICMS
    benZeroServ: 0, benRedServ: 0, pctRedServ: 60,
    folha: 0
  };

  /* ---------------------------------------------------------------------
     CATÁLOGO DE BENEFÍCIOS (LC 214/2025)
     O contador escolhe pelo nome da atividade e o percentual vem junto, em
     vez de ter que lembrar de cor quanto cada regime reduz.
     pct = quanto do IBS/CBS deixa de ser pago (100 = alíquota zero).
     tipo: "prod" entra na base de mercadorias, "serv" na de serviços.
  --------------------------------------------------------------------- */
  var BENEFICIOS = [
    // Alíquota zero
    { id: "cesta", nome: "Cesta básica nacional de alimentos", pct: 100, tipo: "prod", base: "art. 125 · Anexo I" },
    { id: "hortifruti", nome: "Hortaliças, frutas e ovos", pct: 100, tipo: "prod", base: "art. 146 · Anexo XV" },
    { id: "medZero", nome: "Medicamentos da lista de alíquota zero", pct: 100, tipo: "prod", base: "art. 141 · Anexo XIV" },
    { id: "acessib", nome: "Dispositivos médicos e de acessibilidade para PcD", pct: 100, tipo: "prod", base: "Anexos XII e XIII" },
    { id: "prouni", nome: "Ensino superior (Prouni)", pct: 100, tipo: "serv", base: "art. 161" },
    { id: "transpUrbano", nome: "Transporte público coletivo urbano, semiurbano e metropolitano", pct: 100, tipo: "serv", base: "regime específico" },
    // Bens imóveis (art. 261): 70% na locação, cessão onerosa e arrendamento
    { id: "imovelLoc", nome: "Locação, cessão onerosa e arrendamento de bens imóveis", pct: 70, tipo: "serv", base: "art. 261" },
    // Redução de 60%
    { id: "alimentos", nome: "Alimentos para consumo humano", pct: 60, tipo: "prod", base: "art. 135 · Anexo VII" },
    { id: "higiene", nome: "Produtos de higiene pessoal e limpeza", pct: 60, tipo: "prod", base: "art. 136 · Anexo VIII" },
    { id: "agro", nome: "Produtos agropecuários, pesqueiros e florestais in natura", pct: 60, tipo: "prod", base: "art. 137 · Anexo IX" },
    { id: "insumoAgro", nome: "Insumos agropecuários e aquícolas", pct: 60, tipo: "prod", base: "art. 138 · Anexo X" },
    { id: "medicamento", nome: "Medicamentos com redução", pct: 60, tipo: "prod", base: "art. 141 · Anexo VI" },
    { id: "dispMed", nome: "Dispositivos médicos", pct: 60, tipo: "prod", base: "art. 144 · Anexo IV" },
    { id: "saude", nome: "Serviços de saúde", pct: 60, tipo: "serv", base: "art. 128 · Anexo III" },
    { id: "educacao", nome: "Serviços de educação", pct: 60, tipo: "serv", base: "art. 128 · Anexo II" },
    { id: "cultura", nome: "Produções artísticas, culturais, jornalísticas e desportivas", pct: 60, tipo: "serv", base: "art. 145 · Anexo XI" },
    { id: "saneamento", nome: "Saneamento básico e concessão de rodovias", pct: 60, tipo: "serv", base: "art. 143" },
    { id: "transpColetivo", nome: "Transporte coletivo de passageiros intermunicipal e interestadual", pct: 60, tipo: "serv", base: "art. 128" },
    // Redução de 50%: regra geral do capítulo de bens imóveis (art. 261)
    { id: "imovel", nome: "Venda de bens imóveis (incorporação, loteamento, alienação)", pct: 50, tipo: "prod", base: "art. 261" },
    // Redução de 40%
    { id: "hotelaria", nome: "Hotelaria, parques de diversão e temáticos, restaurantes e aviação regional", pct: 40, tipo: "serv", base: "regime específico" },
    // Redução de 30%
    { id: "regulamentada", nome: "Serviço de profissão regulamentada (advogado, contador, médico, engenheiro...)", pct: 30, tipo: "serv", base: "art. 127" },
    // Escape para o que a lei acrescentar depois
    { id: "outroProd", nome: "Outro produto beneficiado (informar o percentual)", pct: 60, tipo: "prod", base: "", livre: true },
    { id: "outroServ", nome: "Outro serviço beneficiado (informar o percentual)", pct: 60, tipo: "serv", base: "", livre: true }
  ];

  /* BENEFÍCIOS ESTADUAIS DE ICMS (valem no Lucro Presumido e no ICMS por fora do
     DAS acima do sublimite; na guia única o ICMS já vem na tabela do anexo).
     pct = quanto do ICMS daquela parcela deixa de ser pago. Na redução da base o
     contador informa o percentual, porque varia por produto e por estado. */
  var BENEF_ICMS = [
    { id: "isencao", nome: "Isenção do ICMS", pct: 100 },
    { id: "diferimento", nome: "Diferimento do ICMS", pct: 100 },
    { id: "suspensao", nome: "Suspensão do ICMS", pct: 100 },
    { id: "naoInc", nome: "Não incidência / imunidade", pct: 100 },
    { id: "redBase", nome: "Redução da base de cálculo (informar o percentual)", pct: 41.67, livre: true },
    { id: "outroIcms", nome: "Outro benefício de ICMS (informar o percentual)", pct: 50, livre: true }
  ];
  function beneficioIcmsPorId(id) {
    for (var i = 0; i < BENEF_ICMS.length; i++) if (BENEF_ICMS[i].id === id) return BENEF_ICMS[i];
    return null;
  }

  /* Tipos de compra que geram crédito de IBS/CBS. Só orientam o preenchimento:
     o motor soma tudo num valor único de compras do mês. */
  var COMPRAS = [
    { id: "revenda", nome: "Mercadorias para revenda" },
    { id: "insumos", nome: "Matéria-prima e insumos" },
    { id: "energia", nome: "Energia elétrica" },
    { id: "frete", nome: "Frete e transporte contratado" },
    { id: "servPj", nome: "Serviços tomados de outra empresa" },
    { id: "aluguel", nome: "Aluguel pago a empresa" },
    { id: "consumo", nome: "Material de uso e consumo" },
    { id: "outras", nome: "Outras compras de fornecedor PJ" }
  ];

  function beneficioPorId(id) {
    for (var i = 0; i < BENEFICIOS.length; i++) if (BENEFICIOS[i].id === id) return BENEFICIOS[i];
    return null;
  }

  /* ---------------------------------------------------------------------
     Converte as listas preenchidas na tela (benItens/credItens) nos campos
     que o cálculo usa. Assim a tela pode ser detalhada sem que o motor
     precise conhecer cada benefício.

     Alíquota zero (pct 100) e reduções parciais são separadas porque a
     fórmula da base é  zero + reduzido x pct. Para vários percentuais ao
     mesmo tempo, o pct consolidado é a média ponderada pelos valores, que
     devolve exatamente a mesma soma de desconto.
  --------------------------------------------------------------------- */
  function consolidar(prem) {
    var p = {}; Object.keys(prem || {}).forEach(function (k) { p[k] = prem[k]; });
    var itens = (prem && prem.benItens) || null;
    // Uma lista vazia é uma resposta: "não tem benefício". Só quando a lista
    // nem existe é que valem os campos soltos gravados antes desta tela.
    if (Array.isArray(itens)) {
      var acc = { prod: { zero: 0, red: 0, pond: 0 }, serv: { zero: 0, red: 0, pond: 0 } };
      itens.forEach(function (it) {
        var cat = beneficioPorId(it && it.id);
        var tipo = (it && it.tipo) || (cat && cat.tipo) || "prod";
        var alvo = acc[tipo === "serv" ? "serv" : "prod"];
        var valor = num(it && it.valor);
        var pct = it && it.pct != null ? num(it.pct) : (cat ? cat.pct : 0);
        if (valor <= 0 || pct <= 0) return;
        if (pct >= 100) alvo.zero += valor;
        else { alvo.red += valor; alvo.pond += valor * pct; }
      });
      p.benZeroProd = round2(acc.prod.zero);
      p.benRedProd = round2(acc.prod.red);
      p.pctRedProd = acc.prod.red > 0 ? acc.prod.pond / acc.prod.red : 0;
      p.benZeroServ = round2(acc.serv.zero);
      p.benRedServ = round2(acc.serv.red);
      p.pctRedServ = acc.serv.red > 0 ? acc.serv.pond / acc.serv.red : 0;
    }
    var cred = (prem && prem.credItens) || null;
    if (Array.isArray(cred)) p.compras = round2(cred.reduce(function (a, c) { return a + num(c && c.valor); }, 0));
    /* Benefícios de ICMS: consolida em valor beneficiado + percentual médio
       ponderado, que devolve exatamente a mesma soma de desconto. */
    var bIcms = (prem && prem.icmsItens) || null;
    if (Array.isArray(bIcms)) {
      var vTot = 0, pond = 0;
      bIcms.forEach(function (it) {
        var cat = beneficioIcmsPorId(it && it.id);
        var v = num(it && it.valor), pc = (it && it.pct != null) ? num(it.pct) : (cat ? cat.pct : 0);
        if (v <= 0 || pc <= 0) return;
        vTot += v; pond += v * pc;
      });
      p.icmsBenefValor = round2(vTot);
      p.icmsBenefPct = vTot > 0 ? pond / vTot : 0;
    }
    // Estudo antigo, feito antes de separar mercadoria de serviço: o percentual
    // único vale para os dois, senão o padrão entraria no lugar do que foi informado.
    if (prem && prem.b2b != null) {
      if (prem.b2bMerc == null) p.b2bMerc = num(prem.b2b);
      if (prem.b2bServ == null) p.b2bServ = num(prem.b2b);
    }
    return p;
  }

  function num(v) {
    if (typeof v === "number") return isFinite(v) ? v : 0;
    if (v == null) return 0;
    var s = String(v).trim().replace(/[R$%\s]/g, "");
    if (s.indexOf(",") > -1) s = s.replace(/\./g, "").replace(",", ".");
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }
  function round2(v) { return Math.round((num(v) + Number.EPSILON) * 100) / 100; }

  // Exportação: imune ao IBS/CBS (com direito a manter o crédito das compras).
  // No PGDAS-D as segregações de exportação têm "exp" no id.
  function ehExportacao(seg) { return /(^|_)exp(_|$)/.test(String(seg || "")); }
  // Mercadoria (base do ICMS e da presunção de 8%/12%) x serviço (ISS e 32%/32%).
  // Transporte de cargas segue a presunção de mercadorias e recolhe ICMS, não ISS.
  function ehMercadoria(anexo, seg) {
    if (String(seg || "").indexOf("transp") === 0) return true;
    return anexo === "I" || anexo === "II";
  }
  /* Qual imposto sobre consumo o Lucro Presumido recolhe nessa receita.
     Não dá para deduzir da presunção: transporte de cargas usa a presunção de
     mercadorias (8%/12%) nos dois casos, mas só o INTERMUNICIPAL/INTERESTADUAL
     recolhe ICMS (§5º-E) — o municipal recolhe ISS. E a atividade com IPI+ISS
     fica no Anexo II mas o imposto municipal devido é o ISS, não o ICMS. */
  function ehIcms(anexo, seg) {
    seg = String(seg || "");
    if (seg.indexOf("transp_inter") === 0) return true;    // ICMS no lugar do ISS
    if (seg.indexOf("transp_mun") === 0) return false;     // transporte municipal: ISS
    if (seg.indexOf("ipi_iss") === 0) return false;        // IPI + ISS simultâneos: ISS
    return anexo === "I" || anexo === "II";
  }

  /* ---------------------------------------------------------------------
     Lê a apuração do Simples (saída de SN.calcularApuracao) e monta o
     contexto da simulação: quanto de cada tributo está dentro do DAS e
     qual a base de IBS/CBS depois de excluir exportação e benefícios.
     secoes: [{ anexo, receitaBruta, segregacao }]  (mesma lista do SN)
  --------------------------------------------------------------------- */
  function contexto(apuracao, secoes, prem) {
    prem = prem || {};
    var det = (apuracao && apuracao.detalhes) || [];
    var sec = secoes || [];

    var receitaMerc = 0, receitaServ = 0, expMerc = 0, expServ = 0;
    var baseIcms = 0, baseIss = 0;   // bases do Lucro Presumido (sem ST/retenção/exportação)

    det.forEach(function (d, i) {
      var s = sec[i] || {};
      var seg = s.segregacao || d.segregacao || "";
      var rec = num(d.receitaBruta), exp = ehExportacao(seg), merc = ehMercadoria(d.anexo, seg);
      var excl = d.exclui || [];
      // presunção de IRPJ/CSLL: mercadoria (8%/12%) x serviço (32%/32%)
      if (merc) { receitaMerc += rec; if (exp) expMerc += rec; }
      else { receitaServ += rec; if (exp) expServ += rec; }
      // base do imposto sobre consumo no Presumido — decidida à parte da presunção
      if (!exp) {
        if (ehIcms(d.anexo, seg)) {
          if (excl.indexOf("ICMS") < 0) baseIcms += rec;   // sem ST
        } else {
          if (excl.indexOf("ISS") < 0) baseIss += rec;     // sem retenção/ISS fixo
        }
      }
    });

    // Tributos que estão DENTRO do DAS, já repartidos por faixa pelo motor SN.
    var t = (apuracao && apuracao.totalTributos) || {};
    var cbsEmb = num(t.PIS) + num(t.Cofins);                              // vira CBS desde 2027
    var icmsEmb = num(t.ICMS), issEmb = num(t.ISS);                       // viram IBS ao longo da transição
    // parte federal: segue no DAS mesmo no regime híbrido, valor a valor
    var fed = { IRPJ: num(t.IRPJ), CSLL: num(t.CSLL), CPP: num(t.CPP), IPI: num(t.IPI) };
    var fedEmb = fed.IRPJ + fed.CSLL + fed.CPP + fed.IPI;

    // Base do IBS/CBS: a receita tributável (sem exportação) fica CHEIA.
    // O benefício da LC 214/2025 reduz a ALÍQUOTA da parcela beneficiada, não a base.
    var tribMerc = Math.max(0, receitaMerc - expMerc);
    var tribServ = Math.max(0, receitaServ - expServ);
    var parcMerc = repartirBeneficio(tribMerc, num(prem.benZeroProd), num(prem.benRedProd), num(prem.pctRedProd) / 100);
    var parcServ = repartirBeneficio(tribServ, num(prem.benZeroServ), num(prem.benRedServ), num(prem.pctRedServ) / 100);

    return {
      receita: round2(receitaMerc + receitaServ),
      receitaMerc: round2(receitaMerc), receitaServ: round2(receitaServ),
      expMerc: round2(expMerc), expServ: round2(expServ),
      tribMerc: round2(tribMerc), tribServ: round2(tribServ),
      parcMerc: parcMerc, parcServ: parcServ,
      // a base do IBS/CBS é a própria receita tributável
      baseMerc: round2(tribMerc), baseServ: round2(tribServ),
      baseIcms: round2(baseIcms), baseIss: round2(baseIss),
      dasTotal: round2(num(apuracao && apuracao.totalDAS)),
      cbsEmb: round2(cbsEmb), icmsEmb: round2(icmsEmb), issEmb: round2(issEmb),
      fedEmb: round2(fedEmb), fed: fed
    };
  }

  /* Fatia a receita por tratamento de alíquota: cheia, reduzida e alíquota zero.
     A base total não muda — o que muda é a alíquota aplicada em cada fatia. */
  function repartirBeneficio(tributavel, zero, reduzida, pctReducao) {
    var comZero = Math.min(tributavel, Math.max(0, num(zero)));
    var comReducao = Math.min(tributavel - comZero, Math.max(0, num(reduzida)));
    var cheia = Math.max(0, tributavel - comZero - comReducao);
    var out = [];
    if (cheia > 0) out.push({ rotulo: "alíquota cheia", base: round2(cheia), reducao: 0 });
    if (comReducao > 0) out.push({ rotulo: "redução de " + Math.round(pctReducao * 100) + "%", base: round2(comReducao), reducao: pctReducao });
    if (comZero > 0) out.push({ rotulo: "alíquota zero", base: round2(comZero), reducao: 1 });
    return out;
  }

  /* Imposto das parcelas, aplicando a redução sobre a ALÍQUOTA. */
  function impostoDasParcelas(parcelas, aliquota) {
    return (parcelas || []).reduce(function (s, p) { return s + p.base * aliquota * (1 - p.reducao); }, 0);
  }

  /* ---------------------------------------------------------------------
     Simulação de UM ano da transição.
  --------------------------------------------------------------------- */
  function simularAno(ctx, ano, prem) {
    prem = prem || {};
    var cbs = num(prem.cbs) / 100, ibsCheio = num(prem.ibs) / 100;
    var ibs = (ano <= 2028) ? IBS_TESTE : ibsCheio * IBS_FRAC[ano];
    var red = RED_FRAC[ano];
    var icmsY = num(prem.icms) / 100 * red, issY = num(prem.iss) / 100 * red;
    var b2b = num(prem.b2b) / 100, compras = num(prem.compras), custo = num(prem.custo);
    // Quem toma crédito é o cliente PJ, e a proporção costuma ser bem diferente
    // entre mercadoria e serviço. Sem a separação informada, vale o percentual único.
    var b2bM = prem.b2bMerc != null ? num(prem.b2bMerc) / 100 : b2b;
    var b2bS = prem.b2bServ != null ? num(prem.b2bServ) / 100 : b2b;
    /* O ICMS tem público próprio e quase sempre menor: só credita quem é
       contribuinte do imposto e vai revender ou industrializar. Quem compra
       para uso e consumo, e o prestador de serviço, não creditam ICMS — mas
       creditam IBS/CBS, que é de base ampla. Sem informar, segue o de
       mercadoria, que é o comportamento antigo. */
    var b2bI = prem.b2bIcms != null && prem.b2bIcms !== '' ? num(prem.b2bIcms) / 100 : b2bM;
    var consumo = cbs + ibs;                       // alíquota cheia de IBS+CBS do ano
    var trib = ctx.tribMerc + ctx.tribServ;        // receita tributável (base cheia)
    var base = trib;                               // a base não é reduzida pelo benefício
    // o benefício entra reduzindo a alíquota de cada fatia da receita
    var debMercBen = impostoDasParcelas(ctx.parcMerc, consumo);
    var debServBen = impostoDasParcelas(ctx.parcServ, consumo);
    var debitoIbsCbs = debMercBen + debServBen;
    var aliqEfetiva = trib > 0 ? debitoIbsCbs / trib : consumo;

    /* --- 1) GUIA ÚNICA -------------------------------------------------
       A carga do DAS não muda na transição: muda a composição interna.
       PIS/Cofins viram CBS já em 2027; ICMS/ISS viram IBS na proporção do
       ano. O benefício de IBS/CBS não alcança o DAS (art. 41 da LC 214). */
    var guIbsCbs = ctx.cbsEmb + (ctx.icmsEmb + ctx.issEmb) * (1 - red);
    var guTrib = {
      IBS_CBS: round2(guIbsCbs),
      IRPJ: round2(ctx.fed.IRPJ), CSLL: round2(ctx.fed.CSLL),
      CPP: round2(ctx.fed.CPP), IPI: round2(ctx.fed.IPI),
      ICMS: round2(ctx.icmsEmb * red), ISS: round2(ctx.issEmb * red)
    };
    var guTotal = round2(ctx.dasTotal);
    // O IBS/CBS embutido no DAS não vem separado por atividade: reparte pela
    // proporção de receita de mercadoria e de serviço do próprio período.
    var recTot = ctx.receitaMerc + ctx.receitaServ;
    var pesoMerc = recTot > 0 ? ctx.receitaMerc / recTot : 0;
    var guCredMerc = guIbsCbs * pesoMerc * b2bM, guCredServ = guIbsCbs * (1 - pesoMerc) * b2bS;
    var guCredito = round2(guCredMerc + guCredServ);   // crédito que o cliente PJ aproveita

    /* --- 2) POR FORA (híbrido) ----------------------------------------
       Sai do DAS só o IBS/CBS. Ficam a parte federal (fixa) e o ICMS/ISS
       que ainda resta no ano. O benefício vale, porque a apuração passa a
       ser pelo regime regular. */
    var pfDebMerc = debMercBen, pfDebServ = debServBen;
    var pfDebito = debitoIbsCbs;
    var pfCredito = compras * consumo;
    var pfLiquido = Math.max(0, pfDebito - pfCredito);
    // crédito de IBS/CBS que passou do débito: não abate a parte que fica no DAS,
    // vira saldo credor do próprio IBS/CBS para o período seguinte
    var pfSaldo = Math.max(0, pfCredito - pfDebito);
    var pfCredCliente = pfDebMerc * b2bM + pfDebServ * b2bS;
    var dasFica = ctx.fedEmb + (ctx.icmsEmb + ctx.issEmb) * red;
    var pfImposto = pfLiquido + dasFica;
    var pfTotal = round2(pfImposto + custo);

    /* --- 3) LUCRO PRESUMIDO -------------------------------------------
       IBS/CBS pelo regime regular + ICMS/ISS que ainda existem, mais
       IRPJ, CSLL (com adicional de 10%) e INSS sobre a folha. */
    var lpIbsCbs = debitoIbsCbs;                          // mesma base e mesmas alíquotas reduzidas
    /* Benefícios estaduais (isenção, diferimento, suspensão, redução da base):
       reduzem o ICMS da parcela beneficiada. A parcela nunca passa da base de
       ICMS apurada, para não descontar mais do que existe. */
    var icmsBenefBase = Math.min(ctx.baseIcms, num(prem.icmsBenefValor));
    var icmsBenefPct = num(prem.icmsBenefPct) / 100;
    var icmsBenefValor = icmsBenefBase * icmsY * icmsBenefPct;   // ICMS que deixa de ser pago
    var lpIcms = Math.max(0, ctx.baseIcms * icmsY - icmsBenefValor);
    var lpIss = ctx.baseIss * issY;                       // cumulativo, sem crédito
    var lpDebito = lpIbsCbs + lpIcms + lpIss;
    /* Cada imposto apura no SEU caixa. Não se compensa crédito de IBS/CBS com ICMS
       nem com ISS: o ISS é cumulativo e não admite crédito. Se o crédito de IBS/CBS
       (ou de ICMS) passa do débito do próprio imposto, a diferença NÃO reduz os
       demais — vira saldo credor a aproveitar no período seguinte. */
    var credIcmsAno = num(prem.credIcms) * red;
    var credIbsCbs = compras * consumo;
    var netIbsCbsAp = Math.max(0, lpIbsCbs - credIbsCbs);
    var netIcmsAp = Math.max(0, lpIcms - credIcmsAno);
    var saldoIbsCbs = Math.max(0, credIbsCbs - lpIbsCbs);   // sobra para o mês seguinte
    var saldoIcms = Math.max(0, credIcmsAno - lpIcms);
    var lpCredCompras = credIbsCbs + credIcmsAno;           // crédito informado (bruto)
    var lpCredUsado = Math.min(credIbsCbs, lpIbsCbs) + Math.min(credIcmsAno, lpIcms);
    var lpConsumo = netIbsCbsAp + netIcmsAp + lpIss;        // ISS entra cheio, sem crédito
    var baseIrpj = ctx.receitaMerc * num(prem.presIrpjMerc) / 100 + ctx.receitaServ * num(prem.presIrpjServ) / 100;
    var baseCsll = ctx.receitaMerc * num(prem.presCsllMerc) / 100 + ctx.receitaServ * num(prem.presCsllServ) / 100;
    var lpIrpj = baseIrpj * ALIQ.irpj;
    var lpAdicional = Math.max(0, baseIrpj - ADICIONAL_FAIXA) * ALIQ.irpjAdicional;
    var lpCsll = baseCsll * ALIQ.csll;
    var lpCpp = num(prem.folha) * num(prem.cpp) / 100;
    var lpImposto = lpConsumo + lpIrpj + lpAdicional + lpCsll + lpCpp;
    var lpTotal = round2(lpImposto + custo);

    // cada imposto já está apurado no seu caixa: a repartição é direta
    var lpIssPago = lpIss, netIcms = netIcmsAp, netIbsCbs = netIbsCbsAp;

    return {
      ano: ano, ibs: ibs, cbs: cbs, red: red, consumo: consumo,
      icmsAno: icmsY, issAno: issY, base: round2(base), tributavel: round2(trib),
      // alíquota média de IBS/CBS depois das reduções, e as fatias que a compõem
      aliqEfetiva: aliqEfetiva, parcMerc: ctx.parcMerc, parcServ: ctx.parcServ,

      gu: {
        total: guTotal, imposto: guTotal, credito: guCredito,
        ibsCbsEmb: round2(guIbsCbs), pesoMerc: pesoMerc,
        tributos: guTrib, carga: ctx.receita > 0 ? guTotal / ctx.receita : 0
      },
      pf: {
        total: pfTotal, imposto: round2(pfImposto), credito: round2(pfCredCliente),
        debito: round2(pfDebito), creditoCompras: round2(pfCredito), liquido: round2(pfLiquido),
        saldoCredor: round2(pfSaldo),
        debMerc: round2(pfDebMerc), debServ: round2(pfDebServ),
        dasResidual: round2(dasFica), custo: round2(custo),
        // no híbrido a parte federal do DAS fica intacta; só o IBS/CBS sai por fora
        tributos: {
          IBS_CBS: round2(pfLiquido),
          IRPJ: round2(ctx.fed.IRPJ), CSLL: round2(ctx.fed.CSLL),
          CPP: round2(ctx.fed.CPP), IPI: round2(ctx.fed.IPI),
          ICMS: round2(ctx.icmsEmb * red), ISS: round2(ctx.issEmb * red)
        },
        carga: ctx.receita > 0 ? pfTotal / ctx.receita : 0
      },
      lp: {
        total: lpTotal, imposto: round2(lpImposto),
        // O ISS é cumulativo: não vira crédito na mão do cliente.
        /* Crédito do cliente = imposto DESTACADO na nota, não alíquota cheia
           sobre a base: com benefício de IBS/CBS o destaque cai, e o crédito
           cai junto. E o ICMS vai pelo seu próprio percentual de público. */
        credito: round2(debMercBen * b2bM + debServBen * b2bS + lpIcms * b2bI),
        credIbsCbsCliente: round2(debMercBen * b2bM + debServBen * b2bS),
        credIcmsCliente: round2(lpIcms * b2bI),
        debito: round2(lpDebito), creditoCompras: round2(lpCredCompras), liquido: round2(lpConsumo),
        creditoUsado: round2(lpCredUsado),
        credIbsCbs: round2(credIbsCbs), credIcms: round2(credIcmsAno),
        debIbsCbs: round2(lpIbsCbs), debIcms: round2(lpIcms), debIss: round2(lpIss),
        icmsBenefBase: round2(icmsBenefBase), icmsBenefPct: icmsBenefPct, icmsBenefValor: round2(icmsBenefValor),
        icmsSemBenef: round2(ctx.baseIcms * icmsY),
        // crédito que sobrou de cada imposto e fica para o período seguinte
        saldoIbsCbs: round2(saldoIbsCbs), saldoIcms: round2(saldoIcms),
        saldoCredor: round2(saldoIbsCbs + saldoIcms),
        irpj: round2(lpIrpj), cpp: round2(lpCpp), custo: round2(custo),
        tributos: {
          IBS_CBS: round2(netIbsCbs), ICMS: round2(netIcms), ISS: round2(lpIssPago),
          IRPJ: round2(lpIrpj + lpAdicional), CSLL: round2(lpCsll), CPP: round2(lpCpp)
        },
        baseIrpj: round2(baseIrpj), baseCsll: round2(baseCsll), adicional: round2(lpAdicional),
        carga: ctx.receita > 0 ? lpTotal / ctx.receita : 0
      }
    };
  }

  /* ---------------------------------------------------------------------
     Simulação completa: um ano em destaque + a trajetória 2027→2033.
  --------------------------------------------------------------------- */
  function simular(opts) {
    opts = opts || {};
    // As listas detalhadas da tela viram os campos do cálculo antes de tudo.
    var origem = consolidar(opts.premissas || {});
    var prem = {}; Object.keys(PADRAO).forEach(function (k) { prem[k] = (origem[k] != null) ? origem[k] : PADRAO[k]; });
    var ctx = contexto(opts.apuracao, opts.secoes, prem);
    var ano = ANOS.indexOf(num(opts.ano)) > -1 ? num(opts.ano) : 2027;
    var trajetoria = ANOS.map(function (a) { return simularAno(ctx, a, prem); });
    var atual = trajetoria[ANOS.indexOf(ano)];
    return {
      contexto: ctx, premissas: prem, ano: ano,
      resultado: atual, trajetoria: trajetoria, anos: ANOS.slice(),
      melhor: melhorCaminho(atual)
    };
  }

  // Caminho mais barato do ano (empate resolve pela ordem: guia única primeiro,
  // por ser o que não exige nenhuma mudança).
  function melhorCaminho(r) {
    if (!r) return null;
    var op = [
      { chave: "gu", nome: "Guia única", total: r.gu.total, credito: r.gu.credito },
      { chave: "pf", nome: "Pagar por fora", total: r.pf.total, credito: r.pf.credito },
      { chave: "lp", nome: "Lucro Presumido", total: r.lp.total, credito: r.lp.credito }
    ];
    var min = op[0];
    op.forEach(function (o) { if (o.total < min.total - 0.005) min = o; });
    var max = op[0];
    op.forEach(function (o) { if (o.total > max.total + 0.005) max = o; });
    return { chave: min.chave, nome: min.nome, total: min.total, credito: min.credito, economia: round2(max.total - min.total), opcoes: op };
  }

  /* Texto da transição no ano, para explicar ao cliente. */
  function explicarAno(ano) {
    if (ano <= 2028) return "a CBS já entrou cheia, o IBS ainda está em teste (0,1%) e o ICMS e o ISS seguem integrais.";
    if (ano < 2033) return "o IBS entra a " + Math.round(IBS_FRAC[ano] * 100) + "% da alíquota cheia e o ICMS e o ISS caem para " + Math.round(RED_FRAC[ano] * 100) + "% do valor de hoje.";
    return "é o sistema completo: IBS e CBS cheios e o ICMS e o ISS extintos.";
  }

  return {
    ANOS: ANOS, IBS_FRAC: IBS_FRAC, RED_FRAC: RED_FRAC, PADRAO: PADRAO,
    BENEFICIOS: BENEFICIOS, COMPRAS: COMPRAS, BENEF_ICMS: BENEF_ICMS,
    beneficioPorId: beneficioPorId, beneficioIcmsPorId: beneficioIcmsPorId, consolidar: consolidar,
    PRESUNCAO: PRESUNCAO, ALIQ: ALIQ, ADICIONAL_FAIXA: ADICIONAL_FAIXA,
    ehExportacao: ehExportacao, ehMercadoria: ehMercadoria, ehIcms: ehIcms,
    contexto: contexto, simularAno: simularAno, simular: simular,
    melhorCaminho: melhorCaminho, explicarAno: explicarAno,
    num: num, round2: round2
  };
});

