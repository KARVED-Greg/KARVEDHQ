/* ============================================================
   KARVED Cut Roadmap — v1
   - Mifflin-St Jeor BMR
   - TDEE = BMR × activity multiplier
   - Cutting target = TDEE − (7700 × pace_kg_per_week / 7)
   - KARVED macros: 2.4g/kg protein, 0.5g/kg fat, carbs fill remainder
   - Trajectory: linear weekly weight target from current → goal
   ============================================================ */
(function () {
  'use strict';

  var KCAL_PER_KG_FAT   = 7700;   // roughly — good enough for planning
  var PROTEIN_G_PER_KG  = 2.4;    // KARVED cut ratio
  var FAT_G_PER_KG      = 0.5;    // KARVED cut ratio
  var KCAL_PER_G_PROTEIN = 4;
  var KCAL_PER_G_CARB    = 4;
  var KCAL_PER_G_FAT     = 9;

  var form = document.getElementById('roadmap-form');
  var formSection = document.getElementById('form-section');
  var resultsSection = document.getElementById('results-section');
  var resetBtn = document.getElementById('reset-btn');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;
    var data = readForm();
    var results = compute(data);
    render(results);
    formSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  resetBtn.addEventListener('click', function () {
    resultsSection.classList.add('hidden');
    formSection.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ------------------------------------------------------------
  function readForm() {
    return {
      age:        parseInt(form.age.value, 10),
      sex:        form.sex.value,
      height:     parseFloat(form.height.value),
      weight:     parseFloat(form.weight.value),
      activity:   parseFloat(form.activity.value),
      goalWeight: parseFloat(form.goalWeight.value),
      pace:       parseFloat(form.pace.value)   // kg/week
    };
  }

  // ------------------------------------------------------------
  function compute(d) {
    // Mifflin-St Jeor
    var base = (10 * d.weight) + (6.25 * d.height) - (5 * d.age);
    var bmr = d.sex === 'male' ? base + 5 : base - 161;

    var tdee = bmr * d.activity;

    // Cutting deficit — pace is kg/week; convert to daily kcal deficit
    var dailyDeficit = (KCAL_PER_KG_FAT * d.pace) / 7;

    var kgToLose = Math.max(d.weight - d.goalWeight, 0);
    var isCutting = kgToLose > 0.1;

    var target = isCutting ? tdee - dailyDeficit : tdee;

    // Macros — based on CURRENT weight (protects lean mass in a deficit)
    var proteinG = d.weight * PROTEIN_G_PER_KG;
    var fatG     = d.weight * FAT_G_PER_KG;
    var proteinKcal = proteinG * KCAL_PER_G_PROTEIN;
    var fatKcal     = fatG * KCAL_PER_G_FAT;
    var carbsKcal   = Math.max(target - proteinKcal - fatKcal, 0);
    var carbsG      = carbsKcal / KCAL_PER_G_CARB;

    // Timeline
    var weeks = isCutting ? Math.ceil(kgToLose / d.pace) : 0;
    var finishDate = addWeeks(new Date(), weeks);

    // Trajectory — array of {week, weight}
    var trajectory = [];
    for (var w = 0; w <= weeks; w++) {
      var weightAtWeek = d.weight - (d.pace * w);
      if (weightAtWeek < d.goalWeight) weightAtWeek = d.goalWeight;
      trajectory.push({ week: w, weight: weightAtWeek });
    }

    // Milestones — 4 checkpoints roughly evenly spaced
    var milestones = [];
    if (weeks >= 4) {
      var quartileWeeks = [Math.round(weeks * 0.25), Math.round(weeks * 0.5), Math.round(weeks * 0.75), weeks];
      quartileWeeks.forEach(function (wk, i) {
        milestones.push({
          label: 'Week ' + wk,
          date: addWeeks(new Date(), wk),
          weight: Math.max(d.weight - (d.pace * wk), d.goalWeight),
          note: [
            'Fat adaptation — energy dips normal. Hold the line.',
            'Halfway point. Re-check bodyweight trend line, not the daily scale.',
            'Grind zone. Sleep + protein carry you through.',
            'Goal weight. Time to reverse diet — do NOT stay in a deficit forever.'
          ][i]
        });
      });
    } else if (weeks > 0) {
      // Short cut — just show finish
      milestones.push({
        label: 'Week ' + weeks,
        date: finishDate,
        weight: d.goalWeight,
        note: 'Short cut — stay dialled on protein and sleep. Reverse out after.'
      });
    }

    return {
      inputs: d,
      isCutting: isCutting,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target: Math.round(target),
      deficit: Math.round(dailyDeficit),
      protein: { g: Math.round(proteinG), kcal: Math.round(proteinKcal) },
      fat:     { g: Math.round(fatG),     kcal: Math.round(fatKcal) },
      carbs:   { g: Math.round(carbsG),   kcal: Math.round(carbsKcal) },
      weeks: weeks,
      finishDate: finishDate,
      trajectory: trajectory,
      milestones: milestones
    };
  }

  // ------------------------------------------------------------
  function render(r) {
    document.getElementById('out-goal-weight').textContent = r.inputs.goalWeight;
    document.getElementById('out-finish-date').textContent = formatDate(r.finishDate);

    document.getElementById('out-bmr').textContent = r.bmr.toLocaleString();
    document.getElementById('out-tdee').textContent = r.tdee.toLocaleString();
    document.getElementById('out-target').textContent = r.target.toLocaleString();
    document.getElementById('out-deficit').textContent = r.deficit.toLocaleString();

    document.getElementById('out-protein-g').textContent = r.protein.g;
    document.getElementById('out-protein-kcal').textContent = r.protein.kcal.toLocaleString();
    document.getElementById('out-fat-g').textContent = r.fat.g;
    document.getElementById('out-fat-kcal').textContent = r.fat.kcal.toLocaleString();
    document.getElementById('out-carbs-g').textContent = r.carbs.g;
    document.getElementById('out-carbs-kcal').textContent = r.carbs.kcal.toLocaleString();

    document.getElementById('out-weeks-label').textContent = r.weeks;

    renderChart(r);
    renderMilestones(r);

    // Not cutting? Adjust headline
    if (!r.isCutting) {
      document.getElementById('results-headline').innerHTML =
        'You\'re already at (or under) your goal. Maintain at <span>' + r.target.toLocaleString() + '</span> kcal/day.';
    }
  }

  // ------------------------------------------------------------
  function renderChart(r) {
    var container = document.getElementById('chart-container');
    container.innerHTML = '';

    if (r.trajectory.length < 2) {
      container.innerHTML = '<p style="opacity:0.6;font-size:14px;text-align:center;padding:20px;">No trajectory to chart — you\'re already at goal.</p>';
      return;
    }

    var W = 640, H = 260;
    var padL = 48, padR = 20, padT = 20, padB = 40;
    var innerW = W - padL - padR;
    var innerH = H - padT - padB;

    var maxW = r.trajectory[0].weight;
    var minW = r.trajectory[r.trajectory.length - 1].weight;
    var range = Math.max(maxW - minW, 1);

    // Y-axis: 5 ticks
    var yTicks = 5;
    var yTickValues = [];
    for (var i = 0; i <= yTicks; i++) {
      yTickValues.push(minW + (range * i / yTicks));
    }

    function xFor(week) {
      return padL + (week / (r.trajectory.length - 1)) * innerW;
    }
    function yFor(weight) {
      return padT + ((maxW - weight) / range) * innerH;
    }

    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">';

    // Grid + Y labels
    yTickValues.forEach(function (v) {
      var y = yFor(v);
      svg += '<line x1="' + padL + '" y1="' + y + '" x2="' + (W - padR) + '" y2="' + y + '" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>';
      svg += '<text x="' + (padL - 8) + '" y="' + (y + 4) + '" fill="rgba(255,255,255,0.55)" font-size="11" text-anchor="end" font-family="Montserrat,sans-serif">' + v.toFixed(1) + '</text>';
    });

    // Line path
    var pathD = 'M ';
    r.trajectory.forEach(function (pt, i) {
      pathD += xFor(pt.week) + ',' + yFor(pt.weight) + (i < r.trajectory.length - 1 ? ' L ' : '');
    });
    svg += '<path d="' + pathD + '" fill="none" stroke="#C4A44A" stroke-width="2.5" stroke-linejoin="round"/>';

    // Points
    r.trajectory.forEach(function (pt) {
      svg += '<circle cx="' + xFor(pt.week) + '" cy="' + yFor(pt.weight) + '" r="3" fill="#C4A44A"/>';
    });

    // X labels — start, mid, end
    var xLabels = [0, Math.floor(r.trajectory.length / 2), r.trajectory.length - 1];
    xLabels.forEach(function (i) {
      var pt = r.trajectory[i];
      svg += '<text x="' + xFor(pt.week) + '" y="' + (H - padB + 20) + '" fill="rgba(255,255,255,0.55)" font-size="11" text-anchor="middle" font-family="Montserrat,sans-serif">Wk ' + pt.week + '</text>';
    });

    // Axis labels
    svg += '<text x="' + (padL + innerW / 2) + '" y="' + (H - 5) + '" fill="rgba(255,255,255,0.55)" font-size="11" text-anchor="middle" font-family="Montserrat,sans-serif">Weeks →</text>';
    svg += '<text x="15" y="' + (padT + innerH / 2) + '" fill="rgba(255,255,255,0.55)" font-size="11" text-anchor="middle" font-family="Montserrat,sans-serif" transform="rotate(-90 15 ' + (padT + innerH / 2) + ')">Weight (kg)</text>';

    svg += '</svg>';
    container.innerHTML = svg;
  }

  // ------------------------------------------------------------
  function renderMilestones(r) {
    var el = document.getElementById('milestones');
    el.innerHTML = '';
    if (r.milestones.length === 0) {
      el.innerHTML = '<p style="opacity:0.6;font-size:14px;">Maintenance phase — no cut milestones needed.</p>';
      return;
    }
    r.milestones.forEach(function (m) {
      el.insertAdjacentHTML('beforeend',
        '<div class="milestone">' +
          '<div class="milestone-week">' + m.label + '</div>' +
          '<div class="milestone-date">' + formatDate(m.date) + '</div>' +
          '<div class="milestone-weight">' + m.weight.toFixed(1) + ' kg</div>' +
          '<div class="milestone-note">' + m.note + '</div>' +
        '</div>'
      );
    });
  }

  // ------------------------------------------------------------
  function addWeeks(date, weeks) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + weeks * 7);
    return d;
  }
  function formatDate(d) {
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  }

})();
