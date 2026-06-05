/* ============================================================
   PMPI Performance Quiz - reusable popup component
   Usage on any page:
     <link rel="stylesheet" href="pmpi-quiz.css">
     <script>
       window.PMPI_CONFIG = {
         webhookUrl: 'https://services.leadconnectorhq.com/hooks/.../webhook-trigger/...',
         redirectUrl: '/vsl',     // where to send them after submit (null = show thanks screen)
         autoOpen: false,         // auto-open after delay + exit-intent
         logoSrc: 'karved-logo.png',
         intro: { eyebrow, title, lead, startLabel },  // optional copy overrides
         formIntro: '...'         // optional copy override for the email form
       };
     </script>
     <script src="pmpi-quiz.js" defer></script>
   Trigger manually with: PMPI.open()
   ============================================================ */
(function () {
  var CONFIG     = window.PMPI_CONFIG || {};
  var WEBHOOK    = CONFIG.webhookUrl || '';
  var REDIRECT   = CONFIG.redirectUrl || null;
  var AUTO_OPEN  = CONFIG.autoOpen || false;
  var DISMISS_URL = CONFIG.dismissUrl || null;
  var LOGO       = CONFIG.logoSrc || 'karved-logo.png';
  var FORM_NOTE  = CONFIG.formNote || '';
  var INTRO      = CONFIG.intro || {};
  var FORM_INTRO = CONFIG.formIntro || 'Get the full 23-page audit (24 benchmarks across all 6 pillars) and your personalised 90-day plan in your inbox.';

  var STORAGE_KEY = 'pmpi-shown-v1';
  var RESULT_KEY  = 'pmpi-last-result-v1';
  var DELAY_MS    = 5000;

  var intro_eyebrow = INTRO.eyebrow || 'Performance Quiz';
  var intro_title   = INTRO.title   || 'Where do you actually stand?';
  var intro_lead    = INTRO.lead    || 'The 6-pillar audit. One score out of 100. Two minutes. Find out which pillar is dragging you down, and exactly what to fix first.';
  var intro_start   = INTRO.startLabel || 'Start the Assessment';

  var QUESTIONS = [
    { pillar: 'Pillar 01 · Body Composition', question: 'What is your current body fat percentage?', options: [
      { label: 'Above 20%', score: 0 },
      { label: '17.5-20% (Baseline)', score: 3 },
      { label: '15-17.5% (Good)', score: 4 },
      { label: 'Under 15% (Great)', score: 5 }
    ]},
    { pillar: 'Pillar 02 · Strength', question: 'Heaviest 3RM trap-bar deadlift?', options: [
      { label: 'Less than 1x my bodyweight', score: 0 },
      { label: 'About 1x my bodyweight (Baseline)', score: 3 },
      { label: 'About 1.25x my bodyweight (Good)', score: 4 },
      { label: '1.75x my bodyweight or more (Great)', score: 5 }
    ]},
    { pillar: 'Pillar 03 · Cardio', question: 'Your most recent 5km time?', options: [
      { label: "Over 27 minutes, or I can't run 5km", score: 0 },
      { label: '24-27 minutes (Baseline)', score: 3 },
      { label: '21-24 minutes (Good)', score: 4 },
      { label: 'Under 21 minutes (Great)', score: 5 }
    ]},
    { pillar: 'Pillar 04 · Mobility', question: 'Deep squat hold, how long can you sit comfortably?', options: [
      { label: "Can't reach the position", score: 0 },
      { label: 'Can hold, heels down (Baseline)', score: 3 },
      { label: '30 second hold (Good)', score: 4 },
      { label: '60 second hold (Great)', score: 5 }
    ]},
    { pillar: 'Pillar 05 · Recovery', question: 'Average sleep duration over the last 14 nights?', options: [
      { label: 'Under 7 hours', score: 0 },
      { label: '7 hours (Baseline)', score: 3 },
      { label: '7.5 hours (Good)', score: 4 },
      { label: '8+ hours (Great)', score: 5 }
    ]},
    { pillar: 'Pillar 06 · Cognition', question: 'Deep focus, no phone, on one task, how long do you last?', options: [
      { label: 'Under 30 minutes', score: 0 },
      { label: '30-60 minutes (Baseline)', score: 3 },
      { label: '60-90 minutes (Good)', score: 4 },
      { label: '90+ minutes (Great)', score: 5 }
    ]}
  ];

  var TIERS = [
    { min: 0,  max: 39,  label: 'Below Default', desc: 'Operating below where any man should be. The body is breaking down faster than life is rebuilding it. Fix recovery and body composition first.' },
    { min: 40, max: 59,  label: 'Baseline',      desc: 'Holding the floor. Roughly the average Western male in his 30s. Functional but not athletic. Not where an ex-athlete should sit.' },
    { min: 60, max: 79,  label: 'Good',          desc: 'Top 30% of men your age. Visibly fit, hormonally healthy, performing across pillars. The realistic target for any ex-athlete who trains properly.' },
    { min: 80, max: 94,  label: 'Great',         desc: 'Top 17% of men. Athletic body, real strength, real engine, full mobility, sharp cognition, restored recovery. Peak male performance for a working man with a real life.' },
    { min: 95, max: 100, label: 'Elite',         desc: 'Top 3%. Every pillar at Great or above. Operating at a level most men do not believe is possible past 30. Sustainable. Earned.' }
  ];

  var MODAL_HTML =
    '<div class="pmpi-modal" id="pmpi-modal" aria-hidden="true" role="dialog">' +
      '<div class="pmpi-backdrop" onclick="PMPI.close()"></div>' +
      '<div class="pmpi-card">' +
        '<button class="pmpi-close" onclick="PMPI.close()" aria-label="Close">&times;</button>' +
        '<div class="pmpi-screen" data-screen="intro">' +
          '<div class="pmpi-mark"><img src="' + LOGO + '" alt="KARVED" loading="eager"></div>' +
          '<div class="pmpi-eyebrow">' + intro_eyebrow + '</div>' +
          '<h2 class="pmpi-title">' + intro_title + '</h2>' +
          '<p class="pmpi-lead">' + intro_lead + '</p>' +
          '<button class="btn btn-gold btn-arrow" onclick="PMPI.start()">' + intro_start + '</button>' +
          '<button class="pmpi-dismiss" onclick="PMPI.dismiss()">Maybe later</button>' +
        '</div>' +
        '<div class="pmpi-screen" data-screen="quiz">' +
          '<div class="pmpi-progress"><div class="pmpi-progress-bar" id="pmpi-progress-bar"></div></div>' +
          '<div class="pmpi-step-label" id="pmpi-step-label">Step 1 of 6</div>' +
          '<div class="pmpi-pillar" id="pmpi-pillar"></div>' +
          '<h3 class="pmpi-question" id="pmpi-question"></h3>' +
          '<div class="pmpi-options" id="pmpi-options"></div>' +
          '<div class="pmpi-actions">' +
            '<button class="pmpi-back" onclick="PMPI.back()">Back</button>' +
            '<button class="btn btn-gold" id="pmpi-next" onclick="PMPI.next()" disabled>Next</button>' +
          '</div>' +
        '</div>' +
        '<div class="pmpi-screen" data-screen="results">' +
          '<div class="pmpi-eyebrow">Your Score</div>' +
          '<div class="pmpi-score" id="pmpi-score">0</div>' +
          '<div class="pmpi-score-label">out of 100</div>' +
          '<div class="pmpi-tier" id="pmpi-tier"></div>' +
          '<p class="pmpi-tier-desc" id="pmpi-tier-desc"></p>' +
          '<div class="pmpi-divider"></div>' +
          '<div class="pmpi-compare" id="pmpi-compare" hidden></div>' +
          '<div class="pmpi-compare pmpi-average">The average KARVED athlete improves their score by <strong>18 points</strong> within the first 90 days.</div>' +
          '<div class="pmpi-weakest-label">Fix this first</div>' +
          '<div class="pmpi-weakest" id="pmpi-weakest"></div>' +
          '<form class="pmpi-form" id="pmpi-form" onsubmit="return PMPI.submit(event)">' +
            '<p class="pmpi-form-intro">' + FORM_INTRO + '</p>' +
            '<input type="text" name="firstName" placeholder="First name" required autocomplete="given-name">' +
            '<input type="email" name="email" placeholder="Your email" required autocomplete="email">' +
            '<button type="submit" class="btn btn-gold btn-arrow">Get My Free Resource</button>' +
            (FORM_NOTE ? '<p class="pmpi-form-note">' + FORM_NOTE + '</p>' : '') +
          '</form>' +
        '</div>' +
        '<div class="pmpi-screen" data-screen="thanks">' +
          '<div class="pmpi-check">&#10003;</div>' +
          '<h2 class="pmpi-title">On its way.</h2>' +
          '<p class="pmpi-lead">Check your inbox in the next few minutes for your results and free resource.</p>' +
          '<a href="#book" class="btn btn-gold btn-arrow" onclick="PMPI.close()">Book a Call With Greg</a>' +
        '</div>' +
      '</div>' +
    '</div>';

  // Inject the modal into the page
  var holder = document.createElement('div');
  holder.innerHTML = MODAL_HTML;
  document.body.appendChild(holder.firstChild);

  var state = { step: 0, answers: [] };
  function resetAnswers() { state.answers = QUESTIONS.map(function () { return null; }); }
  function $(sel) { return document.querySelector(sel); }

  function showScreen(name) {
    document.querySelectorAll('.pmpi-screen').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-screen') === name);
    });
  }
  function openModal() {
    $('#pmpi-modal').classList.add('open');
    $('#pmpi-modal').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    $('#pmpi-modal').classList.remove('open');
    $('#pmpi-modal').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch (e) {}
  }
  function dismiss() {
    if (DISMISS_URL) { window.location.href = DISMISS_URL; return; }
    closeModal();
  }
  function start() {
    state.step = 0;
    resetAnswers();
    renderQuestion();
    showScreen('quiz');
  }
  function renderQuestion() {
    var q = QUESTIONS[state.step];
    $('#pmpi-step-label').textContent = 'Step ' + (state.step + 1) + ' of ' + QUESTIONS.length;
    $('#pmpi-pillar').textContent = q.pillar;
    $('#pmpi-question').textContent = q.question;
    $('#pmpi-progress-bar').style.width = ((state.step + 1) / QUESTIONS.length * 100) + '%';

    var optionsEl = $('#pmpi-options');
    optionsEl.innerHTML = '';
    q.options.forEach(function (opt, i) {
      var btn = document.createElement('button');
      btn.className = 'pmpi-option';
      btn.type = 'button';
      btn.innerHTML = '<span class="pmpi-option-radio"></span><span>' + opt.label + '</span>';
      if (state.answers[state.step] === i) btn.classList.add('selected');
      btn.onclick = function () { state.answers[state.step] = i; renderQuestion(); };
      optionsEl.appendChild(btn);
    });
    $('#pmpi-next').disabled = state.answers[state.step] === null;
    $('#pmpi-next').textContent = state.step === QUESTIONS.length - 1 ? 'See My Score' : 'Next';
  }
  function next() {
    if (state.answers[state.step] === null) return;
    if (state.step < QUESTIONS.length - 1) { state.step++; renderQuestion(); }
    else { showResults(); }
  }
  function back() {
    if (state.step > 0) { state.step--; renderQuestion(); }
    else { showScreen('intro'); }
  }
  function showResults() {
    var total = 0;
    state.answers.forEach(function (answerIdx, qIdx) { total += QUESTIONS[qIdx].options[answerIdx].score; });
    var pct = Math.round((total / (QUESTIONS.length * 5)) * 100);
    var tier = TIERS.find(function (t) { return pct >= t.min && pct <= t.max; }) || TIERS[0];

    var minIdx = 0, minScore = 99;
    state.answers.forEach(function (answerIdx, qIdx) {
      var s = QUESTIONS[qIdx].options[answerIdx].score;
      if (s < minScore) { minScore = s; minIdx = qIdx; }
    });
    var weakestName = QUESTIONS[minIdx].pillar.split('·')[1].trim();

    $('#pmpi-score').textContent = pct;
    $('#pmpi-tier').textContent = tier.label;
    $('#pmpi-tier-desc').textContent = tier.desc;
    $('#pmpi-weakest').textContent = weakestName;

    var compareEl = $('#pmpi-compare');
    compareEl.hidden = true;
    try {
      var prior = JSON.parse(localStorage.getItem(RESULT_KEY) || 'null');
      if (prior && typeof prior.score === 'number') {
        var delta = pct - prior.score;
        var when = formatRelativeDate(prior.date);
        var msg;
        if (delta > 0) msg = '<strong>Up ' + delta + ' points</strong> from your last score of ' + prior.score + ' (' + when + '). Real progress.';
        else if (delta < 0) msg = '<strong>Down ' + Math.abs(delta) + ' points</strong> from your last score of ' + prior.score + ' (' + when + '). Time to find what slipped.';
        else msg = '<strong>Same score as last time:</strong> ' + prior.score + ' (' + when + '). Holding the line.';
        compareEl.innerHTML = msg;
        compareEl.hidden = false;
      }
    } catch (e) {}

    try {
      localStorage.setItem(RESULT_KEY, JSON.stringify({ score: pct, tier: tier.label, weakest: weakestName, date: new Date().toISOString() }));
    } catch (e) {}

    showScreen('results');
  }
  function formatRelativeDate(iso) {
    try {
      var then = new Date(iso).getTime();
      var days = Math.floor((Date.now() - then) / 86400000);
      if (days < 1) return 'today';
      if (days === 1) return 'yesterday';
      if (days < 30) return days + ' days ago';
      if (days < 60) return 'a month ago';
      if (days < 365) return Math.floor(days / 30) + ' months ago';
      return Math.floor(days / 365) + ' year' + (days >= 730 ? 's' : '') + ' ago';
    } catch (e) { return 'last time'; }
  }
  function submit(e) {
    e.preventDefault();
    var form = e.target;
    var payload = {
      firstName: form.firstName.value,
      email: form.email.value,
      score: parseInt($('#pmpi-score').textContent, 10),
      tier: $('#pmpi-tier').textContent,
      weakestPillar: $('#pmpi-weakest').textContent,
      answers: state.answers.map(function (a, i) {
        return { pillar: QUESTIONS[i].pillar, answer: QUESTIONS[i].options[a].label, score: QUESTIONS[i].options[a].score };
      }),
      source: (CONFIG.source || (location.hostname + location.pathname)),
      timestamp: new Date().toISOString()
    };
    if (WEBHOOK) {
      // keepalive lets the request survive page navigation (the redirect below would otherwise kill it before it fires)
      fetch(WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true })
        .catch(function (err) { console.error('PMPI webhook error:', err); });
    } else {
      console.log('PMPI lead (no webhook configured):', payload);
    }
    try { localStorage.setItem(STORAGE_KEY, 'submitted'); } catch (e2) {}
    if (REDIRECT) { window.location.href = REDIRECT; return false; }
    showScreen('thanks');
    return false;
  }
  function maybeAutoOpen() {
    try { if (localStorage.getItem(STORAGE_KEY)) return; } catch (e) {}
    setTimeout(function () {
      if (!$('#pmpi-modal').classList.contains('open')) { showScreen('intro'); openModal(); }
    }, DELAY_MS);
  }
  function setupExitIntent() {
    if (window.matchMedia('(max-width: 768px)').matches) return;
    try { if (localStorage.getItem(STORAGE_KEY)) return; } catch (e) {}
    document.addEventListener('mouseout', function (e) {
      if (e.clientY < 0 && !$('#pmpi-modal').classList.contains('open')) { showScreen('intro'); openModal(); }
    });
  }

  window.PMPI = {
    open: function () { showScreen('intro'); openModal(); },
    close: closeModal,
    dismiss: dismiss,
    start: start,
    next: next,
    back: back,
    submit: submit
  };

  if (AUTO_OPEN) { maybeAutoOpen(); setupExitIntent(); }
})();
