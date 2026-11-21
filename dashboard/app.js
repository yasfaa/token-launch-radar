/* Token Radar page: renders window.RADAR, which main.ts writes beside this page from the same board. */

(function () {
  'use strict';

  var DATA = window.RADAR;
  var state = { q: '', category: 'all', sort: 'rank', dir: 1, status: 'pre', selected: null };

  var MAX_BAR = 0;

  /* ------------------------------------------------------------ formatting */

  function fmtUsd(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    var a = Math.abs(n);
    if (a >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(0) + 'K';
    return '$' + Math.round(n);
  }

  function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'n/a';
    return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  function fmtAge(days) {
    if (days === null || days === undefined) return 'n/a';
    if (days < 45) return days + 'd';
    if (days < 365) return Math.round(days / 30) + 'mo';
    return (days / 365).toFixed(1) + 'y';
  }

  function pctClass(n) {
    if (n === null || n === undefined || !isFinite(n)) return 'flat';
    if (n > 0.0001) return 'up';
    if (n < -0.0001) return 'down';
    return 'flat';
  }

  function chainLine(p) {
    var chains = p.chains || [];
    if (chains.length === 0) return 'chain not recorded';
    if (chains.length === 1) return chains[0];
    return chains[0] + ' +' + (chains.length - 1);
  }

  /* ------------------------------------------------------------ the model */

  // The page recomputes a row's implied value from the figures it shows, so the arithmetic on screen
  // is the one the board claims. It mirrors lib/model.ts exactly.
  function impliedOf(row) {
    var growth = row.change_7d;
    if (growth === null || growth === undefined || !isFinite(growth)) growth = 0;
    var g = Math.min(DATA.model.growth_cap, Math.max(DATA.model.growth_floor, growth));
    var growthMult = 1 + (g / 100) * DATA.model.growth_weight;
    var age = row.age_days === null || row.age_days === undefined ? DATA.model.unknown_age_days : row.age_days;
    var capped = Math.min(Math.max(age, 0), DATA.model.maturity_days);
    var maturity = DATA.model.maturity_floor + (capped / DATA.model.maturity_days) * DATA.model.maturity_range;
    return Math.max(1, Math.round(row.tvl_usd * row.base_multiple * growthMult * maturity));
  }

  function capitalFor(tvl) {
    if (tvl >= 5000000000) return 250;
    if (tvl >= 1000000000) return 150;
    if (tvl >= 100000000) return 100;
    return 50;
  }

  function holdDaysFor(age) {
    if (age === null || age === undefined) return 30;
    if (age < 180) return 60;
    if (age < 365) return 45;
    return 30;
  }

  function actionFor(p, capital, chain) {
    var c = (p.category || '').toLowerCase();
    var name = p.name;
    if (c.indexOf('lend') >= 0 || c.indexOf('cdp') >= 0 || c.indexOf('collateral') >= 0) {
      return 'Supply $' + capital + ' of USDC to ' + name + ' on ' + chain + ' and keep the position open.';
    }
    if (c.indexOf('dex') >= 0 || c.indexOf('yield') >= 0 || c.indexOf('leveraged farm') >= 0) {
      return "Provide $" + capital + " of liquidity to " + name + "'s main pool on " + chain + ' and keep the position open.';
    }
    if (c.indexOf('bridge') >= 0) {
      return 'Bridge $' + capital + ' of USDC to ' + chain + ' through ' + name + ' and use the bridged funds in its app.';
    }
    if (c.indexOf('staking') >= 0 || c.indexOf('restak') >= 0) {
      return "Stake $" + capital + " of the chain's staking asset through " + name + ' and keep the receipt.';
    }
    if (c.indexOf('perpetual') >= 0 || c.indexOf('derivative') >= 0) {
      return 'Deposit $' + capital + ' of USDC as margin on ' + name + ' and open one small hedge.';
    }
    if (c.indexOf('prediction') >= 0) return 'Fund $' + capital + ' and place one market position on ' + name + '.';
    if (c.indexOf('curator') >= 0 || c.indexOf('allocator') >= 0) {
      return 'Deposit $' + capital + ' into a ' + name + ' vault on ' + chain + ' and keep the shares.';
    }
    if (c.indexOf('stable') >= 0) return 'Mint or deposit $' + capital + ' of the stable asset through ' + name + ' on ' + chain + '.';
    if (c.indexOf('rwa') >= 0) return "Mint $" + capital + " of the protocol's yield asset on " + chain + ' and hold it.';
    if (c.indexOf('insurance') >= 0) return 'Buy $' + capital + ' of cover from ' + name + ' on ' + chain + ' and keep the policy.';
    return 'Deposit $' + capital + ' of USDC into ' + name + ' on ' + chain + ' and keep the position open.';
  }

  function planFor(p) {
    var chain = (p.chains && p.chains.length > 0) ? p.chains[0] : 'its main chain';
    var capital = capitalFor(p.tvl_usd);
    var hold = holdDaysFor(p.age_days);
    var young = p.age_days !== null && p.age_days !== undefined && p.age_days < 365;
    return [
      {
        text: 'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.',
        cost: 'under $3 of gas for the first transaction',
        time: '5 minutes'
      },
      {
        text: actionFor(p, capital, chain),
        cost: '$' + capital + ' of capital and about $' + (capital >= 150 ? 8 : 4) + ' of gas',
        time: '15 minutes to set up'
      },
      {
        text: young
          ? 'Make one qualifying action a week — a deposit, a borrow, a swap or a vote — while the protocol is still young enough that early activity is likelier to count.'
          : 'Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.',
        cost: 'about $2 of gas a week',
        time: '10 minutes a week'
      },
      {
        text: 'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot.',
        cost: 'the $' + capital + ' stays in the position',
        time: hold + ' days'
      },
      {
        text: "Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.",
        cost: 'no fee to check, and never pay to claim',
        time: '10 minutes'
      },
      {
        text: 'Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.',
        cost: 'nothing but the log',
        time: '5 minutes'
      }
    ];
  }

  /* ------------------------------------------------------------ dom helpers */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') node.textContent = attrs[k];
        else if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (attrs[k] !== null && attrs[k] !== undefined) node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  /* ------------------------------------------------------------ hash state */

  function readHash() {
    var raw = window.location.hash.replace(/^#/, '');
    if (!raw) return;
    var params = new URLSearchParams(raw);
    if (params.get('q')) state.q = params.get('q');
    if (params.get('category')) state.category = params.get('category');
    if (params.get('p')) state.selected = params.get('p');
  }

  function writeHash() {
    var params = new URLSearchParams();
    if (state.q) params.set('q', state.q);
    if (state.category !== 'all') params.set('category', state.category);
    if (state.selected) params.set('p', state.selected);
    var next = params.toString();
    if (next) window.history.replaceState(null, '', '#' + next);
    else window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  /* ------------------------------------------------------------ filtering */

  function currentRows() {
    if (state.status === 'live') return DATA.live.slice();
    var q = state.q.trim().toLowerCase();
    var list = DATA.rows.filter(function (r) {
      if (state.category !== 'all' && r.category !== state.category) return false;
      if (!q) return true;
      var hay = [r.name, r.slug, r.category, (r.chains || []).join(' ')].join(' ').toLowerCase();
      return hay.indexOf(q) >= 0;
    });
    return sortRows(list);
  }

  function sortRows(list) {
    var key = state.sort;
    var dir = state.dir;
    return list.slice().sort(function (a, b) {
      var av, bv;
      if (key === 'name') { av = a.name.toLowerCase(); bv = b.name.toLowerCase(); }
      else if (key === 'tvl') { av = a.tvl_usd; bv = b.tvl_usd; }
      else if (key === 'growth') { av = a.change_7d === null ? -Infinity : a.change_7d; bv = b.change_7d === null ? -Infinity : b.change_7d; }
      else if (key === 'age') { av = a.age_days === null ? Infinity : a.age_days; bv = b.age_days === null ? Infinity : b.age_days; }
      else if (key === 'implied') { av = a.implied_value_usd; bv = b.implied_value_usd; }
      else { av = a.rank; bv = b.rank; }
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
    });
  }

  /* ------------------------------------------------------------ chrome */

  function renderDateline() {
    var node = document.getElementById('dateline');
    clear(node);
    [
      ['Snapshot', DATA.as_of],
      ['Source', 'DefiLlama protocol index'],
      ['Model', DATA.model_version]
    ].forEach(function (pair) {
      node.appendChild(el('div', {}, [el('dt', { text: pair[0] }), el('dd', { text: pair[1] })]));
    });
  }

  function renderIntro() {
    document.getElementById('headline').textContent =
      DATA.watchlist_size + ' watchlist protocols, ranked by implied value';
    document.getElementById('lede').textContent =
      'The watchlist is the floor: every protocol with at least ' + fmtUsd(DATA.floor_usd) +
      ' of TVL and no token on record. The early radar adds ' + DATA.early_size +
      ' pre-token protocols below that floor. Implied value is a model, not a promise.';

    var tally = document.getElementById('tally');
    clear(tally);
    [
      ['Watchlist covered', DATA.watchlist_size + ' / ' + DATA.watchlist_size],
      ['Pre-token rows scored', String(DATA.board_size)],
      ['Early rows below the floor', String(DATA.early_size)],
      ['Live-token protocols set aside', String(DATA.live_size)]
    ].forEach(function (pair) {
      tally.appendChild(el('dt', { text: pair[0] }));
      tally.appendChild(el('dd', { text: pair[1] }));
    });
  }

  function renderCategories() {
    var select = document.getElementById('category');
    var counts = {};
    DATA.rows.forEach(function (r) {
      var key = r.category === null || r.category === undefined ? 'Uncategorised' : r.category;
      counts[key] = (counts[key] || 0) + 1;
    });
    var names = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a] || (a < b ? -1 : 1); });
    clear(select);
    select.appendChild(el('option', { value: 'all', text: 'All categories (' + DATA.rows.length + ')' }));
    names.forEach(function (n) {
      select.appendChild(el('option', { value: n === 'Uncategorised' ? 'null' : n, text: n + ' (' + counts[n] + ')' }));
    });
  }

  /* ------------------------------------------------------------ table */

  function sortHeader(key, label, numeric) {
    var th = el('th', {}, []);
    var btn = el('button', { type: 'button', text: label });
    if (state.status === 'live' && key !== 'name' && key !== 'tvl') { th.appendChild(el('span', { text: label })); return th; }
    if (state.sort === key) btn.className = 'sorted' + (state.dir === -1 ? '' : ' asc');
    btn.addEventListener('click', function () {
      if (state.sort === key) state.dir = -state.dir;
      else { state.sort = key; state.dir = key === 'name' ? 1 : key === 'age' ? 1 : -1; }
      render();
    });
    th.appendChild(btn);
    if (numeric) th.className = 'num';
    return th;
  }

  function renderHead() {
    var thead = document.getElementById('thead');
    clear(thead);
    var tr = el('tr');
    if (state.status === 'live') {
      tr.appendChild(el('th', { text: 'Protocol' }));
      tr.appendChild(el('th', { className: 'num', text: 'TVL' }));
      tr.appendChild(el('th', { className: 'num', text: 'Market cap' }));
      tr.appendChild(el('th', { className: 'num', text: '7d' }));
    } else {
      tr.appendChild(sortHeader('rank', 'Rank'));
      tr.appendChild(sortHeader('name', 'Protocol'));
      tr.appendChild(sortHeader('tvl', 'TVL', true));
      tr.appendChild(sortHeader('growth', '7d', true));
      tr.appendChild(sortHeader('age', 'Age', true));
      tr.appendChild(sortHeader('implied', 'Implied value', true));
    }
    thead.appendChild(tr);
  }

  function selectRow(slug) {
    state.selected = state.selected === slug ? null : slug;
    writeHash();
    render();
  }

  function renderBody() {
    var tbody = document.getElementById('tbody');
    var list = currentRows();
    var empty = document.getElementById('empty');
    clear(tbody);

    document.getElementById('count').textContent = list.length + (list.length === 1 ? ' row' : ' rows') + ' shown';
    empty.hidden = list.length !== 0;

    list.forEach(function (r) {
      var tr = el('tr');
      if (state.selected === r.slug) tr.className = 'selected';
      tr.addEventListener('click', function () { selectRow(r.slug); });

      if (state.status === 'live') {
        tr.appendChild(el('td', {}, [
          el('span', { class: 'name', text: r.name }),
          el('span', { class: 'sub', text: (r.category || 'uncategorised') + ' on ' + chainLine(r) })
        ]));
        tr.appendChild(el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }));
        tr.appendChild(el('td', { class: 'num', text: fmtUsd(r.mcap_usd) }));
        tr.appendChild(el('td', { class: 'num ' + pctClass(r.change_7d), text: fmtPct(r.change_7d) }));
      } else {
        tr.appendChild(el('td', { class: 'rank num', text: String(r.rank) }));
        tr.appendChild(el('td', {}, [
          el('span', { class: 'name', text: r.name }),
          el('span', { class: 'sub', text: (r.category || 'uncategorised') + ' on ' + chainLine(r) })
        ]));
        tr.appendChild(el('td', { class: 'num', text: fmtUsd(r.tvl_usd) }));
        tr.appendChild(el('td', { class: 'num ' + pctClass(r.change_7d), text: fmtPct(r.change_7d) }));
        tr.appendChild(el('td', { class: 'num', text: fmtAge(r.age_days) }));
        var width = MAX_BAR > 0 ? Math.max(2, Math.round((r.implied_value_usd / MAX_BAR) * 100)) : 0;
        tr.appendChild(el('td', { class: 'num' }, [
          el('span', { text: fmtUsd(r.implied_value_usd) }),
          el('span', { class: 'bar' }, [el('span', { style: 'width:' + width + '%' })])
        ]));
      }
      tbody.appendChild(tr);
    });
  }

  /* ------------------------------------------------------------ drawer */

  function renderDrawer() {
    var drawer = document.getElementById('drawer');
    if (!state.selected) { drawer.hidden = true; clear(drawer); return; }

    var row = null;
    for (var i = 0; i < DATA.rows.length; i++) if (DATA.rows[i].slug === state.selected) { row = DATA.rows[i]; break; }
    if (row === null) {
      for (var j = 0; j < DATA.live.length; j++) if (DATA.live[j].slug === state.selected) { renderLiveDrawer(DATA.live[j]); return; }
      drawer.hidden = true;
      return;
    }

    var recomputed = impliedOf(row);
    var g = row.change_7d === null || row.change_7d === undefined ? 0 : row.change_7d;
    var clamped = Math.min(DATA.model.growth_cap, Math.max(DATA.model.growth_floor, g));

    clear(drawer);
    drawer.hidden = false;

    var close = el('button', { type: 'button', class: 'close', text: 'Close' });
    close.addEventListener('click', function () { state.selected = null; writeHash(); render(); });

    drawer.appendChild(el('div', { class: 'drawer-head' }, [
      el('div', {}, [
        el('span', { class: 'drawer-kicker', text: 'Rank ' + row.rank + ' of ' + DATA.board_size }),
        el('h2', { text: row.name }),
        el('span', { class: 'sub', text: (row.category || 'uncategorised') + ' on ' + (row.chains || []).join(', ') })
      ]),
      close
    ]));

    drawer.appendChild(el('h3', { text: 'Implied value' }));
    var ledger = el('dl', { class: 'ledger' });
    [
      ['TVL', fmtUsd(row.tvl_usd)],
      ['Category multiple', row.base_multiple.toFixed(2) + ' ×'],
      ['Seven-day growth', fmtPct(row.change_7d) + (clamped !== g ? ' (clamped)' : '')],
      ['Age with no token', row.age_days === null ? 'not recorded' : row.age_days + ' days'],
      ['Growth multiplier', row.growth_multiplier.toFixed(4) + ' ×'],
      ['Maturity multiplier', row.maturity_multiplier.toFixed(4) + ' ×'],
      ['Model recomputes', fmtUsd(recomputed), 'total'],
      ['Board carries', fmtUsd(row.implied_value_usd), 'total']
    ].forEach(function (pair) {
      ledger.appendChild(el('dt', { text: pair[0] }));
      ledger.appendChild(el('dd', { class: pair[2] || '', text: pair[1] }));
    });
    drawer.appendChild(ledger);

    drawer.appendChild(el('p', {
      class: 'note',
      text: 'Model ' + DATA.model_version + ': TVL × ' + row.base_multiple.toFixed(2) + ' × ' +
        row.growth_multiplier.toFixed(4) + ' × ' + row.maturity_multiplier.toFixed(4) +
        ' = ' + fmtUsd(row.implied_value_usd) + '. One function scores every row; no name is special-cased.'
    }));

    drawer.appendChild(el('h3', { text: 'Farm plan' }));
    var plan = el('ol', { class: 'plan' });
    planFor(row).forEach(function (step) {
      plan.appendChild(el('li', {}, [
        el('p', { text: step.text }),
        el('p', { class: 'meta', text: 'Cost: ' + step.cost + ' · Time: ' + step.time })
      ]));
    });
    drawer.appendChild(plan);
  }

  function renderLiveDrawer(row) {
    var drawer = document.getElementById('drawer');
    clear(drawer);
    drawer.hidden = false;
    var close = el('button', { type: 'button', class: 'close', text: 'Close' });
    close.addEventListener('click', function () { state.selected = null; writeHash(); render(); });
    drawer.appendChild(el('div', { class: 'drawer-head' }, [
      el('div', {}, [
        el('span', { class: 'drawer-kicker', text: 'Trades already' }),
        el('h2', { text: row.name }),
        el('span', { class: 'sub', text: (row.category || 'uncategorised') + ' on ' + (row.chains || []).join(', ') })
      ]),
      close
    ]));
    var ledger = el('dl', { class: 'ledger' });
    [
      ['TVL', fmtUsd(row.tvl_usd)],
      ['Market cap', fmtUsd(row.mcap_usd)],
      ['Seven-day growth', fmtPct(row.change_7d)]
    ].forEach(function (pair) {
      ledger.appendChild(el('dt', { text: pair[0] }));
      ledger.appendChild(el('dd', { text: pair[1] }));
    });
    drawer.appendChild(el('h3', { text: 'The market\'s own figures' }));
    drawer.appendChild(ledger);
    drawer.appendChild(el('p', {
      class: 'note',
      text: 'This protocol records a token, so it is shown at the market value it already carries and never ranked against the pre-token board.'
    }));
  }

  /* ------------------------------------------------------------ method */

  function renderMethod() {
    var node = document.getElementById('method');
    clear(node);

    var left = el('div', {}, [
      el('h2', { text: 'How a number is made' }),
      el('p', { text: 'Every row runs through one function of the snapshot\'s own figures: its TVL, its seven-day change, its category and how long it has run with no token on record. The category is the only place a protocol earns a different multiple, because a lending market holds capital more tightly than a bridge passes it through.' }),
      el('pre', {
        text: 'base       = tvl_usd × category_multiple\n' +
          'growth     = clamp(change_7d, ' + DATA.model.growth_floor + ', +' + DATA.model.growth_cap + ') %\n' +
          'growthMult = 1 + (growth / 100) × ' + DATA.model.growth_weight + '\n' +
          'maturity   = ' + DATA.model.maturity_floor + ' + min(age_days, ' + DATA.model.maturity_days + ') / ' + DATA.model.maturity_days + ' × ' + DATA.model.maturity_range + '\n' +
          'implied    = max(1, round(base × growthMult × maturity))'
      })
    ]);

    var params = el('dl', { class: 'params' });
    [
      ['growth_weight', String(DATA.model.growth_weight)],
      ['growth_floor', DATA.model.growth_floor + '%'],
      ['growth_cap', '+' + DATA.model.growth_cap + '%'],
      ['maturity_floor', String(DATA.model.maturity_floor)],
      ['maturity_range', String(DATA.model.maturity_range)],
      ['maturity_days', String(DATA.model.maturity_days)],
      ['unknown_age_days', String(DATA.model.unknown_age_days)]
    ].forEach(function (pair) {
      params.appendChild(el('dt', { text: pair[0] }));
      params.appendChild(el('dd', { text: pair[1] }));
    });

    var right = el('div', {}, [
      el('h2', { text: 'What this board is not' }),
      el('p', { text: 'A protocol that records no token may still have one its record does not carry. The board ranks what a launch would plausibly be worth if the protocol\'s record stayed as it is; it does not say whether a token will be issued, or when.' }),
      el('p', { text: 'The watchlist is the floor, never the ceiling: rows below the TVL floor are the early names the radar exists to find, and their numbers are the same function applied to smaller figures.' }),
      params
    ]);

    node.appendChild(left);
    node.appendChild(right);
  }

  function renderFooter() {
    document.getElementById('foot-source').textContent = 'Snapshot ' + DATA.as_of + ' · ' + DATA.source + ' · ' + DATA.board_size + ' rows scored by model ' + DATA.model_version + '.';
  }

  /* ------------------------------------------------------------ render */

  function render() {
    MAX_BAR = 0;
    DATA.rows.forEach(function (r) { if (r.implied_value_usd > MAX_BAR) MAX_BAR = r.implied_value_usd; });

    document.getElementById('q').value = state.q;
    document.getElementById('category').value = state.category === 'null' ? 'null' : state.category;
    document.getElementById('show-pre').className = state.status === 'pre' ? 'on' : '';
    document.getElementById('show-pre').setAttribute('aria-pressed', String(state.status === 'pre'));
    document.getElementById('show-live').className = state.status === 'live' ? 'on' : '';
    document.getElementById('show-live').setAttribute('aria-pressed', String(state.status === 'live'));
    document.getElementById('hint').textContent = state.status === 'live'
      ? 'These protocols record a token, so the page shows the market value they already carry.'
      : 'Every row is scored by one function of the snapshot figures. Select a row for its arithmetic and its farm plan.';

    renderHead();
    renderBody();
    renderDrawer();
  }

  /* ------------------------------------------------------------ boot */

  function boot() {
    if (!DATA) {
      document.getElementById('headline').textContent = 'No data';
      document.getElementById('lede').textContent = 'The page could not read its data file beside it.';
      return;
    }

    renderDateline();
    renderIntro();
    renderCategories();
    renderMethod();
    renderFooter();
    readHash();
    if (state.category === 'null') state.category = 'null';
    render();

    document.getElementById('q').addEventListener('input', function (e) {
      state.q = e.target.value;
      writeHash();
      render();
    });

    document.getElementById('category').addEventListener('change', function (e) {
      state.category = e.target.value;
      writeHash();
      render();
    });

    document.getElementById('show-pre').addEventListener('click', function () {
      state.status = 'pre';
      render();
    });

    document.getElementById('show-live').addEventListener('click', function () {
      state.status = 'live';
      render();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.selected) {
        state.selected = null;
        writeHash();
        render();
      }
    });
  }

  boot();
})();
