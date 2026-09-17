(function(){
  // com centavos: a conferência do contador precisa fechar linha a linha, então
  // a exibição não pode arredondar para reais inteiros
  var BRL = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2});
  // lê número no padrão brasileiro (50.000,00) ou simples (50000 / 8.8)
  function parseBR(v){
    var s=String(v==null?'':v).replace(/\s|R\$/g,'').trim(); if(!s) return 0;
    if(s.indexOf(',')>=0) s=s.replace(/\./g,'').replace(',','.');   // vírgula é o decimal
    else s=s.replace(/\.(?=\d{3}(?:\D|$))/g,'');                    // ponto de milhar
    var n=parseFloat(s); return isNaN(n)?0:n;
  }
  function val(id){ return parseBR(document.getElementById(id).value); }
  function fmtNum(n){ return (isFinite(n)?n:0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function pct(x){ return (x*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%'; }
  /* Alíquota na MEMÓRIA DE CÁLCULO: precisão suficiente para o contador refazer a
     conta na mão. Com 1 casa, 9,31% virava "9,3%" e quem multiplicasse pelo valor
     exibido chegava a um número diferente do calculado. Percentuais redondos
     (30%, 60%, 8%) continuam sem casas decimais. */
  function pctA(x){ return (x*100).toLocaleString('pt-BR',{maximumFractionDigits:4})+'%'; }

  // Motores compartilhados com o sistema Conferência do Simples Nacional:
  // SN (simples.js) faz a apuração do DAS e REFORMA (reforma.js) projeta a transição.
  // Este arquivo é GERADO por build-simulador.js — não edite os motores aqui.
  var YEARS=REFORMA.ANOS;
  function simplesAliq(rbt12,anexo){ var t=SN.taxaEfetiva(rbt12,anexo); return t?t.efetivaCheia:0; }
  function simplesFaixa(rbt12,anexo){ var t=SN.taxaEfetiva(rbt12,anexo); return t?t.faixa:1; }

  /* ===== atividades econômicas do PGDAS-D =====
     ax: anexo fixo · fr: sujeito ao fator "r" (Anexo III se folha12/RBT12 >= 28%, senão Anexo V)
     st: ICMS já recolhido por ST/monofásica/antecipação (sai do DAS)
     ret: ISS retido ou substituído (sai do DAS) · issFixo: ISS fixo pago ao município · semIss: atividade sem ISS
     exp: exportação — sem PIS/Cofins, ICMS, ISS e IPI no DAS (LC 123/2006, art. 18 §14) e imune ao IBS/CBS
     nat: 'com' entra na base do ICMS e da presunção de comércio; 'serv' na do ISS e da presunção de serviço */
  var SEM_ST='sem substituição tributária/tributação monofásica/antecipação com encerramento de tributação';
  var COM_ST='com substituição tributária/tributação monofásica/antecipação com encerramento de tributação';
  var S_OUTRO='sem retenção/substituição tributária de ISS, com ISS devido a outro(s) Município(s)';
  var S_PROPRIO='sem retenção/substituição tributária de ISS, com ISS devido ao próprio Município do estabelecimento';
  var S_RET='com retenção/substituição tributária de ISS';
  // sn: id da segregação equivalente no motor SN (simples.js). É por ele que o
  // DAS é calculado — o simulador e o sistema usam exatamente a mesma tabela.
  // No fator "r" o anexo só se define com a folha, então há um id para cada caso.
  var PG=[
    {ax:'I', t:'Revenda de mercadorias', n:'com', ln:[
      {id:'pgRevSemST', sn:'rev_sem_st', l:'Revenda de mercadorias, exceto para o exterior, '+SEM_ST, ax:'I'},
      {id:'pgRevComST', sn:'rev_com_st', l:'Revenda de mercadorias, exceto para o exterior, '+COM_ST, ax:'I', st:1, stT:['ICMS','PIS','Cofins']},
      {id:'pgRevExp', sn:'rev_exp', l:'Revenda de mercadorias para o exterior', ax:'I', exp:1}
    ]},
    {ax:'II', t:'Venda de mercadorias industrializadas pelo contribuinte', n:'com', ln:[
      {id:'pgIndSemST', sn:'ind_sem_st', l:'Venda de mercadorias industrializadas pelo contribuinte, exceto para o exterior, '+SEM_ST, ax:'II'},
      {id:'pgIndComST', sn:'ind_com_st', l:'Venda de mercadorias industrializadas pelo contribuinte, exceto para o exterior, '+COM_ST, ax:'II', st:1, stT:['ICMS','PIS','Cofins','IPI']},
      {id:'pgIndExp', sn:'ind_exp', l:'Venda de mercadorias industrializadas pelo contribuinte para o exterior', ax:'II', exp:1},
      // IPI + ISS simultâneos: Anexo II sem ICMS + parcela de ISS do Anexo III
      {id:'pgIpiIssProprio', sn:'ipi_iss_proprio', l:'Atividades com incidência simultânea de IPI e de ISS, exceto para o exterior, '+S_PROPRIO, ax:'II', ipiIss:1, n:'serv'},
      {id:'pgIpiIssOutro', sn:'ipi_iss_outro', l:'Atividades com incidência simultânea de IPI e de ISS, exceto para o exterior, '+S_OUTRO, ax:'II', ipiIss:1, n:'serv'},
      {id:'pgIpiIssRet', sn:'ipi_iss_ret', l:'Atividades com incidência simultânea de IPI e de ISS, exceto para o exterior, '+S_RET, ax:'II', ipiIss:1, ret:1, n:'serv'}
    ]},
    {ax:'III', t:'Serviços e locação de bens móveis', s:'atividades não sujeitas ao fator r', n:'serv', ln:[
      {id:'pgLoc', sn:'loc', l:'Locação de bens móveis, exceto para o exterior', ax:'III', semIss:1},
      {id:'pgLocExp', sn:'exp', l:'Locação de bens móveis para o exterior', ax:'III', semIss:1, exp:1},
      {id:'pgServContFixo', sn:'contabil', l:'Escritórios de serviços contábeis autorizados pela legislação municipal a pagar o ISS em valor fixo', ax:'III', issFixo:1},
      {id:'pgServIIIOutro', sn:'a3_outro', l:'Prestação de serviços, exceto para o exterior, não sujeitos ao fator "r" e tributados pelo Anexo III, '+S_OUTRO, ax:'III'},
      {id:'pgServIIIProprio', sn:'a3_proprio', l:'Prestação de serviços, exceto para o exterior, não sujeitos ao fator "r" e tributados pelo Anexo III, '+S_PROPRIO, ax:'III'},
      {id:'pgServIIIRet', sn:'a3_ret', l:'Prestação de serviços, exceto para o exterior, não sujeitos ao fator "r" e tributados pelo Anexo III, '+S_RET, ax:'III', ret:1},
      {id:'pgServExpIII', sn:'exp', l:'Prestação de serviços para o exterior, tributados pelo Anexo III', ax:'III', exp:1},
      {id:'pgCcIIIOutro', sn:'a3_outro', l:'Construção civil (subitens 7.02 e 7.05), exceto para o exterior, tributada pelo Anexo III, '+S_OUTRO, ax:'III'},
      {id:'pgCcIIIProprio', sn:'a3_proprio', l:'Construção civil (subitens 7.02 e 7.05), exceto para o exterior, tributada pelo Anexo III, '+S_PROPRIO, ax:'III'},
      {id:'pgCcIIIRet', sn:'a3_ret', l:'Construção civil (subitens 7.02 e 7.05), exceto para o exterior, tributada pelo Anexo III, '+S_RET, ax:'III', ret:1},
      {id:'pgCcExpIII', sn:'exp', l:'Construção civil (subitens 7.02 e 7.05) para o exterior, tributada pelo Anexo III', ax:'III', exp:1},
      {id:'pgTransp', sn:'transp_mun', l:'Transporte MUNICIPAL de cargas · Anexo III, sem retenção de ISS', ax:'III'},
      {id:'pgTranspRet', sn:'transp_mun_ret', l:'Transporte MUNICIPAL de cargas · Anexo III, com retenção/substituição de ISS', ax:'III', ret:1},
      {id:'pgTranspInter', sn:'transp_inter', l:'Transporte INTERMUNICIPAL/INTERESTADUAL de cargas · Anexo III com ICMS no lugar do ISS (§5º-E da LC 123/2006)', ax:'III', transp:1},
      {id:'pgTranspInterST', sn:'transp_inter_st', l:'Transporte INTERMUNICIPAL/INTERESTADUAL de cargas · com substituição tributária do ICMS (ICMS 0%, sem ISS)', ax:'III', transp:1, transpST:1}
    ]},
    {ax:'IV', t:'Serviços', s:'construção civil, limpeza, vigilância e advocacia', n:'serv', ln:[
      {id:'pgServIVOutro', sn:'a4_outro', l:'Prestação de serviços, exceto para o exterior, sujeitos ao Anexo IV, '+S_OUTRO, ax:'IV'},
      {id:'pgServIVProprio', sn:'a4_proprio', l:'Prestação de serviços, exceto para o exterior, sujeitos ao Anexo IV, '+S_PROPRIO, ax:'IV'},
      {id:'pgServIVRet', sn:'a4_ret', l:'Prestação de serviços, exceto para o exterior, sujeitos ao Anexo IV, '+S_RET, ax:'IV', ret:1},
      {id:'pgServExpIV', sn:'exp', l:'Prestação de serviços para o exterior, tributados pelo Anexo IV', ax:'IV', exp:1},
      {id:'pgCcIVOutro', sn:'a4_outro', l:'Construção civil (subitens 7.02 e 7.05), exceto para o exterior, tributada pelo Anexo IV, '+S_OUTRO, ax:'IV'},
      {id:'pgCcIVProprio', sn:'a4_proprio', l:'Construção civil (subitens 7.02 e 7.05), exceto para o exterior, tributada pelo Anexo IV, '+S_PROPRIO, ax:'IV'},
      {id:'pgCcIVRet', sn:'a4_ret', l:'Construção civil (subitens 7.02 e 7.05), exceto para o exterior, tributada pelo Anexo IV, '+S_RET, ax:'IV', ret:1},
      {id:'pgCcExpIV', sn:'exp', l:'Construção civil (subitens 7.02 e 7.05) para o exterior, tributada pelo Anexo IV', ax:'IV', exp:1}
    ]},
    {ax:'V', fr:1, t:'Serviços sujeitos ao fator r', s:'vão para o Anexo III com folha ≥ 28% da RBT12; abaixo disso, Anexo V', n:'serv', ln:[
      {id:'pgServFrOutro', snIII:'fr_outro', snV:'a5_outro', l:'Prestação de serviços, exceto para o exterior, sujeitos ao fator "r", '+S_OUTRO, fr:1},
      {id:'pgServFrProprio', snIII:'fr_proprio', snV:'a5_proprio', l:'Prestação de serviços, exceto para o exterior, sujeitos ao fator "r", '+S_PROPRIO, fr:1},
      {id:'pgServFrRet', snIII:'fr_ret', snV:'a5_ret', l:'Prestação de serviços, exceto para o exterior, sujeitos ao fator "r", '+S_RET, fr:1, ret:1},
      {id:'pgServExpFr', snIII:'exp', snV:'exp', l:'Prestação de serviços para o exterior, sujeitos ao fator "r"', fr:1, exp:1}
    ]}
  ];
  // nat: a linha pode sobrescrever a natureza do grupo (ex.: IPI+ISS fica no Anexo II,
  // mas o tributo municipal devido é o ISS, então entra como serviço na comparação)
  var PGLINES=[]; PG.forEach(function(g){ g.ln.forEach(function(l){ PGLINES.push({def:l, nat:l.n||g.n}); }); });
  var PGIDS=PGLINES.map(function(x){ return x.def.id; });
  // quais tributos estão sob ST/monofásica/antecipação em cada linha: a ST não é só de ICMS —
  // PIS e Cofins monofásicos (combustíveis, medicamentos, cosméticos, bebidas frias, autopeças, pneus)
  // e o IPI também podem já ter sido recolhidos antes e saem do DAS.
  var TRIBLABEL={ICMS:'ICMS',PIS:'PIS',Cofins:'COFINS',IPI:'IPI'};
  var CHECKFIELDS=[];
  PGLINES.forEach(function(x){ if(x.def.stT) x.def.stT.forEach(function(t){ CHECKFIELDS.push(x.def.id+'_'+t); }); });
  function stMarcados(d){
    var out={};
    if(d.stT) d.stT.forEach(function(t){ var c=document.getElementById(d.id+'_'+t); if(c&&c.checked) out[t]=1; });
    else if(d.st) out.ICMS=1;
    return out;
  }

  // campos numéricos/select que recalculam e são salvos por cliente
  var NUMFIELDS=['ano','rbt12','rbt12Exp','rba','rbaExp','mesesAtiv','folha12','proLabore12','b2b','b2bIcms',
    'credIcms','custo',
    'cbs','ibs','cpp','inssProSeg','inssProPat','cppIV','icms','iss',
    'presIrpjCom','presCsllCom','presIrpjServ','presCsllServ'].concat(PGIDS);

  var DEFAULTS={ano:2027,rbt12:600000,rbt12Exp:0,rba:600000,rbaExp:0,mesesAtiv:0,folha12:0,proLabore12:0,b2b:60,b2bIcms:60,
    credIcms:0,custo:300,cbs:9.21,ibs:18.70,cpp:28,inssProSeg:11,inssProPat:20,cppIV:22,icms:18,iss:5,
    presIrpjCom:8,presCsllCom:12,presIrpjServ:32,presCsllServ:32};
  PGIDS.forEach(function(id){ DEFAULTS[id]=0; });
  DEFAULTS.pgRevSemST=50000;

  function tagsFor(d){
    var t=[];
    if(d.exp) t.push('exportação: sem PIS/Cofins, ICMS, ISS e IPI no DAS e sem IBS/CBS');
    if(d.ipiIss) t.push('Anexo II sem ICMS + parcela de ISS do Anexo III');
    if(d.st && !d.stT) t.push('ICMS fora do DAS');
    if(d.ret) t.push('ISS fora do DAS');
    if(d.issFixo) t.push('ISS fixo no município, fora do DAS');
    if(d.semIss) t.push('sem ISS');
    return t.length?'<span class="tags">'+t.join(' · ')+'</span>':'';
  }
  // faixa de seleção dos tributos já recolhidos antes (ST, monofásica ou antecipação)
  function stBoxHtml(d){
    if(!d.stT) return '';
    var h='<div class="pg-st"><span class="stt">Já recolhido antes, sai do DAS:</span>';
    d.stT.forEach(function(t){
      h+='<label for="'+d.id+'_'+t+'"><input type="checkbox" id="'+d.id+'_'+t+'"'+(t==='ICMS'?' checked':'')+'>'+TRIBLABEL[t]+'</label>';
    });
    return h+'<span id="'+d.id+'_stmsg" style="color:var(--muted)"></span></div>';
  }
  /* Linhas extras com ST/monofásica.
     Uma mesma empresa pode ter venda com ICMS-ST e, em outra venda, PIS/Cofins
     monofásicos. Numa linha só o contador teria de marcar todos os tributos e a
     exclusão sairia maior que a real, então cada combinação ganha a sua linha. */
  var stExtras=[];   // [{k, id:<idDaLinhaBase>, valor:'0,00', t:{ICMS:1,...}}]
  var stSeq=0;
  function extrasDe(lineId){ return stExtras.filter(function(e){ return e.id===lineId; }); }
  function defDaLinha(lineId){
    for(var i=0;i<PGLINES.length;i++) if(PGLINES[i].def.id===lineId) return PGLINES[i].def;
    return null;
  }
  function renderStExtras(lineId){
    var wrap=document.getElementById('stx_'+lineId); if(!wrap) return;
    var d=defDaLinha(lineId), h='';
    extrasDe(lineId).forEach(function(e){
      h+='<div class="pg-line stx-line" data-k="'+e.k+'">'+
         '<span class="stx-l">Outra venda com ST ou monofásica<small>mesma atividade, com tributos já recolhidos diferentes</small></span>'+
         '<div class="inp"><span class="pre">R$</span><input class="has-pre stx-val" type="text" inputmode="decimal" autocomplete="off" value="'+e.valor+'"></div>'+
         '<div class="pg-st"><span class="stt">Já recolhido antes, sai do DAS:</span>';
      d.stT.forEach(function(t){
        h+='<label><input type="checkbox" class="stx-chk" data-t="'+t+'"'+(e.t[t]?' checked':'')+'>'+TRIBLABEL[t]+'</label>';
      });
      h+='<span class="stx-msg" style="color:var(--muted)"></span>'+
         '<button class="stx-del" type="button" title="Remover linha">✕</button></div></div>';
    });
    h+='<button class="stx-add" type="button" data-line="'+lineId+'">+ Adicionar outra venda com ST ou monofásica</button>';
    wrap.innerHTML=h;
    ligarStExtras(lineId);
  }
  function ligarStExtras(lineId){
    var wrap=document.getElementById('stx_'+lineId); if(!wrap) return;
    wrap.querySelector('.stx-add').addEventListener('click',function(){
      var d=defDaLinha(lineId), t={};
      d.stT.forEach(function(x){ t[x]=(x==='ICMS')?1:0; });   // padrão: só ICMS-ST marcado
      stExtras.push({k:++stSeq, id:lineId, valor:fmtNum(0), t:t});
      renderStExtras(lineId); calc(); refreshPgdas(false);
      var campos=wrap.querySelectorAll('.stx-val');
      if(campos.length) campos[campos.length-1].focus();
    });
    [].forEach.call(wrap.querySelectorAll('.stx-line'),function(row){
      var k=parseInt(row.getAttribute('data-k'),10);
      var e=stExtras.filter(function(x){ return x.k===k; })[0]; if(!e) return;
      var v=row.querySelector('.stx-val');
      v.addEventListener('input',function(){ moneyInput(v); e.valor=v.value; calc(); refreshPgdas(false); });
      v.addEventListener('focus',function(){ v.select(); });
      v.addEventListener('blur',function(){ v.value=fmtNum(parseBR(v.value)); e.valor=v.value; calc(); refreshPgdas(false); });
      [].forEach.call(row.querySelectorAll('.stx-chk'),function(c){
        c.addEventListener('change',function(){ e.t[c.getAttribute('data-t')]=c.checked?1:0; calc(); refreshPgdas(false); });
      });
      row.querySelector('.stx-del').addEventListener('click',function(){
        stExtras=stExtras.filter(function(x){ return x.k!==k; });
        renderStExtras(lineId); calc(); refreshPgdas(false);
      });
    });
  }
  function renderPgdas(){
    var h='';
    PG.forEach(function(g,gi){
      h+='<details class="pg-g" id="pgg'+gi+'"><summary><span class="cr">▸</span>'+
         '<span class="pg-b" id="pggb'+gi+'">'+g.ax+'</span>'+
         '<span class="gt">Anexo '+g.ax+' · '+g.t+(g.s?'<small id="pggs'+gi+'">'+g.s+'</small>':'')+'</span>'+
         '<span class="gv" id="pggv'+gi+'">R$ 0,00</span></summary>';
      g.ln.forEach(function(l){
        h+='<div class="pg-line"><label for="'+l.id+'">'+l.l+tagsFor(l)+'</label>'+
           '<div class="inp"><span class="pre">R$</span><input id="'+l.id+'" class="has-pre" type="text" inputmode="decimal" autocomplete="off" value="'+fmtNum(DEFAULTS[l.id])+'"></div>'+
           stBoxHtml(l)+'</div>';
        if(l.stT) h+='<div class="stx-wrap" id="stx_'+l.id+'"></div>';
      });
      h+='</details>';
    });
    document.getElementById('pgdas').innerHTML=h;
    PGLINES.forEach(function(x){ if(x.def.stT) renderStExtras(x.def.id); });
  }
  /* Início de atividade (< 12 meses): a RBT12 é estimada pela média mensal × 12.
     Vale para cada mercado com a RBA do próprio mercado. */
  function rbt12Anualizada(rbt12, rba, meses){
    return (meses>=1 && meses<12 && rba>0) ? (rba/meses)*12 : rbt12;
  }
  /* RBT12r do fator "r": aqui os dois mercados entram CONJUNTAMENTE (art. 26, inciso II
     e § 5º, V da Resolução CGSN 140/2018) — ao contrário da alíquota, que é separada. */
  function rbt12rDaTela(){
    var meses=val('mesesAtiv');
    return rbt12Anualizada(val('rbt12'),val('rba'),meses) + rbt12Anualizada(val('rbt12Exp'),val('rbaExp'),meses);
  }
  // subtotais por anexo + destaque das linhas preenchidas; abre os anexos que têm receita
  function refreshPgdas(autoOpen){
    var tot=0, folha12=val('folha12'), proLabore12=val('proLabore12');
    var rbtUsed=rbt12rDaTela();
    var folhaFR=folha12+proLabore12;   // o Fator R considera folha de empregados + pró-labore
    var fr=rbtUsed>0?folhaFR/rbtUsed:0, axFr=fr>=0.28?'III':'V';
    PG.forEach(function(g,gi){
      var s=0;
      g.ln.forEach(function(l){
        var v=val(l.id), el=document.getElementById(l.id); s+=v;
        if(el) el.closest('.pg-line').classList.toggle('on',v>0);
        if(l.stT){ // avisa se declarou receita com ST mas não marcou nenhum tributo
          var m=document.getElementById(l.id+'_stmsg'), n=Object.keys(stMarcados(l)).length;
          if(m) m.textContent=(v>0&&n===0)?'Nenhum tributo marcado: esta linha está sendo calculada como se não houvesse ST.':'';
          // as linhas extras somam no mesmo anexo e recebem o mesmo aviso
          var wrap=document.getElementById('stx_'+l.id);
          extrasDe(l.id).forEach(function(e){
            var vx=parseBR(e.valor); s+=vx;
            var row=wrap&&wrap.querySelector('.stx-line[data-k="'+e.k+'"]');
            if(row){
              row.classList.toggle('on',vx>0);
              var msg=row.querySelector('.stx-msg'), marcados=Object.keys(e.t).filter(function(t){return e.t[t];}).length;
              if(msg) msg.textContent=(vx>0&&marcados===0)?'Nenhum tributo marcado nesta linha.':'';
            }
          });
        }
      });
      tot+=s;
      var box=document.getElementById('pgg'+gi);
      document.getElementById('pggv'+gi).textContent='R$ '+fmtNum(s);
      box.classList.toggle('has-v',s>0);
      if(g.fr){ // o anexo do fator r só se define com a folha: mostra a resolução ao vivo
        document.getElementById('pggb'+gi).textContent=axFr;
        document.getElementById('pggs'+gi).textContent='Fator R '+pct(fr)+' → tributado pelo Anexo '+axFr+
          (axFr==='III'?' (folha + pró-labore ≥ 28% da RBT12)':' (folha + pró-labore abaixo de 28% da RBT12)');
      }
      if(autoOpen && s>0) box.open=true;
    });
    if(autoOpen && tot<=0) document.getElementById('pgg0').open=true;
    document.getElementById('pgdasTot').innerHTML='Receita total declarada no mês <b>R$ '+fmtNum(tot)+'</b>';
    return tot;
  }
  renderPgdas(); // cria os campos antes de qualquer leitura/listener

  /* ===== atividades beneficiadas (catálogo da LC 214/2025) =====
     O contador escolhe pelo nome e o percentual de redução da ALÍQUOTA vem junto.
     Nada aqui mexe na base de cálculo: a base segue sendo a receita cheia. */
  var benItens=[];            // [{id, valor:'0,00', pct, tipo:'prod'|'serv'}]
  var benSeq=0;

  // rótulo do grupo no seletor, para qualquer percentual da lei (100, 70, 60, 50, 40, 30...)
  function grupoDoBeneficio(pct){
    if(pct>=100) return 'Não paga IBS/CBS (alíquota zero)';
    return 'Paga só '+Math.round(100-pct)+'% (redução de '+Math.round(pct)+'%)';
  }
  function seloDoBeneficio(cat,pct){
    if(pct>=100) return '<span class="ben-selo">isento'+(cat&&cat.base?' <small>'+(cat.tipo==='serv'?'serviço':'produto')+' · '+cat.base+'</small>':'')+'</span>';
    return '<span class="ben-selo">−'+Math.round(pct)+'%'+(cat&&cat.base?' <small>'+(cat.tipo==='serv'?'serviço':'produto')+' · '+cat.base+'</small>':'')+'</span>';
  }
  function opcoesBeneficio(sel){
    var grupos={}, ordem=[];
    REFORMA.BENEFICIOS.forEach(function(b){
      var g=b.livre?'Outro caso':grupoDoBeneficio(b.pct);
      if(!grupos[g]){ grupos[g]=[]; ordem.push(g); }
      grupos[g].push(b);
    });
    var h='';
    ordem.forEach(function(g){
      h+='<optgroup label="'+g+'">';
      grupos[g].forEach(function(b){
        h+='<option value="'+b.id+'"'+(b.id===sel?' selected':'')+'>'+esc(b.nome)+'</option>';
      });
      h+='</optgroup>';
    });
    return h;
  }
  /* Em qual base a receita beneficiada foi declarada. O catálogo dá o padrão da lei,
     mas quem manda é a linha do PGDAS-D: restaurante de Anexo I declara como produto
     mesmo o benefício de hotelaria/restaurantes, que a LC classifica como serviço. */
  function tipoDoItem(it){
    if(it && (it.tipo==='prod'||it.tipo==='serv')) return it.tipo;
    var cat=REFORMA.beneficioPorId(it&&it.id);
    return cat&&cat.tipo==='serv'?'serv':'prod';
  }
  function renderBeneficios(){
    var lista=document.getElementById('benLista'); if(!lista) return;
    lista.innerHTML=benItens.map(function(it,i){
      var cat=REFORMA.beneficioPorId(it.id);
      var pct=it.pct!=null?it.pct:(cat?cat.pct:0);
      var tipo=tipoDoItem(it);
      return '<div class="ben-row" data-i="'+i+'">'+
        '<select class="ben-sel">'+opcoesBeneficio(it.id)+'</select>'+
        '<select class="ben-tipo" title="Em qual base essa receita foi declarada no PGDAS-D. O benefício só desconta a base do mesmo tipo.">'+
          '<option value="prod"'+(tipo==='prod'?' selected':'')+'>produto</option>'+
          '<option value="serv"'+(tipo==='serv'?' selected':'')+'>serviço</option>'+
        '</select>'+
        '<div class="inp"><span class="pre">R$</span><input class="ben-val has-pre" type="text" inputmode="decimal" value="'+it.valor+'"></div>'+
        (cat&&cat.livre
          ? '<span class="ben-selo">−<input class="ben-pct" type="text" inputmode="decimal" value="'+fmtNum(pct)+'"> %</span>'
          : seloDoBeneficio(cat,pct))+
        '<button class="ben-del" type="button" title="Remover">✕</button>'+
      '</div>';
    }).join('');
    ligarBeneficios();
    atualizaResumoBeneficios();
  }
  function ligarBeneficios(){
    var lista=document.getElementById('benLista');
    [].forEach.call(lista.querySelectorAll('.ben-row'),function(row){
      var i=parseInt(row.getAttribute('data-i'),10);
      row.querySelector('.ben-sel').addEventListener('change',function(){
        benItens[i].id=this.value;
        var cat=REFORMA.beneficioPorId(this.value);
        benItens[i].pct=cat?cat.pct:0;      // ao trocar a atividade, o percentual da lei vem junto
        benItens[i].tipo=cat&&cat.tipo==='serv'?'serv':'prod';   // e a base padrão dela também
        renderBeneficios(); calc();
      });
      var tp=row.querySelector('.ben-tipo');
      if(tp) tp.addEventListener('change',function(){
        benItens[i].tipo=this.value==='serv'?'serv':'prod';
        atualizaResumoBeneficios(); calc();
      });
      var val0=row.querySelector('.ben-val');
      val0.addEventListener('input',function(){
        moneyInput(val0); benItens[i].valor=val0.value; atualizaResumoBeneficios(); calc();
      });
      val0.addEventListener('focus',function(){ val0.select(); });
      val0.addEventListener('blur',function(){ val0.value=fmtNum(parseBR(val0.value)); benItens[i].valor=val0.value; calc(); });
      var p=row.querySelector('.ben-pct');
      if(p){
        p.addEventListener('input',function(){ applyMask(p,pctTyping,RE_NUM); benItens[i].pct=parseBR(p.value); atualizaResumoBeneficios(); calc(); });
        p.addEventListener('blur',function(){ var n=Math.max(0,Math.min(100,parseBR(p.value))); p.value=fmtNum(n); benItens[i].pct=n; calc(); });
      }
      row.querySelector('.ben-del').addEventListener('click',function(){
        benItens.splice(i,1); renderBeneficios(); calc();
      });
    });
  }
  function num0(v){ return typeof v==='number'&&isFinite(v)?v:0; }
  /** quanto de base cada fatia realmente desconta de alíquota */
  function descontoDasParcelas(parc){
    return (parc||[]).reduce(function(s,p){ return s+num0(p.base)*num0(p.reducao); },0);
  }

  /** resumo: quanto de faturamento tem benefício e quanto isso vira de imposto a menos.
      O benefício só desconta a base do MESMO tipo (produto x serviço) e nunca passa da
      receita tributável daquela base. O que sobra é ignorado pelo cálculo, então tem que
      aparecer na tela em vez de virar economia imaginária. */
  function atualizaResumoBeneficios(){
    var totalBase=0, informado={prod:0,serv:0};
    benItens.forEach(function(it){
      var cat=REFORMA.beneficioPorId(it.id);
      var pct=it.pct!=null?it.pct:(cat?cat.pct:0);
      var v=parseBR(it.valor);
      if(v>0&&pct>0){ totalBase+=v; informado[tipoDoItem(it)]+=v; }
    });
    document.getElementById('benTot').textContent=BRL.format(totalBase);

    // receita tributável de cada base e o desconto que o motor de fato aplicou
    var tribProd=0, tribServ=0, deixaDePagar=0, temParams=false;
    try{
      var P=readParams();
      tribProd=num0(P.ctx.tribMerc); tribServ=num0(P.ctx.tribServ);
      deixaDePagar=descontoDasParcelas(P.ctx.parcMerc)+descontoDasParcelas(P.ctx.parcServ);
      temParams=true;
    }catch(e){ deixaDePagar=0; }

    var cbs=val('cbs')/100, ibs=val('ibs')/100;
    var ano=parseInt(document.getElementById('ano').value,10);
    var ibsY=(ano<=2028)?0.001:ibs*(REFORMA.IBS_FRAC[ano]||0);
    var economia=deixaDePagar*(cbs+ibsY);

    document.getElementById('benNota').innerHTML = totalBase>0
      ? 'Com o IBS/CBS de '+pct2(cbs+ibsY)+' em '+ano+', a alíquota reduzida deixa cerca de <b>'+BRL.format(economia)+
        '</b> de imposto a menos no mês, e isso <b>só aparece se a empresa sair da guia única</b>. A base de cálculo continua cheia.'
      : 'Sem atividade beneficiada informada. Se o cliente vende cesta básica, medicamentos, serviços de saúde, educação ou é de profissão regulamentada, informe aqui: a alíquota cai e o resultado do regime híbrido melhora.';

    var box=document.getElementById('benAviso');
    if(!box) return;
    var avisos=[];
    if(temParams && informado.prod-tribProd>0.01) avisos.push({b:'produto',v:informado.prod-tribProd,t:tribProd});
    if(temParams && informado.serv-tribServ>0.01) avisos.push({b:'serviço',v:informado.serv-tribServ,t:tribServ});
    if(!avisos.length){ box.style.display='none'; box.innerHTML=''; return; }
    box.style.display='';
    box.innerHTML=avisos.map(function(a){
      return 'Você informou <b>'+BRL.format(a.v)+'</b> de benefício além da receita tributável de <b>'+a.b+
             '</b> do mês (<b>'+BRL.format(a.t)+'</b>): esse excedente <b>não entra no cálculo</b>. '+
             (a.t<=0
               ? 'Não há receita de '+a.b+' declarada no PGDAS-D. Troque a base da atividade na coluna ao lado ou lance a receita na linha certa.'
               : 'Confira o valor ou a base (produto x serviço) escolhida na coluna ao lado.');
    }).join('<br>');
  }
  function pct2(x){ return (x*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%'; }

  /* ===== compras que geram crédito de IBS/CBS =====
     Aqui entra a BASE (valor das compras): o crédito sai da alíquota aplicada sobre ela.
     O crédito de ICMS é informado à parte, em reais, porque depende da origem e da ST. */
  var cmpItens=[];
  function renderCompras(){
    var lista=document.getElementById('cmpLista'); if(!lista) return;
    lista.innerHTML=cmpItens.map(function(it,i){
      return '<div class="cmp-row" data-i="'+i+'">'+
        '<select class="cmp-sel">'+REFORMA.COMPRAS.map(function(c){
          return '<option value="'+c.id+'"'+(c.id===it.id?' selected':'')+'>'+esc(c.nome)+'</option>';
        }).join('')+'</select>'+
        '<div class="inp"><span class="pre">R$</span><input class="cmp-val has-pre" type="text" inputmode="decimal" value="'+it.valor+'"></div>'+
        '<button class="ben-del" type="button" title="Remover">✕</button>'+
      '</div>';
    }).join('');
    [].forEach.call(lista.querySelectorAll('.cmp-row'),function(row){
      var i=parseInt(row.getAttribute('data-i'),10);
      row.querySelector('.cmp-sel').addEventListener('change',function(){ cmpItens[i].id=this.value; });
      var v=row.querySelector('.cmp-val');
      v.addEventListener('input',function(){ moneyInput(v); cmpItens[i].valor=v.value; atualizaResumoCompras(); calc(); });
      v.addEventListener('focus',function(){ v.select(); });
      v.addEventListener('blur',function(){ v.value=fmtNum(parseBR(v.value)); cmpItens[i].valor=v.value; calc(); });
      row.querySelector('.ben-del').addEventListener('click',function(){ cmpItens.splice(i,1); renderCompras(); calc(); });
    });
    atualizaResumoCompras();
  }
  function totalCompras(){
    return cmpItens.reduce(function(s,it){ return s+parseBR(it.valor); },0);
  }

  /* ===== benefícios estaduais de ICMS (Lucro Presumido) =====
     Isenção, diferimento, suspensão e não incidência zeram o ICMS da parcela;
     na redução da base o contador informa o percentual, que varia por estado. */
  var icmsItens=[];   // [{id, valor:'0,00', pct}]
  function opcoesBenefIcms(sel){
    return REFORMA.BENEF_ICMS.map(function(b){
      return '<option value="'+b.id+'"'+(b.id===sel?' selected':'')+'>'+esc(b.nome)+'</option>';
    }).join('');
  }
  function renderBenefIcms(){
    var lista=document.getElementById('icmsLista'); if(!lista) return;
    lista.innerHTML=icmsItens.map(function(it,i){
      var cat=REFORMA.beneficioIcmsPorId(it.id);
      var p=it.pct!=null?it.pct:(cat?cat.pct:0);
      return '<div class="ben-row icms-row" data-i="'+i+'">'+
        '<select class="icms-sel">'+opcoesBenefIcms(it.id)+'</select>'+
        '<div class="inp"><span class="pre">R$</span><input class="icms-val has-pre" type="text" inputmode="decimal" value="'+it.valor+'"></div>'+
        (cat&&cat.livre
          ? '<span class="ben-selo">−<input class="icms-pct" type="text" inputmode="decimal" value="'+fmtNum(p)+'"> %</span>'
          : '<span class="ben-selo">sem ICMS</span>')+
        '<button class="ben-del" type="button" title="Remover">✕</button>'+
      '</div>';
    }).join('');
    ligarBenefIcms();
    atualizaResumoBenefIcms();
  }
  function ligarBenefIcms(){
    var lista=document.getElementById('icmsLista');
    [].forEach.call(lista.querySelectorAll('.ben-row'),function(row){
      var i=parseInt(row.getAttribute('data-i'),10);
      row.querySelector('.icms-sel').addEventListener('change',function(){
        icmsItens[i].id=this.value;
        var cat=REFORMA.beneficioIcmsPorId(this.value);
        icmsItens[i].pct=cat?cat.pct:0;
        renderBenefIcms(); calc();
      });
      var v=row.querySelector('.icms-val');
      v.addEventListener('input',function(){ moneyInput(v); icmsItens[i].valor=v.value; atualizaResumoBenefIcms(); calc(); });
      v.addEventListener('focus',function(){ v.select(); });
      v.addEventListener('blur',function(){ v.value=fmtNum(parseBR(v.value)); icmsItens[i].valor=v.value; calc(); });
      var p=row.querySelector('.icms-pct');
      if(p){
        p.addEventListener('input',function(){ applyMask(p,pctTyping,RE_NUM); icmsItens[i].pct=parseBR(p.value); atualizaResumoBenefIcms(); calc(); });
        p.addEventListener('blur',function(){ var n=Math.max(0,Math.min(100,parseBR(p.value))); p.value=fmtNum(n); icmsItens[i].pct=n; calc(); });
      }
      row.querySelector('.ben-del').addEventListener('click',function(){
        icmsItens.splice(i,1); renderBenefIcms(); calc();
      });
    });
  }
  function atualizaResumoBenefIcms(){
    var base=0, deixa=0;
    icmsItens.forEach(function(it){
      var cat=REFORMA.beneficioIcmsPorId(it.id);
      var p=it.pct!=null?it.pct:(cat?cat.pct:0), v=parseBR(it.valor);
      if(v>0&&p>0){ base+=v; deixa+=v*p/100; }
    });
    document.getElementById('icmsBenTot').textContent=BRL.format(base);
    var aliq=val('icms')/100;
    document.getElementById('icmsBenNota').innerHTML = base>0
      ? 'Com o ICMS de '+pct(aliq)+', esses benefícios deixam cerca de <b>'+BRL.format(deixa*aliq)+
        '</b> de ICMS a menos no mês, <b>só no Lucro Presumido</b>. Atenção: isenção e redução de base costumam exigir o <b>estorno proporcional do crédito</b> (art. 155, §2º, II da CF). Se for o caso, reduza o crédito de ICMS informado acima.'
      : 'Sem benefício de ICMS informado. Se o cliente tem isenção, diferimento, suspensão ou redução da base em parte das vendas, informe aqui: no Lucro Presumido isso muda bastante a conta.';
  }
  function atualizaResumoCompras(){
    var tot=totalCompras();
    document.getElementById('cmpTot').textContent=BRL.format(tot);
    var ano=parseInt(document.getElementById('ano').value,10);
    var ibsY=(ano<=2028)?0.001:(val('ibs')/100)*(REFORMA.IBS_FRAC[ano]||0);
    var aliq=val('cbs')/100+ibsY;
    document.getElementById('cmpNota').innerHTML = tot>0
      ? 'Com o IBS/CBS de '+pct2(aliq)+' em '+ano+', essas compras geram <b>'+BRL.format(tot*aliq)+
        '</b> de crédito no mês, que desconta do imposto a pagar fora da guia única.'
      : 'Sem compras informadas. Quem compra de fornecedor que destaca IBS/CBS tem crédito, e isso pesa a favor de sair da guia única.';
  }
  function atualizaNotaCredIcms(){
    var c=parseBR(document.getElementById('credIcms').value);
    document.getElementById('credIcmsNota').innerHTML = c>0
      ? 'Esse crédito abate o ICMS devido no Lucro Presumido. Na transição ele acompanha a redução do próprio ICMS, que cai 10% ao ano e é extinto em 2033.'
      : 'Informe o crédito de ICMS apurado no mês, se houver. Deixe zero se a empresa não credita ICMS.';
  }

  function toggleAtividade(){}

  // Monta as seções no formato do motor SN a partir das atividades declaradas.
  // O `exclui` sai da própria segregação (SN.segExclui); só a linha "com ST" usa
  // os tributos marcados pelo usuário, porque a ST não é sempre só de ICMS.
  function montarSecoes(rbt12Int, rbt12Exp, axFr){
    var out=[];
    PGLINES.forEach(function(x){
      var d=x.def, rec=val(d.id); if(rec<=0) return;
      var ax=d.fr?axFr:d.ax;
      var seg=d.fr?(axFr==='III'?d.snIII:d.snV):d.sn;
      var exclui=SN.segExclui(ax,seg);
      if(d.stT){ exclui=Object.keys(stMarcados(d)); }   // ST/monofásica escolhida linha a linha
      // Art. 23 da Res. CGSN 140/2018: a linha de exportação acha a faixa na RBT12 do
      // mercado externo, não na do interno. São duas escadas de alíquota independentes.
      out.push({anexo:ax, rbt12:(d.exp?rbt12Exp:rbt12Int), receitaBruta:rec, segregacao:seg, exclui:exclui,
                transpICMS:!!d.transp, transpICMSst:!!d.transpST, ipiIss:!!d.ipiIss, nat:x.nat, def:d});
      // cada linha extra de ST entra como uma seção própria: mesma segregação,
      // mas com o seu próprio conjunto de tributos já recolhidos antes
      extrasDe(d.id).forEach(function(e){
        var rx=parseBR(e.valor); if(rx<=0) return;
        var ex=Object.keys(e.t).filter(function(t){ return e.t[t]; });
        out.push({anexo:ax, rbt12:(d.exp?rbt12Exp:rbt12Int), receitaBruta:rx, segregacao:seg, exclui:ex,
                  transpICMS:!!d.transp, transpICMSst:!!d.transpST, ipiIss:!!d.ipiIss, nat:x.nat, def:d, extra:e});
      });
    });
    return out;
  }

  function readParams(){
    var rbt12in=val('rbt12'), rba=val('rba'), meses=val('mesesAtiv'), folha12=val('folha12'), proLabore12=val('proLabore12');
    var rbt12ExpIn=val('rbt12Exp'), rbaExp=val('rbaExp');
    var inssProSegRate=val('inssProSeg')/100;    // INSS do sócio (segurado): recolhido em GPS nos três regimes
    var inssProPatRate=val('inssProPat')/100;    // INSS patronal: no Simples já está no DAS, só pesa no Lucro Presumido
    // início de atividade (< 12 meses): RBT12 estimada pela média mensal × 12, por mercado
    var rbt12used = rbt12Anualizada(rbt12in, rba, meses);
    var rbt12ExpUsed = rbt12Anualizada(rbt12ExpIn, rbaExp, meses);
    // fator "r": os dois mercados entram juntos (art. 26, § 5º, V da Res. CGSN 140/2018)
    var rbt12r = rbt12used + rbt12ExpUsed;
    // o Fator R soma a folha dos empregados com o pró-labore dos sócios
    var fatorR=rbt12r>0?(folha12+proLabore12)/rbt12r:0;
    var proLaboreMes=proLabore12/12;
    var inssProSeg=proLaboreMes*inssProSegRate;  // 11% do sócio, por mês (guia única, por fora e Lucro Presumido)
    var inssProPat=proLaboreMes*inssProPatRate;  // 20% patronais, por mês (Lucro Presumido: folha e pró-labore inteiros)
    var cppIVRate=val('cppIV')/100;              // CPP 20% + RAT sobre a folha no Anexo IV (sem terceiros)
    var icms=val('icms')/100, iss=val('iss')/100;
    var compras=totalCompras();                 // base do crédito de IBS/CBS
    var credIcms=val('credIcms');               // crédito de ICMS informado em reais
    var servVName=fatorR>=0.28?'III':'V';

    var secoes=montarSecoes(rbt12used,rbt12ExpUsed,servVName);
    var ap=SN.calcularApuracao(secoes);            // ← DAS pelo mesmo motor do sistema

    // Limite e sublimite valem por mercado, e a exportação tem os seus, do mesmo valor
    // (art. 2º, § 1º e art. 9º, § 1º da Res. CGSN 140/2018; art. 24, § 8º). Somar os dois
    // mercados num número só reprova exportador que não estourou nada.
    // O sublimite que muda o cálculo é o do mercado interno: ICMS/ISS saem do DAS e entram
    // pela alíquota regular. Na exportação não há ICMS/ISS a sair — a receita é imune.
    var subl = rba>3600000 || rbt12used>3600000;
    var sublExp = rbaExp>3600000 || rbt12ExpUsed>3600000;
    var overInt = rba>4800000 || rbt12used>4800000;
    var overExp = rbaExp>4800000 || rbt12ExpUsed>4800000;
    var overLimit = overInt || overExp;
    var baseIcmsReg=0, baseIssReg=0, aliqAx={}, aliqAxExp={}, temFr=false, expCom=0, expServ=0, fatCom=0, fatServ=0, fatIV=0;
    secoes.forEach(function(s,i){
      var d=s.def, det=ap.detalhes[i]||{}, ex=s.exclui||[];
      if(d.exp) aliqAxExp[s.anexo]=det.efetivaCheia||0; else aliqAx[s.anexo]=det.efetivaCheia||0;
      if(d.fr) temFr=true;
      if(s.anexo==='IV') fatIV+=s.receitaBruta;   // no Anexo IV a CPP patronal fica FORA do DAS
      // usa exatamente a mesma classificação do motor, senão a tela e o cálculo divergem:
      // a presunção segue "é mercadoria?" e a base de consumo segue "recolhe ICMS?"
      var ehMerc=REFORMA.ehMercadoria(s.anexo,s.segregacao);
      if(ehMerc){ fatCom+=s.receitaBruta; if(d.exp) expCom+=s.receitaBruta; }
      else { fatServ+=s.receitaBruta; if(d.exp) expServ+=s.receitaBruta; }
      if(!d.exp){
        if(REFORMA.ehIcms(s.anexo,s.segregacao)){ if(ex.indexOf('ICMS')<0) baseIcmsReg+=s.receitaBruta; }
        else { if(ex.indexOf('ISS')<0) baseIssReg+=s.receitaBruta; }
      }
    });
    var tot={}; SN.TRIBUTOS.forEach(function(t){ tot[t]=(ap.totalTributos||{})[t]||0; });
    var guDas=ap.totalDAS;
    if(subl){
      // no sublimite o ICMS sai do DAS: débito pela alíquota regular, menos o crédito informado
      var icmsReg=Math.max(0,baseIcmsReg*icms-credIcms), issReg=baseIssReg*iss;
      guDas+=icmsReg-tot.ICMS+issReg-tot.ISS;
      tot.ICMS=icmsReg; tot.ISS=issReg;
    }

    // atividades beneficiadas escolhidas na tela: o motor consolida e o percentual
    // entra reduzindo a ALÍQUOTA de cada parcela, nunca a base de cálculo
    var itens=benItens.map(function(it){
      var cat=REFORMA.beneficioPorId(it.id);
      return { id:it.id, valor:parseBR(it.valor), pct:(it.pct!=null?it.pct:(cat?cat.pct:0)),
               tipo:tipoDoItem(it) };
    }).filter(function(it){ return it.valor>0 && it.pct>0; });

    var prem=REFORMA.consolidar({
      cbs:val('cbs'), ibs:val('ibs'), icms:val('icms'), iss:val('iss'), cpp:val('cpp'),
      b2b:val('b2b'), b2bIcms:val('b2bIcms'), compras:compras, credIcms:credIcms, custo:val('custo'), folha:folha12/12,
      presIrpjMerc:val('presIrpjCom'), presCsllMerc:val('presCsllCom'),
      presIrpjServ:val('presIrpjServ'), presCsllServ:val('presCsllServ'),
      benItens:itens,
      icmsItens:icmsItens.map(function(it){
        var cat=REFORMA.beneficioIcmsPorId(it.id);
        return {id:it.id, valor:parseBR(it.valor), pct:(it.pct!=null?it.pct:(cat?cat.pct:0))};
      })
    });
    var redProdPct=(prem.pctRedProd||0)/100, redServPct=(prem.pctRedServ||0)/100;
    var ctx=REFORMA.contexto({detalhes:ap.detalhes,totalTributos:tot,totalDAS:guDas,totalReceita:ap.totalReceita}, secoes, prem);
    ctx.baseIcms=baseIcmsReg; ctx.baseIss=baseIssReg;   // bases do Presumido já apuradas acima

    /* Anexo IV: a CPP patronal não entra no DAS (LC 123/2006, art. 18, §5º-C), então a
       empresa recolhe por fora 20%+RAT sobre a folha e 20% sobre o pró-labore mesmo
       continuando no Simples. Com receita de mais de um anexo, rateia-se pela receita. */
    var recMes=fatCom+fatServ;
    var pesoIV=recMes>0 ? fatIV/recMes : 0;
    var cppIVFolha=(folha12/12)*cppIVRate*pesoIV;
    var cppIVPro=proLaboreMes*inssProPatRate*pesoIV;

    return {
      ctx:ctx, prem:prem, secoes:secoes, apuracao:ap,
      fatCom:fatCom, fatServ:fatServ, expCom:expCom, expServ:expServ, b2b:prem.b2b/100,
      b2bIcms:(prem.b2bIcms!=null?prem.b2bIcms:prem.b2b)/100,
      tribCom:ctx.tribMerc, tribServ:ctx.tribServ, baseCom:ctx.baseMerc, baseServ:ctx.baseServ,
      benZeroProd:prem.benZeroProd, benRedProd:prem.benRedProd, redProdPct:redProdPct,
      benZeroServ:prem.benZeroServ, benRedServ:prem.benRedServ, redServPct:redServPct,
      baseIcmsReg:baseIcmsReg, baseIssReg:baseIssReg,
      icmsBenefInformado:prem.icmsBenefValor||0, icmsBenefPctMedio:(prem.icmsBenefPct||0)/100,
      rbt12:rbt12in, rbt12used:rbt12used, rba:rba, meses:meses, subl:subl, overLimit:overLimit,
      rbt12Exp:rbt12ExpIn, rbt12ExpUsed:rbt12ExpUsed, rbaExp:rbaExp, rbt12r:rbt12r,
      sublExp:sublExp, overInt:overInt, overExp:overExp,
      faixaExp:rbt12ExpUsed>0?simplesFaixa(rbt12ExpUsed,'I'):0,
      aliqAx:aliqAx, aliqAxExp:aliqAxExp, servVName:servVName, fatorR:fatorR, temFr:temFr,
      repAll:tot, guDas:guDas,
      dasCom:fatCom>0?ctx.dasTotal*(fatCom/(fatCom+fatServ||1))/fatCom:0,
      dasServ:fatServ>0?ctx.dasTotal*(fatServ/(fatCom+fatServ||1))/fatServ:0,
      icmsEmb:ctx.icmsEmb, issEmb:ctx.issEmb, cbsEmb:ctx.cbsEmb, fedEmb:ctx.fedEmb,
      icmsAliqDAS:fatCom>0?ctx.icmsEmb/fatCom:0, issAliqDAS:fatServ>0?ctx.issEmb/fatServ:0,
      faixaCom:simplesFaixa(rbt12used,'I'),
      ano:val('ano'), compras:compras, credIcms:credIcms, custo:prem.custo, folha:folha12/12, folha12:folha12,
      proLabore12:proLabore12, proLabore:proLaboreMes,
      inssProSegRate:inssProSegRate, inssProPatRate:inssProPatRate,
      inssProSeg:inssProSeg, inssProPat:inssProPat,
      // Anexo IV: CPP patronal fora do DAS, rateada pela participação da receita do anexo no mês
      fatIV:fatIV, pesoIV:pesoIV, cppIVRate:cppIVRate,
      cppIVFolha:cppIVFolha, cppIVPro:cppIVPro, cppIVTot:cppIVFolha+cppIVPro,
      cbs:prem.cbs/100, ibs:prem.ibs/100, cpp:prem.cpp/100, icms:icms, iss:iss,
      pIrpjCom:prem.presIrpjMerc/100, pCsllCom:prem.presCsllMerc/100,
      pIrpjServ:prem.presIrpjServ/100, pCsllServ:prem.presCsllServ/100
    };
  }

  // Um ano da transição, pelo motor REFORMA. Traduz a saída para os nomes que a
  // interface já usa, para que cards, memória de cálculo e relatório não mudem.
  function computeYear(P, ano){
    var S=REFORMA.simularAno(P.ctx, ano, P.prem), c=P.ctx;
    var fat=c.receita, red=S.red, consPF=S.consumo;
    var baseCons=c.baseMerc+c.baseServ, trib=c.tribMerc+c.tribServ;
    var embIbsCbs=c.cbsEmb+(c.icmsEmb+c.issEmb)*(1-red);
    var debPF=S.pf.debito, netPF=S.pf.liquido, dasStay=S.pf.dasResidual;
    var lpIbsCbsD=S.lp.debIbsCbs, lpIcmsD=c.baseIcms*S.icmsAno, lpIssD=c.baseIss*S.issAno;
    var debitoLP=S.lp.debito;
    return {
      sim:S, fat:fat, ibsY:S.ibs, red:red, icmsY:S.icmsAno, issY:S.issAno,
      // sf agora é a razão entre a alíquota efetiva e a cheia (antes era redução de base)
      sf:consPF>0?S.aliqEfetiva/consPF:1, baseCons:baseCons, trib:trib,
      consPF:consPF, consLpCom:consPF+S.icmsAno, consLpServ:consPF+S.issAno,
      debitoLP:debitoLP, debitoLPgross:debitoLP, consLpBlend:fat>0?debitoLP/fat:0, vend:fat*P.b2b,
      lpIbsCbsD:lpIbsCbsD, lpIcmsD:lpIcmsD, lpIssD:lpIssD,
      inssProSeg:P.inssProSeg, inssProPat:P.inssProPat,
      cppIVFolha:P.cppIVFolha, cppIVPro:P.cppIVPro, cppIVTot:P.cppIVTot,
      guNA:false, guImp:S.gu.total, guImpGross:S.gu.total, guBol:S.gu.total+P.inssProSeg+P.cppIVTot,
      guCre:S.gu.credito, guCreRate:fat>0?embIbsCbs/fat:0, embIbsCbs:embIbsCbs,
      dasStayY:fat>0?dasStay/fat:0, dasStay:dasStay,
      dasStayFed:c.fedEmb, dasStayIcms:c.icmsEmb*red, dasStayIss:c.issEmb*red,
      credPF:S.pf.creditoCompras, debPF:debPF, debPFgross:trib*consPF, netPF:netPF,
      pfImp:S.pf.imposto, pfBol:S.pf.total+P.inssProSeg+P.cppIVTot, pfCre:S.pf.credito,
      credLP:S.lp.creditoCompras, netLP:S.lp.liquido,
      baseIRPJ:S.lp.baseIrpj, baseCSLL:S.lp.baseCsll,
      // lpIrpj é o total (15% + adicional), como vai para a composição e para o badge;
      // as duas parcelas ficam separadas para a memória de cálculo não dizer "15%" num valor que tem o adicional
      lpIrpj:S.lp.tributos.IRPJ, lpIrpjAdic:S.lp.adicional, lpIrpjPuro:S.lp.tributos.IRPJ-S.lp.adicional,
      lpCsll:S.lp.tributos.CSLL, lpCppV:S.lp.tributos.CPP,
      lpImp:S.lp.imposto, lpBol:S.lp.total+P.inssProSeg+P.inssProPat, lpCre:S.lp.credito,
      lpCreIbsCbs:S.lp.credIbsCbsCliente, lpCreIcms:S.lp.credIcmsCliente
    };
  }

  function cheapestKey(guBol,pfBol,lpBol){
    var b={gu:guBol,pf:pfBol,lp:lpBol}, k='gu';
    if(b.pf<b[k])k='pf'; if(b.lp<b[k])k='lp'; return k;
  }

  function step(l,m,res){ return '<div class="step'+(res?' res':'')+'"><span class="s-l">'+l+'</span><span class="s-m">'+m+'</span></div>'; }

  function calc(){
    refreshPgdas(false);
    var P=readParams(), ano=parseInt(document.getElementById('ano').value,10), R=computeYear(P,ano);
    var fatCom=P.fatCom, fatServ=P.fatServ, fat=R.fat;

    var dparts=[];
    ['I','II','III','IV','V'].forEach(function(ax){ if(P.aliqAx[ax]!=null) dparts.push('Anexo '+ax+' '+pct(P.aliqAx[ax])); });
    ['I','II','III','IV','V'].forEach(function(ax){ if(P.aliqAxExp[ax]!=null) dparts.push('Anexo '+ax+' exportação '+pct(P.aliqAxExp[ax])); });
    if(P.temFr) dparts.push('Fator R '+pct(P.fatorR)+' → Anexo '+P.servVName);
    var dCab='RBT12 mercado interno '+BRL.format(P.rbt12used)+', faixa '+P.faixaCom;
    if(P.rbt12ExpUsed>0) dCab+=' · RBT12 exportação '+BRL.format(P.rbt12ExpUsed)+', faixa '+P.faixaExp;
    var dInfo='<b>DAS efetivo ('+dCab+'):</b> '+(dparts.join(' · ')||'preencha as receitas');
    var emb=[]; if(P.icmsAliqDAS>0)emb.push('ICMS '+pct(P.icmsAliqDAS)); if(P.issAliqDAS>0)emb.push('ISS '+pct(P.issAliqDAS));
    if(emb.length) dInfo+=' · alíquota dentro do DAS: '+emb.join(' + ');
    if(P.meses>=1 && P.meses<12) dInfo+=' · início de atividade ('+P.meses+' meses)';
    // Limite e sublimite são conferidos mercado a mercado: cada um tem o seu, do mesmo valor.
    if(P.overInt) dInfo+='<br><span style="color:#b00020;font-weight:800">Mercado interno acima de R$ 4,8 mi: excede o limite do Simples Nacional. Avalie Lucro Presumido ou Real.</span>';
    if(P.overExp) dInfo+='<br><span style="color:#b00020;font-weight:800">Exportação acima de R$ 4,8 mi: excede o limite próprio da exportação (art. 2º, § 1º da Res. CGSN 140/2018).</span>';
    if(!P.overInt && P.subl) dInfo+='<br><span style="color:#9a6b00;font-weight:700">Mercado interno acima do sublimite (R$ 3,6 mi): ICMS e ISS saem do DAS e entram por fora na alíquota normal.</span>';
    if(!P.overExp && P.sublExp) dInfo+='<br><span style="color:#9a6b00;font-weight:700">Exportação acima do sublimite próprio (R$ 3,6 mi). Não muda o DAS: a receita de exportação já é imune a ICMS e ISS.</span>';
    document.getElementById('dasInfo').innerHTML=dInfo;

    document.getElementById('cheia').textContent=pct(R.consLpBlend);
    var ce=document.getElementById('cheiaExp');
    if(fatCom>0 && fatServ>0){
      ce.innerHTML='Média ponderada pelo faturamento: (comércio '+BRL.format(fatCom)+' × '+pct(R.consLpCom)+' + serviço '+BRL.format(fatServ)+' × '+pct(R.consLpServ)+') ÷ '+BRL.format(fat)+' = '+pct(R.consLpBlend)+'.';
    } else if(fatCom>0){
      ce.innerHTML='Só comércio, então é o próprio imposto do comércio (CBS + IBS + ICMS = '+pct(R.consLpCom)+').';
    } else if(fatServ>0){
      ce.innerHTML='Só serviço, então é o próprio imposto do serviço (CBS + IBS + ISS = '+pct(R.consLpServ)+').';
    } else {
      ce.innerHTML='Preencha o faturamento para ver a média.';
    }
    document.getElementById('res_ano_lbl').textContent='· ano de '+ano;

    var trans, pfTail;
    if(ano<=2028){
      trans='a CBS já entrou cheia, o IBS ainda está em fase de teste (0,1%) e o ICMS e o ISS seguem integrais (100%).';
    } else if(ano<2033){
      trans='o IBS entra a '+pct(REFORMA.IBS_FRAC[ano])+' da alíquota cheia e o ICMS e o ISS ficam reduzidos a '+pct(R.red)+' do valor de hoje (queda de '+pct(1-R.red)+').';
    } else {
      trans='é o sistema completo: IBS e CBS cheios e o ICMS e o ISS extintos (0%).';
    }
    if(ano<2033) pfTail='o que fica no DAS ('+pct(R.dasStayY)+') tem a parte federal fixa mais o ICMS/ISS que ainda resta e vai reduzindo até zerar em 2033';
    else pfTail='no DAS resta só a parte federal ('+pct(R.dasStayY)+'), porque o ICMS e o ISS foram extintos';
    document.getElementById('yearNote').innerHTML='Em '+ano+', '+trans+' No <b>por fora</b> saem CBS+IBS ('+pct(R.consPF)+'); '+pfTail+'. No <b>Lucro Presumido</b>, o imposto fica em média em '+pct(R.consLpBlend)+'.';

    // benefício de ICMS informado acima da base tributável: dado inconsistente, avisa
    if(P.icmsBenefInformado>P.baseIcmsReg+0.005){
      var nb=document.getElementById('icmsBenNota');
      nb.innerHTML='<b style="color:#b00020">Atenção:</b> você informou '+BRL.format(P.icmsBenefInformado)+
        ' de vendas com benefício de ICMS, mas a base de ICMS do mês é de apenas '+BRL.format(P.baseIcmsReg)+
        '. O desconto foi limitado a essa base. Revise os valores para o resultado ficar correto.';
    }

    var lpFolha=document.getElementById('lp_folha');
    if(P.folha<=0){ lpFolha.style.display=''; lpFolha.textContent='Folha em zero. Se o cliente tem funcionários, preencha a folha, porque os encargos sobre ela (INSS + RAT + terceiros) entram neste imposto.'; }
    else { lpFolha.style.display='none'; }

    var diffCusto=R.pfBol-R.guBol, credExtra=R.pfCre-R.guCre;
    document.getElementById('cmp_custo').textContent=R.guNA?'—':BRL.format(diffCusto);
    document.getElementById('cmp_cred').textContent=R.guNA?'—':BRL.format(credExtra);

    var benP=[], benS=[];
    if(P.benZeroProd>0) benP.push('alíquota zero em '+BRL.format(P.benZeroProd));
    if(P.benRedProd>0) benP.push('redução de '+pct(P.redProdPct)+' em '+BRL.format(P.benRedProd));
    if(P.benZeroServ>0) benS.push('alíquota zero em '+BRL.format(P.benZeroServ));
    if(P.benRedServ>0) benS.push('redução de '+pct(P.redServPct)+' em '+BRL.format(P.benRedServ));
    var benTxt=[]; if(benP.length) benTxt.push('produtos: '+benP.join(' + ')); if(benS.length) benTxt.push('serviços: '+benS.join(' + '));
    var expTot=P.expCom+P.expServ;
    // a base fica cheia: o benefício reduz a ALÍQUOTA de cada fatia da receita
    var baseStep=step('Base do IBS/CBS = receita tributável'+(expTot>0?' (fora a exportação de '+BRL.format(expTot)+', imune)':''),
      BRL.format(R.trib), true);
    var fatias=[];
    (R.sim.parcMerc||[]).forEach(function(p){ fatias.push({r:'produtos · '+p.rotulo, b:p.base, red:p.reducao}); });
    (R.sim.parcServ||[]).forEach(function(p){ fatias.push({r:'serviços · '+p.rotulo, b:p.base, red:p.reducao}); });
    var temBen=fatias.some(function(f){return f.red>0;});
    if(temBen){
      fatias.forEach(function(f){
        var a=R.consPF*(1-f.red);
        baseStep+=step(f.r+': alíquota de '+pctA(R.consPF)+(f.red>0?' reduzida em '+pctA(f.red)+' → '+pctA(a):''),
          BRL.format(f.b)+' × '+pctA(a)+' = '+BRL.format(f.b*a));
      });
      baseStep+=step('Alíquota média efetiva do IBS/CBS sobre a base de '+BRL.format(R.trib), pctA(R.sim.aliqEfetiva), true);
    }
    var benGuStep=(R.sf<1)?step('O benefício de IBS/CBS ('+benTxt.join(' · ')+') NÃO reduz o DAS',
      'Na guia única vale a tabela do Simples: as reduções e a alíquota zero são regimes diferenciados do regime regular (LC 214/2025, art. 41) e o art. 24 da LC 123/2006 manda desconsiderá-las na apuração do Simples. O benefício só aparece pagando por fora ou no Lucro Presumido.'):'';

    var segStep = P.inssProSeg>0 ? step('(+) INSS do sócio (segurado) sobre o pró-labore = pró-labore mensal × '+pctA(P.inssProSegRate)+' (recolhido em GPS, por fora do DAS, nos três regimes)', BRL.format(P.proLabore)+' × '+pctA(P.inssProSegRate)+' = '+BRL.format(P.inssProSeg)) : '';
    var patStep = P.inssProPat>0 ? step('(+) INSS patronal sobre o pró-labore = pró-labore mensal × '+pctA(P.inssProPatRate)+' (no Lucro Presumido incide sobre o pró-labore inteiro)', BRL.format(P.proLabore)+' × '+pctA(P.inssProPatRate)+' = '+BRL.format(P.inssProPat)) : '';
    // Anexo IV: a CPP patronal fica fora do DAS, então pesa também nas colunas do Simples
    var ivStep = P.cppIVTot>0 ? (
      step('Receita do Anexo IV no mês = '+BRL.format(P.fatIV)+' de '+BRL.format(fat)+' (a CPP patronal do Anexo IV NÃO entra no DAS, conforme a LC 123/2006, art. 18, §5º-C)',
           'participação de '+pctA(P.pesoIV)+' da receita do mês') +
      (P.cppIVFolha>0 ? step('(+) CPP + RAT sobre a folha, na parte do Anexo IV = folha × '+pctA(P.cppIVRate)+' × '+pctA(P.pesoIV),
           BRL.format(P.folha)+' × '+pctA(P.cppIVRate)+' × '+pctA(P.pesoIV)+' = '+BRL.format(P.cppIVFolha)) : '') +
      (P.cppIVPro>0 ? step('(+) INSS patronal sobre o pró-labore, na parte do Anexo IV = pró-labore × '+pctA(P.inssProPatRate)+' × '+pctA(P.pesoIV),
           BRL.format(P.proLabore)+' × '+pctA(P.inssProPatRate)+' × '+pctA(P.pesoIV)+' = '+BRL.format(P.cppIVPro)) : '')
    ) : '';
    document.getElementById('gu_calc').innerHTML =
      step('DAS das atividades declaradas = mercadorias '+BRL.format(fatCom)+' × '+pctA(P.dasCom)+' + serviços '+BRL.format(fatServ)+' × '+pctA(P.dasServ)+' (cada linha já sem os tributos com ST ou monofásica, o ISS retido e as parcelas da exportação)', BRL.format(R.guImpGross), true) +
      segStep +
      ivStep +
      ((P.inssProSeg>0||P.cppIVTot>0) ? step('(=) Sai do bolso = DAS + INSS do sócio' + (P.cppIVTot>0?' + CPP do Anexo IV':''),
        BRL.format(R.guImpGross)+' + '+BRL.format(P.inssProSeg)+(P.cppIVTot>0?' + '+BRL.format(P.cppIVTot):'')+' = '+BRL.format(R.guBol), true) : '') +
      benGuStep +
      step('Vendas para empresas = faturamento × '+pctA(P.b2b), BRL.format(fat)+' × '+pctA(P.b2b)+' = '+BRL.format(R.vend)) +
      step('IBS/CBS dentro do DAS em '+ano+' = '+pctA(R.guCreRate)+' do faturamento (CBS desde 2027 + ICMS/ISS já convertido em IBS, '+pctA(1-R.red)+' da transição)', BRL.format(R.embIbsCbs)) +
      step('Crédito para o cliente = IBS/CBS no DAS × '+pctA(P.b2b), BRL.format(R.embIbsCbs)+' × '+pctA(P.b2b)+' = '+BRL.format(R.guCre), true);
    document.getElementById('pf_calc').innerHTML =
      step('Alíquota por fora = CBS + IBS', pctA(P.cbs)+' + '+pctA(R.ibsY)+' = '+pctA(R.consPF), true) +
      baseStep +
      step('(=) CBS + IBS sobre as vendas (por fora)', BRL.format(R.debPF)) +
      step('(-) Crédito das compras = compras × '+pctA(R.consPF), BRL.format(P.compras)+' × '+pctA(R.consPF)+' = '+BRL.format(R.credPF)) +
      step('(=) CBS e IBS a pagar por fora', BRL.format(R.netPF), true) +
      (R.sim.pf.saldoCredor>0
        ? step('(=) Saldo credor de IBS/CBS para o período seguinte',
               BRL.format(R.sim.pf.saldoCredor)+' (crédito que passou do débito e NÃO abate a parte que fica no DAS)', true)
        : '') +
      step('(+) Parte do Simples que fica no DAS = faturamento × '+pctA(R.dasStayY)+' (federal fixo + ICMS/ISS em transição)', BRL.format(fat)+' × '+pctA(R.dasStayY)+' = '+BRL.format(R.dasStay)) +
      step('(=) Imposto que paga', BRL.format(R.pfImp), true) +
      step('(+) Custo extra (contador/sistema)', BRL.format(P.custo)) +
      segStep +
      ivStep +
      step('(=) Sai do bolso', BRL.format(R.pfBol), true) +
      step('Crédito para o cliente = IBS/CBS destacado × '+pctA(P.b2b), BRL.format(R.debPF)+' × '+pctA(P.b2b)+' = '+BRL.format(R.pfCre), true);
    document.getElementById('lp_calc').innerHTML =
      baseStep +
      step('CBS ('+pctA(P.cbs)+' da alíquota de consumo)', BRL.format(R.consPF>0?R.lpIbsCbsD*P.cbs/R.consPF:0)) +
      step('IBS ('+pctA(R.ibsY)+' da alíquota de consumo)', BRL.format(R.consPF>0?R.lpIbsCbsD*R.ibsY/R.consPF:0)) +
      (P.baseIcmsReg>0?step('ICMS = mercadorias sem ST e sem exportação × '+pctA(R.icmsY), BRL.format(P.baseIcmsReg)+' × '+pctA(R.icmsY)+' = '+BRL.format(R.sim.lp.icmsSemBenef)):'') +
      (R.sim.lp.icmsBenefValor>0
        ? step('(-) Benefício estadual de ICMS = '+BRL.format(R.sim.lp.icmsBenefBase)+' × '+pctA(R.icmsY)+' × '+pctA(R.sim.lp.icmsBenefPct)+' (isenção, diferimento, suspensão ou redução da base)',
               '− '+BRL.format(R.sim.lp.icmsBenefValor)+'  →  ICMS de '+BRL.format(R.lpIcmsD))
        : '') +
      (P.baseIssReg>0?step('ISS = serviços sem retenção e sem exportação × '+pctA(R.issY)+' (cumulativo, sem crédito)', BRL.format(P.baseIssReg)+' × '+pctA(R.issY)+' = '+BRL.format(R.lpIssD)):'') +
      step('(=) Débito total do imposto', BRL.format(R.debitoLP), true) +
      step('(-) Crédito de IBS/CBS das compras = compras × '+pctA(R.consPF), BRL.format(P.compras)+' × '+pctA(R.consPF)+' = '+BRL.format(R.sim.lp.credIbsCbs)) +
      step('(-) Crédito de ICMS informado no mês'+(R.red<1&&R.red>0?' (reduzido a '+pctA(R.red)+' na transição)':''), BRL.format(R.sim.lp.credIcms)) +
      step('(=) Crédito total informado', BRL.format(R.credLP)) +
      // cada imposto apura no seu caixa: o crédito de um não abate o outro
      step('IBS/CBS a pagar = débito − crédito de IBS/CBS',
           BRL.format(R.sim.lp.debIbsCbs)+' − '+BRL.format(R.sim.lp.credIbsCbs)+' = '+BRL.format(R.sim.lp.tributos.IBS_CBS)) +
      (R.sim.lp.debIcms>0 || R.sim.lp.credIcms>0
        ? step('ICMS a pagar = débito − crédito de ICMS',
               BRL.format(R.sim.lp.debIcms)+' − '+BRL.format(R.sim.lp.credIcms)+' = '+BRL.format(R.sim.lp.tributos.ICMS))
        : '') +
      (R.sim.lp.debIss>0
        ? step('ISS a pagar = integral (cumulativo, não admite crédito e não é abatido pelo crédito de IBS/CBS)',
               BRL.format(R.sim.lp.tributos.ISS))
        : '') +
      (R.sim.lp.saldoCredor>0
        ? step('(=) Saldo credor para o período seguinte'+
               (R.sim.lp.saldoIbsCbs>0&&R.sim.lp.saldoIcms>0
                 ? ' (IBS/CBS '+BRL.format(R.sim.lp.saldoIbsCbs)+' + ICMS '+BRL.format(R.sim.lp.saldoIcms)+')'
                 : (R.sim.lp.saldoIbsCbs>0?' (IBS/CBS)':' (ICMS)')),
               BRL.format(R.sim.lp.saldoCredor)+' (crédito que sobrou e NÃO reduz o ISS nem os demais tributos deste mês)', true)
        : '') +
      step('(=) Total de imposto a pagar', BRL.format(R.netLP), true) +
      step('Base do IRPJ = comércio × '+pctA(P.pIrpjCom)+' + serviço × '+pctA(P.pIrpjServ)+' (presunção de lucro)', BRL.format(fatCom)+' × '+pctA(P.pIrpjCom)+' + '+BRL.format(fatServ)+' × '+pctA(P.pIrpjServ)+' = '+BRL.format(R.baseIRPJ)) +
      step('(+) IRPJ = base × 15% (alíquota normal, sobre toda a base)', BRL.format(R.baseIRPJ)+' × 15% = '+BRL.format(R.lpIrpjPuro)) +
      (R.lpIrpjAdic>0
        ? step('(+) Adicional de IRPJ = 10% sobre o que passa de '+BRL.format(20000)+' de lucro presumido na competência (o limite legal é '+BRL.format(60000)+' por trimestre, período de apuração do Lucro Presumido; aqui está na fração do mês)',
               '('+BRL.format(R.baseIRPJ)+' − '+BRL.format(20000)+') × 10% = '+BRL.format(R.lpIrpjAdic))
        : step('(+) Adicional de IRPJ = não incide nesta competência: o lucro presumido de '+BRL.format(R.baseIRPJ)+' está dentro do limite de '+BRL.format(20000)+' no mês ('+BRL.format(60000)+' no trimestre)',
               BRL.format(0))) +
      step('Alíquota efetiva do IRPJ nesta competência (15% + adicional ÷ base)', pctA(R.baseIRPJ>0?R.lpIrpj/R.baseIRPJ:0), true) +
      step('Base do CSLL = comércio × '+pctA(P.pCsllCom)+' + serviço × '+pctA(P.pCsllServ)+' (presunção de lucro)', BRL.format(fatCom)+' × '+pctA(P.pCsllCom)+' + '+BRL.format(fatServ)+' × '+pctA(P.pCsllServ)+' = '+BRL.format(R.baseCSLL)) +
      step('(+) CSLL = base × 9%', BRL.format(R.baseCSLL)+' × 9% = '+BRL.format(R.lpCsll)) +
      step('(+) Encargos sobre a folha (INSS + RAT + terceiros) = folha × '+pctA(P.cpp), BRL.format(P.folha)+' × '+pctA(P.cpp)+' = '+BRL.format(R.lpCppV)) +
      step('(=) Imposto que paga', BRL.format(R.lpImp), true) +
      step('(+) Custo extra (contador/sistema)', BRL.format(P.custo)) +
      segStep +
      patStep +
      step('(=) Sai do bolso', BRL.format(R.lpBol), true) +
      step('Crédito de IBS/CBS para o cliente = IBS/CBS destacado × '+pctA(P.b2b),
           BRL.format(R.sim.lp.debIbsCbs)+' × '+pctA(P.b2b)+' = '+BRL.format(R.lpCreIbsCbs)) +
      (R.sim.lp.debIcms>0
        ? step('Crédito de ICMS para o cliente = ICMS destacado × '+pctA(P.b2bIcms)+
               (P.b2bIcms!==P.b2b?' (público menor que o do IBS/CBS: só credita ICMS quem é contribuinte do imposto e revende ou industrializa)':''),
               BRL.format(R.sim.lp.debIcms)+' × '+pctA(P.b2bIcms)+' = '+BRL.format(R.lpCreIcms))
        : '') +
      step('(=) Crédito para o cliente (o ISS é cumulativo e não gera crédito)', BRL.format(R.lpCre), true);

    var rec=document.getElementById('rec'), txt=document.getElementById('rec_txt'), t, cls;
    // Se o por fora sai MAIS BARATO em caixa, isso vale por si só: a economia
    // independe de o cliente aproveitar ou não o crédito, então vem antes do perfil de vendas.
    if(diffCusto<0){
      cls='pf';
      t='Em '+ano+', pagar por fora saiu <b>mais barato que a guia única</b>: economia de '+BRL.format(-diffCusto)+' por mês ('+BRL.format(-diffCusto*12)+' no ano)'+
        (credExtra>0?', e ainda gera '+BRL.format(credExtra)+' a mais de crédito por mês para os clientes dele':'')+'. '+
        (P.b2b<0.3
          ? 'Mesmo o cliente vendendo mais para consumidor final, a economia é de caixa e aparece de qualquer forma. O crédito é um ganho adicional. Confirme o custo extra de apuração antes de decidir.'
          : 'Some-se a isso o ganho de competitividade nas vendas para empresas. Feche as contas finais na apuração.');
    } else if(P.b2b<0.3){
      cls='gu';
      t='O cliente vende mais para consumidor final (pessoa física) e pagar por fora custa '+BRL.format(diffCusto)+' a mais por mês. Ficar na guia única tende a ser a melhor escolha: mais simples e sem custo extra, e nesse caso o cliente dele não aproveita crédito mesmo.';
    } else if(credExtra>diffCusto){
      cls='pf';
      t='O cliente vende bastante para empresas. Em '+ano+', pagar por fora gera '+BRL.format(credExtra)+' a mais de crédito por mês para os clientes dele, o que supera o custo extra de '+BRL.format(diffCusto)+'. Tende a deixá-lo mais competitivo. Feche as contas finais na apuração.';
    } else {
      cls='mid';
      t='Caso intermediário: em '+ano+', o custo extra de pagar por fora ('+BRL.format(diffCusto)+') ainda pesa mais que o ganho de crédito ('+BRL.format(credExtra)+'). Reavalie ano a ano mudando o ano no seletor acima, porque o crédito da guia única cresce ao longo da transição.';
    }
    var lpNote;
    if(R.lpBol<R.guBol && R.lpBol<R.pfBol){
      lpNote='neste ano apareceu como o <b>mais barato de todos</b> ('+BRL.format(R.lpBol)+') e ainda gera crédito cheio. Como significa sair do Simples Nacional, avalie a mudança de regime.';
    } else if(R.lpBol<R.pfBol){
      lpNote='ficou <b>mais barato que o por fora</b> ('+BRL.format(R.lpBol)+' contra '+BRL.format(R.pfBol)+') e também gera crédito cheio. Vale avaliar.';
    } else {
      lpNote='neste ano apareceu <b>mais caro</b> ('+BRL.format(R.lpBol)+'), então provavelmente não compensa sair do Simples Nacional.';
    }
    rec.className='rec '+cls; txt.innerHTML=t+'<br><br><b>Lucro Presumido:</b> '+lpNote;

    buildCards(P,R);
  }

  // reparte o imposto de cada regime por tributo (guia única: repartição do DAS; por fora: IBS/CBS + resto do DAS repartido; LP: IBS/CBS + IRPJ/CSLL/INSS)
  function taxBreak(P,R){
    // repartição do DAS já consolidada em R$ na leitura dos parâmetros (com ST, retenção, exportação,
    // benefício e sublimite aplicados linha a linha)
    var gu={}; for(var t in P.repAll) gu[t]=P.repAll[t];
    // recomposição da reforma DENTRO do DAS (LC 214/2025): a carga total não muda, só o tributo.
    // PIS+Cofins viram CBS (desde 2027); ICMS+ISS viram IBS na proporção da transição (10/20/30/40% em 2029-2032, 100% em 2033).
    var toIbs=((gu.ICMS||0)+(gu.ISS||0))*(1-R.red);
    gu.IBS_CBS=(gu.Cofins||0)+(gu.PIS||0)+toIbs;
    gu.Cofins=0; gu.PIS=0;
    gu.ICMS=(gu.ICMS||0)*R.red; gu.ISS=(gu.ISS||0)*R.red;
    // por fora: mesmo federal e ICMS/ISS da guia única (ficam no DAS); só o IBS/CBS vira o valor cheio pago por fora
    var pf={IBS_CBS:R.netPF,IRPJ:0,CSLL:0,Cofins:0,PIS:0,IPI:0,CPP:0,ICMS:R.dasStayIcms,ISS:R.dasStayIss};
    var fedSum=(gu.IRPJ||0)+(gu.CSLL||0)+(gu.CPP||0)+(gu.IPI||0), fedStay=R.dasStayFed;
    if(fedSum>0){ pf.IRPJ=fedStay*(gu.IRPJ||0)/fedSum; pf.CSLL=fedStay*(gu.CSLL||0)/fedSum; pf.CPP=fedStay*(gu.CPP||0)/fedSum; pf.IPI=fedStay*(gu.IPI||0)/fedSum; } else { pf.CPP=fedStay; }
    // LP por tributo: cada imposto já vem apurado no seu próprio caixa pelo motor.
    // O crédito de IBS/CBS não abate ICMS nem ISS (o ISS é cumulativo, sem crédito):
    // o que sobra de crédito vira saldo credor do período seguinte.
    var lpT=R.sim.lp.tributos;
    var lp={IBS_CBS:lpT.IBS_CBS,IRPJ:R.lpIrpj,CSLL:R.lpCsll,Cofins:0,PIS:0,IPI:0,CPP:R.lpCppV,
      ICMS:lpT.ICMS,ISS:lpT.ISS};
    // INSS do sócio (11%): recolhido em GPS por fora do DAS, pesa igual nos três regimes.
    gu.INSS_PRO_SEG=R.inssProSeg; pf.INSS_PRO_SEG=R.inssProSeg; lp.INSS_PRO_SEG=R.inssProSeg;
    // Patronal sobre o pró-labore: cheia no Lucro Presumido; no Simples só na fatia do Anexo IV,
    // porque nos demais anexos a CPP já está embutida no DAS.
    gu.INSS_PRO_PAT=R.cppIVPro; pf.INSS_PRO_PAT=R.cppIVPro; lp.INSS_PRO_PAT=R.inssProPat;
    // CPP + RAT sobre a folha do Anexo IV: fora do DAS, só nas colunas do Simples
    // (no Lucro Presumido a folha inteira já entra na linha CPP/INSS).
    gu.CPP_IV=R.cppIVFolha; pf.CPP_IV=R.cppIVFolha; lp.CPP_IV=0;
    return {gu:gu,pf:pf,lp:lp};
  }
  var TAXROWS=[['IBS_CBS','IBS/CBS'],['IRPJ','IRPJ'],['CSLL','CSLL'],['IPI','IPI'],['CPP','CPP/INSS'],['CPP_IV','CPP folha · Anexo IV'],['INSS_PRO_SEG','INSS pró-labore (sócio)'],['INSS_PRO_PAT','INSS pró-labore (patronal)'],['ICMS','ICMS'],['ISS','ISS']];
  function buildCards(P,R){
    var tb=taxBreak(P,R), cheap=cheapestKey(R.guNA?Infinity:R.guBol,R.pfBol,R.lpBol), fat=R.fat, tot={gu:R.guBol,pf:R.pfBol,lp:R.lpBol};
    var cards={gu:document.getElementById('cardGU'),pf:document.getElementById('cardPF'),lp:document.getElementById('cardLP')};
    var badges={gu:document.getElementById('badgeGU'),pf:document.getElementById('badgePF'),lp:document.getElementById('badgeLP')};
    for(var kk in badges){ badges[kk].className='badge'; badges[kk].textContent=''; cards[kk].classList.remove('is-best'); }
    badges[cheap].className='badge win'; badges[cheap].textContent='Mais barato'; cards[cheap].classList.add('is-best');
    document.getElementById('pf_bol').textContent=BRL.format(R.pfBol);
    document.getElementById('lp_bol').textContent=BRL.format(R.lpBol);
    document.getElementById('gu_rec').textContent=BRL.format(fat);
    document.getElementById('pf_rec').textContent=BRL.format(fat);
    document.getElementById('lp_rec').textContent=BRL.format(fat);
    function badgesHtml(arr){ return arr.map(function(x){return '<span class="b">'+x[0]+'<i>'+x[1]+'</i></span>';}).join(''); }
    document.getElementById('pf_badges').innerHTML=badgesHtml([['Alíq. total',pct(fat>0?R.pfImp/fat:0)],['IBS+CBS',BRL.format(R.netPF)],['DAS',BRL.format(fat*R.dasStayY)]]);
    // separa a carga do Lucro Presumido em tributária (impostos) e trabalhista (INSS/encargos),
    // usando a mesma quebra por tributo das linhas do card. O custo extra fica de fora das duas.
    var lpTrib=(tb.lp.IBS_CBS||0)+(tb.lp.IRPJ||0)+(tb.lp.CSLL||0)+(tb.lp.IPI||0)+(tb.lp.ICMS||0)+(tb.lp.ISS||0);
    var lpTrab=(tb.lp.CPP||0)+(tb.lp.INSS_PRO_SEG||0)+(tb.lp.INSS_PRO_PAT||0);
    var lpEfet=lpTrib+lpTrab;
    document.getElementById('lp_badges').innerHTML=badgesHtml([
      ['Carga efetiva',pct(fat>0?lpEfet/fat:0)+' · '+BRL.format(lpEfet)],
      ['Tributária',pct(fat>0?lpTrib/fat:0)+' · '+BRL.format(lpTrib)],
      ['Trabalhista',pct(fat>0?lpTrab/fat:0)+' · '+BRL.format(lpTrab)]]);
    function rows(k,dict){
      var t=tot[k]||1, h='';
      function line(lbl,v){
        if(!v) return '<div class="cline muted"><span class="cl-l">'+lbl+'</span><span class="cl-bar"></span><span class="cl-v">—</span></div>';
        var w=Math.max(2,Math.min(100,v/t*100));
        return '<div class="cline"><span class="cl-l">'+lbl+'</span><span class="cl-bar"><i style="width:'+w.toFixed(1)+'%"></i></span><span class="cl-v">'+BRL.format(v)+'</span></div>';
      }
      TAXROWS.forEach(function(r){ h+=line(r[1], dict[r[0]]||0); });
      h+=line('Custo extra', k==='gu'?0:P.custo);
      return h;
    }
    // guia única (regime unificado): carga total constante na transição; só a composição interna (ICMS/ISS → IBS) muda ano a ano
    document.getElementById('gu_bol').textContent=BRL.format(R.guBol);
    var guBadges=[['Alíq. efetiva',pct(fat>0?R.guImp/fat:0)],['Faixa',P.faixaCom+'ª'],['RBT12',BRL.format(P.rbt12used)]];
    if(P.rbt12ExpUsed>0) guBadges.push(['Faixa exp.',P.faixaExp+'ª'],['RBT12 exp.',BRL.format(P.rbt12ExpUsed)]);
    document.getElementById('gu_badges').innerHTML=badgesHtml(guBadges);
    document.getElementById('gu_rows').innerHTML=rows('gu',tb.gu);
    document.getElementById('gu_tot').textContent=BRL.format(R.guBol);
    document.getElementById('gu_cre').textContent=BRL.format(R.guCre);
    document.getElementById('pf_rows').innerHTML=rows('pf',tb.pf);
    document.getElementById('lp_rows').innerHTML=rows('lp',tb.lp);
    document.getElementById('pf_tot').textContent=BRL.format(R.pfBol);
    document.getElementById('lp_tot').textContent=BRL.format(R.lpBol);
    document.getElementById('pf_cre').textContent=BRL.format(R.pfCre);
    document.getElementById('lp_cre').textContent=BRL.format(R.lpCre);
    equalizeHeads();
  }

  // iguala a altura dos 3 cabeçalhos para alinhar as linhas de imposto e os totais nas colunas
  function equalizeHeads(){
    var heads=document.querySelectorAll('.results .rc-head');
    if(!heads.length) return;
    var mx=0;
    heads.forEach(function(h){ h.style.minHeight='0'; });
    heads.forEach(function(h){ mx=Math.max(mx, h.offsetHeight); });
    heads.forEach(function(h){ h.style.minHeight=mx+'px'; });
  }

  /* ===== clientes salvos (localStorage) ===== */
  var LSK='contabiliza_snlp_clientes_v1', LSKE='contabiliza_snlp_escritorio_v1';
  function loadStore(){ try{ return JSON.parse(localStorage.getItem(LSK))||{}; }catch(e){ return {}; } }
  function saveStore(s){ try{ localStorage.setItem(LSK,JSON.stringify(s)); }catch(e){} }
  function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function flash(msg,err){
    var m=document.getElementById('wsMsg');
    m.textContent=msg; m.className='ws-msg'+(err?' err':'');
    if(flash._t)clearTimeout(flash._t);
    flash._t=setTimeout(function(){ m.textContent=''; m.className='ws-msg'; },err?7000:4000);
  }

  function collectFields(){
    var o={};
    NUMFIELDS.forEach(function(id){ o[id]=document.getElementById(id).value; });
    CHECKFIELDS.forEach(function(id){ o[id]=document.getElementById(id).checked?1:0; });
    o.cnpj=document.getElementById('cnpj').value;
    o.benItens=benItens.map(function(it){ return {id:it.id,valor:it.valor,pct:it.pct,tipo:tipoDoItem(it)}; });
    o.cmpItens=cmpItens.map(function(it){ return {id:it.id,valor:it.valor}; });
    o.stExtras=stExtras.map(function(e){ return {id:e.id,valor:e.valor,t:e.t}; });
    o.icmsItens=icmsItens.map(function(it){ return {id:it.id,valor:it.valor,pct:it.pct}; });
    return o;
  }
  /** recria as linhas extras de ST do cliente salvo */
  function aplicarStExtras(d){
    stExtras=[];
    if(Array.isArray(d.stExtras)){
      d.stExtras.forEach(function(e){
        var def=defDaLinha(e.id); if(!def||!def.stT) return;
        var t={}; def.stT.forEach(function(x){ t[x]=(e.t&&e.t[x])?1:0; });
        stExtras.push({k:++stSeq, id:e.id, valor:typeof e.valor==='string'?e.valor:fmtNum(parseBR(e.valor)), t:t});
      });
    }
    PGLINES.forEach(function(x){ if(x.def.stT) renderStExtras(x.def.id); });
  }
  function resetChecks(){ // padrão: ICMS-ST marcado, monofásica de PIS/Cofins e IPI desmarcadas
    CHECKFIELDS.forEach(function(id){ document.getElementById(id).checked=/_ICMS$/.test(id); });
  }
  // clientes salvos no formato antigo (recI..recV + stIcms/issRet + benZero/benRed) viram atividades do PGDAS-D
  function migrate(o){
    if(!o || o.pgRevSemST!==undefined) return o;
    var n={}; for(var k in o) n[k]=o[k];
    var recI=parseBR(o.recI), recII=parseBR(o.recII), recIII=parseBR(o.recIII), recIV=parseBR(o.recIV), recV=parseBR(o.recV);
    var st=Math.min(parseBR(o.stIcms),recI), ret=parseBR(o.issRet);
    PGIDS.forEach(function(id){ n[id]=0; });
    n.pgRevSemST=recI-st; n.pgRevComST=st; n.pgIndSemST=recII;
    var fs=recIII+recIV+recV, rf=fs>0?Math.min(1,ret/fs):0; // retenção rateada entre os serviços
    n.pgServIIIProprio=recIII*(1-rf); n.pgServIIIRet=recIII*rf;
    n.pgServIVProprio=recIV*(1-rf);   n.pgServIVRet=recIV*rf;
    n.pgServFrProprio=recV*(1-rf);    n.pgServFrRet=recV*rf;
    // benefício antigo era só de produto: vira item "outro produto" com o percentual usado então
    var itens=[];
    if(parseBR(o.benZero)>0) itens.push({id:'outroProd',valor:fmtNum(parseBR(o.benZero)),pct:100,tipo:'prod'});
    if(parseBR(o.benRed)>0)  itens.push({id:'outroProd',valor:fmtNum(parseBR(o.benRed)),pct:60,tipo:'prod'});
    n.benItens=itens;
    CHECKFIELDS.forEach(function(id){ n[id]=/_ICMS$/.test(id)?1:0; }); // o campo antigo era só de ICMS-ST
    return n;
  }
  /** reconstrói a lista de atividades beneficiadas a partir do cliente salvo */
  function aplicarBeneficios(d){
    benItens=[];
    if(Array.isArray(d.benItens)){
      d.benItens.forEach(function(it){
        var cat=REFORMA.beneficioPorId(it.id);
        benItens.push({id:it.id, valor:typeof it.valor==='string'?it.valor:fmtNum(parseBR(it.valor)),
                       pct:it.pct!=null?Number(it.pct):(cat?cat.pct:0),
                       tipo:it.tipo==='serv'?'serv':(it.tipo==='prod'?'prod':(cat&&cat.tipo==='serv'?'serv':'prod'))});
      });
    } else {
      // formato intermediário: quatro campos soltos
      var add=function(v,pct,tipo){ if(parseBR(v)>0) benItens.push({id:tipo==='serv'?'outroServ':'outroProd',valor:fmtNum(parseBR(v)),pct:pct,tipo:tipo==='serv'?'serv':'prod'}); };
      add(d.benZeroProd,100,'prod'); add(d.benRedProd,parseBR(d.benRedProdPct)||60,'prod');
      add(d.benZeroServ,100,'serv'); add(d.benRedServ,parseBR(d.benRedServPct)||60,'serv');
    }
    renderBeneficios();
  }
  /** reconstrói a lista de compras; o formato antigo tinha um valor único */
  function aplicarCompras(d){
    cmpItens=[];
    if(Array.isArray(d.cmpItens)){
      d.cmpItens.forEach(function(it){
        cmpItens.push({id:it.id, valor:typeof it.valor==='string'?it.valor:fmtNum(parseBR(it.valor))});
      });
    } else if(parseBR(d.compras)>0){
      cmpItens.push({id:'outras', valor:fmtNum(parseBR(d.compras))});
    }
    renderCompras();
  }
  /** reconstrói os benefícios de ICMS do cliente salvo */
  function aplicarBenefIcms(d){
    icmsItens=[];
    if(Array.isArray(d.icmsItens)){
      d.icmsItens.forEach(function(it){
        var cat=REFORMA.beneficioIcmsPorId(it.id); if(!cat) return;
        icmsItens.push({id:it.id, valor:typeof it.valor==='string'?it.valor:fmtNum(parseBR(it.valor)),
                        pct:it.pct!=null?Number(it.pct):cat.pct});
      });
    }
    renderBenefIcms();
  }
  function applyFields(o){
    var d=migrate(o);
    NUMFIELDS.forEach(function(id){ if(d[id]!==undefined && d[id]!==null) document.getElementById(id).value=d[id]; });
    // clientes salvos antes do pró-labore não têm esses campos: volta ao padrão em vez de herdar do cliente anterior
    ['proLabore12','inssProSeg','inssProPat','cppIV'].forEach(function(id){ if(d[id]===undefined||d[id]===null) document.getElementById(id).value=DEFAULTS[id]; });
    // cliente salvo antes da separação do ICMS: repete o percentual geral,
    // que é exatamente o resultado que ele já tinha
    if(d.b2bIcms===undefined||d.b2bIcms===null)
      document.getElementById('b2bIcms').value=(d.b2b!==undefined&&d.b2b!==null)?d.b2b:DEFAULTS.b2bIcms;
    CHECKFIELDS.forEach(function(id){ if(d[id]!==undefined && d[id]!==null) document.getElementById(id).checked=!!Number(d[id]); });
    // o CNPJ vem do cliente carregado: registra como o atual para não disparar a limpeza
    document.getElementById('cnpj').value=d.cnpj||'';
    cnpjAtual=cnpjRaw(d.cnpj||'');
    aplicarBeneficios(d); aplicarCompras(d); aplicarStExtras(d); aplicarBenefIcms(d);
    fmtAll(); toggleAtividade(); calc(); refreshPgdas(true);
  }
  function refreshList(sel){
    var s=loadStore(), names=Object.keys(s).sort(function(a,b){return a.localeCompare(b,'pt-BR');});
    var opts='<option value="">'+(names.length?'Selecione um cliente':'Nenhum salvo')+'</option>';
    names.forEach(function(n){ opts+='<option value="'+esc(n)+'"'+(n===sel?' selected':'')+'>'+esc(n)+'</option>'; });
    document.getElementById('clientList').innerHTML=opts;
  }

  /* ===== cópia de segurança dos clientes =====
     Os cenários vivem só no localStorage deste navegador: limpar o histórico,
     trocar de perfil ou de máquina apaga tudo. O arquivo JSON resolve os três. */
  var BKP_TIPO='contabiliza-snlp-clientes';
  function baixarArquivo(nome,texto){
    var blob=new Blob([texto],{type:'application/json;charset=utf-8'});
    var url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=nome; document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); },1500);
  }
  function carimboData(){
    var d=new Date(), p=function(n){ return (n<10?'0':'')+n; };
    return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
  }
  function exportarClientes(){
    var s=loadStore(), nomes=Object.keys(s);
    if(!nomes.length){ flash('Não há cliente salvo para exportar.',true); return; }
    var dadosEsc={}; try{ dadosEsc=JSON.parse(localStorage.getItem(LSKE))||{}; }catch(e){}
    var pacote={ tipo:BKP_TIPO, versao:1, gerado:new Date().toISOString(),
                 clientes:s, escritorio:dadosEsc };
    baixarArquivo('clientes-simulador-contabiliza-snlp-'+carimboData()+'.json', JSON.stringify(pacote,null,2));
    flash(nomes.length+(nomes.length>1?' clientes exportados.':' cliente exportado.'));
  }
  /** aceita o pacote exportado aqui e também um arquivo com só o objeto de clientes */
  function lerPacote(txt){
    var d=JSON.parse(txt);
    if(!d||typeof d!=='object') return null;
    if(d.clientes&&typeof d.clientes==='object') return {clientes:d.clientes, escritorio:d.escritorio||null};
    var ks=Object.keys(d);
    if(ks.length&&ks.every(function(k){ return d[k]&&typeof d[k]==='object'&&!Array.isArray(d[k]); }))
      return {clientes:d, escritorio:null};
    return null;
  }
  function importarClientes(file){
    var r=new FileReader();
    r.onload=function(){
      var pac=null;
      try{ pac=lerPacote(String(r.result)); }catch(e){ pac=null; }
      if(!pac){ flash('Arquivo inválido: não parece uma exportação do simulador.',true); return; }
      var novos=Object.keys(pac.clientes);
      if(!novos.length){ flash('O arquivo não tem nenhum cliente.',true); return; }
      var atual=loadStore(), repet=novos.filter(function(n){ return atual[n]!==undefined; });
      var msg='Importar '+novos.length+(novos.length>1?' clientes?':' cliente?');
      if(repet.length) msg+='\n\n'+repet.length+(repet.length>1?' já existem e serão substituídos:\n':' já existe e será substituído:\n')+
        repet.slice(0,8).join(', ')+(repet.length>8?'...':'');
      if(!confirm(msg)) return;
      novos.forEach(function(n){ atual[n]=pac.clientes[n]; });
      saveStore(atual); refreshList('');
      var add=novos.length-repet.length;
      flash(add+(add===1?' novo cliente':' novos clientes')+' e '+repet.length+(repet.length===1?' atualizado.':' atualizados.'));
      if(pac.escritorio&&Object.keys(pac.escritorio).length&&
         confirm('O arquivo também traz os dados do seu escritório (nome, CRC, contato e logo).\n\nSubstituir os dados atuais?')){
        try{ localStorage.setItem(LSKE,JSON.stringify(pac.escritorio)); loadEscritorio(); }catch(e){}
      }
    };
    r.onerror=function(){ flash('Não foi possível ler o arquivo.',true); };
    r.readAsText(file);
  }

  /* ===== dados do escritório (white-label) ===== */
  var ESCFIELDS=['escNome','escCrc','escContato'];
  var escLogo='';        // logo em data URL, guardada junto com os demais dados do escritório
  var escLogoScale=100;  // escala de exibição escolhida pelo usuário, em % do tamanho padrão
  function loadEscritorio(){
    var d={}; try{ d=JSON.parse(localStorage.getItem(LSKE))||{}; }catch(e){}
    ESCFIELDS.forEach(function(id){ if(d[id]!==undefined) document.getElementById(id).value=d[id]; });
    escLogo=d.logo||'';
    escLogoScale=clampScale(d.logoScale);
    document.getElementById('escLogoScale').value=escLogoScale;
    renderLogoPrev();
  }
  function saveEscritorio(){
    var d={}; ESCFIELDS.forEach(function(id){ d[id]=document.getElementById(id).value; });
    d.logo=escLogo; d.logoScale=escLogoScale;
    try{ localStorage.setItem(LSKE,JSON.stringify(d)); return true; }catch(e){ return false; }
  }
  function clampScale(v){ var n=parseInt(v,10); return isNaN(n)?100:Math.max(50,Math.min(180,n)); }
  // aplica a escala no preview e no cabeçalho do relatório (herdada pelo CSS via --logoScale)
  function applyLogoScale(){
    var s=escLogoScale/100;
    document.getElementById('escLogoPrev').style.setProperty('--logoScale',s);
    document.getElementById('rp_logo').style.setProperty('--logoScale',s);
    document.getElementById('escLogoScaleVal').textContent=escLogoScale+'% · até '+Math.round(190*s)+' × '+Math.round(66*s)+' px';
  }
  function logoMsg(txt,erro){
    var m=document.getElementById('escLogoMsg');
    m.className='logo-msg'+(erro?' err':''); m.textContent=txt||'';
  }
  function renderLogoPrev(){
    var p=document.getElementById('escLogoPrev');
    p.innerHTML=escLogo?'<img src="'+escLogo+'" alt="Logo do escritório">':'<span>Sua logo</span>';
    document.getElementById('escLogoDel').style.display=escLogo?'':'none';
    document.getElementById('escLogoSizeBox').style.display=escLogo?'':'none';
    applyLogoScale();
  }
  // reduz a imagem antes de guardar: o localStorage é pequeno e a logo do cabeçalho é exibida em ~190x66
  function shrinkImage(dataUrl,maxW,maxH,cb){
    var img=new Image();
    img.onload=function(){
      var r=Math.min(1,maxW/img.width,maxH/img.height);
      if(r>=1 && dataUrl.length<160000){ cb(dataUrl,img.width,img.height); return; }
      try{
        var c=document.createElement('canvas');
        c.width=Math.max(1,Math.round(img.width*r)); c.height=Math.max(1,Math.round(img.height*r));
        c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        cb(c.toDataURL('image/png'),c.width,c.height);   // PNG preserva a transparência da logo
      }catch(e){ cb(dataUrl,img.width,img.height); }
    };
    img.onerror=function(){ cb(null); };
    img.src=dataUrl;
  }
  document.getElementById('escLogoBtn').addEventListener('click',function(){ document.getElementById('escLogoFile').click(); });
  document.getElementById('escLogoScale').addEventListener('input',function(){
    escLogoScale=clampScale(this.value); applyLogoScale();
  });
  document.getElementById('escLogoScale').addEventListener('change',function(){ saveEscritorio(); buildReport(); });
  document.getElementById('escLogoScaleReset').addEventListener('click',function(){
    escLogoScale=100; document.getElementById('escLogoScale').value=100;
    applyLogoScale(); saveEscritorio(); buildReport();
  });
  document.getElementById('escLogoDel').addEventListener('click',function(){
    escLogo=''; saveEscritorio(); renderLogoPrev(); buildReport(); logoMsg('Logo removida.');
  });
  document.getElementById('escLogoFile').addEventListener('change',function(){
    var f=this.files&&this.files[0]; this.value=''; if(!f) return;
    if(f.size>4*1024*1024){ logoMsg('Imagem muito grande: o limite é 4 MB.',true); return; }
    logoMsg('Carregando...');
    var rd=new FileReader();
    rd.onload=function(){
      var raw=String(rd.result);
      function done(url,w,h){
        if(!url){ logoMsg('Não foi possível ler essa imagem. Tente um PNG ou JPG.',true); return; }
        var antes=escLogo; escLogo=url;
        if(!saveEscritorio()){ escLogo=antes; logoMsg('A imagem não coube no armazenamento do navegador. Use uma versão menor.',true); return; }
        renderLogoPrev(); buildReport();
        var kb=Math.round(url.length/1024);
        logoMsg(w?('Logo salva: '+w+' × '+h+' px, '+kb+' KB.'):('Logo SVG salva (vetorial), '+kb+' KB.'));
      }
      // SVG já é leve e vetorial: guarda como veio, sem passar pelo canvas
      if(f.type==='image/svg+xml') done(raw.length<150000?raw:null);
      else shrinkImage(raw,420,150,done);
    };
    rd.onerror=function(){ logoMsg('Não foi possível ler o arquivo.',true); };
    rd.readAsDataURL(f);
  });
  function money(n){ return BRL.format(n); }

  function barChart(items){
    var W=440,H=248, bw=96, base=182, maxH=150, gap=(W-items.length*bw)/(items.length+1);
    var max=Math.max.apply(null,items.map(function(d){return d.val;}))||1;
    var s='<svg class="chart" viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI,Arial,sans-serif">';
    s+='<line x1="6" y1="'+base+'" x2="'+(W-6)+'" y2="'+base+'" stroke="#e2e5f0"/>';
    items.forEach(function(d,i){
      var x=gap+i*(bw+gap), h=Math.max(3,d.val/max*maxH), y=base-h, c=d.best?'#b8ae1a':'#5c0a0a';
      s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw+'" height="'+h.toFixed(1)+'" rx="7" fill="'+c+'"/>';
      s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(y-9).toFixed(1)+'" text-anchor="middle" font-size="15" font-weight="700" fill="#16182c">'+money(d.val)+'</text>';
      s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(base+20)+'" text-anchor="middle" font-size="12.5" font-weight="700" fill="#3a3f52">'+d.label+'</text>';
      if(d.best) s+='<text x="'+(x+bw/2).toFixed(1)+'" y="'+(base+37)+'" text-anchor="middle" font-size="11" font-weight="800" fill="#b8ae1a">Mais econômica</text>';
    });
    return s+'</svg>';
  }

  function lineChart(P){
    var W=640,H=290, L=70,Rp=16,T=18,B=46, plotW=W-L-Rp, plotH=H-T-B, base=T+plotH;
    var ser={gu:[],pf:[],lp:[]};
    YEARS.forEach(function(y){ var Ry=computeYear(P,y); ser.gu.push(Ry.guNA?null:Ry.guBol); ser.pf.push(Ry.pfBol); ser.lp.push(Ry.lpBol); });
    var all=ser.gu.concat(ser.pf,ser.lp).filter(function(v){return v!=null;}), max=Math.max.apply(null,all)||1, min=0;
    function xx(i){ return L+(YEARS.length===1?0:i/(YEARS.length-1)*plotW); }
    function yy(v){ return T+plotH-(v-min)/(max-min)*plotH; }
    var colors={gu:'#8a93a6',pf:'#5c0a0a',lp:'#21867a'};
    var s='<svg class="chart" viewBox="0 0 '+W+' '+H+'" xmlns="http://www.w3.org/2000/svg" font-family="Segoe UI,Arial,sans-serif">';
    [0,0.5,1].forEach(function(f){ var v=min+(max-min)*f, gy=yy(v);
      s+='<line x1="'+L+'" y1="'+gy.toFixed(1)+'" x2="'+(W-Rp)+'" y2="'+gy.toFixed(1)+'" stroke="#eef0f7"/>';
      s+='<text x="'+(L-8)+'" y="'+(gy+4).toFixed(1)+'" text-anchor="end" font-size="11" fill="#7a8095">'+money(v)+'</text>';
    });
    YEARS.forEach(function(y,i){ s+='<text x="'+xx(i).toFixed(1)+'" y="'+(base+20)+'" text-anchor="middle" font-size="11" fill="#7a8095">'+y+'</text>'; });
    ['gu','pf','lp'].forEach(function(k){
      var pts=ser[k].map(function(v,i){ return v==null?null:(xx(i).toFixed(1)+','+yy(v).toFixed(1)); }).filter(Boolean);
      if(pts.length>=2) s+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+colors[k]+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
      ser[k].forEach(function(v,i){ if(v!=null) s+='<circle class="pt pt'+i+'" cx="'+xx(i).toFixed(1)+'" cy="'+yy(v).toFixed(1)+'" r="3.2" fill="'+colors[k]+'"/>'; });
    });

    // balão com os três valores do ano sob o cursor
    var NOMES={gu:'Guia única',pf:'Pagar por fora',lp:'Lucro Presumido'};
    var tipW=176, tipH=86;
    s+='<g id="lcTip" style="display:none;pointer-events:none">'+
       '<line id="lcTipLine" y1="'+T+'" y2="'+base+'" stroke="#cdd3f5" stroke-width="1" stroke-dasharray="3 3"/>'+
       '<rect id="lcTipBox" width="'+tipW+'" height="'+tipH+'" rx="9" fill="#14162b" opacity=".96"/>'+
       '<text id="lcTipAno" font-size="11.5" font-weight="800" fill="#fff"></text>';
    ['gu','pf','lp'].forEach(function(k,j){
      s+='<circle id="lcTipDot'+j+'" r="3.4" fill="'+colors[k]+'"/>'+
         '<text id="lcTipNome'+j+'" font-size="10.5" fill="#cdd6e6">'+NOMES[k]+'</text>'+
         '<text id="lcTipVal'+j+'" font-size="11.5" font-weight="800" fill="#fff" text-anchor="end"></text>';
    });
    s+='</g>';

    // faixas invisíveis: uma por ano, capturam o mouse em toda a altura do gráfico
    var faixa=plotW/(YEARS.length-1);
    YEARS.forEach(function(y,i){
      s+='<rect class="lcHit" data-i="'+i+'" x="'+(xx(i)-faixa/2).toFixed(1)+'" y="'+T+'" width="'+faixa.toFixed(1)+
         '" height="'+plotH+'" fill="transparent" style="cursor:crosshair"/>';
    });
    return s+'</svg>';
  }

  /** liga o balão do gráfico de linha depois que o SVG entra no DOM */
  function ligarTooltipLinha(container, dados){
    var svg=container.querySelector('svg'); if(!svg) return;
    var tip=svg.querySelector('#lcTip'); if(!tip) return;
    var W=640, tipW=176, tipH=86;
    function mostrar(i){
      var d=dados[i]; if(!d) return;
      tip.style.display='';
      var x=Number(d.x);
      svg.querySelector('#lcTipLine').setAttribute('x1',x); svg.querySelector('#lcTipLine').setAttribute('x2',x);
      // o balão vira para o lado que tiver espaço
      var bx=x+14; if(bx+tipW>W-4) bx=x-14-tipW;
      var by=Math.max(20, Math.min(Number(d.yMin)-tipH-10, 200));
      svg.querySelector('#lcTipBox').setAttribute('x',bx); svg.querySelector('#lcTipBox').setAttribute('y',by);
      var ano=svg.querySelector('#lcTipAno');
      ano.setAttribute('x',bx+12); ano.setAttribute('y',by+19); ano.textContent=d.ano;
      ['gu','pf','lp'].forEach(function(k,j){
        var ly=by+38+j*17;
        svg.querySelector('#lcTipDot'+j).setAttribute('cx',bx+15);
        svg.querySelector('#lcTipDot'+j).setAttribute('cy',ly-3.5);
        svg.querySelector('#lcTipNome'+j).setAttribute('x',bx+25);
        svg.querySelector('#lcTipNome'+j).setAttribute('y',ly);
        var v=svg.querySelector('#lcTipVal'+j);
        v.setAttribute('x',bx+tipW-12); v.setAttribute('y',ly); v.textContent=BRL.format(d[k]);
      });
      svg.querySelectorAll('.pt').forEach(function(c){ c.setAttribute('r','3.2'); });
      svg.querySelectorAll('.pt'+i).forEach(function(c){ c.setAttribute('r','5.4'); });
    }
    function esconder(){
      tip.style.display='none';
      svg.querySelectorAll('.pt').forEach(function(c){ c.setAttribute('r','3.2'); });
    }
    svg.querySelectorAll('.lcHit').forEach(function(rect){
      rect.addEventListener('mouseenter',function(){ mostrar(parseInt(rect.getAttribute('data-i'),10)); });
      rect.addEventListener('mousemove',function(){ mostrar(parseInt(rect.getAttribute('data-i'),10)); });
    });
    svg.addEventListener('mouseleave',esconder);
  }

  /** dados por ano usados pelo balão */
  function dadosTrajetoria(P){
    var W=640,H=290,L=70,Rp=16,T=18,B=46, plotW=W-L-Rp, plotH=H-T-B;
    var ser=YEARS.map(function(y){ var R=computeYear(P,y); return {ano:y,gu:R.guBol,pf:R.pfBol,lp:R.lpBol}; });
    var max=Math.max.apply(null,ser.map(function(d){return Math.max(d.gu,d.pf,d.lp);}))||1;
    return ser.map(function(d,i){
      var x=L+(YEARS.length===1?0:i/(YEARS.length-1)*plotW);
      var yy=function(v){ return T+plotH-(v/max)*plotH; };
      // x e yMin ficam como NÚMERO: se virarem string, as somas abaixo concatenam
      // e todos os textos do balão caem na mesma coordenada
      return {ano:d.ano,gu:d.gu,pf:d.pf,lp:d.lp,x:x,
        yMin:Math.min(yy(d.gu),yy(d.pf),yy(d.lp))};
    });
  }

  /* ===== blocos extras do relatório completo ===== */
  function linhaDado(rot,val){
    return '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;'+
      'border-bottom:1px solid var(--line);padding:6px 0;font-size:.86rem">'+
      '<span style="color:var(--body)">'+rot+'</span>'+
      '<span style="font-weight:700;color:var(--ink);white-space:nowrap">'+val+'</span></div>';
  }
  function painel(titulo,conteudo){
    return '<div class="rp-panel"><div class="rp-ph">'+titulo+'</div>'+conteudo+'</div>';
  }
  /** receitas declaradas, agrupadas por anexo — só o que foi preenchido */
  function receitasDeclaradas(){
    var html='';
    PG.forEach(function(g){
      // uma linha entra se ela própria tem receita ou se alguma linha extra dela tem
      var linhas=g.ln.filter(function(l){
        return val(l.id)>0 || extrasDe(l.id).some(function(e){ return parseBR(e.valor)>0; });
      });
      if(!linhas.length) return;
      html+='<div style="margin-bottom:10px"><div style="font-size:.8rem;font-weight:800;color:var(--brand-navy);margin-bottom:3px">'+
        'Anexo '+g.ax+' · '+g.t+'</div>';
      var selo=function(lista){
        return lista.length?' <b style="color:var(--muted)">· já recolhido antes: '+lista.map(function(t){return TRIBLABEL[t];}).join(', ')+'</b>':'';
      };
      linhas.forEach(function(l){
        if(val(l.id)>0){
          var st=(l.stT||[]).filter(function(t){ var c=document.getElementById(l.id+'_'+t); return c&&c.checked; });
          html+=linhaDado(l.l+selo(st), BRL.format(val(l.id)));
        }
        extrasDe(l.id).forEach(function(e){
          var vx=parseBR(e.valor); if(vx<=0) return;
          var marc=(l.stT||[]).filter(function(t){ return e.t[t]; });
          html+=linhaDado(l.l+selo(marc), BRL.format(vx));
        });
      });
      html+='</div>';
    });
    return html||'<p style="font-size:.86rem;color:var(--muted)">Nenhuma receita informada.</p>';
  }
  /** clona os três cards da tela principal para dentro do relatório */
  function comparativoLadoALado(ano){
    var res=document.querySelector('.results');
    if(!res) return '';
    var c=res.cloneNode(true);
    // o clone não pode duplicar ids
    [].forEach.call(c.querySelectorAll('[id]'),function(e){ e.removeAttribute('id'); });
    // avisos de tela (ex.: "folha em zero") não vão para o relatório do cliente
    [].forEach.call(c.querySelectorAll('.miniwarn'),function(e){ e.parentNode.removeChild(e); });
    // o "Ver o cálculo" vai junto no relatório completo, já aberto para aparecer no PDF
    [].forEach.call(c.querySelectorAll('details.calc'),function(d){
      d.setAttribute('open','');
      var s=d.querySelector('summary'); if(s) s.textContent='Memória de cálculo';
    });
    return painel('Comparativo de carga total · '+ano+
      ' <span style="font-weight:600;text-transform:none;letter-spacing:0;color:var(--muted)">Guia única (tradicional) x Pagar por fora (híbrido) x Lucro Presumido · valores por mês</span>',
      c.outerHTML);
  }

  function blocosCompletos(P,R,ano){
    var h='';
    h+=comparativoLadoALado(ano);
    h+=painel('Receita do mês informada, por atividade',
      receitasDeclaradas()+
      '<div style="display:flex;justify-content:space-between;border-top:2px solid var(--line);margin-top:8px;padding-top:8px;font-size:.9rem">'+
      '<b style="color:var(--ink)">Receita total do mês</b><b style="color:var(--blue-deep)">'+BRL.format(R.fat)+'</b></div>');

    h+='<div class="rp-grid2">'+
      painel('Dados informados do cliente',
        linhaDado('Receita bruta dos últimos 12 meses (RBT12)',BRL.format(P.rbt12))+
        linhaDado('RBT12 do mercado interno (define a faixa interna)',BRL.format(P.rbt12used))+
        (P.rbt12ExpUsed>0?linhaDado('RBT12 de exportação (faixa própria · art. 23 da Res. CGSN 140/2018)',BRL.format(P.rbt12ExpUsed)):'')+
        (P.rbt12ExpUsed>0?linhaDado('RBT12r do fator "r" (os dois mercados juntos)',BRL.format(P.rbt12r)):'')+
        linhaDado('RBA do mercado interno',BRL.format(P.rba))+
        (P.rbaExp>0?linhaDado('RBA de exportação',BRL.format(P.rbaExp)):'')+
        linhaDado('Folha de empregados (últimos 12 meses)',BRL.format(P.folha12))+
        linhaDado('Pró-labore dos sócios (últimos 12 meses)',BRL.format(P.proLabore12))+
        linhaDado('INSS do sócio por mês ('+pct(P.inssProSegRate)+', nos 3 regimes)',BRL.format(P.inssProSeg))+
        linhaDado('INSS patronal por mês ('+pct(P.inssProPatRate)+', Lucro Presumido)',BRL.format(P.inssProPat))+
        (P.fatIV>0
          ? linhaDado('Receita do Anexo IV no mês ('+pct(P.pesoIV)+' do faturamento)',BRL.format(P.fatIV))+
            linhaDado('CPP fora do DAS no Anexo IV, por mês (folha + pró-labore)',BRL.format(P.cppIVTot))
          : '')+
        linhaDado('Fator R ((folha + pró-labore) ÷ RBT12)',pct(P.fatorR))+
        linhaDado('Compras que geram crédito de IBS/CBS no mês',BRL.format(P.compras))+
        linhaDado('Crédito de ICMS informado no mês',BRL.format(P.credIcms))+
        linhaDado('Vendas para empresas que aproveitam o crédito de IBS/CBS',pct(P.b2b))+
        linhaDado('Vendas para cliente que aproveita o crédito de ICMS',pct(P.b2bIcms))+
        linhaDado('Custo extra para apurar por fora',BRL.format(P.custo))+
        linhaDado('Faixa do Simples Nacional'+(P.rbt12ExpUsed>0?' (mercado interno)':''),P.faixaCom+'ª')+
        (P.rbt12ExpUsed>0?linhaDado('Faixa do Simples Nacional (exportação)',P.faixaExp+'ª'):''))+
      painel('Premissas usadas na simulação',
        linhaDado('Alíquota da CBS',pct(P.cbs))+
        linhaDado('Alíquota do IBS (cheia)',pct(P.ibs))+
        linhaDado('IBS aplicado em '+ano,pct(R.ibsY))+
        linhaDado('ICMS e ISS remanescentes em '+ano,pct(R.red))+
        linhaDado('Alíquota de ICMS (comércio)',pct(P.icms))+
        linhaDado('Alíquota de ISS (serviço)',pct(P.iss))+
        linhaDado('Presunção de IRPJ · comércio / serviço',pct(P.pIrpjCom)+' / '+pct(P.pIrpjServ))+
        linhaDado('Presunção de CSLL · comércio / serviço',pct(P.pCsllCom)+' / '+pct(P.pCsllServ))+
        linhaDado('Encargos sobre a folha (INSS + RAT + terceiros)',pct(P.cpp))+
        linhaDado('INSS do sócio sobre o pró-labore (segurado)',pct(P.inssProSegRate))+
        linhaDado('INSS patronal sobre o pró-labore',pct(P.inssProPatRate))+
        linhaDado('CPP + RAT da folha no Anexo IV (fora do DAS)',pct(P.cppIVRate))+
        linhaDado('IRPJ','15% + adicional de 10%')+
        linhaDado('CSLL','9%'))+
      '</div>';

    if(benItens.length){
      var b='';
      benItens.forEach(function(it){
        var cat=REFORMA.beneficioPorId(it.id);
        var p=it.pct!=null?it.pct:(cat?cat.pct:0);
        if(parseBR(it.valor)<=0||p<=0) return;
        b+=linhaDado((cat?cat.nome:'Atividade beneficiada')+
          ' <b style="color:var(--green)">'+(p>=100?'isento':'alíquota −'+Math.round(p)+'%')+'</b>'+
          ' <span style="color:var(--muted);font-size:.78rem">base de '+(tipoDoItem(it)==='serv'?'serviço':'produto')+
          (cat&&cat.base?' · '+cat.base:'')+'</span>',
          BRL.format(parseBR(it.valor)));
      });
      b+=linhaDado('<b>Alíquota cheia de IBS/CBS em '+ano+'</b>',pct(R.consPF));
      b+=linhaDado('<b>Alíquota média efetiva depois das reduções</b>',pct(R.sim.aliqEfetiva));
      b+=linhaDado('Base de cálculo (não muda com o benefício)',BRL.format(R.trib));
      b+='<div style="margin-top:8px;font-size:.78rem;line-height:1.45;color:var(--muted)">A redução incide sobre a <b>alíquota</b>, não sobre a base de cálculo: a receita tributável continua sendo '+BRL.format(R.trib)+' e o que muda é o percentual aplicado a cada parcela. Na guia única esses benefícios não reduzem o DAS.</div>';
      h+=painel('Benefícios de IBS/CBS informados',b);
    }
    return h;
  }

  function buildReport(){
    var P=readParams(), ano=parseInt(document.getElementById('ano').value,10), R=computeYear(P,ano);
    var nome=document.getElementById('escNome').value.trim(), crc=document.getElementById('escCrc').value.trim(), contato=document.getElementById('escContato').value.trim();
    document.getElementById('rp_esc').textContent=nome||'Seu Escritório de Contabilidade';
    var lg=document.getElementById('rp_logo');
    lg.className='rp-logo'+(escLogo?' on':'');
    lg.innerHTML=escLogo?'<img src="'+escLogo+'" alt="'+esc(nome||'Escritório')+'">':'';
    applyLogoScale();
    var sub=[]; if(crc)sub.push(crc); if(contato)sub.push(contato);
    document.getElementById('rp_sub').textContent=sub.join('   ·   ');
    document.getElementById('rp_cliente').textContent=document.getElementById('clientName').value.trim()||'Cliente não informado';
    var atv=(P.fatCom>0&&P.fatServ>0)?'Comércio/Indústria e Serviços':(P.fatCom>0?'Comércio/Indústria':(P.fatServ>0?'Serviços':'-'));
    document.getElementById('rp_atv').textContent=atv;
    document.getElementById('rp_ano').textContent=ano+(ano===2033?' (sistema completo)':'');
    document.getElementById('rp_ano2').textContent=ano;
    document.getElementById('rp_data').textContent=new Date().toLocaleDateString('pt-BR');

    var names={gu:'Guia única',pf:'Pagar por fora',lp:'Lucro Presumido'};
    var allv={gu:R.guBol,pf:R.pfBol,lp:R.lpBol}, cre={gu:R.guCre,pf:R.pfCre,lp:R.lpCre};
    var cheap=cheapestKey(R.guNA?Infinity:R.guBol,R.pfBol,R.lpBol);
    var av=R.guNA?[R.pfBol,R.lpBol]:[R.guBol,R.pfBol,R.lpBol];
    var maxv=Math.max.apply(null,av), minv=Math.min.apply(null,av);
    document.getElementById('rp_best').textContent=names[cheap];
    document.getElementById('rp_bests').textContent=money(allv[cheap])+' por mês';
    document.getElementById('rp_ecoM').textContent=money(maxv-minv);
    document.getElementById('rp_ecoA').textContent=money((maxv-minv)*12);
    document.getElementById('rp_cred').textContent=money(cre[cheap]);

    var barItems=[];
    if(!R.guNA) barItems.push({label:'Guia única',val:R.guBol,best:cheap==='gu'});
    barItems.push({label:'Por fora',val:R.pfBol,best:cheap==='pf'});
    barItems.push({label:'Lucro Presumido',val:R.lpBol,best:cheap==='lp'});
    document.getElementById('rp_bars').innerHTML=barChart(barItems);
    document.getElementById('rp_line').innerHTML=lineChart(P);
    ligarTooltipLinha(document.getElementById('rp_line'), dadosTrajetoria(P));

    // composição por tributo (mesma quebra das colunas do simulador)
    document.getElementById('rp_ano3').textContent=ano;
    var tbR=taxBreak(P,R);
    function bcell(v){ return v?money(v):'—'; }
    var brk='<thead><tr><th class="th-t">Tributo</th><th class="th-gu">Guia única</th><th class="th-pf">Por fora</th><th class="th-lp">Lucro Presumido</th></tr></thead><tbody>';
    TAXROWS.forEach(function(r){
      var g=tbR.gu[r[0]]||0, p=tbR.pf[r[0]]||0, l=tbR.lp[r[0]]||0;
      if(g||p||l) brk+='<tr><td>'+r[1]+'</td><td>'+bcell(g)+'</td><td>'+bcell(p)+'</td><td>'+bcell(l)+'</td></tr>';
    });
    brk+='<tr><td>Custo extra</td><td>—</td><td>'+bcell(P.custo)+'</td><td>'+bcell(P.custo)+'</td></tr>';
    brk+='</tbody><tfoot><tr><td>Total por mês</td><td>'+money(R.guBol)+'</td><td>'+money(R.pfBol)+'</td><td>'+money(R.lpBol)+'</td></tr>'
      +'<tr class="cred"><td>Crédito ao cliente PJ</td><td>'+money(R.guCre)+'</td><td>'+money(R.pfCre)+'</td><td>'+money(R.lpCre)+'</td></tr></tfoot>';
    document.getElementById('rp_break').innerHTML=brk;

    var d='';
    if(R.guNA){
      d+='<p>Em '+ano+' não há como simular a <b>guia única</b> (Simples tradicional): ainda não há legislação sobre as alíquotas do DAS do Simples na reforma a partir de 2028. O comparativo considera apenas o <b>pagar por fora</b> e o <b>Lucro Presumido</b>.</p>';
      d+='<p>Entre os disponíveis, o mais econômico é <b>'+names[cheap]+'</b> ('+money(allv[cheap])+'/mês). Para incluir a guia única na comparação, use o ano de 2027.</p>';
    } else {
      var diffCusto=R.pfBol-R.guBol, credExtra=R.pfCre-R.guCre;
      d+='<p>No ano de '+ano+', o caminho mais econômico em caixa é <b>'+names[cheap]+'</b>, com <b>'+money(allv[cheap])+'</b> por mês. Ante a opção mais cara, a diferença chega a '+money(maxv-minv)+' por mês ('+money((maxv-minv)*12)+' no ano).</p>';
      if(credExtra>diffCusto){
        d+='<p>Pagar por fora gera <b>'+money(credExtra)+'</b> a mais de crédito por mês para os clientes empresa, superando o custo extra de '+money(diffCusto)+'. Tende a aumentar a competitividade nas vendas para empresas.</p>';
      } else {
        d+='<p>Neste ano, o custo extra de pagar por fora ('+money(diffCusto)+') ainda supera o ganho de crédito para os clientes ('+money(credExtra)+'). Vale reavaliar ano a ano na trajetória abaixo.</p>';
      }
      if(R.lpBol<R.guBol && R.lpBol<R.pfBol){
        d+='<p><b>Lucro Presumido:</b> apareceu como o mais barato e com crédito cheio. Como implica sair do Simples Nacional, avalie a mudança de regime com atenção.</p>';
      } else {
        d+='<p><b>Lucro Presumido:</b> neste ano ficou mais caro ('+money(R.lpBol)+'), então provavelmente não compensa sair do Simples Nacional agora.</p>';
      }
    }
    document.getElementById('rp_diag').innerHTML=d;
    document.getElementById('rp_extra').innerHTML = modoRelatorio==='completo' ? blocosCompletos(P,R,ano) : '';
    document.querySelector('.rp-badge').textContent='DIAGNÓSTICO · REFORMA TRIBUTÁRIA'+(modoRelatorio==='completo'?' · COMPLETO':'');
    document.getElementById('rp_foot').innerHTML='Simulação com valores estimados, para apoio à decisão. Os percentuais de IBS, CBS e crédito dependem de regras em definição. O Lucro Presumido inclui o adicional de 10% de IRPJ sobre o lucro presumido que excede '+BRL.format(20000)+' na competência (fração mensal do limite de '+BRL.format(60000)+' por trimestre). Base legal: EC 132/2023 e LC 214/2025. Documento gerado por '+(nome||'seu escritório')+'.';
  }

  /* ===== listeners ===== */
  NUMFIELDS.forEach(function(id){ document.getElementById(id).addEventListener('input',calc); });
  CHECKFIELDS.forEach(function(id){ document.getElementById(id).addEventListener('change',calc); });
  document.getElementById('cmpAdd').addEventListener('click',function(){
    cmpItens.push({id:REFORMA.COMPRAS[0].id, valor:fmtNum(0)});
    renderCompras(); calc();
    var campos=document.querySelectorAll('#cmpLista .cmp-val');
    if(campos.length) campos[campos.length-1].focus();
  });
  document.getElementById('credIcms').addEventListener('input',atualizaNotaCredIcms);
  document.getElementById('icmsAdd').addEventListener('click',function(){
    var padrao=REFORMA.BENEF_ICMS[0];
    icmsItens.push({id:padrao.id, valor:fmtNum(0), pct:padrao.pct});
    renderBenefIcms(); calc();
    var campos=document.querySelectorAll('#icmsLista .icms-val');
    if(campos.length) campos[campos.length-1].focus();
  });
  document.getElementById('benAdd').addEventListener('click',function(){
    var padrao=REFORMA.BENEFICIOS[0];
    benItens.push({id:padrao.id, valor:fmtNum(0), pct:padrao.pct, tipo:padrao.tipo==='serv'?'serv':'prod'});
    renderBeneficios(); calc();
    var campos=document.querySelectorAll('#benLista .ben-val');
    if(campos.length) campos[campos.length-1].focus();
  });

  /* ===== máscaras: o campo já se formata enquanto o usuário digita ===== */
  // caracteres que o usuário realmente digita: os separadores de milhar e de CNPJ a máscara repõe sozinha
  var RE_NUM=/[0-9,]/, RE_CNPJ=/[0-9A-Z]/;
  // reescreve o valor formatado e devolve o cursor depois do mesmo número de caracteres úteis
  function applyMask(el,fmt,re){
    var pos=el.selectionStart==null?el.value.length:el.selectionStart, antes=0, i, c;
    for(i=0;i<pos && i<el.value.length;i++) if(re.test(el.value[i])) antes++;
    el.value=fmt(el.value);
    for(i=0,c=0;i<el.value.length && c<antes;i++) if(re.test(el.value[i])) c++;
    try{ el.setSelectionRange(i,i); }catch(e){}
  }

  // dinheiro: o valor se monta da direita para a esquerda, como em caixa eletrônico.
  // Cada dígito digitado entra nos centavos e empurra os demais: 1 → 0,01 · 120 → 1,20 · 120000 → 1.200,00
  function moneyTyping(v){
    var d=String(v==null?'':v).replace(/\D/g,'').replace(/^0+(?=\d)/,'').slice(0,15);
    if(d==='') return '';
    return (Number(d)/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
  }
  // entrada de dinheiro estilo caixa eletrônico: reformata e mantém o cursor no fim
  // (mesmo comportamento dos campos principais; usar applyMask aqui jogava o 1º dígito nos centavos)
  function moneyInput(el){ el.value=moneyTyping(el.value); var n=el.value.length; try{ el.setSelectionRange(n,n); }catch(x){} }
  // percentual: sem milhar, aceita ponto ou vírgula como decimal
  function pctTyping(v){
    var s=String(v==null?'':v).replace(/[^\d.,]/g,'').replace(/\./g,','), i=s.indexOf(',');
    var int=(i<0?s:s.slice(0,i)).replace(/\D/g,'').slice(0,3).replace(/^0+(?=\d)/,'');
    if(i<0) return int;
    return (int===''?'0':int)+','+s.slice(i+1).replace(/\D/g,'').slice(0,2);
  }
  // CNPJ: 12 primeiras posições alfanuméricas e 2 dígitos verificadores numéricos
  // (formato alfanumérico da Receita Federal, válido para inscrições a partir de 31/07/2026)
  function cnpjRaw(v){
    var s=String(v==null?'':v).toUpperCase().replace(/[^0-9A-Z]/g,'').slice(0,14);
    return s.slice(0,12)+s.slice(12).replace(/[^0-9]/g,'');
  }
  function cnpjTyping(v){
    var d=cnpjRaw(v), o=d.slice(0,2);
    if(d.length>2) o+='.'+d.slice(2,5);
    if(d.length>5) o+='.'+d.slice(5,8);
    if(d.length>8) o+='/'+d.slice(8,12);
    if(d.length>12) o+='-'+d.slice(12,14);
    return o;
  }

  var MONEYFIELDS=['rbt12','rbt12Exp','rba','rbaExp','folha12','proLabore12','credIcms','custo'].concat(PGIDS);
  var PCTFIELDS=['b2b','b2bIcms','cbs','ibs','cpp','inssProSeg','inssProPat','cppIV','icms','iss',
    'presIrpjCom','presCsllCom','presIrpjServ','presCsllServ'];
  function fmtMoney(id){ var e=document.getElementById(id); if(e) e.value=fmtNum(parseBR(e.value)); }
  function fmtPct(id){
    var e=document.getElementById(id); if(!e) return;
    var n=parseBR(e.value), mn=e.getAttribute('data-min'), mx=e.getAttribute('data-max');
    if(mx!==null && mx!=='' && n>parseFloat(mx)) n=parseFloat(mx);   // respeita os limites do campo
    if(mn!==null && mn!=='' && n<parseFloat(mn)) n=parseFloat(mn);
    e.value=n.toLocaleString('pt-BR',{maximumFractionDigits:2});
  }
  function fmtAll(){ MONEYFIELDS.forEach(fmtMoney); PCTFIELDS.forEach(fmtPct); }

  function setupMask(id,typing,fmtOnBlur,caretEnd){
    var e=document.getElementById(id); if(!e) return;
    e.setAttribute('data-min',e.getAttribute('min')||''); e.setAttribute('data-max',e.getAttribute('max')||'');
    e.type='text'; e.setAttribute('inputmode','decimal');
    e.removeAttribute('step'); e.removeAttribute('min'); e.removeAttribute('max');
    e.addEventListener('focus',function(){ e.select(); });
    e.addEventListener('input',function(){
      // no dinheiro os dígitos entram sempre pelos centavos, então o cursor fica no fim
      if(caretEnd){ e.value=typing(e.value); var n=e.value.length; try{ e.setSelectionRange(n,n); }catch(x){} }
      else applyMask(e,typing,RE_NUM);
    });
    e.addEventListener('blur',function(){ fmtOnBlur(id); calc(); });
  }
  MONEYFIELDS.forEach(function(id){ setupMask(id,moneyTyping,fmtMoney,true); });
  PCTFIELDS.forEach(function(id){ setupMask(id,pctTyping,fmtPct,false); });
  // CNPJ do cenário que está na tela: trocar de CNPJ significa trocar de cliente
  var cnpjAtual='';
  function temDados(){
    if(val('rbt12')>0||val('rbt12Exp')>0||val('rba')>0||val('rbaExp')>0||val('folha12')>0) return true;
    for(var i=0;i<PGIDS.length;i++) if(val(PGIDS[i])>0) return true;
    for(var j=0;j<stExtras.length;j++) if(parseBR(stExtras[j].valor)>0) return true;
    return false;
  }
  function limparCliente(){ // zera os dados do cliente e preserva as premissas (e o CNPJ digitado)
    MONEYFIELDS.forEach(function(id){ if(id!=='custo') document.getElementById(id).value='0'; });
    document.getElementById('clientName').value='';
    resetChecks();
    benItens=[]; renderBeneficios(); cmpItens=[]; renderCompras();
    stExtras=[]; PGLINES.forEach(function(x){ if(x.def.stT) renderStExtras(x.def.id); });
    icmsItens=[]; renderBenefIcms();
    fmtAll(); toggleAtividade(); calc(); refreshPgdas(true);
  }
  (function(){
    var e=document.getElementById('cnpj');
    e.addEventListener('input',function(){
      applyMask(e,cnpjTyping,RE_CNPJ);
      var raw=cnpjRaw(e.value);
      if(raw.length!==14 || raw===cnpjAtual) return;
      // só confirma quando há trabalho de verdade na tela; sobre o exemplo, zera direto
      if(!isExemplo() && temDados() &&
         !confirm('Este é outro CNPJ. Os dados do cliente que está na tela serão zerados.\n\nContinuar?')) return;
      cnpjAtual=raw; limparCliente();
      flash('CNPJ novo: campos zerados para este cliente. As alíquotas e presunções foram mantidas.');
    });
  })();
  fmtAll();
  ESCFIELDS.forEach(function(id){ document.getElementById(id).addEventListener('input',saveEscritorio); });

  function doSaveClient(){
    var nameEl=document.getElementById('clientName'), name=nameEl.value.trim();
    if(!name){ flash('Digite o nome do cliente para salvar.'); nameEl.scrollIntoView({behavior:'smooth',block:'center'}); nameEl.focus(); return; }
    var s=loadStore(); s[name]=collectFields(); saveStore(s); refreshList(name); flash('Cliente "'+name+'" salvo neste navegador.');
  }
  document.getElementById('saveClientBottom').addEventListener('click',doSaveClient);
  document.getElementById('expClients').addEventListener('click',exportarClientes);
  document.getElementById('impClients').addEventListener('click',function(){ document.getElementById('impFile').click(); });
  document.getElementById('impFile').addEventListener('change',function(){
    if(this.files&&this.files[0]) importarClientes(this.files[0]);
    this.value='';   // permite reimportar o mesmo arquivo depois
  });
  document.getElementById('reportBottom').addEventListener('click',function(){ abrirResumido(); });
  document.getElementById('clientList').addEventListener('change',function(){
    var name=this.value; if(!name) return;
    var s=loadStore(); if(s[name]){ document.getElementById('clientName').value=name; applyFields(s[name]); flash('Cliente "'+name+'" carregado.'); }
  });
  document.getElementById('delClient').addEventListener('click',function(){
    var name=document.getElementById('clientList').value;
    if(!name){ flash('Selecione um cliente salvo para apagar.'); return; }
    if(!confirm('Apagar o cliente "'+name+'"? Essa ação não tem volta.')) return;
    var s=loadStore(); delete s[name]; saveStore(s); refreshList(''); flash('Cliente "'+name+'" apagado.');
  });
  var modoRelatorio='resumido';
  function openReport(){
    // trava de segurança: o relatório leva a marca do escritório ao cliente final
    if(isExemplo() && !confirm('Atenção: os números ainda são os do exemplo (R$ 50.000 de revenda no Anexo I, RBT12 de R$ 600.000).\n\nGerar o relatório assim mesmo?')) return;
    buildReport(); document.body.classList.add('previewing'); window.scrollTo(0,0);
  }
  function abrirResumido(){ modoRelatorio='resumido'; openReport(); }
  function abrirCompleto(){ modoRelatorio='completo'; openReport(); }
  document.getElementById('reportTop').addEventListener('click',abrirResumido);
  document.getElementById('reportTopFull').addEventListener('click',abrirCompleto);
  document.getElementById('reportBottomFull').addEventListener('click',abrirCompleto);
  document.getElementById('rp_print').addEventListener('click',function(){ window.print(); });
  document.getElementById('rp_back').addEventListener('click',function(){ document.body.classList.remove('previewing'); window.scrollTo(0,0); });
  window.addEventListener('beforeprint', buildReport);
  document.getElementById('reset').addEventListener('click',function(){
    for(var k in DEFAULTS){ document.getElementById(k).value=DEFAULTS[k]; }
    resetChecks();
    document.getElementById('clientName').value='';
    document.getElementById('cnpj').value=''; cnpjAtual='';
    benItens=[]; renderBeneficios(); cmpItens=[]; renderCompras();
    fmtAll(); toggleAtividade(); calc(); refreshPgdas(true);
    flash('Exemplo restaurado.');
  });
  // zera só os dados do cliente e mantém as premissas (alíquotas, presunções e custo extra)
  document.getElementById('clearAll').addEventListener('click',function(){
    document.getElementById('cnpj').value=''; cnpjAtual='';
    limparCliente();
    flash('Campos zerados para um novo cliente. As alíquotas e presunções foram mantidas.');
    document.getElementById('cnpj').scrollIntoView({behavior:'smooth',block:'center'});
  });
  // o cenário ainda é o de demonstração? (usado para avisar antes de gerar o PDF)
  function isExemplo(){
    for(var k in DEFAULTS){
      var e=document.getElementById(k); if(!e) continue;
      if(parseBR(e.value)!==parseBR(String(DEFAULTS[k]))) return false;
    }
    return true;
  }
  document.getElementById('cnpjBtn').addEventListener('click',function(){
    var raw=cnpjRaw(document.getElementById('cnpj').value), info=document.getElementById('cnpjInfo');
    if(raw.length!==14){ info.textContent='CNPJ incompleto: precisa de 14 caracteres.'; return; }
    if(/[A-Z]/.test(raw)){ info.textContent='CNPJ alfanumérico: a consulta automática ainda não está disponível para esse formato. Preencha o nome do cliente manualmente.'; return; }
    info.textContent='Consultando...';
    fetch('https://brasilapi.com.br/api/cnpj/v1/'+raw).then(function(r){ if(!r.ok) throw 0; return r.json(); }).then(function(d){
      var nome=d.nome_fantasia||d.razao_social||'';
      if(nome) document.getElementById('clientName').value=nome;
      if(d.data_inicio_atividade){
        var ini=new Date(d.data_inicio_atividade+'T00:00:00'), now=new Date();
        var m=(now.getFullYear()-ini.getFullYear())*12+(now.getMonth()-ini.getMonth());
        document.getElementById('mesesAtiv').value=(m>=1&&m<12)?m:0;
      }
      var det=[]; if(d.razao_social)det.push('<b>'+d.razao_social+'</b>');
      if(d.data_inicio_atividade)det.push('abertura '+d.data_inicio_atividade.split('-').reverse().join('/'));
      if(d.cnae_fiscal_descricao)det.push(d.cnae_fiscal_descricao);
      if(d.municipio)det.push(d.municipio+'/'+(d.uf||''));
      info.innerHTML=det.join(' · ')+'. Ajuste a RBT12, a RBA e as receitas por anexo manualmente.';
      calc();
    }).catch(function(){ info.textContent='Não foi possível consultar o CNPJ (verifique a internet ou preencha manualmente).'; });
  });

  window.addEventListener('resize', equalizeHeads);
  // "Ver o cálculo": abrir/fechar um sincroniza os três cards
  var calcDetails=document.querySelectorAll('.results details.calc');
  calcDetails.forEach(function(d){ d.addEventListener('toggle',function(){
    if(d._sync) return;
    calcDetails.forEach(function(o){ if(o!==d && o.open!==d.open){ o._sync=true; o.open=d.open; o._sync=false; } });
  }); });

  /* ===== init ===== */
  loadEscritorio();
  refreshList('');
  renderBeneficios();
  renderCompras();
  renderBenefIcms();
  atualizaNotaCredIcms();
  toggleAtividade();
  calc();
  refreshPgdas(true);
  buildReport();
})();
