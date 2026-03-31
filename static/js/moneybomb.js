/**
 * Save the Bronx Moneybomb — Interactive Elements
 *
 * Prototype: all data is simulated. In production, replace the
 * SIMULATED_DATA section with real API calls (e.g. ActBlue webhooks,
 * a server-sent events endpoint, etc.).
 */

(function () {
  'use strict';

  // ===========================================
  // CONFIGURATION (edit these for the real event)
  // ===========================================
  var CONFIG = {
    // Countdown target: set to 48 hours from now for the prototype.
    // Replace with a real ISO date string for production.
    countdownEnd: new Date(Date.now() + 48 * 60 * 60 * 1000),

    // Fundraising
    goal: 50000,
    // Simulated starting amount (prototype only)
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
    var distance = CONFIG.countdownEnd.getTime() - now;

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
  var currentAmount = CONFIG.startingAmount;
  var currentDonors = CONFIG.startingDonors;

  function updateThermometer() {
    var pct = Math.min((currentAmount / CONFIG.goal) * 100, 100);

    setText('thermo-raised', '$' + formatNumber(currentAmount));
    setText('thermo-goal', '$' + formatNumber(CONFIG.goal));
    setText('thermo-donors', formatNumber(currentDonors));
    setText('thermo-pct', Math.round(pct));

    var fill = document.getElementById('thermo-fill');
    if (fill) fill.style.width = pct + '%';
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

    item.innerHTML =
      '<div class="mb-feed__avatar">' + initials + '</div>' +
      '<div class="mb-feed__content">' +
        '<div class="mb-feed__top">' +
          '<span class="mb-feed__name">' + escapeHtml(donation.name) + '</span>' +
          '<span class="mb-feed__amount">$' + donation.amount + '</span>' +
        '</div>' +
        messageHtml +
        '<div class="mb-feed__time">' + escapeHtml(donation.location) + ' &middot; ' + donation.time + '</div>' +
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
  // INIT
  // ===========================================
  document.addEventListener('DOMContentLoaded', function () {
    // Countdown — update every second
    updateCountdown();
    setInterval(updateCountdown, 1000);

    // Thermometer — initial render
    updateThermometer();

    // Seed feeds
    seedFeeds();

    // Simulate new donations every 5–15 seconds
    function scheduleNext() {
      var delay = 5000 + Math.random() * 10000;
      setTimeout(function () {
        simulateNewDonation();
        scheduleNext();
      }, delay);
    }
    scheduleNext();

    // Sticky bar
    initStickyBar();

    // Copy link
    initCopyLink();
  });
})();
