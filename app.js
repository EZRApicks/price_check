(function(){
  "use strict";

  var state = { country: "jp", jpMode: "general" };

  var app = document.getElementById("app");
  var amountInput = document.getElementById("amount");
  var amountSum = document.getElementById("amount-sum");
  var amountSumValue = document.getElementById("amount-sum-value");
  var amountLabel = document.getElementById("amount-label");
  var currencyPrefix = document.getElementById("currency-prefix");
  var calcTitle = document.getElementById("calc-title");
  var modeWrap = document.getElementById("mode-wrap");
  var resultTotal = document.getElementById("result-total");
  var breakdownEl = document.getElementById("breakdown");
  var termsJp = document.getElementById("terms-jp");
  var termsKr = document.getElementById("terms-kr");
  var overlay = document.getElementById("quote-overlay");
  var closeBtn = document.getElementById("quote-close");
  var quoteBtn = document.getElementById("quote-btn");

  // 本次代購匯率 — 需要調整時直接改這裡的數字即可
  var DEFAULT_RATES = { jpy: 0.26, jpyOnline: 0.24, krw: 35 };
  var quoteOpen = false;

  function getRates(){
    return {
      jpy: DEFAULT_RATES.jpy,
      jpyOnline: DEFAULT_RATES.jpyOnline,
      krw: DEFAULT_RATES.krw
    };
  }

  function ceilTo10(n){
    if (!n || n <= 0) return 0;
    return Math.ceil(n / 10) * 10;
  }
  function fmtNT(n){ return "NT$ " + ceilTo10(n).toLocaleString("zh-Hant-TW"); }
  function fmtSrc(n, cur){
    var sym = cur === "JPY" ? "¥" : "₩";
    return sym + Math.round(n).toLocaleString("zh-Hant-TW");
  }

  function getPlaceholder(){
    return state.country === "jp" ? "例：1000+2500" : "例：15000+8000";
  }

  function sanitizeExpr(raw){
    var s = String(raw || "").replace(/＋/g, "+").replace(/[^\d.+]/g, "");
    s = s.replace(/^\++/, "");
    s = s.replace(/\++/g, "+");
    var out = "";
    var seenDot = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === "+") {
        seenDot = false;
        out += ch;
      } else if (ch === ".") {
        if (!seenDot) {
          seenDot = true;
          out += ch;
        }
      } else {
        out += ch;
      }
    }
    return out;
  }

  function getParts(val){
    return String(val || "").split("+").map(function(p){ return parseFloat(p); }).filter(function(n){ return n > 0; });
  }

  function getPriceTotal(){
    return getParts(amountInput.value).reduce(function(sum, n){ return sum + n; }, 0);
  }

  function currentCurrency(){
    return state.country === "jp" ? "JPY" : "KRW";
  }

  function updateSum(){
    var price = getPriceTotal();
    var show = String(amountInput.value).indexOf("+") !== -1;
    amountSum.hidden = !show;
    amountSumValue.textContent = fmtSrc(price, currentCurrency());
  }

  function openQuote(){
    quoteOpen = true;
    overlay.hidden = false;
    closeBtn.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeQuote(){
    quoteOpen = false;
    overlay.hidden = true;
    closeBtn.hidden = true;
    document.body.style.overflow = "";
  }

  function requestQuote(){
    recalc();
    var price = getPriceTotal();
    if (!price || price <= 0) {
      amountInput.focus();
      return;
    }
    openQuote();
  }

  function setCountry(c){
    state.country = c;
    app.setAttribute("data-country", c);
    document.querySelectorAll(".switch button").forEach(function(b){
      b.setAttribute("aria-pressed", b.getAttribute("data-c") === c ? "true" : "false");
    });
    if (c === "jp") {
      calcTitle.textContent = "日本代購報價試算";
      modeWrap.hidden = false;
      amountLabel.textContent = "商品售價（日幣）";
      currencyPrefix.textContent = "¥";
      termsJp.hidden = false;
      termsKr.hidden = true;
    } else {
      calcTitle.textContent = "韓國代購報價試算";
      modeWrap.hidden = true;
      amountLabel.textContent = "商品售價（韓幣）";
      currencyPrefix.textContent = "₩";
      termsJp.hidden = true;
      termsKr.hidden = false;
    }
    amountInput.placeholder = getPlaceholder();
    updateSum();
  }

  function setJpMode(m){
    state.jpMode = m;
    document.querySelectorAll(".seg button").forEach(function(b){
      b.setAttribute("aria-pressed", b.getAttribute("data-m") === m ? "true" : "false");
    });
  }

  function recalc(){
    var price = getPriceTotal();
    var rates = getRates();

    if (!price || price <= 0) {
      resultTotal.textContent = "NT$ 0元";
      breakdownEl.innerHTML = "";
      return;
    }

    var converted, cur, rateLabel, modeLabel;
    if (state.country === "jp") {
      cur = "JPY";
      if (state.jpMode === "online") {
        converted = price * rates.jpyOnline;
        rateLabel = "× " + rates.jpyOnline + "（匯率）";
        modeLabel = "網路代訂";
      } else {
        converted = price * rates.jpy;
        rateLabel = "× " + rates.jpy + "（匯率）";
        modeLabel = "一般商品";
      }
    } else {
      cur = "KRW";
      converted = price / rates.krw;
      rateLabel = "÷ " + rates.krw + "（匯率）";
      modeLabel = "";
    }

    converted = ceilTo10(converted);
    resultTotal.textContent = fmtNT(converted) + "元";

    var rows = [];
    var itemCount = getParts(amountInput.value).length;
    rows.push([itemCount > 1 ? "商品售價合計（" + itemCount + " 項）" : "商品售價", fmtSrc(price, cur)]);
    if (modeLabel) rows.push(["計價方式", modeLabel]);
    rows.push(["匯率換算 " + rateLabel, fmtNT(converted)]);
    rows.push(["個位數", "無條件進位"]);

    breakdownEl.innerHTML = rows.map(function(r){
      return '<div class="row"><span>' + r[0] + '</span><span>' + r[1] + '</span></div>';
    }).join("");
  }

  document.querySelectorAll(".switch button").forEach(function(b){
    b.addEventListener("click", function(){ setCountry(b.getAttribute("data-c")); });
  });
  document.querySelectorAll(".seg button").forEach(function(b){
    b.addEventListener("click", function(){ setJpMode(b.getAttribute("data-m")); });
  });
  quoteBtn.addEventListener("click", requestQuote);
  amountInput.addEventListener("input", function(){
    var cleaned = sanitizeExpr(amountInput.value);
    if (cleaned !== amountInput.value) amountInput.value = cleaned;
    updateSum();
  });
  amountInput.addEventListener("keydown", function(e){
    if (e.key === "Enter") {
      e.preventDefault();
      requestQuote();
    }
  });

  closeBtn.addEventListener("click", closeQuote);
  overlay.addEventListener("click", function(e){
    if (e.target === overlay) closeQuote();
  });
  document.addEventListener("keydown", function(e){
    if (e.key === "Escape" && quoteOpen) closeQuote();
  });

  setCountry(state.country);
})();
