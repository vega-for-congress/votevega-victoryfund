/**
 * Save the Bronx Moneybomb — Interactive Elements
 *
 * Supports two modes:
 *   'demo'  — simulated data (for development / preview)
 *   'live'  — pulls real Stripe data from the donation-widget API
 *
 * Toggle the MODE value below to switch.
 */

(function () {
  'use strict';

  // ===========================================
  // CONFIGURATION — edit these for the real event
  // ===========================================
  var CONFIG = {
    // 'demo' = simulated data, 'live' = real Stripe data via API
    mode: 'live',

    // API base URL (only used in live mode)
    apiBase: 'https://secure.votevega.nyc/api/moneybomb',

    // How often to poll the API in live mode (ms)
    pollInterval: 30000,

    // ---- Single source of truth for the fundraiser window ----
    // In live mode these are sent as query params to the API.
    // In demo mode they drive the local simulation.
    countdownStart: '2026-04-01T00:00:00Z',
    countdownEnd: '2026-04-17T00:00:00Z',
    goal: 25000,

    // Demo-only: starting simulated values
    startingAmount: 18742,
    startingDonors: 314
  };

  // ===========================================
  // SIMULATED DATA (remove in production)
  // ===========================================
  var NAMES = [
    'Maria G.', 'Carlos R.', 'Anonymous', 'David L.', 'Rosa M.',
    'James T.', 'Sofia P.', 'Michael B.', 'Ana C.', 'Robert K.',
    'Linda S.', 'Jose H.', 'Patricia F.', 'Juan D.', 'Carmen V.',
    'William A.', 'Michelle N.', 'Anthony Z.', 'Elizabeth W.', 'Daniel O.',
    'Bronx Voter', 'NY-15 Resident', 'A Friend', 'Concerned Citizen'
  ];

  var MESSAGES = [
    'The Bronx needs a fighter, not a sellout.',
    'Go get them, Jose!',
    'Finally, someone who speaks for us.',
    'Healthcare is a right!',
    'End the wars. Build the Bronx.',
    'Proud to support a real independent.',
    'Small donation but big heart. Let\'s go!',
    'From the Bronx with love.',
    'We need real representation.',
    'No more corporate puppets.',
    'Keep fighting for us!',
    'The youth are watching.',
    'Peace through development, not destruction.',
    'Reindustrialize America!',
    'This is what democracy looks like.',
    '',  // some donations without messages
    '',
    ''
  ];

  var LOCATIONS = [
    'Bronx, NY', 'Manhattan, NY', 'Brooklyn, NY', 'Queens, NY',
    'Yonkers, NY', 'New Rochelle, NY', 'Newark, NJ', 'Philadelphia, PA',
    'Chicago, IL', 'Los Angeles, CA', 'Houston, TX', 'Miami, FL',
    'Washington, DC', 'Boston, MA', 'Atlanta, GA', 'Detroit, MI'
  ];

  // ===========================================
  // COUNTDOWN TIMER
  // ===========================================
  function updateCountdown() {
    var now = new Date().getTime();
    var end = CONFIG.countdownEnd instanceof Date
      ? CONFIG.countdownEnd
      : new Date(CONFIG.countdownEnd);
    var distance = end.getTime() - now;

    if (distance < 0) {
      setCountdownValues(0, 0, 0, 0);
      return;
    }

    var days = Math.floor(distance / (1000 * 60 * 60 * 24));
    var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    var seconds = Math.floor((distance % (1000 * 60)) / 1000);

    setCountdownValues(days, hours, minutes, seconds);

    // Update sticky bar timer
    var stickyTimer = document.getElementById('sticky-timer');
    if (stickyTimer) {
      stickyTimer.textContent =
        pad(days) + 'd ' + pad(hours) + 'h ' + pad(minutes) + 'm ' + pad(seconds) + 's';
    }
  }

  function setCountdownValues(d, h, m, s) {
    // Hero countdown
    setText('cd-days', pad(d));
    setText('cd-hours', pad(h));
    setText('cd-minutes', pad(m));
    setText('cd-seconds', pad(s));
    // Bottom countdown
    setText('cd2-days', pad(d));
    setText('cd2-hours', pad(h));
    setText('cd2-minutes', pad(m));
    setText('cd2-seconds', pad(s));
  }

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function setText(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  // ===========================================
  // THERMOMETER
  // ===========================================
  var currentAmount = CONFIG.mode === 'live' ? 0 : CONFIG.startingAmount;
  var currentDonors = CONFIG.mode === 'live' ? 0 : CONFIG.startingDonors;

  function updateThermometer() {
    var pct = Math.min((currentAmount / CONFIG.goal) * 100, 100);

    setText('thermo-raised', '$' + formatNumber(currentAmount));
    setText('thermo-goal', '$' + formatNumber(CONFIG.goal));
    setText('thermo-donors', formatNumber(currentDonors));
    setText('thermo-pct', Math.round(pct));

    var fill = document.getElementById('thermo-fill');
    if (fill) fill.style.width = pct + '%';

    // === NEW: Dynamically update milestone labels so they always match CONFIG.goal ===
    var milestones = document.querySelectorAll('.mb-thermo__milestone');
    var milestonePcts = [0.25, 0.5, 0.75];
    for (var i = 0; i < milestones.length && i < milestonePcts.length; i++) {
      var amount = Math.round(CONFIG.goal * milestonePcts[i]);
      milestones[i].setAttribute('data-label', '$' + formatNumber(amount));
    }
  }

  function formatNumber(n) {
    return n.toLocaleString('en-US');
  }

  // ===========================================
  // DONATION FEED (simulated)
  // ===========================================
  function randomDonation() {
    var amounts = [5, 10, 15, 20, 25, 27, 35, 50, 75, 100, 150, 200, 250, 500];
    var amount = amounts[Math.floor(Math.random() * amounts.length)];
    var name = NAMES[Math.floor(Math.random() * NAMES.length)];
    var message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    var location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];
    var minutesAgo = Math.floor(Math.random() * 15);

    return {
      name: name,
      amount: amount,
      message: message,
      location: location,
      time: minutesAgo === 0 ? 'Just now' : minutesAgo + 'm ago'
    };
  }

  function createMiniFeedItem(donation) {
    var item = document.createElement('div');
    item.className = 'mb-minifeed__item';
    item.innerHTML =
      '<span class="mb-minifeed__name">' + escapeHtml(donation.name) + '</span>' +
      '<span class="mb-minifeed__amount">$' + donation.amount + '</span>';
    return item;
  }

  function createFeedItem(donation) {
    var item = document.createElement('div');
    item.className = 'mb-feed__item';
    var initials = donation.name.split(' ').map(function (w) { return w[0]; }).join('').toUpperCase();
    var messageHtml = donation.message
      ? '<div class="mb-feed__message">' + escapeHtml(donation.message) + '</div>'
      : '';

    var timeStr = donation.time && !donation.time.match(/d\s*ago$/)
      ? ' &middot; ' + escapeHtml(donation.time)
      : '';
    var locationStr = donation.location ? escapeHtml(donation.location) : '';

    item.innerHTML =
      '<div class="mb-feed__avatar">' + initials + '</div>' +
      '<div class="mb-feed__content">' +
        '<div class="mb-feed__top">' +
          '<span class="mb-feed__name">' + escapeHtml(donation.name) + '</span>' +
          '<span class="mb-feed__amount">$' + donation.amount + '</span>' +
        '</div>' +
        messageHtml +
        (locationStr || timeStr ? '<div class="mb-feed__time">' + locationStr + timeStr + '</div>' : '') +
      '</div>';
    return item;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // Seed initial donations
  function seedFeeds() {
    var miniFeedList = document.getElementById('mini-feed-list');
    var donationFeed = document.getElementById('donation-feed');

    // Seed 4 mini-feed items
    for (var i = 0; i < 4; i++) {
      var d = randomDonation();
      if (miniFeedList) miniFeedList.appendChild(createMiniFeedItem(d));
    }

    // Seed 10 main feed items
    for (var j = 0; j < 10; j++) {
      var d2 = randomDonation();
      if (donationFeed) donationFeed.appendChild(createFeedItem(d2));
    }
  }

  // Add a new simulated donation periodically
  function simulateNewDonation() {
    var donation = randomDonation();
    donation.time = 'Just now';

    // Update totals
    currentAmount += donation.amount;
    currentDonors += 1;
    updateThermometer();

    // Mini feed: prepend and cap at 4
    var miniFeedList = document.getElementById('mini-feed-list');
    if (miniFeedList) {
      var newMini = createMiniFeedItem(donation);
      miniFeedList.insertBefore(newMini, miniFeedList.firstChild);
      while (miniFeedList.children.length > 4) {
        miniFeedList.removeChild(miniFeedList.lastChild);
      }
    }

    // Main feed: prepend
    var donationFeed = document.getElementById('donation-feed');
    if (donationFeed) {
      var newFeed = createFeedItem(donation);
      donationFeed.insertBefore(newFeed, donationFeed.firstChild);
      // Cap at 30 items
      while (donationFeed.children.length > 30) {
        donationFeed.removeChild(donationFeed.lastChild);
      }
    }
  }

  // ===========================================
  // STICKY BAR
  // ===========================================
  function initStickyBar() {
    var stickyBar = document.getElementById('sticky-bar');
    var hero = document.querySelector('.mb-hero');
    if (!stickyBar || !hero) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          stickyBar.classList.remove('visible');
        } else {
          stickyBar.classList.add('visible');
        }
      });
    }, { threshold: 0.1 });

    observer.observe(hero);
  }

  // ===========================================
  // COPY LINK BUTTON
  // ===========================================
  function initCopyLink() {
    var btn = document.getElementById('copy-link-btn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var url = btn.getAttribute('data-url') || window.location.href;
      navigator.clipboard.writeText(url).then(function () {
        btn.classList.add('copied');
        var icon = btn.querySelector('i');
        var originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(function () {
          btn.innerHTML = originalHtml;
          btn.classList.remove('copied');
        }, 2000);
      });
    });
  }

  // ===========================================
  // LOADING STATE (live mode only)
  // ===========================================

  function showLoadingState() {
    // Thermometer: show placeholder text
    setText('thermo-raised', '...');
    setText('thermo-donors', '...');
    setText('thermo-pct', '...');

    // Mini feed: show skeleton items
    var miniFeedList = document.getElementById('mini-feed-list');
    if (miniFeedList) {
      miniFeedList.innerHTML = '';
      for (var i = 0; i < 4; i++) {
        var skeleton = document.createElement('div');
        skeleton.className = 'mb-minifeed__item mb-skeleton';
        skeleton.innerHTML =
          '<span class="mb-skeleton__bar" style="width:60%"></span>' +
          '<span class="mb-skeleton__bar" style="width:20%"></span>';
        miniFeedList.appendChild(skeleton);
      }
    }

    // Main feed: show skeleton items
    var donationFeed = document.getElementById('donation-feed');
    if (donationFeed) {
      donationFeed.innerHTML = '';
      for (var j = 0; j < 5; j++) {
        var sk = document.createElement('div');
        sk.className = 'mb-feed__item mb-skeleton';
        sk.innerHTML =
          '<div class="mb-feed__avatar mb-skeleton__circle"></div>' +
          '<div class="mb-feed__content">' +
            '<div class="mb-skeleton__bar" style="width:45%;margin-bottom:8px"></div>' +
            '<div class="mb-skeleton__bar" style="width:80%"></div>' +
          '</div>';
        donationFeed.appendChild(sk);
      }
    }
  }

  function hideLoadingState() {
    // Skeletons are replaced when renderLiveDonations clears innerHTML.
    // Just remove any leftover skeleton class if feeds were empty.
    var skeletons = document.querySelectorAll('.mb-skeleton');
    for (var i = 0; i < skeletons.length; i++) {
      skeletons[i].parentNode.removeChild(skeletons[i]);
    }
  }

  // ===========================================
  // LIVE MODE — fetch real data from API
  // ===========================================

  // Track donation IDs we've already rendered so we can detect new ones
  var knownDonationKeys = {};

  /**
   * Fetch moneybomb data from the API and update all UI.
   * Returns a promise.
   */
  function buildApiUrl() {
    return CONFIG.apiBase +
      '?start=' + encodeURIComponent(CONFIG.countdownStart) +
      '&end=' + encodeURIComponent(CONFIG.countdownEnd) +
      '&goal=' + CONFIG.goal;
  }

  function fetchLiveData() {
    return fetch(buildApiUrl())
      .then(function (res) {
        if (!res.ok) throw new Error('API returned ' + res.status);
        return res.json();
      })
      .then(function (data) {
        // Update countdown end and goal from server
        if (data.countdownEnd) {
          CONFIG.countdownEnd = new Date(data.countdownEnd);
        }
        if (data.goal) {
          CONFIG.goal = data.goal;
        }

        // Update thermometer
        currentAmount = data.raised || 0;
        currentDonors = data.donors || 0;
        updateThermometer();

        // Update feeds with real donations
        if (data.recentDonations && data.recentDonations.length > 0) {
          renderLiveDonations(data.recentDonations);
        }
      })
      .catch(function (err) {
        console.error('Moneybomb API error:', err.message);
      });
  }

  /**
   * Render live donations into the mini-feed and main feed.
   * On first call, replaces all content. On subsequent calls,
   * prepends only new donations.
   */
  function renderLiveDonations(donations) {
    var miniFeedList = document.getElementById('mini-feed-list');
    var donationFeed = document.getElementById('donation-feed');
    var isFirstLoad = Object.keys(knownDonationKeys).length === 0;

    if (isFirstLoad) {
      // First load: clear placeholders and render all
      if (miniFeedList) miniFeedList.innerHTML = '';
      if (donationFeed) donationFeed.innerHTML = '';

      // Mini feed: show first 4
      donations.slice(0, 4).forEach(function (d) {
        if (miniFeedList) miniFeedList.appendChild(createMiniFeedItem(d));
      });

      // Main feed: show all
      donations.forEach(function (d) {
        if (donationFeed) donationFeed.appendChild(createFeedItem(d));
        knownDonationKeys[donationKey(d)] = true;
      });
    } else {
      // Subsequent polls: prepend only new donations
      for (var i = donations.length - 1; i >= 0; i--) {
        var d = donations[i];
        var key = donationKey(d);
        if (knownDonationKeys[key]) continue;
        knownDonationKeys[key] = true;

        // Prepend to mini feed
        if (miniFeedList) {
          miniFeedList.insertBefore(createMiniFeedItem(d), miniFeedList.firstChild);
          while (miniFeedList.children.length > 4) {
            miniFeedList.removeChild(miniFeedList.lastChild);
          }
        }

        // Prepend to main feed
        if (donationFeed) {
          donationFeed.insertBefore(createFeedItem(d), donationFeed.firstChild);
          while (donationFeed.children.length > 30) {
            donationFeed.removeChild(donationFeed.lastChild);
          }
        }
      }
    }
  }

  /** Simple key to deduplicate donations between polls. */
  function donationKey(d) {
    return d.name + ':' + d.amount + ':' + d.time;
  }

  // ===========================================
  // INIT
  // ===========================================
  document.addEventListener('DOMContentLoaded', function () {
    // Countdown — update every second
    updateCountdown();
    setInterval(updateCountdown, 1000);

    // Thermometer — initial render
    updateThermometer();

    if (CONFIG.mode === 'live') {
      // Live mode: show loading state, fetch, then poll
      showLoadingState();
      fetchLiveData().then(function () {
        hideLoadingState();
        setInterval(fetchLiveData, CONFIG.pollInterval);
      });
    } else {
      // Demo mode: simulated feeds
      seedFeeds();

      function scheduleNext() {
        var delay = 5000 + Math.random() * 10000;
        setTimeout(function () {
          simulateNewDonation();
          scheduleNext();
        }, delay);
      }
      scheduleNext();
    }

    // Sticky bar
    initStickyBar();

    // Copy link
    initCopyLink();
  });
})();
