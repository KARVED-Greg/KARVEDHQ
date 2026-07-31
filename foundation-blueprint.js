/* ============================================================
   KARVED Foundation Blueprint — v1
   Email gate → HL webhook → reveal all 4 assets
   ============================================================ */
(function () {
  'use strict';

  var WEBHOOK = 'https://services.leadconnectorhq.com/hooks/34aVjIvtkAMGeXk0MMmq/webhook-trigger/1Ti3CB5zPtEhIam7FyJZ';

  var form = document.getElementById('fb-form');
  var gateSection = document.getElementById('gate-section');
  var revealSection = document.getElementById('reveal-section');
  var helloName = document.getElementById('hello-name');
  var submitBtn = form.querySelector('button[type="submit"]');

  var STORAGE_KEY = 'karved_fb_unlocked';

  // If already unlocked in this browser, skip the gate on return visits
  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      var data = JSON.parse(saved);
      unlock(data.first_name || 'mate');
    }
  } catch (e) { /* ignore */ }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;

    var payload = {
      email: form.email.value.trim(),
      first_name: form.first_name.value.trim(),
      source: 'foundation_blueprint',
      tag: 'foundation_blueprint',
      submitted_at: new Date().toISOString(),
      page: window.location.href
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function (err) {
      console.error('Foundation Blueprint webhook error:', err);
    });

    // Remember locally so they don't see the gate again on return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        email: payload.email,
        first_name: payload.first_name
      }));
    } catch (e) { /* ignore */ }

    unlock(payload.first_name || 'mate');
  });

  function unlock(name) {
    helloName.textContent = name;
    gateSection.classList.add('hidden');
    revealSection.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

})();
