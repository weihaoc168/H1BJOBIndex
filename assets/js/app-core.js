(function(){
  'use strict';
  var NS='http://www.w3.org/2000/svg';
  var YEARS=[]; for(var y=2014;y<=2026;y++) YEARS.push(y);
  var N=YEARS.length;

  /* ---------- 数据(口径见方法论) ---------- */
  var D={
    enroll:[88.6052,97.4926,104.3839,107.8822,109.4792,109.5299,107.5496,91.4095,94.8519,105.7188,112.6690,117.7766,116.6],
    newEnroll:[27.0128,29.3766,30.0743,29.0836,27.1738,26.9383,26.7712,14.5528,26.1961,29.8523,29.8705,27.7118,23.0],
    opt:[10.5997,12.0287,14.7498,17.5695,20.3462,22.3085,22.3539,20.3885,18.4759,19.8793,24.2782,29.4253,33.5],
    h1bReg:[17.25,23.3,23.6,19.9,19.0098,20.1011,27.4237,30.8613,48.3927,78.0884,47.9953,35.8737,21.16],
    sel:[49.3,36.5,36,42.7,44.7,42.3,46.2,43.8,26.9,24.8,28.7,34.9,null],
    den:[8,6,10,13,24,21,13,4,2.2,3.5,2.5,2.8,null],
    unemp:[6.2,5.3,4.9,4.4,3.9,3.7,8.1,5.3,3.6,3.6,4.0,4.3,4.2],
    grad:[5.3,4.8,3.9,3.9,3.7,3.9,8.0,5.8,4.1,4.4,4.8,5.4,5.6],
    jolts:[4.8,5.6,5.9,6.1,7.1,7.2,6.3,10.0,11.2,9.3,7.7,7.1,7.359],
    policy:[55,50,65,-35,-55,-50,-85,45,60,55,55,-90,-89],
    layoffs:[null,null,null,null,null,null,81,15,164.4,262.7,152.9,123.9,124]
  };
  var EST={enroll:[12],newEnroll:[12],opt:[12]};
  var SEL_EST_2026=20, DEN_EST_2026=2.8;

  /* ---------- 指数计算 ---------- */
  function normArr(a){var mn=Infinity,mx=-Infinity;a.forEach(function(v){if(v==null)return;mn=Math.min(mn,v);mx=Math.max(mx,v);});return a.map(function(v){return v==null?null:(v-mn)/(mx-mn);});}
  var A,B,C,Dp,INDEX,START_V;
  function computeIndex(){
    var gradInv=normArr(D.grad.map(function(v){return -v;}));
    var joltsN=normArr(D.jolts);
    A=YEARS.map(function(_,i){return (gradInv[i]+joltsN[i])/2*100;});
    var eff=YEARS.map(function(_,i){
      var s=(i===12)?SEL_EST_2026:D.sel[i], d=(i===12)?DEN_EST_2026:D.den[i];
      return s*(1-d/100);
    });
    B=normArr(eff).map(function(v){return v*100;});
    C=D.policy.map(function(v){return (v+100)/2;});
    var growth=D.opt.map(function(v,i){return i===0?null:(v/D.opt[i-1]-1)*100;});
    Dp=normArr(growth).map(function(v){return v==null?null:v*100;});
    INDEX=YEARS.map(function(_,i){
      if(Dp[i]==null){var w=0.30+0.25+0.30;return (0.30*A[i]+0.25*B[i]+0.30*C[i])/w;}
      return 0.30*A[i]+0.25*B[i]+0.30*C[i]+0.15*Dp[i];
    });
    START_V=INDEX[12];
    var dlt=INDEX[10]-INDEX[12];
    document.getElementById('heroNum').innerHTML=Math.round(INDEX[12])+'<small> / 100 · 2026 年</small>';
    document.getElementById('heroDelta').innerHTML=(dlt>=0?'▼ 较 2024 年(':'▲ 较 2024 年(')+Math.round(INDEX[10])+')'+(dlt>=0?'下降 ':'上升 ')+Math.abs(Math.round(dlt))+' 点<span class="hero-tag">'+(INDEX[12]<=Math.min.apply(null,INDEX)+0.5?'2014 年以来最低,低于疫情年':'当前情景设定下的水平')+'</span>';
  }
  computeIndex();

  /* ---------- 工具 ---------- */
  function sv(tag,attrs,parent){var e=document.createElementNS(NS,tag);for(var k in attrs)e.setAttribute(k,attrs[k]);if(parent)parent.appendChild(e);return e;}
  function fmt1(v){return v==null?'—':(Math.round(v*10)/10).toLocaleString('zh-CN');}
  function ay(y){return (y-1)+'/'+String(y).slice(2)+' 学年';}
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

  /* ---------- 通用折线图 ---------- */
  /* cfg: {series:[{name,cls,vals,est:[],breakAfter,endVal,endName}], yMin,yMax,ticks,fmt,H,mR,eras,lane,anno,tipTitle,tipRows,tipExtra} */
  function lineChart(elId,cfg){
    var host=document.getElementById(elId); host.innerHTML='';
    var W=Math.max(300,host.clientWidth||host.parentNode.clientWidth||640);
    var H=cfg.H||230;
    var small=W<560;
    var mT=cfg.eras?26:14, mB=cfg.lane?62:30, mL=40, mR=small?Math.min(cfg.mR||58,64):(cfg.mR||58);
    var pw=W-mL-mR, ph=H-mT-mB, pb=mT+ph;
    var svg=sv('svg',{viewBox:'0 0 '+W+' '+H,width:W,height:H,role:'img'},host);
    host.style.position='relative';
    var X=function(i){return mL+(N<2?0:i/(N-1)*pw);};
    var Y=function(v){return mT+(1-(v-cfg.yMin)/(cfg.yMax-cfg.yMin))*ph;};

    if(cfg.eras){
      var eras=[[2014,2016,'奥巴马(末期)',0],[2017,2020,'特朗普 1.0',1],[2021,2024,'拜登',0],[2025,2026,'特朗普 2.0',1]];
      eras.forEach(function(e){
        var x0=X(e[0]-2014)-(e[0]>2014?pw/(N-1)/2:6), x1=X(e[1]-2014)+(e[1]<2026?pw/(N-1)/2:6);
        if(e[3])sv('rect',{x:x0,y:mT-4,width:x1-x0,height:ph+8,fill:'var(--wash)'},svg);
        if(x1-x0>76){
          var t=sv('text',{x:(x0+x1)/2,y:mT-10,'text-anchor':'middle','class':'eralbl'},svg);
          t.textContent=e[2];
        }
      });
    }
    cfg.ticks.forEach(function(tv){
      sv('line',{x1:mL,x2:mL+pw,y1:Y(tv),y2:Y(tv),'class':(tv===0&&cfg.yMin<0)?'axisln':'grid-h'},svg);
      var t=sv('text',{x:mL-7,y:Y(tv)+4,'text-anchor':'end','class':'tick'},svg);
      t.textContent=cfg.fmt?cfg.fmt(tv):tv;
    });
    sv('line',{x1:mL,x2:mL+pw,y1:pb,y2:pb,'class':'axisln'},svg);
    var every=(pw/N<46)?2:1;
    YEARS.forEach(function(yv,i){
      if(i%every!==0&&i!==N-1)return;
      var t=sv('text',{x:X(i),y:pb+16,'text-anchor':'middle','class':'tick'},svg);
      t.textContent=yv;
    });

    /* 折线:按 null / breakAfter / 估算切段 */
    cfg.series.forEach(function(s){
      var segs=[],cur=[];
      s.vals.forEach(function(v,i){
        if(v==null){if(cur.length)segs.push(cur);cur=[];return;}
        cur.push(i);
        if(s.breakAfter===i){segs.push(cur);cur=[];}
      });
      if(cur.length)segs.push(cur);
      segs.forEach(function(seg){
        if(seg.length<2)return;
        var solid=[],dash=[];
        for(var k=0;k<seg.length-1;k++){
          var i0=seg[k],i1=seg[k+1];
          var isEst=(s.est&&(s.est.indexOf(i1)>=0||s.est.indexOf(i0)>=0));
          (isEst?dash:solid).push([i0,i1]);
        }
        function draw(pairs,dashed){
          if(!pairs.length)return;
          var dstr='';
          pairs.forEach(function(p){dstr+='M'+X(p[0])+' '+Y(s.vals[p[0]])+'L'+X(p[1])+' '+Y(s.vals[p[1]]);});
          var path=sv('path',{d:dstr,'class':'ln '+s.cls},svg);
          if(dashed)path.setAttribute('stroke-dasharray','5 4');
        }
        draw(solid,false);draw(dash,true);
      });
      /* 端点 */
      var last=-1;for(var i=N-1;i>=0;i--){if(s.vals[i]!=null){last=i;break;}}
      if(last>=0){
        var isEst=s.est&&s.est.indexOf(last)>=0;
        sv('circle',{cx:X(last),cy:Y(s.vals[last]),r:4,'class':'dot '+(isEst?'est ':'')+s.cls},svg);
        if(s.endVal!==false){
          var tv=sv('text',{x:X(last)+8,y:Y(s.vals[last])+4,'class':'endval'},svg);
          tv.textContent=(cfg.fmt?cfg.fmt(s.vals[last]):fmt1(s.vals[last]))+(isEst?'(估)':'');
        }
      }
    });

    /* 右侧支柱名标注(hero) */
    if(cfg.endNames&&!small){
      var lbls=cfg.endNames.map(function(e){return {name:e.name,y:Y(e.v)};}).sort(function(a,b){return a.y-b.y;});
      for(var i2=1;i2<lbls.length;i2++){if(lbls[i2].y-lbls[i2-1].y<14)lbls[i2].y=lbls[i2-1].y+14;}
      lbls.forEach(function(l){
        var t=sv('text',{x:mL+pw+10,y:clamp(l.y,mT+8,pb-2)+4,'class':'endlbl'},svg);
        t.textContent=l.name;
      });
    }
    if(cfg.anno){cfg.anno.forEach(function(a){
      var t=sv('text',{x:X(a.i),y:Y(a.y),'text-anchor':a.anchor||'middle','class':'anno'},svg);
      t.textContent=a.text;
    });}

    /* 事件带(hero) */
    var laneTip=null;
    if(cfg.lane){
      var laneY=H-14;
      var lt=sv('text',{x:mL-7,y:laneY+4,'text-anchor':'end','class':'tick'},svg);lt.textContent='事件';
      cfg.lane.forEach(function(ev){
        var ex=X(ev.y-2014)+(ev.dx||0);
        var g=sv('g',{},svg);
        if(ev.imp==='neg')sv('path',{d:'M'+ex+' '+(laneY-5)+'l5 5-5 5-5-5z','class':'evt-neg'},g);
        else if(ev.imp==='pos')sv('circle',{cx:ex,cy:laneY,r:4.5,'class':'evt-pos'},g);
        else sv('circle',{cx:ex,cy:laneY,r:4.5,'class':'evt-mix'},g);
        var hit=sv('circle',{cx:ex,cy:laneY,r:12,fill:'transparent'},g);
        hit.style.pointerEvents='all';
        hit.addEventListener('pointerenter',function(){
          if(!laneTip){laneTip=document.createElement('div');laneTip.className='tip';host.appendChild(laneTip);}
          laneTip.innerHTML='';
          var d1=document.createElement('div');d1.className='yr';d1.textContent=ev.y+' 年'+(ev.imp==='neg'?' · 利空':ev.imp==='pos'?' · 利好':' · 双向');
          var d2=document.createElement('div');d2.className='evline';d2.textContent=ev.t;
          laneTip.appendChild(d1);laneTip.appendChild(d2);
          laneTip.style.display='block';
          var tw=laneTip.offsetWidth;
          laneTip.style.left=clamp(ex-tw/2,4,W-tw-4)+'px';
          laneTip.style.top=(laneY-laneTip.offsetHeight-16)+'px';
        });
        hit.addEventListener('pointerleave',function(){if(laneTip)laneTip.style.display='none';});
      });
    }

    /* 十字线 + 提示 */
    var tip=document.createElement('div');tip.className='tip';host.appendChild(tip);
    var xline=sv('line',{y1:mT,y2:pb,'class':'xhair',visibility:'hidden'},svg);
    var hoverDots=sv('g',{},svg);
    var overlay=sv('rect',{x:mL,y:mT,width:pw,height:ph,fill:'transparent',tabindex:'0'},svg);
    overlay.style.pointerEvents='all';
    var activeI=-1;
    function show(i){
      activeI=i;
      var x=X(i);
      xline.setAttribute('x1',x);xline.setAttribute('x2',x);xline.setAttribute('visibility','visible');
      while(hoverDots.firstChild)hoverDots.removeChild(hoverDots.firstChild);
      cfg.series.forEach(function(s){
        if(s.vals[i]==null)return;
        var isEst=s.est&&s.est.indexOf(i)>=0;
        sv('circle',{cx:x,cy:Y(s.vals[i]),r:4.5,'class':'dot '+(isEst?'est ':'')+s.cls},hoverDots);
      });
      tip.innerHTML='';
      var h=document.createElement('div');h.className='yr';h.textContent=cfg.tipTitle?cfg.tipTitle(i):YEARS[i]+' 年';tip.appendChild(h);
      cfg.tipRows(i).forEach(function(r){
        var row=document.createElement('div');row.className='row';
        var nm=document.createElement('span');nm.className='nm';
        var k=document.createElement('span');k.className='k';k.style.borderTopColor=r.color;nm.appendChild(k);
        nm.appendChild(document.createTextNode(r.name));
        var v=document.createElement('span');v.className='v';v.textContent=r.value;
        row.appendChild(nm);row.appendChild(v);tip.appendChild(row);
      });
      if(cfg.tipExtra){var ex=cfg.tipExtra(i);if(ex){var e=document.createElement('div');e.className='estnote';e.textContent=ex;tip.appendChild(e);}}
      tip.style.display='block';
      var tw=tip.offsetWidth;
      var lx=(x+14+tw>W-4)?(x-tw-14):(x+14);
      tip.style.left=lx+'px';
      tip.style.top=Math.max(4,mT+8)+'px';
    }
    function hide(){tip.style.display='none';xline.setAttribute('visibility','hidden');while(hoverDots.firstChild)hoverDots.removeChild(hoverDots.firstChild);activeI=-1;}
    overlay.addEventListener('pointermove',function(e){
      var r=svg.getBoundingClientRect();
      var px=(e.clientX-r.left)*(W/r.width);
      var i=clamp(Math.round((px-mL)/(pw/(N-1))),0,N-1);
      show(i);
    });
    overlay.addEventListener('pointerleave',hide);
    overlay.addEventListener('focus',function(){show(activeI<0?N-1:activeI);});
    overlay.addEventListener('blur',hide);
    overlay.addEventListener('keydown',function(e){
      if(e.key==='ArrowLeft'){show(clamp((activeI<0?N-1:activeI)-1,0,N-1));e.preventDefault();}
      else if(e.key==='ArrowRight'){show(clamp((activeI<0?N-1:activeI)+1,0,N-1));e.preventDefault();}
      else if(e.key==='Escape')hide();
    });
  }

  /* ---------- 发散条形图(政策评分) ---------- */
  function divergingChart(elId){
    var host=document.getElementById(elId);host.innerHTML='';host.style.position='relative';
    var W=Math.max(300,host.clientWidth||640),H=260;
    var mT=16,mB=30,mL=44,mR=16,pw=W-mL-mR,ph=H-mT-mB;
    var svg=sv('svg',{viewBox:'0 0 '+W+' '+H,width:W,height:H,role:'img'},host);
    var Y=function(v){return mT+(1-(v+100)/200)*ph;};
    var slot=pw/N, bw=Math.min(24,slot-8);
    [-100,-50,0,50,100].forEach(function(tv){
      sv('line',{x1:mL,x2:mL+pw,y1:Y(tv),y2:Y(tv),'class':tv===0?'axisln':'grid-h'},svg);
      var t=sv('text',{x:mL-7,y:Y(tv)+4,'text-anchor':'end','class':'tick'},svg);t.textContent=tv>0?'+'+tv:tv;
    });
    var tip=document.createElement('div');tip.className='tip';host.appendChild(tip);
    var NOTES=['奥巴马末期:行政令指示扩大 STEM OPT,便利化基调','STEM OPT 延期遭诉讼撤销(暂缓执行),不确定性上升','24 个月 STEM OPT 新规生效,奥巴马时代高点','“买美国货、雇美国人”行政令,H-1B 审查骤紧','拒签率峰值 24%;非法滞留新政;对华 STEM 签证收紧','高拒签与 RFE 持续,法院开始反制','疫情 + 多重入境禁令 + 网课新规,特朗普 1.0 最低点','拜登系统性撤销限制,拒签率降至约 4%','STEM OPT 扩容 22 个专业,签发量强劲回升','再增 8 个 STEM 专业;WashTech 法律威胁解除','一人一签抽签改革 + H-1B 现代化规则','SEVIS 除名、面谈暂停、19 国禁令、$10 万费、加权抽签规则:序列最低','8-04 重评 −85→−89:D/S 终结规则已成定局(7-17 发布、9-15 生效,离境宽限砍半并新增转学换专业限制,截至 8-04 无诉讼)、加权抽签生效、OPT 版 $10 万费进入内部讨论;正面项(39 国冻结被叫停、$10 万 H-1B 费现全国不可执行)属临时性司法救济,未触及学生身份架构本身'];
    YEARS.forEach(function(yv,i){
      var v=D.policy[i],cx=mL+slot*i+slot/2,x0=cx-bw/2;
      var y0=Y(Math.max(0,v)),y1=Y(Math.min(0,v)),hgt=Math.abs(y1-y0),r=Math.min(4,hgt);
      var d2;
      if(v>=0)d2='M'+x0+' '+y1+'V'+(y0+r)+'a'+r+' '+r+' 0 0 1 '+r+'-'+r+'h'+(bw-2*r)+'a'+r+' '+r+' 0 0 1 '+r+' '+r+'V'+y1+'Z';
      else d2='M'+x0+' '+y0+'V'+(y1-r)+'a'+r+' '+r+' 0 0 0 '+r+' '+r+'h'+(bw-2*r)+'a'+r+' '+r+' 0 0 0 '+r+'-'+r+'V'+y0+'Z';
      var bar=sv('path',{d:d2,'class':v>=0?'bar-pos':'bar-neg'},svg);
      if(i===2||i===11||i===12){
        var t=sv('text',{x:cx,y:v>=0?Y(v)-6:Y(v)+14,'text-anchor':'middle','class':'barlbl'},svg);
        t.textContent=(v>0?'+':'')+v;
      }
      var hit=sv('rect',{x:mL+slot*i,y:mT,width:slot,height:ph,fill:'transparent'},svg);
      hit.style.pointerEvents='all';
      function show(){
        bar.style.opacity=.82;
        tip.innerHTML='';
        var h=document.createElement('div');h.className='yr';h.textContent=yv+' 年 · '+(v>0?'+':'')+v;tip.appendChild(h);
        var b=document.createElement('div');b.className='evline';b.textContent=NOTES[i];tip.appendChild(b);
        tip.style.display='block';
        var tw=tip.offsetWidth;
        tip.style.left=clamp(cx-tw/2,4,W-tw-4)+'px';
        tip.style.top=Math.max(4,(v>=0?Y(v):Y(0))-tip.offsetHeight-10)+'px';
      }
      function hide(){bar.style.opacity=1;tip.style.display='none';}
      hit.addEventListener('pointerenter',show);hit.addEventListener('pointerleave',hide);
      hit.addEventListener('focus',show);hit.addEventListener('blur',hide);
      hit.setAttribute('tabindex','0');
    });
    sv('line',{x1:mL,x2:mL+pw,y1:H-mB,y2:H-mB,'class':'axisln',visibility:'hidden'},svg);
    var every=(pw/N<46)?2:1;
    YEARS.forEach(function(yv,i){
      if(i%every!==0&&i!==N-1)return;
      var t=sv('text',{x:mL+slot*i+slot/2,y:H-mB+22,'text-anchor':'middle','class':'tick'},svg);t.textContent=yv;
    });
  }

  /* ---------- 各图渲染 ---------- */
  var LANE=[
    {y:2014,imp:'pos',t:'奥巴马行政令:指示扩大 STEM OPT、简化签证流程'},
    {y:2015,imp:'mix',t:'WashTech 诉讼撤销 17 个月 STEM 延期(暂缓执行)'},
    {y:2016,imp:'pos',t:'STEM OPT 延长至 24 个月新规生效(最长可工作 36 个月)'},
    {y:2017,imp:'neg',t:'“买美国货、雇美国人”行政令,H-1B 审查全面收紧'},
    {y:2018,imp:'neg',t:'H-1B 初次申请拒签率达 24% 峰值;非法滞留新政'},
    {y:2020,imp:'neg',t:'新冠疫情;H-1B 入境禁令;网课新规(8 天后撤回)'},
    {y:2021,imp:'pos',t:'拜登系统性撤销特朗普 1.0 限制,拒签率降至约 4%'},
    {y:2022,imp:'pos',dx:-8,t:'STEM OPT 新增 22 个专业(数据科学、商业分析等)'},
    {y:2022,imp:'neg',dx:8,t:'11 月科技裁员潮开始:Meta / Twitter / Amazon,全年 16.4 万人'},
    {y:2023,imp:'neg',t:'科技裁员峰值:全年约 26.3 万人,正中留学生集中的软件岗位'},
    {y:2024,imp:'pos',t:'一人一签抽签改革;H-1B 现代化规则(cap-gap 延至 4/1)'},
    {y:2025,imp:'neg',dx:-8,t:'SEVIS 大规模除名(约 4,700 人,诉讼后撤回);哈佛 SEVP 风波'},
    {y:2025,imp:'neg',dx:8,t:'签证面谈暂停 3 周 + 社媒审查;19 国旅行禁令;$10 万 H-1B 费'},
    {y:2026,imp:'neg',dx:-8,t:'加权抽签生效(应届生 Level I 中签约 15%);39 国 OPT 审批冻结'},
    {y:2026,imp:'mix',dx:8,t:'法院反制:审批冻结与 $10 万费均被判违法(费现全国不可执行);D/S 终结规则 7-17 发布,9-15 生效'}
  ];

  function heroTip(i){
    return [
      {name:'综合指数',color:'var(--ink)',value:String(Math.round(INDEX[i]))},
      {name:'劳动力市场',color:'var(--yellow)',value:String(Math.round(A[i]))},
      {name:'H-1B 通道',color:'var(--orange)',value:String(Math.round(B[i]))},
      {name:'政策环境',color:'var(--blue)',value:String(Math.round(C[i]))},
      {name:'OPT 增长',color:'var(--aqua)',value:Dp[i]==null?'—':String(Math.round(Dp[i]))}
    ];
  }

  /* ---------- 外推模型(每日推进) ---------- */
  var SNAP=new Date(2026,7,4);
  var PROJ_END=new Date(2027,7,4);
  var SCN={base:{label:'基准',drift:-0.15},bull:{label:'乐观',drift:0.22},bear:{label:'悲观',drift:-0.40}};
  var DRIFT0={base:-0.15,bull:0.22,bear:-0.40}, POLICY0=D.policy[12];
  var PEVENTS=[
    {d:new Date(2026,8,5), label:'D/S 诉讼窗口关闭(生效前最后节点)', base:0, bull:2, bear:-0.5, note:'8-04 重评新增。截至 8-04 无任何诉讼立案、无 CRA 撤销决议,距 9-15 生效仅六周。要阻断施行,须在此前后完成起诉并取得初步禁令——乐观情景的核心前提正在快速消耗;基准情景现假设规则如期施行',
     links:[['NAFSA 声明','https://www.nafsa.org/Duration-status-final-rule-press-statement'],['Presidents’ Alliance','https://www.presidentsalliance.org/'],['PIE News:实施争议','https://thepienews.com/replacing-duration-of-status-set-to-cause-chaos/']]},
    {d:new Date(2026,8,15), label:'D/S 生效:F-1 固定 4 年期限', base:-2, bull:-1.5, bear:-2.5, note:'截至 8-04 尚无诉讼立案,亦无 CRA 撤销决议;NAFSA 称将「穷尽一切途径」。过渡条款:9-15 在美者可留至 I-20 结束日(最迟 2030-11-14);2027-03-18 前按时递交 OPT/STEM 延期可免单独 I-539;9-15 后离境再入境即适用新固定期限。SEVP 定于 8-31 举办说明会',
     links:[['Study in the States 速览','https://studyinthestates.dhs.gov/elimination-of-duration-of-status-quick-facts'],['联邦公报原文','https://www.federalregister.gov/documents/2026/07/17/2026-14439/establishing-a-fixed-time-period-of-admission-and-an-extension-of-stay-procedure-for-nonimmigrant'],['NAFSA 声明','https://www.nafsa.org/Duration-status-final-rule-press-statement'],['Nixon Peabody','https://www.nixonpeabody.com/insights/alerts/2026/07/17/dhs-finalizes-rule-replacing-duration-of-status-for-f-1-j-1-and-i-visa-holders']]},
    {d:new Date(2026,8,30), label:'$10 万 H-1B 费:最高法院紧急救济窗口', base:0, bull:1, bear:-2, note:'8-04 重评下调风险:截至 8-04 最高法院无相关紧急申请立案(已逐案核对 26A118–26A157),近期恢复征收的概率随之降低(悲观冲击由 −2.5 调至 −2)。但 DHS 7-28 明确表态「若禁令解除仍计划征收」,第一巡回实体审理要到 2027 年,风险后移而非消失',
     links:[['第一巡回裁定原文(PDF)','https://www.ca1.uscourts.gov/sites/ca1/files/opnfiles/26-1699O-01A.pdf'],['Fragomen:法院拒绝暂缓','https://www.fragomen.com/insights/united-states-federal-appeals-court-declines-to-stay-lower-court-order-vacating-dollar100000-h-1b-fee.html'],['最高法院案件检索','https://www.supremecourt.gov/docket/docket.aspx']]},
    {d:new Date(2026,9,1), label:'OPT 版 $10 万费(传闻中,未成文)', base:-0.5, bull:0, bear:-6, note:'Forbes 8-03 报道 DHS 内部正在讨论对 OPT 征收 $10 万费,拟挂靠 D/S 新规带来的身份延期(EOS)要求;尚无联邦公报文件、无案卷号,亦未列入 2026 议程,属决策前阶段(基准情景仅计 −0.5)。若落地,按报道者说法「无论谁付,该金额等同禁令」——这是本模型悲观情景中最大的单一下行因子。时点后移至 10 月,因其需挂靠 9-15 生效的 EOS 流程',
     links:[['Forbes 报道 8-03','https://www.forbes.com/sites/stuartanderson/2026/08/03/new-immigration-plan-considered-to-stop-students-from-working-in-us/'],['PIIE:限制留学生的经济代价','https://www.piie.com/blogs/realtime-economics/2026/new-us-rule-restrict-student-visas-will-hurt-us-economy'],['NAFSA OPT 专页','https://www.nafsa.org/OPT']]},
    {d:new Date(2026,9,15), label:'秋季规则窗口:EAD 自动延期撤销 / H-1B 改革 NPRM', base:-1, bull:0, bear:-1.5, note:'8-04 复核:H-1B 改革 NPRM(RIN 1615-AD00)未发布、且不在 OMB 待审名单,8 月目标大概率落空;EAD 自动延期撤销终局规则(1615-AD05)自 6-23 起在 OMB 待审。注意过渡规则已生效:2025-10-30 起递交的 EAD 续期不再自动延期(原最长 540 天)',
     links:[['OMB 待审规则查询','https://www.reginfo.gov/public/do/eoReviewSearch'],['H-1B 改革规则议程条目','https://www.reginfo.gov/public/do/eAgendaViewRule?pubId=202504&RIN=1615-AD00'],['Fragomen 议程综述','https://www.fragomen.com/insights/united-states-immigration-agencies-unveil-regulatory-agendas-for-the-coming-months.html']]},
    {d:new Date(2026,10,16), label:'Open Doors 2026 + 秋季快报:收缩确认', base:-1.5, bull:-0.5, bear:-2, note:'2025 秋新入学 −17% 传导;IIE 2026 春季快报(7-13 发布,585 所院校):63% 预计 2026/27 继续下滑,博士类院校约 80% 预计下降,59% 报告本轮申请量减少',
     links:[['Open Doors 发布页','https://opendoorsdata.org/annual-release/'],['IIE 春季快报报道','https://www.insidehighered.com/news/global/international-students-us/2026/07/13/5-takeaways-international-education-survey'],['Forbes:63% 院校预计下滑','https://www.forbes.com/sites/annaesakismith/2026/07/09/nearly-two-thirds-of-colleges-expect-international-enrollment-to-fall/']]},
    {d:new Date(2026,11,31), label:'D.C. 巡回:$10 万费裁决(窗口)', base:-0.5, bull:2, bear:-1.5, note:'与第一巡回立场相反的上诉线;巡回分裂大概率上最高法院',
     links:[['D.D.C. 维持费用判决(Fragomen)','https://www.fragomen.com/insights/united-states-district-court-judge-issues-opinion-upholding-dollar100000-h-1b-fee.html'],['上诉快速通道','https://www.globalimmigrationblog.com/2026/01/100k-h-1b-fee-case-fast-tracked-in-federal-appeals-court/'],['案件追踪(Adams & Reese)','https://www.adamsandreese.com/visa-viewpoint/100000-h-1b-visa-fee-update']]},
    {d:new Date(2027,1,15), label:'OPT 限制规则 NPRM(议程目标)', base:-2.5, bull:0, bear:-4.5, note:'ICE 议程排期 2027-02(常见推迟);悲观情形含削减 STEM 延期',
     links:[['ICEF:2026 规则议程','https://monitor.icef.com/2026/07/us-regulatory-agenda-for-2026-aims-to-end-duration-of-status-and-introduce-optional-practical-training-and-h-1b-reforms/'],['DHS 确认审查 OPT(EIG Law)','https://eiglaw.com/dhs-confirms-review-of-opt-and-stem-opt/'],['NAFSA OPT 专页','https://www.nafsa.org/OPT'],['Forbes 前瞻','https://www.forbes.com/sites/stuartanderson/2025/11/11/new-immigration-rule-will-end-or-restrict-student-practical-training/']]},
    {d:new Date(2027,2,18), label:'D/S 过渡期届满:OPT 申请需另交 I-539', base:-1.5, bull:-0.5, bear:-2.5, note:'8-04 重评新增的确定性节点。D/S 规则过渡条款:2027-03-18 前按时递交 post-completion OPT 或 STEM OPT 的学生豁免单独的身份延期(EOS)申请;此日之后申请 OPT 需<b>另交 I-539 + 生物信息 + 费用</b>,并需符合「令人信服的学术理由」等条件。此后每一届毕业生的 OPT 门槛结构性抬高,且与 3 月抽签季重叠',
     links:[['Study in the States 速览','https://studyinthestates.dhs.gov/elimination-of-duration-of-status-quick-facts'],['联邦公报原文','https://www.federalregister.gov/documents/2026/07/17/2026-14439/establishing-a-fixed-time-period-of-admission-and-an-extension-of-stay-procedure-for-nonimmigrant'],['Mintz 解读','https://www.mintz.com/insights-center/viewpoints/2806/2026-07-23-dhs-issues-final-rule-creating-fixed-period-admission-f']]},
    {d:new Date(2027,2,10), label:'FY2028 加权抽签(第二年)', base:0, bull:1.5, bear:-1, note:'注册量走低可推高整体中签率,但 Level I 权重劣势不变(FY2027 实测 L1≈15% / L4≈61%)',
     links:[['加权抽签最终规则(联邦公报)','https://www.federalregister.gov/documents/2025/12/29/2025-23853/weighted-selection-process-for-registrants-and-petitioners-seeking-to-file-cap-subject-h-1b'],['USCIS:FY2027 抽签完成','https://www.uscis.gov/newsroom/alerts/fy-2027-h-1b-cap-initial-registration-selection-process-completed'],['首次加权抽签复盘','https://www.rnlawgroup.com/h-1b-after-the-first-weighted-lottery-what-changed-whats-next-and-what-it-means-for-your-workforce/']]}
  ];
  PEVENTS.sort(function(a,b){return a.d-b.d;});
  PEVENTS.forEach(function(e){e.state='pending';e.base0=e.base;e.bull0=e.bull;e.bear0=e.bear;});
  /* state: pending = 按日期生效 · landed = 已落地,立即计入 · killed = 已否决,永不计入 */
  function evActive(ev,t){
    if(ev.state==='killed')return false;
    if(ev.state==='landed')return true;
    return t>=ev.d;
  }
  function projVal(scn,t){
    var months=(t-SNAP)/(30.44*864e5);
    var v=START_V+SCN[scn].drift*months;
    for(var i=0;i<PEVENTS.length;i++){if(evActive(PEVENTS[i],t))v+=PEVENTS[i][scn];}
    return clamp(v,0,100);
  }
  var TODAY=new Date();TODAY.setHours(0,0,0,0);
  var T_NOW=new Date(Math.min(Math.max(+TODAY,+SNAP),+PROJ_END));
  function pad2(n){return (n<10?'0':'')+n;}
  function fmtD(d){return d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate());}

  document.getElementById('liveChip').innerHTML='';
  (function(){
    var chip=document.getElementById('liveChip');
    var days=Math.round((T_NOW-SNAP)/864e5);
    chip.appendChild(document.createTextNode('已自动推进至 '));
    var b=document.createElement('b');b.textContent=fmtD(TODAY);chip.appendChild(b);
    chip.appendChild(document.createTextNode(' · 快照后第 '+days+' 天'));
  })();
  function updateProjHead(){
    var vb=projVal('base',T_NOW);
    document.getElementById('projNum').innerHTML=Math.round(vb)+'<small> / 100 · 今日外推(基准)· '+fmtD(T_NOW)+'</small>';
    document.getElementById('projRange').textContent='今日情景区间:悲观 '+Math.round(projVal('bear',T_NOW))+' – 乐观 '+Math.round(projVal('bull',T_NOW))+' · 快照锚点(2026-08-04)= '+Math.round(START_V);
  }
  updateProjHead();

  function drawProj(){
    var host=document.getElementById('chProj');host.innerHTML='';host.style.position='relative';
    var W=Math.max(300,host.clientWidth||640),H=320;
    var small=W<560;
    var mT=16,mB=34,mL=40,mR=small?64:96;
    var pw=W-mL-mR,ph=H-mT-mB,pb=mT+ph;
    var svg=sv('svg',{viewBox:'0 0 '+W+' '+H,width:W,height:H,role:'img'},host);
    var span=PROJ_END-SNAP;
    var X=function(t){return mL+(t-SNAP)/span*pw;};
    var Y=function(v){return mT+(1-(v-0)/50)*ph;};
    [0,10,20,30,40,50].forEach(function(tv){
      sv('line',{x1:mL,x2:mL+pw,y1:Y(tv),y2:Y(tv),'class':'grid-h'},svg);
      var t=sv('text',{x:mL-7,y:Y(tv)+4,'text-anchor':'end','class':'tick'},svg);t.textContent=tv;
    });
    sv('line',{x1:mL,x2:mL+pw,y1:pb,y2:pb,'class':'axisln'},svg);
    var mlist=[];
    for(var mi=0;mi<13;mi++){var md=new Date(2026,7+mi,1);if(md>PROJ_END)break;mlist.push(md);}
    var everyM=(pw/13<44)?2:1;
    mlist.forEach(function(md,i){
      if(i%everyM!==0)return;
      var lb=(md.getMonth()===0)?(String(md.getFullYear()).slice(2)+'年1月'):((md.getMonth()+1)+'月');
      var t=sv('text',{x:X(md),y:pb+16,'text-anchor':'middle','class':'tick'},svg);t.textContent=lb;
    });
    /* 采样 */
    function samples(scn){
      var pts=[];
      for(var t=+SNAP;t<=+PROJ_END;t+=4*864e5)pts.push([t,projVal(scn,new Date(t))]);
      pts.push([+PROJ_END,projVal(scn,PROJ_END)]);
      return pts;
    }
    var sBase=samples('base'),sBull=samples('bull'),sBear=samples('bear');
    /* 情景区间带 */
    var d2='M'+sBull.map(function(p){return X(p[0])+' '+Y(p[1]);}).join('L');
    d2+='L'+sBear.slice().reverse().map(function(p){return X(p[0])+' '+Y(p[1]);}).join('L')+'Z';
    sv('path',{d:d2,'class':'band'},svg);
    /* 三条情景线(虚线 = 全段为外推) */
    function line(pts,cls){
      var d3='M'+pts.map(function(p){return X(p[0])+' '+Y(p[1]);}).join('L');
      var p=sv('path',{d:d3,'class':'ln '+cls},svg);p.setAttribute('stroke-dasharray','6 4');
    }
    line(sBull,'proj-bull');line(sBear,'proj-bear');line(sBase,'proj-base');
    /* 快照锚点 */
    sv('circle',{cx:X(+SNAP),cy:Y(START_V),r:4.5,'class':'dot hero'},svg);
    var at=sv('text',{x:X(+SNAP)+7,y:Y(START_V)-8,'class':'anno'},svg);at.textContent='快照 '+Math.round(START_V);
    /* 端点标注 */
    if(!small){
      var ends=[
        {name:'乐观 '+Math.round(projVal('bull',PROJ_END)),v:projVal('bull',PROJ_END),cls:'blue'},
        {name:'基准 '+Math.round(projVal('base',PROJ_END)),v:projVal('base',PROJ_END),cls:'hero'},
        {name:'悲观 '+Math.round(projVal('bear',PROJ_END)),v:projVal('bear',PROJ_END),cls:''}
      ];
      var lbls=ends.map(function(e){return{name:e.name,y:Y(e.v)};}).sort(function(a,b){return a.y-b.y;});
      for(var i2=1;i2<lbls.length;i2++){if(lbls[i2].y-lbls[i2-1].y<14)lbls[i2].y=lbls[i2-1].y+14;}
      lbls.forEach(function(l){
        var t=sv('text',{x:mL+pw+8,y:clamp(l.y,mT+8,pb-2)+4,'class':'endlbl'},svg);t.textContent=l.name;
      });
    }
    /* 事件菱形(基准线上) */
    var evTip=document.createElement('div');evTip.className='tip';host.appendChild(evTip);
    PEVENTS.forEach(function(e){
      if(e.d>PROJ_END)return;
      var ex=X(+e.d),ey=Y(projVal('base',e.d));
      var sign=e.base<0?'neg':(e.base>0?'pos':'mix');
      sv('path',{d:'M'+ex+' '+(ey-5.5)+'l5.5 5.5-5.5 5.5-5.5-5.5z','class':'evd '+sign},svg);
      var hit=sv('circle',{cx:ex,cy:ey,r:13,fill:'transparent'},svg);
      hit.style.pointerEvents='all';
      function show(){
        evTip.innerHTML='';
        var h=document.createElement('div');h.className='yr';h.textContent=fmtD(e.d)+(e.d<=T_NOW?' · 已到期':' · 待落地');evTip.appendChild(h);
        var b1=document.createElement('div');b1.className='evline';b1.textContent=e.label;evTip.appendChild(b1);
        var b2=document.createElement('div');b2.className='estnote';b2.textContent='冲击(指数点):基准 '+e.base+' / 乐观 '+(e.bull>0?'+':'')+e.bull+' / 悲观 '+e.bear+' · '+e.note;evTip.appendChild(b2);
        evTip.style.display='block';
        var tw=evTip.offsetWidth;
        evTip.style.left=clamp(ex-tw/2,4,W-tw-4)+'px';
        evTip.style.top=Math.max(4,ey-evTip.offsetHeight-14)+'px';
      }
      function hide(){evTip.style.display='none';}
      hit.addEventListener('pointerenter',show);hit.addEventListener('pointerleave',hide);
      hit.setAttribute('tabindex','0');hit.addEventListener('focus',show);hit.addEventListener('blur',hide);
    });
    /* 今日线 */
    if(T_NOW>SNAP){
      var tx=X(+T_NOW);
      sv('line',{x1:tx,x2:tx,y1:mT,y2:pb,'class':'todayln'},svg);
      sv('circle',{cx:tx,cy:Y(projVal('base',T_NOW)),r:5,'class':'dot hero'},svg);
      var tl=sv('text',{x:clamp(tx,mL+16,mL+pw-16),y:mT+11,'text-anchor':'middle','class':'anno'},svg);
      tl.textContent='今日 '+Math.round(projVal('base',T_NOW));
    }
    /* 十字线 + 提示(按日) */
    var tip=document.createElement('div');tip.className='tip';host.appendChild(tip);
    var xline=sv('line',{y1:mT,y2:pb,'class':'xhair',visibility:'hidden'},svg);
    var hdots=sv('g',{},svg);
    var overlay=sv('rect',{x:mL,y:mT,width:pw,height:ph,fill:'transparent',tabindex:'0'},svg);
    overlay.style.pointerEvents='all';
    var actT=null;
    function showT(t){
      actT=t;
      var x=X(+t);
      xline.setAttribute('x1',x);xline.setAttribute('x2',x);xline.setAttribute('visibility','visible');
      while(hdots.firstChild)hdots.removeChild(hdots.firstChild);
      sv('circle',{cx:x,cy:Y(projVal('bull',t)),r:4,'class':'dot blue'},hdots);
      sv('circle',{cx:x,cy:Y(projVal('base',t)),r:4.5,'class':'dot hero'},hdots);
      sv('circle',{cx:x,cy:Y(projVal('bear',t)),r:4,'class':'dot',style:'fill:var(--divneg)'},hdots);
      tip.innerHTML='';
      var h=document.createElement('div');h.className='yr';h.textContent=fmtD(t);tip.appendChild(h);
      [['基准','var(--ink)',projVal('base',t)],['乐观','var(--divpos)',projVal('bull',t)],['悲观','var(--divneg)',projVal('bear',t)]].forEach(function(r){
        var row=document.createElement('div');row.className='row';
        var nm=document.createElement('span');nm.className='nm';
        var k=document.createElement('span');k.className='k';k.style.borderTopColor=r[1];nm.appendChild(k);
        nm.appendChild(document.createTextNode(r[0]));
        var v=document.createElement('span');v.className='v';v.textContent=String(Math.round(r[2]));
        row.appendChild(nm);row.appendChild(v);tip.appendChild(row);
      });
      var nxt=null;
      for(var i=0;i<PEVENTS.length;i++){if(PEVENTS[i].d>t){nxt=PEVENTS[i];break;}}
      if(nxt){var e2=document.createElement('div');e2.className='estnote';e2.textContent='下一事件:'+fmtD(nxt.d)+' '+nxt.label;tip.appendChild(e2);}
      tip.style.display='block';
      var tw=tip.offsetWidth;
      tip.style.left=((x+14+tw>W-4)?(x-tw-14):(x+14))+'px';
      tip.style.top=(mT+8)+'px';
    }
    function hideT(){tip.style.display='none';xline.setAttribute('visibility','hidden');while(hdots.firstChild)hdots.removeChild(hdots.firstChild);actT=null;}
    overlay.addEventListener('pointermove',function(e){
      var r=svg.getBoundingClientRect();
      var px=(e.clientX-r.left)*(W/r.width);
      var frac=clamp((px-mL)/pw,0,1);
      var t=new Date(+SNAP+Math.round(frac*span/864e5)*864e5);
      showT(t);
    });
    overlay.addEventListener('pointerleave',hideT);
    overlay.addEventListener('focus',function(){showT(actT||T_NOW);});
    overlay.addEventListener('blur',hideT);
    overlay.addEventListener('keydown',function(e){
      var cur=actT||T_NOW;
      if(e.key==='ArrowLeft'){showT(new Date(Math.max(+SNAP,+cur-7*864e5)));e.preventDefault();}
      else if(e.key==='ArrowRight'){showT(new Date(Math.min(+PROJ_END,+cur+7*864e5)));e.preventDefault();}
      else if(e.key==='Escape')hideT();
    });
  }

  function renderAll(){
    drawProj();
    lineChart('heroChart',{
      H:430,mR:130,eras:true,lane:LANE,
      yMin:0,yMax:100,ticks:[0,25,50,75,100],
      series:[
        {name:'劳动力市场',cls:'yellow pillar',vals:A,endVal:false},
        {name:'H-1B 通道',cls:'orange pillar',vals:B,est:[12],endVal:false},
        {name:'政策环境',cls:'blue pillar',vals:C,endVal:false},
        {name:'OPT 增长',cls:'aqua pillar',vals:Dp,est:[12],endVal:false},
        {name:'综合指数',cls:'hero',vals:INDEX,est:[12],endVal:true}
      ],
      fmt:function(v){return Math.round(v);},
      endNames:[{name:'劳动力市场 '+Math.round(A[12]),v:A[12]},{name:'H-1B 通道 '+Math.round(B[12]),v:B[12]},{name:'政策环境 '+Math.round(C[12]),v:C[12]},{name:'OPT 增长 '+Math.round(Dp[12]),v:Dp[12]}],
      tipRows:heroTip,
      tipExtra:function(i){return i===12?'2026 年含估算:H-1B 有效中签率取 20%,OPT +14% 推算':null;}
    });

    lineChart('chEnroll',{
      yMin:0,yMax:125,ticks:[0,25,50,75,100,125],mR:86,
      series:[
        {name:'新入学',cls:'ctx',vals:D.newEnroll,est:EST.newEnroll,endVal:true},
        {name:'总人数',cls:'blue',vals:D.enroll,est:EST.enroll,endVal:true}
      ],
      fmt:function(v){return v;},
      tipTitle:function(i){return ay(YEARS[i]);},
      tipRows:function(i){return[
        {name:'总人数',color:'var(--blue)',value:fmt1(D.enroll[i])+' 万'+(i===12?'(估)':'')},
        {name:'新入学',color:'var(--ctx)',value:fmt1(D.newEnroll[i])+' 万'+(i===12?'(估)':'')}
      ];}
    });

    lineChart('chOpt',{
      yMin:0,yMax:36,ticks:[0,10,20,30],mR:86,
      series:[{name:'OPT',cls:'aqua',vals:D.opt,est:EST.opt,endVal:true}],
      fmt:function(v){return v;},
      tipTitle:function(i){return ay(YEARS[i]);},
      tipRows:function(i){return[{name:'OPT 在职',color:'var(--aqua)',value:fmt1(D.opt[i])+' 万'+(i===12?'(估)':'')}];}
    });

    lineChart('chUnemp',{
      yMin:2,yMax:9,ticks:[2,4,6,8],mR:70,
      series:[
        {name:'全体',cls:'ctx',vals:D.unemp,endVal:false},
        {name:'应届毕业生',cls:'yellow',vals:D.grad,endVal:true}
      ],
      fmt:function(v){return v+'%';},
      tipRows:function(i){return[
        {name:'应届毕业生',color:'var(--yellow)',value:fmt1(D.grad[i])+'%'},
        {name:'全体劳动者',color:'var(--ctx)',value:fmt1(D.unemp[i])+'%'}
      ];},
      tipExtra:function(i){return i>=10?'应届生失业率高于整体:1990 年以来首次持续倒挂':null;}
    });

    lineChart('chJolts',{
      yMin:4,yMax:12,ticks:[4,6,8,10,12],mR:70,
      series:[{name:'岗位空缺',cls:'yellow',vals:D.jolts,endVal:true}],
      fmt:function(v){return v;},
      tipRows:function(i){return[{name:'岗位空缺',color:'var(--yellow)',value:fmt1(D.jolts[i])+' 百万'}];},
      tipExtra:function(i){return i===12?'2026 年为 6 月值(08-04 发布),非全年均值':null;}
    });

    lineChart('chH1bReg',{
      yMin:0,yMax:80,ticks:[0,20,40,60,80],mR:70,
      series:[{name:'注册/申请',cls:'orange',vals:D.h1bReg,breakAfter:5,endVal:true}],
      fmt:function(v){return Math.round(v*10)/10;},
      anno:[{i:6,y:76,text:'← 2020 起改电子注册(口径变化)',anchor:'start'}],
      tipTitle:function(i){return YEARS[i]+' 年抽签(FY'+(YEARS[i]+1)+')';},
      tipRows:function(i){return[{name:i<6?'纸质申请数':'电子注册数',color:'var(--orange)',value:fmt1(D.h1bReg[i])+' 万'}];},
      tipExtra:function(i){return i===12?'首次加权抽签 + $10 万费阴影下暴跌 38.5%':(i===9?'重复注册泛滥所致,次年改一人一签后回落':null);}
    });

    lineChart('chH1bRate',{
      yMin:0,yMax:60,ticks:[0,20,40,60],mR:70,
      series:[
        {name:'拒签率',cls:'ctx',vals:D.den,endVal:false},
        {name:'中签率',cls:'orange',vals:D.sel,endVal:true}
      ],
      fmt:function(v){return v+'%';},
      anno:[{i:12,y:14,text:'FY2027:加权抽签',anchor:'middle'},{i:12,y:7,text:'Level I ≈15%',anchor:'middle'}],
      tipTitle:function(i){return YEARS[i]+' 年(抽签 FY'+(YEARS[i]+1)+' / 拒签 FY'+YEARS[i]+')';},
      tipRows:function(i){return[
        {name:'抽签中签率',color:'var(--orange)',value:D.sel[i]==null?'未公布':fmt1(D.sel[i])+'%'},
        {name:'初次拒签率',color:'var(--ctx)',value:D.den[i]==null?'—':fmt1(D.den[i])+'%'}
      ];},
      tipExtra:function(i){return i===12?'加权抽签下不再有统一中签率:Level I ≈15%,Level IV ≈61%':null;}
    });

    divergingChart('chPolicy');
  }
  renderAll();
  var rT;window.addEventListener('resize',function(){clearTimeout(rT);rT=setTimeout(renderAll,150);});

  /* ---------- 刷新与情景编辑 ---------- */
  (function(){
    var KEY='islet-model-v1';
    var elP=document.getElementById('inPolicy'), elD=document.getElementById('inDrift');
    var outP=document.getElementById('outPolicy'), outD=document.getElementById('outDrift');
    var msg=document.getElementById('rfMsg'), tbl=document.getElementById('rfEvents');
    if(!elP||!tbl)return;
    var msgT;
    function say(t,bad){
      msg.textContent=t; msg.className='rfmsg'+(bad?' err':'');
      clearTimeout(msgT); msgT=setTimeout(function(){msg.textContent='';},4000);
    }
    function save(){
      try{
        localStorage.setItem(KEY,JSON.stringify({
          policy:D.policy[12], drift:SCN.base.drift,
          ev:PEVENTS.map(function(e){return {s:e.state,b:e.base};})
        }));
      }catch(err){}
    }
    function load(){
      try{
        var raw=localStorage.getItem(KEY); if(!raw)return false;
        var st=JSON.parse(raw);
        if(typeof st.policy==='number')D.policy[12]=clamp(st.policy,-100,100);
        if(typeof st.drift==='number')SCN.base.drift=clamp(st.drift,-1,0.5);
        if(Array.isArray(st.ev))st.ev.forEach(function(s,i){
          if(!PEVENTS[i])return;
          if(s&&(s.s==='pending'||s.s==='landed'||s.s==='killed'))PEVENTS[i].state=s.s;
          if(s&&typeof s.b==='number')PEVENTS[i].base=s.b;
        });
        return true;
      }catch(err){return false;}
    }
    var dirty=false;
    function apply(persist){
      computeIndex();
      renderAll();
      updateProjHead();
      buildEvLinks();
      outP.textContent=(D.policy[12]>0?'+':'')+D.policy[12];
      outD.textContent=(SCN.base.drift>0?'+':'')+SCN.base.drift.toFixed(2);
      elP.value=D.policy[12]; elD.value=SCN.base.drift;
      Array.prototype.forEach.call(tbl.querySelectorAll('tr[data-i]'),function(tr){
        var e=PEVENTS[+tr.getAttribute('data-i')];
        tr.className=e.state==='landed'?'st-landed':(e.state==='killed'?'st-killed':'');
      });
      dirty=true;
      if(persist!==false)save();
    }
    /* 事件表 */
    (function(){
      var thead=document.createElement('thead'),trh=document.createElement('tr');
      ['预计日期','事件','状态','基准冲击','乐观/悲观'].forEach(function(c){
        var th=document.createElement('th');th.textContent=c;trh.appendChild(th);
      });
      thead.appendChild(trh);tbl.appendChild(thead);
      var tb=document.createElement('tbody');
      PEVENTS.forEach(function(e,i){
        var tr=document.createElement('tr');tr.setAttribute('data-i',i);
        var t1=document.createElement('td');t1.textContent=fmtD(e.d);
        var t2=document.createElement('td');t2.textContent=e.label;
        var t3=document.createElement('td');
        var sel=document.createElement('select');
        [['pending','待落地'],['landed','已落地'],['killed','已否决']].forEach(function(o){
          var op=document.createElement('option');op.value=o[0];op.textContent=o[1];sel.appendChild(op);
        });
        sel.value=e.state;
        sel.addEventListener('change',function(){e.state=sel.value;apply();});
        t3.appendChild(sel);
        var t4=document.createElement('td');
        var num=document.createElement('input');
        num.type='number';num.step='0.5';num.min='-20';num.max='20';num.value=e.base;
        num.addEventListener('change',function(){
          var v=parseFloat(num.value);
          if(isNaN(v)){num.value=e.base;return;}
          e.base=clamp(v,-20,20);num.value=e.base;apply();
        });
        t4.appendChild(num);
        var t5=document.createElement('td');
        t5.textContent=(e.bull>0?'+':'')+e.bull+' / '+e.bear;
        [t1,t2,t3,t4,t5].forEach(function(td){tr.appendChild(td);});
        tb.appendChild(tr);
      });
      tbl.appendChild(tb);
    })();
    elP.addEventListener('input',function(){D.policy[12]=parseInt(elP.value,10);apply();});
    elD.addEventListener('input',function(){SCN.base.drift=parseFloat(elD.value);apply();});

    var restored=load();
    apply(false);
    if(restored)say('已恢复你上次的情景设定');

    document.getElementById('btnReset').addEventListener('click',function(){
      D.policy[12]=POLICY0;
      SCN.base.drift=DRIFT0.base;SCN.bull.drift=DRIFT0.bull;SCN.bear.drift=DRIFT0.bear;
      PEVENTS.forEach(function(e){e.state='pending';e.base=e.base0;});
      Array.prototype.forEach.call(tbl.querySelectorAll('tr[data-i]'),function(tr){
        var e=PEVENTS[+tr.getAttribute('data-i')];
        tr.querySelector('select').value=e.state;
        tr.querySelector('input').value=e.base;
      });
      try{localStorage.removeItem(KEY);}catch(err){}
      apply(false);say('已恢复到 2026-08-04 官方快照');
    });

    function stateJSON(){
      return JSON.stringify({
        snapshot:'2026-08-04', exportedOn:fmtD(TODAY),
        indexNow:Math.round(INDEX[12]),
        projectionToday:{date:fmtD(T_NOW),base:Math.round(projVal('base',T_NOW)),bull:Math.round(projVal('bull',T_NOW)),bear:Math.round(projVal('bear',T_NOW))},
        projectionEnd:{date:fmtD(PROJ_END),base:Math.round(projVal('base',PROJ_END)),bull:Math.round(projVal('bull',PROJ_END)),bear:Math.round(projVal('bear',PROJ_END))},
        policyScore2026:D.policy[12], drift:{base:SCN.base.drift,bull:SCN.bull.drift,bear:SCN.bear.drift},
        events:PEVENTS.map(function(e){return {date:fmtD(e.d),label:e.label,state:e.state,base:e.base,bull:e.bull,bear:e.bear};})
      },null,2);
    }
    document.getElementById('btnExport').addEventListener('click',function(){
      var name='intl-student-index-'+fmtD(TODAY)+'.json';
      if(window.claude&&window.claude.downloads){
        window.claude.downloads.save({filename:name,data:stateJSON()})
          .then(function(){say('已保存 '+name);})
          .catch(function(err){
            var c=err&&err.code;
            if(c==='declined')say('已取消保存');
            else if(c==='rate_limited')say('稍候再试',true);
            else fallback();
          });
      }else fallback();
      function fallback(){
        copy(stateJSON(),'模型状态已复制到剪贴板(本视图不支持直接下载)');
      }
    });
    function copy(text,okMsg){
      function legacy(){
        var ta=document.createElement('textarea');
        ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
        document.body.appendChild(ta);ta.select();
        var ok=false;try{ok=document.execCommand('copy');}catch(err){}
        document.body.removeChild(ta);
        say(ok?okMsg:'复制失败,请手动选择文本',!ok);
      }
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){say(okMsg);},legacy);
      }else legacy();
    }
    document.getElementById('btnPrompt').addEventListener('click',function(){
      var changed=PEVENTS.filter(function(e){return e.state!=='pending'||e.base!==e.base0;});
      var lines=[
        '请刷新「美国留学生就业趋势 2014–2026」这个 Artifact 的数据与评分。',
        '',
        'Artifact 链接:https://claude.ai/code/artifact/6d01929f-2548-4999-afe3-9bbcc4bd1a31',
        '当前快照日期:2026-08-04(生成本指令时为 '+fmtD(TODAY)+')',
        '',
        '请重跑调研管线,核验并更新以下内容:',
        '1. 劳动力市场:BLS 就业报告(失业率、非农、劳动参与率)、JOLTS 岗位空缺、纽约联储应届毕业生失业率、layoffs.fyi 年度累计',
        '2. 留学生规模:SEVIS 月度在读 F-1/M-1(逐国求和,注明抓取日)、IIE Open Doors 与快报、国务院 F-1 月度签发',
        '3. H-1B:USCIS FY2027/FY2028 抽签统计与分工资等级中签率、NFAP 拒签率',
        '4. 政策:联邦公报新规、D/S 规则的诉讼与实施进展、OPT 限制规则(RIN 1653-AA97)、$10 万 H-1B 费司法进展、OPT 版 $10 万费是否成文',
        '5. 依据以上重评 2026 年政策友好度评分与三情景外推的事件冲击与月漂移',
        '',
        '我在页面上的当前设定:',
        '- 2026 政策评分:'+D.policy[12]+'(官方快照 '+POLICY0+')',
        '- 基准月漂移:'+SCN.base.drift.toFixed(2)+'(官方快照 '+DRIFT0.base.toFixed(2)+')',
        '- 今日外推(基准/乐观/悲观):'+Math.round(projVal('base',T_NOW))+' / '+Math.round(projVal('bull',T_NOW))+' / '+Math.round(projVal('bear',T_NOW))
      ];
      if(changed.length){
        lines.push('- 我手动调整过的事件:');
        changed.forEach(function(e){
          var tag=e.state==='landed'?'已落地':(e.state==='killed'?'已否决':'待落地');
          lines.push('  · '+fmtD(e.d)+' '+e.label+' → '+tag+',基准冲击 '+e.base+(e.base!==e.base0?'(原 '+e.base0+')':''));
        });
        lines.push('  请核实这些判断是否与最新事实一致。');
      }else{
        lines.push('- 事件状态与冲击均为官方快照默认值,未手动调整。');
      }
      lines.push('','更新后请用同一个 URL 重新发布,不要新建 Artifact。');
      copy(lines.join('\n'),'刷新指令已复制,粘贴给 Claude 即可');
    });
  })();

  /* ---------- 情景假设表(方法论) ---------- */
  (function(){
    var host=document.getElementById('scnTable');if(!host)return;
    var tb=document.createElement('table');tb.className='data';
    var thead=document.createElement('thead'),trh=document.createElement('tr');
    ['日期(预计)','事件','基准','乐观','悲观','说明','来源'].forEach(function(c){var th=document.createElement('th');th.textContent=c;trh.appendChild(th);});
    thead.appendChild(trh);tb.appendChild(thead);
    var tbody=document.createElement('tbody');
    PEVENTS.forEach(function(e){
      var tr=document.createElement('tr');
      [fmtD(e.d),e.label,e.base,(e.bull>0?'+':'')+e.bull,e.bear,e.note].forEach(function(v,ci){
        var td=document.createElement('td');td.textContent=String(v);
        if(ci===1||ci===5){td.style.whiteSpace='normal';td.style.textAlign='left';td.style.minWidth=ci===5?'260px':'180px';}
        tr.appendChild(td);
      });
      var tdl=document.createElement('td');tdl.style.textAlign='left';
      (e.links||[]).slice(0,2).forEach(function(L,li2){
        if(li2>0)tdl.appendChild(document.createTextNode(' · '));
        var a=document.createElement('a');a.textContent=L[0];a.href=L[1];a.target='_blank';a.rel='noopener';
        tdl.appendChild(a);
      });
      tr.appendChild(tdl);
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);host.appendChild(tb);
  })();

  /* ---------- 事件依据与追踪链接 ---------- */
  function buildEvLinks(){
    var host=document.getElementById('evLinks');if(!host)return;
    host.innerHTML='';
    PEVENTS.forEach(function(e){
      var li=document.createElement('li');
      var dt=document.createElement('span');dt.className='dt';
      var tag = e.state==='landed' ? ' · 已落地(手动)'
              : e.state==='killed' ? ' · 已否决(手动)'
              : (e.d<=T_NOW?' · 已到期':' · 待落地');
      dt.textContent=fmtD(e.d)+tag;
      if(e.state==='landed')dt.style.color='var(--bad)';
      else if(e.state==='killed')dt.style.textDecoration='line-through';
      var lb=document.createElement('span');lb.className='lb';lb.textContent=e.label;
      var lk=document.createElement('span');lk.className='lk';
      (e.links||[]).forEach(function(L){
        var a=document.createElement('a');a.textContent=L[0];a.href=L[1];a.target='_blank';a.rel='noopener';
        lk.appendChild(a);
      });
      li.appendChild(dt);li.appendChild(lb);li.appendChild(lk);
      host.appendChild(li);
    });
  }
  buildEvLinks();

  /* ---------- 外推月度数值表 ---------- */
  (function(){
    var btn=document.getElementById('projTblBtn'),wrapEl=document.getElementById('projTblWrap');
    if(!btn)return;
    var built=false;
    btn.addEventListener('click',function(){
      var open=wrapEl.hidden;
      if(open&&!built){
        var tb=document.createElement('table');tb.className='data';
        var thead=document.createElement('thead'),trh=document.createElement('tr');
        ['月末','基准','乐观','悲观','当月事件'].forEach(function(c){var th=document.createElement('th');th.textContent=c;trh.appendChild(th);});
        thead.appendChild(trh);tb.appendChild(thead);
        var tbody=document.createElement('tbody');
        for(var mi=0;mi<12;mi++){
          var mEnd=new Date(2026,8+mi,0);
          if(mEnd>PROJ_END)mEnd=PROJ_END;
          var tr=document.createElement('tr');
          var evs=PEVENTS.filter(function(e){return e.d.getFullYear()===mEnd.getFullYear()&&e.d.getMonth()===mEnd.getMonth();}).map(function(e){return e.label;}).join(';');
          [mEnd.getFullYear()+'-'+pad2(mEnd.getMonth()+1),Math.round(projVal('base',mEnd)),Math.round(projVal('bull',mEnd)),Math.round(projVal('bear',mEnd)),evs||'—'].forEach(function(v,ci){
            var td=document.createElement('td');td.textContent=String(v);
            if(ci===4){td.style.whiteSpace='normal';td.style.textAlign='left';td.style.minWidth='240px';}
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        }
        tb.appendChild(tbody);wrapEl.appendChild(tb);built=true;
      }
      wrapEl.hidden=!open;
      btn.setAttribute('aria-expanded',String(open));
      btn.textContent=open?'隐藏外推数值':'显示外推数值(按月)';
    });
  })();

  /* ---------- 数据鲜度日历(打开时自动核对) ---------- */
  (function(){
    var host=document.getElementById('relCal');if(!host)return;
    var REL=[
      {label:'BLS 就业报告(失业率)',url:'https://www.bls.gov/schedule/news_release/empsit.htm',detail:'快照含 6 月值(失业率 4.2%、非农 +5.7 万、劳动参与率 61.5%);7 月值 08-07 发布,之后 09-04、10-02、11-06、12-04',next:new Date(2026,7,7),recur:30},
      {label:'BLS JOLTS 岗位空缺',url:'https://www.bls.gov/schedule/news_release/jolts.htm',detail:'快照已含 08-04 发布的 6 月值 735.9 万;下期 09-01(7 月值),之后 09-29、11-03、12-01',next:new Date(2026,8,1),recur:28},
      {label:'SEVIS 月度在读学生数据',url:'https://studyinthestates.dhs.gov/sevis-data-mapping-tool',detail:'快照已含 2026 年 7 月页(114.7 万);8 月页尚未上线(核对当日返回 404)',next:new Date(2026,8,3),recur:30},
      {label:'纽约联储应届生失业率',url:'https://www.newyorkfed.org/research/college-labor-market',detail:'季度更新(2/5/8/11 月);最新仍为 05-05 发布的 Q1 2026 = 5.6%(低度就业率 41.5%);Q2 预计 8 月内更新',next:new Date(2026,7,31),recur:91},
      {label:'USCIS FY2027 H-1B 抽签统计',url:'https://www.uscis.gov/working-in-the-united-states/temporary-workers/h-1b-specialty-occupations/h-1b-electronic-registration-process',detail:'名额 7-17 已满(无第二轮);官方统计表仍止于 FY2026,FY2027 中签总数与分等级数据未公布',next:new Date(2026,9,15),recur:null},
      {label:'国务院月度签证签发统计(F-1)',url:'https://travel.state.gov/content/travel/en/legal/visa-law0/visa-statistics/nonimmigrant-visa-statistics/monthly-nonimmigrant-visa-issuances.html',detail:'异常:整个 FY2026 未发布,最新月度文件仍为 2025 年 9 月;F-1 签发趋势暂无官方数据',next:null,recur:null},
      {label:'IIE Open Doors 2026 + 秋季快报',url:'https://opendoorsdata.org/annual-release/',detail:'2025/26 学年官方普查(含 OPT);IIE 未公布具体日期,按惯例国际教育周(11 月中旬)',next:new Date(2026,10,16),recur:null},
      {label:'BLS 非农就业基准修订(初值)',url:'https://www.bls.gov/ces/',detail:'08-28 与 Q1 QCEW 同步发布,可能大幅下修 2025-26 就业增长',next:new Date(2026,7,28),recur:null},
      {label:'layoffs.fyi 科技裁员追踪',url:'https://layoffs.fyi/',detail:'持续更新;2026 前七个月约 12.4 万,已超 2025 全年(约 12.2 万)',next:null,recur:null}
    ];
    REL.forEach(function(r){
      var li=document.createElement('li');
      var st=document.createElement('span');st.className='st';
      if(!r.next){st.classList.add('ok');st.textContent='持续更新';}
      else{
        var n=new Date(r.next),missed=0;
        while(n<TODAY&&r.recur){n=new Date(+n+r.recur*864e5);missed++;}
        if(n<TODAY){st.classList.add('due');st.textContent='预计已发布';}
        else if(missed>0){st.classList.add('due');st.textContent='约 '+missed+' 期未纳入';}
        else{st.classList.add('wait');st.textContent='待发布 '+fmtD(n).slice(5);}
      }
      var tx=document.createElement('span');
      if(r.url){
        var a=document.createElement('a');a.textContent=r.label;a.href=r.url;a.target='_blank';a.rel='noopener';
        tx.appendChild(a);
      }else{
        tx.appendChild(document.createTextNode(r.label));
      }
      tx.appendChild(document.createTextNode(' · '));
      var sm=document.createElement('small');sm.style.color='var(--muted)';sm.textContent=r.detail;
      tx.appendChild(sm);
      li.appendChild(st);li.appendChild(tx);host.appendChild(li);
    });
  })();

  /* ---------- 行动计划(双人群,可勾选) ---------- */
  (function(){
    var PLAN_SEEK=[
      {ph:'立即',when:'本月',items:[
        '核对专业是否在 <b>STEM 指定清单</b>;与国际学生办公室确认 I-20 与 OPT 递交窗口(毕业前 90 天首日递交 I-765)',
        '用 <b>USCIS H-1B Employer Data Hub</b> 等备案数据库,筛出近两年有持续担保记录的雇主清单',
        '把 <b>AI 工具实战能力</b>写进简历与作品集;启动内推网络(校友、导师、行业社群)'
      ]},
      {ph:'3 个月内',when:'至 2026-10 · D/S 于 9-15 生效',items:[
        '<b>D/S 规则 9-15 生效</b>:确认固定 4 年期限对自己项目与 OPT 的影响(离境宽限 60→30 天);记住 <b>2027-03-18</b> 前按时递交 OPT/STEM 延期可豁免单独的 I-539 延期申请',
        '秋招优先投 <b>cap-exempt 雇主</b>(高校、附属医院、非营利科研)与净招聘行业(金融、医疗、半导体制造)',
        '开始积累 <b>O-1A / NIW 证据</b>(论文、专利、审稿、竞赛、媒体)——申请周期以年计,越早越好'
      ]},
      {ph:'6–12 个月',when:'至 2027-07',items:[
        '<b>2027-02 OPT 限制提案</b>发布后:关注 60 天评论期与定稿方向,必要时调整毕业与递交时点',
        '<b>2027-03 FY2028 抽签</b>:确保雇主按时注册;谈 offer 时争取 OEWS Level II+ 定薪(抽签权重成倍)',
        '若未中签:启动 Plan B——cap-exempt 转岗、L-1 回派、O-1、加拿大 EE 等第三国路径'
      ]}
    ];
    var PLAN_WORK=[
      {ph:'立即',when:'本月',items:[
        '核对 <b>EAD / I-94 / 签证到期日</b>;倒排 STEM 延期(EAD 到期前 90 天可交)与下轮 H-1B 时间线',
        'OPT <b>失业天数管控</b>(普通 90 天 / 含 STEM 累计 150 天);STEM 在职者更新 I-983 培训计划',
        '与雇主明确 <b>绿卡启动时间</b>:PERM + I-140 常超 1 年,中国出生排期长,越早锁定优先日越好'
      ]},
      {ph:'3 个月内',when:'至 2026-10',items:[
        '<b>D/S 生效</b>:确认是否落入过渡条款,把延期申请截止日写进日历',
        '<b>被裁预案</b>:H-1B 60 天宽限期行动卡——transfer 材料常备、目标雇主与猎头清单、B-2 过渡规则',
        '<b>出行评估</b>:签证 stamping 排期与 221g 行政审查风险(敏感专业尤甚);非必要不离境'
      ]},
      {ph:'6–12 个月',when:'至 2027-07',items:[
        '$10 万费<b>目前全国不可执行</b>(第一巡回 7-24 拒暂缓),但最高法院紧急程序随时可能反转——重要换雇主/换身份动作仍<b>优先境内 COS / transfer</b>,避免押注境外领事程序',
        '关注 <b>OPT 限制定稿</b>对 STEM 延期的影响;若被削减,加速 O-1 / NIW / EB 路线或内部调派',
        '<b>年度复盘</b>:优先日期与 EB 排期、配偶 H-4/EAD 联动、应急资金与第三国备份方案'
      ]}
    ];
    var saved={};
    try{saved=JSON.parse(localStorage.getItem('isep-plan')||'{}');}catch(e){}
    function renderPlan(hostId,plan,prefix){
      var host=document.getElementById(hostId);if(!host)return;
      plan.forEach(function(p,pi){
        var h=document.createElement('div');h.className='phase';
        h.appendChild(document.createTextNode(p.ph));
        var w=document.createElement('span');w.className='when';w.textContent=p.when;h.appendChild(w);
        host.appendChild(h);
        var ul=document.createElement('ul');ul.className='acts';
        p.items.forEach(function(it,ii){
          var key=prefix+pi+'-'+ii;
          var li=document.createElement('li');
          var lab=document.createElement('label');
          var cb=document.createElement('input');cb.type='checkbox';cb.checked=!!saved[key];
          cb.addEventListener('change',function(){
            saved[key]=cb.checked;
            try{localStorage.setItem('isep-plan',JSON.stringify(saved));}catch(e){}
          });
          var span=document.createElement('span');span.innerHTML=it;
          lab.appendChild(cb);lab.appendChild(span);li.appendChild(lab);ul.appendChild(li);
        });
        host.appendChild(ul);
      });
    }
    renderPlan('planSeek',PLAN_SEEK,'s');
    renderPlan('planWork',PLAN_WORK,'w');
  })();

  /* ---------- H-1B 概率与四地面板 ---------- */
  /*__H1B_DATA__*/
  var H1B={
    odds:{
      ba:{L1:24.7,L2:43.3,L3:57.4,L4:67.8},
      ms:{L1:40.4,L2:64.4,L3:78.7,L4:87.3},
      official:{L1:15.3,L2:30.6,L3:45.9,L4:61.2},
      basis:'按 FY2027 实际规模校准的模型估算(非官方);官方规则模型:L1 15%·L2 31%·L3 46%·L4 61%,注册量回升时概率将向其回落'
    },
    fys:['FY20','FY21','FY22','FY23','FY24','FY25'],
    trendMax:28000,
    states:{
      CA:{zh:'加州',zhs:'加州',color:'blue',
        who:'AI 独强、通才 SWE 疲软;湾区 Level I 门槛全美最高;南加航天防务扩张',
        trend:[25555,24244,25012,19336,23590,21559],
        occs:[{n:'软件开发',c:73853,w:179689},{n:'电子工程师(半导体)',c:23187,w:178006},{n:'IT 项目经理',c:7685,w:166962},{n:'数据科学家',c:6337,w:158808}],
        advice:[
          {ph:'现在',when:'至 2026-10',items:[
            '求职押注 <b>AI/ML 与安全</b>方向(岗位 +163% / +124%),通才 SWE 招聘仍低迷;南加可看航天防务(Anduril 扩张约 7,000 人)',
            '谈薪以 <b>圣何塞 L2 = $187.7k</b> 为锚;base 低于 $149.4k(L1 线)在湾区连 LCA 都无法认证——尽量把 sign-on/股票换成 base',
            'UC 系统仍在招聘冻结,cap-exempt 转投 Stanford、USC、私立医院与研究所(Scripps / Salk / City of Hope)']},
          {ph:'定级与注册准备',when:'2026-11 – 2027-02',items:[
            '锁定愿意 3 月注册的雇主,书面确认<b>按 L2 及以上定级</b>(权重 2–4 倍)',
            '同步准备 O-1A 证据包;base 过 L3($226k)可拿 3 票']},
          {ph:'抽签季',when:'2027-03 – 07',items:[
            '<b>3 月上旬 FY2028 注册窗口</b>(参照 FY2027:3-4 至 3-19),结果 3 月底',
            '未中签→并行 cap-exempt / O-1A / 次年再抽;出境 stamping 前关注 $10 万费终审动向']}]},
      TX:{zh:'德州',zhs:'德州',color:'yellow',
        who:'工资门槛红利:同样 offer 更易上 L2/L3;半导体与金融扩张,IT 外包收缩拖累总量',
        trend:[14166,17809,17821,17824,21575,12613],
        occs:[{n:'软件开发',c:47417,w:120000},{n:'系统工程师/架构师',c:7609,w:92581},{n:'IT 项目经理',c:5203,w:110000},{n:'电子工程师(半导体)',c:4218,w:150000}],
        advice:[
          {ph:'现在',when:'至 2026-10',items:[
            '<b>工资门槛红利</b>:$130k 在奥斯汀已超 L2($114.8k)、$145k 接近 L3($139.2k)——谈薪直接以等级门槛为锚,同样的钱在德州多拿 1–2 票',
            '方向:半导体软件(三星泰勒厂 2026-04 起加速招聘)、AI 基础设施、DFW 金融风控(高盛 / 嘉信 / 摩根大通)',
            '避开纯外包 offer:IT 外包 sponsor 大收缩(Cognizant 初次批准 2,873 → 743)']},
          {ph:'定级与注册准备',when:'2026-11 – 2027-02',items:[
            '休斯顿医学中心是被低估的 <b>cap-exempt 集群</b>:MD Anderson、贝勒医学院、UTHealth;UT 系统 / Texas A&M / Rice 同样免抽签',
            '确认雇主注册计划与 L2/L3 定级;用 Data Hub 核查 sponsor 历史记录']},
          {ph:'抽签季',when:'2027-03 – 07',items:[
            '3 月注册窗口;德州多数岗位可按 L2+ 注册,同职级中签概率显著高于湾区',
            '未中→医学中心 cap-exempt 或并行路径;休斯顿 2026 预计新增约 3.1 万岗位,转圜余地大']}]},
      MA:{zh:'麻省',zhs:'麻省',color:'orange',
        who:'生物医药资金收缩,但 cap-exempt 密度全美第一;科技岗 L2 可及',
        trend:[5246,7927,5757,4778,5875,4870],
        occs:[{n:'软件开发',c:6441,w:138960},{n:'数据科学家',c:906,w:125819},{n:'电子工程师',c:836,w:134552},{n:'理疗师(派遣类)',c:1151,w:75587}],
        advice:[
          {ph:'现在',when:'至 2026-10',items:[
            '生科应届 RA 常见 $60–85k,<b>低于 Medical Scientists L1($85.6k)</b>——优先工艺开发 / 载体制造等紧缺岗(供需约 3:1)把 base 谈过等级线',
            '资金收缩(2026 Q1 裁员 745+、NIH 经费流失)→ offer 延迟风险高,OPT 失业天数(90/150)提前排程',
            '科技岗 L2 = $131.1k,大厂 offer 通常可及']},
          {ph:'定级与注册准备',when:'2026-11 – 2027-02',items:[
            '用好<b>全美最密的 cap-exempt 网</b>:哈佛系医院(MGH / BWH / Dana-Farber / 波士顿儿童)、MIT、Broad、Whitehead——全年可办、免抽签,先落身份再并行企业岗',
            '确认企业雇主 3 月注册;医疗器械与生物制造逆势招聘']},
          {ph:'抽签季',when:'2027-03 – 07',items:[
            '3 月注册窗口;未中签→cap-exempt 医院 / 研究所是麻省的天然兜底',
            '持续关注 NIH 拨款诉讼与经费恢复(BU 估算最多 6.4 万个岗位受影响)']}]},
      WA:{zh:'华盛顿州(西雅图)',zhs:'华州',color:'aqua',
        who:'亚马逊/微软裁员潮下与中层同场竞争;波音万人扩招为对冲;大厂 offer 通常过 L2',
        trend:[8358,9132,4529,2605,3120,2874],
        occs:[{n:'软件开发',c:39534,w:149240},{n:'IT 项目经理',c:4370,w:142800},{n:'数据科学家',c:3763,w:142800},{n:'BI 分析师',c:3616,w:119191}],
        advice:[
          {ph:'现在',when:'至 2026-10',items:[
            '与被裁中层<b>同场竞争</b>(亚马逊 2026-01 再裁 1.6 万、西雅图约 2,200 人;微软 7 月裁 4,800)——用 AI 实战与领域深度差异化',
            '大厂 offer base+固定薪通常过 <b>L2($149.2k)</b>,注册前书面确认定级;波音扩招 1 万+(周招 100–140 人)是对冲选项',
            '被裁预案:H-1B/OPT 60 天行动卡随时可用']},
          {ph:'定级与注册准备',when:'2026-11 – 2027-02',items:[
            'UW / Fred Hutch 联邦经费受创(约 −50%),cap-exempt 仍可投但避开受灾课题组;Allen Institute、Seattle Children&#39;s 为备选',
            '亚马逊自 FY2022 起从弗吉尼亚递件——图中华州曲线的下台阶是统计位移,西雅图实际岗位并未同幅消失']},
          {ph:'抽签季',when:'2027-03 – 07',items:[
            '3 月注册窗口;确认按 L2 定级(2 票)',
            '未中→西雅图 transfer 市场仍活跃;必要时考虑温哥华近岸方案保全大厂工龄']}]}
    }
  };

  function drawOddsBars(){
    if(!H1B)return;
    var host=document.getElementById('chOdds');if(!host)return;
    host.innerHTML='';host.style.position='relative';
    var W=Math.max(300,host.clientWidth||640),H=250;
    var mT=18,mB=34,mL=40,mR=12,pw=W-mL-mR,ph=H-mT-mB,pb=mT+ph;
    var svg=sv('svg',{viewBox:'0 0 '+W+' '+H,width:W,height:H,role:'img'},host);
    var yMax=100;
    var Y=function(v){return mT+(1-v/yMax)*ph;};
    [0,25,50,75,100].forEach(function(tv){
      sv('line',{x1:mL,x2:mL+pw,y1:Y(tv),y2:Y(tv),'class':tv===0?'axisln':'grid-h'},svg);
      var t=sv('text',{x:mL-7,y:Y(tv)+4,'text-anchor':'end','class':'tick'},svg);t.textContent=tv+'%';
    });
    var LV=['L1','L2','L3','L4'],LBL=['Level I · 1票','Level II · 2票','Level III · 3票','Level IV · 4票'];
    var slot=pw/4,bw=Math.min(24,slot/2-10);
    var tip=document.createElement('div');tip.className='tip';host.appendChild(tip);
    LV.forEach(function(lv,i){
      var cx=mL+slot*i+slot/2;
      [['ba',-bw-1,'var(--ctx)'],['ms',1,'var(--blue)']].forEach(function(sp){
        var v=H1B.odds[sp[0]][lv];
        var x0=cx+sp[1]-(sp[1]<0?0:0),xL=cx+(sp[1]<0?sp[1]:1);
        var y0=Y(v),r=Math.min(4,pb-y0);
        var d2='M'+xL+' '+pb+'V'+(y0+r)+'a'+r+' '+r+' 0 0 1 '+r+'-'+r+'h'+(bw-2*r)+'a'+r+' '+r+' 0 0 1 '+r+' '+r+'V'+pb+'Z';
        sv('path',{d:d2,fill:sp[2]},svg);
        var t=sv('text',{x:xL+bw/2,y:y0-5,'text-anchor':'middle','class':'barlbl'},svg);
        t.textContent=Math.round(v)+'%';
      });
      var t2=sv('text',{x:cx,y:pb+16,'text-anchor':'middle','class':'tick'},svg);t2.textContent=LBL[i];
      var hit=sv('rect',{x:mL+slot*i,y:mT,width:slot,height:ph,fill:'transparent',tabindex:'0'},svg);
      hit.style.pointerEvents='all';
      function show(){
        tip.innerHTML='';
        var h=document.createElement('div');h.className='yr';h.textContent=LBL[i]+' · 单次中签概率';tip.appendChild(h);
        [['本科(单池)','var(--ctx)',H1B.odds.ba[lv]],['美国硕士+(双池)','var(--blue)',H1B.odds.ms[lv]]].forEach(function(r2){
          var row=document.createElement('div');row.className='row';
          var nm=document.createElement('span');nm.className='nm';
          var k=document.createElement('span');k.className='k';k.style.borderTopColor=r2[1];nm.appendChild(k);
          nm.appendChild(document.createTextNode(r2[0]));
          var vv=document.createElement('span');vv.className='v';vv.textContent=Math.round(r2[2])+'%';
          row.appendChild(nm);row.appendChild(vv);tip.appendChild(row);
        });
        tip.style.display='block';
        var tw=tip.offsetWidth;
        tip.style.left=clamp(cx-tw/2,4,W-tw-4)+'px';
        tip.style.top=Math.max(4,Y(Math.max(H1B.odds.ba[lv],H1B.odds.ms[lv]))-tip.offsetHeight-12)+'px';
      }
      function hide(){tip.style.display='none';}
      hit.addEventListener('pointerenter',show);hit.addEventListener('pointerleave',hide);
      hit.addEventListener('focus',show);hit.addEventListener('blur',hide);
    });
  }

  function calcOdds(){
    if(!H1B)return;
    var deg=document.getElementById('selDeg').value;
    var lv=document.getElementById('selLvl').value;
    var n=parseInt(document.getElementById('selN').value,10);
    var p=H1B.odds[deg][lv]/100;
    var cum=1-Math.pow(1-p,n);
    document.getElementById('oddsNum').innerHTML=Math.round(cum*100)+'<small> % · '+n+' 轮累计</small>';
    document.getElementById('oddsNote').textContent='单次约 '+Math.round(p*100)+'% · '+H1B.odds.basis;
  }

  function drawStateTrend(){
    if(!H1B)return;
    var host=document.getElementById('chStates');if(!host)return;
    host.innerHTML='';host.style.position='relative';
    var W=Math.max(300,host.clientWidth||640),H=260;
    var small=W<560;
    var mT=14,mB=30,mL=46,mR=small?54:76,pw=W-mL-mR,ph=H-mT-mB,pb=mT+ph;
    var svg=sv('svg',{viewBox:'0 0 '+W+' '+H,width:W,height:H,role:'img'},host);
    var FYS=H1B.fys,M=FYS.length;
    var yMax=H1B.trendMax;
    var X=function(i){return mL+i/(M-1)*pw;};
    var Y=function(v){return mT+(1-v/yMax)*ph;};
    var tks=[],step=yMax/4;
    for(var k2=0;k2<=4;k2++)tks.push(step*k2);
    tks.forEach(function(tv){
      sv('line',{x1:mL,x2:mL+pw,y1:Y(tv),y2:Y(tv),'class':tv===0?'axisln':'grid-h'},svg);
      var t=sv('text',{x:mL-7,y:Y(tv)+4,'text-anchor':'end','class':'tick'},svg);
      t.textContent=(tv/10000).toLocaleString('zh-CN')+'万';
    });
    FYS.forEach(function(f,i){
      var t=sv('text',{x:X(i),y:pb+16,'text-anchor':'middle','class':'tick'},svg);t.textContent=f;
    });
    var codes=['CA','TX','MA','WA'];
    codes.forEach(function(c){
      var st=H1B.states[c];
      var d3='M'+st.trend.map(function(v,i){return X(i)+' '+Y(v);}).join('L');
      sv('path',{d:d3,'class':'ln '+st.color},svg);
      var last=st.trend.length-1;
      sv('circle',{cx:X(last),cy:Y(st.trend[last]),r:4,'class':'dot '+st.color},svg);
      if(!small){
        var t=sv('text',{x:X(last)+8,y:Y(st.trend[last])+4,'class':'endlbl'},svg);
        t.textContent=st.zhs+' '+(st.trend[last]/10000).toFixed(1)+'万';
      }
    });
    var tip=document.createElement('div');tip.className='tip';host.appendChild(tip);
    var xline=sv('line',{y1:mT,y2:pb,'class':'xhair',visibility:'hidden'},svg);
    var overlay=sv('rect',{x:mL,y:mT,width:pw,height:ph,fill:'transparent',tabindex:'0'},svg);
    overlay.style.pointerEvents='all';
    function show(i){
      var x=X(i);
      xline.setAttribute('x1',x);xline.setAttribute('x2',x);xline.setAttribute('visibility','visible');
      tip.innerHTML='';
      var h=document.createElement('div');h.className='yr';h.textContent=FYS[i];tip.appendChild(h);
      codes.forEach(function(c){
        var st=H1B.states[c];
        var row=document.createElement('div');row.className='row';
        var nm=document.createElement('span');nm.className='nm';
        var k=document.createElement('span');k.className='k';k.style.borderTopColor='var(--'+st.color+')';nm.appendChild(k);
        nm.appendChild(document.createTextNode(st.zh));
        var v=document.createElement('span');v.className='v';v.textContent=st.trend[i].toLocaleString('zh-CN');
        row.appendChild(nm);row.appendChild(v);tip.appendChild(row);
      });
      tip.style.display='block';
      var tw=tip.offsetWidth;
      tip.style.left=((x+14+tw>W-4)?(x-tw-14):(x+14))+'px';
      tip.style.top=(mT+8)+'px';
    }
    function hide(){tip.style.display='none';xline.setAttribute('visibility','hidden');}
    overlay.addEventListener('pointermove',function(e){
      var r=svg.getBoundingClientRect();
      var px=(e.clientX-r.left)*(W/r.width);
      show(clamp(Math.round((px-mL)/(pw/(M-1))),0,M-1));
    });
    overlay.addEventListener('pointerleave',hide);
    overlay.addEventListener('focus',function(){show(M-1);});
    overlay.addEventListener('blur',hide);
  }

  function renderStatePanels(){
    if(!H1B)return;
    var host=document.getElementById('stateGrid');if(!host)return;
    host.innerHTML='';
    var saved={};
    try{saved=JSON.parse(localStorage.getItem('isep-stplan')||'{}');}catch(e){}
    ['CA','TX','MA','WA'].forEach(function(c){
      var st=H1B.states[c];
      var pn=document.createElement('div');pn.className='stpanel';
      var h4=document.createElement('h4');
      var kd=document.createElement('span');kd.className='kdot '+st.color;h4.appendChild(kd);
      h4.appendChild(document.createTextNode(st.zh+' · '+c));
      pn.appendChild(h4);
      var who=document.createElement('p');who.className='who';who.textContent=st.who;pn.appendChild(who);
      var maxC=Math.max.apply(null,st.occs.map(function(o){return o.c;}));
      st.occs.forEach(function(o){
        var row=document.createElement('div');row.className='occrow';
        var nm=document.createElement('span');nm.className='onm';nm.textContent=o.n;
        var tr=document.createElement('span');tr.className='otrack';
        var fl=document.createElement('span');fl.className='ofill '+st.color;fl.style.width=Math.max(4,o.c/maxC*100)+'%';
        tr.appendChild(fl);
        var vv=document.createElement('span');vv.className='oval';vv.textContent=(o.c>=10000?(o.c/10000).toFixed(1)+'万':o.c.toLocaleString('zh-CN'))+' · $'+Math.round(o.w/1000)+'k';
        row.appendChild(nm);row.appendChild(tr);row.appendChild(vv);
        pn.appendChild(row);
      });
      st.advice.forEach(function(p2,pi){
        var ph2=document.createElement('div');ph2.className='phase';
        ph2.appendChild(document.createTextNode(p2.ph));
        var w=document.createElement('span');w.className='when';w.textContent=p2.when;ph2.appendChild(w);
        pn.appendChild(ph2);
        var ul=document.createElement('ul');ul.className='acts';
        p2.items.forEach(function(it,ii){
          var key='r'+c+pi+'-'+ii;
          var li=document.createElement('li');
          var lab=document.createElement('label');
          var cb=document.createElement('input');cb.type='checkbox';cb.checked=!!saved[key];
          cb.addEventListener('change',function(){
            saved[key]=cb.checked;
            try{localStorage.setItem('isep-stplan',JSON.stringify(saved));}catch(e){}
          });
          var span=document.createElement('span');span.innerHTML=it;
          lab.appendChild(cb);lab.appendChild(span);li.appendChild(lab);ul.appendChild(li);
        });
        pn.appendChild(ul);
      });
      host.appendChild(pn);
    });
  }

  if(H1B){
    drawOddsBars();drawStateTrend();renderStatePanels();calcOdds();
    ['selDeg','selLvl','selN'].forEach(function(id){
      document.getElementById(id).addEventListener('change',calcOdds);
    });
    window.addEventListener('resize',function(){clearTimeout(rT);rT=setTimeout(function(){drawOddsBars();drawStateTrend();},160);});
  }

  /* ---------- CSV 下载(downloads 能力) ---------- */
  (function(){
    var btn=document.getElementById('dlBtn');if(!btn)return;
    if(!(window.claude&&window.claude.downloads))return;
    btn.hidden=false;
    function csvEsc(v){v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
    function buildCSV(){
      var rows=[];
      rows.push(['# 美国留学生就业环境综合指数 2014-2026 + 外推 2026-08 至 2027-08']);
      rows.push(['# 快照 2026-08-04 · 生成日 '+fmtD(TODAY)+' · 指数与支柱为 0-100 相对分值(区间 min-max 归一化)· 详见页面方法论']);
      rows.push(['年份','综合指数','劳动力市场','H-1B通道','政策环境','OPT增长','留学生总数(万)','新入学(万)','OPT(万)','H-1B注册(万)','中签率%','拒签率%','整体失业率%','应届生失业率%','岗位空缺(百万)','政策评分','科技裁员(千)']);
      YEARS.forEach(function(yv,i){
        rows.push([yv,Math.round(INDEX[i]),Math.round(A[i]),Math.round(B[i]),Math.round(C[i]),
          Dp[i]==null?'':Math.round(Dp[i]),D.enroll[i],D.newEnroll[i],D.opt[i],D.h1bReg[i],
          D.sel[i]==null?'':D.sel[i],D.den[i]==null?'':D.den[i],D.unemp[i],D.grad[i],D.jolts[i],D.policy[i],D.layoffs[i]==null?'':D.layoffs[i]]);
      });
      rows.push([]);
      rows.push(['# 三情景外推(月末值)']);
      rows.push(['月末','基准','乐观','悲观']);
      for(var mi=0;mi<12;mi++){
        var mEnd=new Date(2026,8+mi,0);if(mEnd>PROJ_END)mEnd=PROJ_END;
        rows.push([mEnd.getFullYear()+'-'+pad2(mEnd.getMonth()+1),Math.round(projVal('base',mEnd)),Math.round(projVal('bull',mEnd)),Math.round(projVal('bear',mEnd))]);
      }
      rows.push([]);
      rows.push(['# 情景事件假设(指数点)']);
      rows.push(['日期','事件','基准','乐观','悲观']);
      PEVENTS.forEach(function(e){rows.push([fmtD(e.d),e.label,e.base,e.bull,e.bear]);});
      if(H1B){
        rows.push([]);
        rows.push(['# 四州 H-1B 初次批准(USCIS Data Hub / NFAP;FY21-22 旧CSV口径偏高;WA 受亚马逊迁址弗州影响)']);
        rows.push(['州'].concat(H1B.fys));
        ['CA','TX','MA','WA'].forEach(function(c){rows.push([H1B.states[c].zh].concat(H1B.states[c].trend));});
        rows.push([]);
        rows.push(['# 加权抽签单次中签概率(%,FY2027 规模校准模型;官方=规则模型 90 FR 60864)']);
        rows.push(['等级','本科(单池)','美国硕士+(双池)','官方规则模型']);
        ['L1','L2','L3','L4'].forEach(function(lv){rows.push([lv,H1B.odds.ba[lv],H1B.odds.ms[lv],H1B.odds.official[lv]]);});
        rows.push([]);
        rows.push(['# 四州热门职业(FY2025 LCA 认证岗位数与中位年薪 USD)']);
        rows.push(['州','职业','岗位数','中位年薪']);
        ['CA','TX','MA','WA'].forEach(function(c){H1B.states[c].occs.forEach(function(o){rows.push([H1B.states[c].zh,o.n,o.c,o.w]);});});
      }
      return '﻿'+rows.map(function(r){return r.map(csvEsc).join(',');}).join('\r\n');
    }
    btn.addEventListener('click',function(){
      var csv=buildCSV();
      window.claude.downloads.save({filename:'us-intl-student-employment-2014-2027.csv',data:csv})
        .catch(function(err){
          if(err&&err.code==='extension_not_enabled'){
            return window.claude.downloads.save({filename:'us-intl-student-employment-2014-2027.txt',data:csv}).catch(function(){});
          }
          if(err&&(err.code==='unavailable'||err.code==='not_granted'||err.code==='capability_disabled'||err.code==='capability_removed')){btn.hidden=true;}
        });
    });
  })();

  /* ---------- 时间线 ---------- */
  var TL=[
    ['era','奥巴马时期 · 2014–2016(指数 61–69)'],
    ['2014-11','pos','奥巴马签署行政令,指示 DHS 扩大/延长 STEM OPT、简化高技能签证流程'],
    ['2015-08','mix','WashTech 诉 DHS:法院以程序缺陷撤销 17 个月 STEM OPT 延期(暂缓执行,倒逼新规)'],
    ['2016-03','pos','STEM OPT 24 个月延期最终规则发布(5 月生效):STEM 毕业生最长可工作 36 个月'],
    ['era','特朗普 1.0 · 2017–2020(指数 58 → 30)'],
    ['2017-04','neg','“买美国货、雇美国人”行政令:H-1B 审查全面收紧,RFE 与拒签率飙升'],
    ['2017-10','neg','USCIS 撤销“尊重先前批准”政策,续签同样面临全面重审'],
    ['2018-08','neg','非法滞留新政:留学生技术性违规即可触发 3/10 年入境禁令(2019 年被法院叫停)'],
    ['2018','neg','H-1B 初次申请拒签率达 24% 峰值(2015 财年仅 6%);对部分中国理工科研究生签证限至 1 年'],
    ['2020-05','neg','PP10043:禁止与“军民融合”院校相关的中国研究生/研究人员入境(两届政府延续执行)'],
    ['2020-06','neg','PP10052:暂停新 H-1B / L / J 签证持有人入境(2021 年 3 月到期不续)'],
    ['2020-07','mix','SEVP 网课新规:全网课留学生将失去身份;哈佛/MIT 起诉后 8 天撤回'],
    ['2020-09','neg','DHS 首次提议取消“身份存续期”(D/S),改固定期限(2021 年被拜登政府撤回)'],
    ['era','拜登时期 · 2021–2024(指数 59–64)'],
    ['2021','pos','系统性撤销特朗普 1.0 限制:恢复尊重先前批准、撤回 D/S 提案;拒签率降至约 4%'],
    ['2022-01','pos','STEM OPT 新增 22 个专业(数据科学、商业分析等);O-1A / J-1 高技能通道指引发布'],
    ['2022-11','neg','科技裁员潮开始:Meta、Twitter、Amazon 相继大裁员,全年 16.4 万人(layoffs.fyi)'],
    ['2023-01','neg','裁员峰值月:Google −1.2 万、Microsoft −1 万、Amazon −1.8 万;全年约 26.3 万人'],
    ['2023-10','pos','最高法院拒绝受理 WashTech 案,OPT / STEM OPT 的最大法律威胁解除'],
    ['2024-01','pos','受益人中心制抽签改革(一人一签):遏制重复注册,FY2025 起个人中签率回升'],
    ['2024-12','pos','H-1B 现代化最终规则:法典化“尊重先前批准”、cap-gap 保护延长至 4 月 1 日'],
    ['era','特朗普 2.0 · 2025–2026(指数 44 → 27,历史最低)'],
    ['2025-04','neg','SEVIS 大规模除名约 4,700 人(法庭陈述口径);百余起诉讼、50+ 临时禁令后于 4 月 25 日撤回'],
    ['2025-05','neg','试图吊销哈佛 SEVP 资格(被法院禁止);国务院宣布“积极吊销”部分中国留学生签证'],
    ['2025-06','neg','全球暂停 F/M/J 签证面谈 3 周,恢复后强制社交媒体审查;19 国旅行禁令(含 F/M/J)'],
    ['2025-07','neg','《大而美法案》新增 $250 签证诚信费(F-1 签证总成本升至约 $785)'],
    ['2025-08','neg','DHS 再度提议取消“身份存续期”:F-1 改固定 4 年入境期;8 月入境留学生同比 −19%'],
    ['2025-09','neg','$10 万 H-1B 新申请费总统公告(9 月 21 日生效,主要影响境外领事程序申请)'],
    ['2025-11','neg','IIE 秋季快报:新入学 −17%(非疫情年最大跌幅);DHS 议程列入 OPT 限制规则'],
    ['2025-12','neg','加权(按工资等级)H-1B 抽签最终规则发布;旅行禁令扩至 39 国(2026-01-01 生效)'],
    ['2026-01','neg','USCIS 冻结约 39 国国民福利审批(含 OPT / STEM OPT),约百万申请积压'],
    ['2026-03','mix','FY2027 首次加权抽签:注册数暴跌 38.5% 至 21.2 万;中签者 71.5% 拥有美国硕士以上学位'],
    ['2026-06','mix','法院密集反制:39 国审批冻结被判违法(6/5);$10 万费被判违法税(6/8)但暂缓生效待上诉'],
    ['2026-06','neg','取消“身份存续期”最终规则通过 OMB 审查(6/17),即将发布:留学生身份改固定期限'],
    ['2026-07','mix','OPT 限制规则(RIN 1653-AA97)维持 2027 年 2 月提案目标;截至 8 月初 OPT 与 STEM OPT 仍按现行规则运作'],
    ['2026-07-13','neg','IIE 2026 春季快报(585 所院校):63% 预计 2026/27 国际生下滑,博士类院校约 80% 预计下降,59% 报告本轮国际申请量减少'],
    ['2026-07-17','neg','D/S 终结规则正式发布,9 月 15 日生效:F-1 改固定 4 年入境期限,离境宽限 60→30 天;新增流动性限制(一年内不得转学/换专业/换学位层级,研究生层级原则上全程禁止);语言课程上限 24 个月'],
    ['2026-07-17','mix','USCIS 宣布 FY2027 H-1B 名额首轮即满、不设第二轮抽签;截至 8-04 官方仍未公布 FY2027 中签总数与分等级数据'],
    ['2026-07-24','pos','$10 万 H-1B 费重大转折:第一巡回拒绝暂缓,全国撤销令全面生效,费用<b>目前不可执行</b>;截至 8-04 最高法院无紧急申请立案,但 DHS 7-28 明确表示若禁令解除仍将征收,D.C. 巡回裁决待出'],
    ['2026-07-29','mix','FOMC 维持利率 3.50–3.75% 不变(9 比 3),三位反对者主张<b>加息</b>;声明称就业增长与劳动力同步、失业率变化不大,劳动力市场在决策权重中已让位于通胀'],
    ['2026-08-01','neg','国务院将 25 个非洲使领馆的常规签证业务归并至区域中心,8 月 1 日起 F/J/H/O 申请人须改在指定中心预约缴费,正值秋季入学高峰'],
    ['2026-08-03','neg','Forbes 报道 DHS 内部正在讨论<b>对 OPT 征收 $10 万费用</b>,拟挂靠新的身份延期要求。属决策前阶段,无联邦公报文件与案卷号,亦未列入议程;若落地按报道者说法等同禁令'],
    ['2026-08-04','neg','SEVIS 7 月在读 F-1/M-1 降至 114.7 万,单月 −3.2 万(−2.7%)为本年最大跌幅;2 月以来累计 −10.3 万(−8.3%),同比 −4.4%。印度同比 −8.6% 首次超过中国的 −7.4%'],
    ['2026-08-04','neg','JOLTS 6 月岗位空缺降至 735.9 万(−17.8 万),5 月同时下修至 753.7 万;招聘率 3.4%、离职率 2.0%、裁员率 1.1%,低招聘低解雇格局延续']
  ];
  var tlHost=document.getElementById('timeline');
  TL.forEach(function(e){
    var li=document.createElement('li');
    if(e[0]==='era'){li.className='era';li.textContent=e[1];tlHost.appendChild(li);return;}
    li.className='ev imp-'+e[1];
    var dt=document.createElement('span');dt.className='dt';dt.textContent=e[0];
    var im=document.createElement('span');im.className='imp';
    var chip=document.createElement('span');chip.className='impc';chip.textContent=e[1]==='neg'?'利空':e[1]==='pos'?'利好':'双向';
    im.appendChild(chip);
    var tx=document.createElement('span');tx.className='tx';tx.textContent=e[2];
    li.appendChild(dt);li.appendChild(im);li.appendChild(tx);
    tlHost.appendChild(li);
  });

  /* ---------- 数据表 ---------- */
  var btn=document.getElementById('tblBtn'),wrapEl=document.getElementById('tblWrap');
  var built=false;
  btn.addEventListener('click',function(){
    var open=wrapEl.hidden;
    if(open&&!built){buildTable();built=true;}
    wrapEl.hidden=!open;
    btn.setAttribute('aria-expanded',String(open));
    btn.textContent=open?'隐藏数据表':'显示数据表';
  });
  function buildTable(){
    var cols=['年份','综合指数','劳动力市场','H-1B通道','政策环境','OPT增长','留学生总数(万)','新入学(万)','OPT(万)','H-1B注册(万)','中签率%','拒签率%','整体失业率%','应届生失业率%','岗位空缺(百万)','政策评分','科技裁员(千)'];
    var colDots={2:'yellow',3:'orange',4:'blue',5:'aqua'};
    var tb=document.createElement('table');tb.className='data';
    var thead=document.createElement('thead'),trh=document.createElement('tr');
    cols.forEach(function(c,ci){
      var th=document.createElement('th');
      if(colDots[ci]){var dot=document.createElement('span');dot.className='kdot '+colDots[ci];th.appendChild(dot);}
      th.appendChild(document.createTextNode(c));trh.appendChild(th);
    });
    thead.appendChild(trh);tb.appendChild(thead);
    var tbody=document.createElement('tbody');
    function cell(v,est){return (v==null?'—':(typeof v==='number'?(Math.round(v*10)/10).toLocaleString('zh-CN'):v))+(est?' †':'');}
    YEARS.forEach(function(yv,i){
      var tr=document.createElement('tr');
      var vals=[
        String(yv), Math.round(INDEX[i]), Math.round(A[i]), Math.round(B[i]), Math.round(C[i]),
        Dp[i]==null?null:Math.round(Dp[i]),
        D.enroll[i], D.newEnroll[i], D.opt[i], D.h1bReg[i],
        D.sel[i], D.den[i], D.unemp[i], D.grad[i], D.jolts[i], D.policy[i], D.layoffs[i]
      ];
      var ests=[false,i===12,false,i===12,false,i===12,i===12,i===12,i===12,false,false,false,false,false,false,false,i===12];
      vals.forEach(function(v,ci){
        var td=document.createElement('td');td.textContent=cell(v,ests[ci]&&v!=null);tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tb.appendChild(tbody);
    wrapEl.appendChild(tb);
    var fn=document.createElement('p');fn.className='note';
    fn.textContent='† 估算/推导值。综合指数与四大支柱为 0–100 相对分值(区间 min-max 归一化);2026 年科技裁员为上半年累计;2026 年失业率/岗位空缺为最新月度或年初至今均值。';
    wrapEl.appendChild(fn);
  }

  /* ---------- 对外 API:供 news.js / lexicon.js 驱动模型 ---------- */
  window.H1BIndex = {
    YEARS: YEARS,
    data: D,
    events: PEVENTS,
    scenarios: SCN,
    baseline: { policy: POLICY0, drift: DRIFT0 },
    dates: { snapshot: SNAP, today: TODAY, now: T_NOW, end: PROJ_END },
    fmtDate: fmtD,
    clamp: clamp,
    projValue: projVal,
    index: function(){ return INDEX; },
    anchor: function(){ return START_V; },
    policyScore: function(v){
      if (typeof v === 'number') { D.policy[12] = clamp(Math.round(v), -100, 100); }
      return D.policy[12];
    },
    addEvent: function(ev){ PEVENTS.push(ev); PEVENTS.sort(function(a,b){return a.d-b.d;}); },
    refresh: function(){
      computeIndex(); renderAll(); updateProjHead();
      if (typeof buildEvLinks === 'function') buildEvLinks();
      if (window.H1BIndex._onRefresh) window.H1BIndex._onRefresh();
    },
    onRefresh: function(fn){ this._onRefresh = fn; }
  };
})();
