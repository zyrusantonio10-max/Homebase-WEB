/* ==========================================================================
   HOMEBASE — STUDENT DASHBOARD MODULE (dashboard.js)
   
   Handles:
   1. Ariante Dormitory room data (config-driven, not hard-coded)
   2. Preference collection from the form
   3. Suitability scoring algorithm (weighted multi-criteria)
   4. True monthly cost calculation
   5. Dynamic room card rendering with score rings
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

  // =========================================================================
  // 1. ARIANTE DORMITORY ROOM DATA
  //    This is the dataset the owner/manager would edit.
  //    Nothing is hard-coded to Ariante — swap this object for another dorm.
  // =========================================================================

  const DORM_CONFIG = {
    name: "Ariante Dormitory",
    address: "Zone 6, Diversion Road, Naga City",
    contactPhone: "0917-123-4567",
    contactEmail: "ariante.dorm@email.com",
  };

  const ROOMS = [
    {
      id: "R101",
      name: "Room 101",
      floor: 1,
      type: "solo",
      typeLabel: "Solo — Private Room",
      capacity: 1,
      status: "available",
      baseRent: 4500,
      electricity: 800,
      water: 200,
      wifi: 500,
      deposit: 4500,
      amenities: ["aircon", "ownCR", "wifi", "desk", "nearGate"],
      description: "Ground floor solo room with private bathroom, air-conditioning, and study desk. Near the main gate for easy access.",
    },
    {
      id: "R102",
      name: "Room 102",
      floor: 1,
      type: "duo",
      typeLabel: "Duo — 2-Person Shared",
      capacity: 2,
      status: "available",
      baseRent: 3200,
      electricity: 600,
      water: 150,
      wifi: 300,
      deposit: 3200,
      amenities: ["wifi", "desk", "nearGate"],
      description: "Ground floor shared room for 2 tenants. Fan-cooled with shared CR. Near the gate.",
    },
    {
      id: "R201",
      name: "Room 201",
      floor: 2,
      type: "solo",
      typeLabel: "Solo — Private Room",
      capacity: 1,
      status: "available",
      baseRent: 5000,
      electricity: 900,
      water: 200,
      wifi: 500,
      deposit: 5000,
      amenities: ["aircon", "ownCR", "wifi", "desk"],
      description: "2nd floor private room with AC, own CR, and study desk. Quieter than ground floor rooms.",
    },
    {
      id: "R202",
      name: "Room 202",
      floor: 2,
      type: "duo",
      typeLabel: "Duo — 2-Person Shared",
      capacity: 2,
      status: "available",
      baseRent: 3500,
      electricity: 700,
      water: 150,
      wifi: 300,
      deposit: 3500,
      amenities: ["aircon", "wifi"],
      description: "2nd floor air-conditioned shared room for 2. Shared CR down the hall. Wi-Fi included.",
    },
    {
      id: "R203",
      name: "Room 203",
      floor: 2,
      type: "quad",
      typeLabel: "Bedspace — 4-Person Shared",
      capacity: 4,
      status: "available",
      baseRent: 2000,
      electricity: 400,
      water: 100,
      wifi: 250,
      deposit: 2000,
      amenities: ["wifi"],
      description: "Budget-friendly bedspace on the 2nd floor. Shared CR and fan-cooled. Wi-Fi included.",
    },
    {
      id: "R301",
      name: "Room 301",
      floor: 3,
      type: "solo",
      typeLabel: "Solo — Private Room",
      capacity: 1,
      status: "occupied",
      baseRent: 5500,
      electricity: 950,
      water: 200,
      wifi: 500,
      deposit: 5500,
      amenities: ["aircon", "ownCR", "wifi", "desk"],
      description: "Top floor premium solo room with AC, private CR, study desk. The quietest room in the building.",
    },
    {
      id: "R302",
      name: "Room 302",
      floor: 3,
      type: "duo",
      typeLabel: "Duo — 2-Person Shared",
      capacity: 2,
      status: "available",
      baseRent: 3800,
      electricity: 750,
      water: 150,
      wifi: 300,
      deposit: 3800,
      amenities: ["aircon", "wifi", "desk"],
      description: "Top floor air-con shared room for 2. Includes study desks. Shared CR. Quiet area.",
    },
    {
      id: "R303",
      name: "Room 303",
      floor: 3,
      type: "quad",
      typeLabel: "Bedspace — 4-Person Shared",
      capacity: 4,
      status: "available",
      baseRent: 2200,
      electricity: 450,
      water: 100,
      wifi: 250,
      deposit: 2200,
      amenities: ["wifi", "desk"],
      description: "Top floor bedspace with study desks provided. Shared CR, fan-cooled. Best value for quiet study.",
    },
  ];

  // =========================================================================
  // 2. DOM REFERENCES
  // =========================================================================

  const prefForm = document.getElementById("prefForm");
  const budgetInput = document.getElementById("budgetInput");
  const roomTypeSelect = document.getElementById("roomTypeSelect");
  const floorSelect = document.getElementById("floorSelect");
  const amenityToggles = document.querySelectorAll(".amen-toggle");
  const roomResults = document.getElementById("roomResults");
  const emptyState = document.getElementById("emptyState");
  const resultsHeader = document.getElementById("resultsHeader");
  const resultsTitle = document.getElementById("resultsTitle");

  // =========================================================================
  // 3. AMENITY TOGGLE INTERACTION
  // =========================================================================

  amenityToggles.forEach((toggle) => {
    toggle.addEventListener("click", (e) => {
      // Don't toggle when clicking the checkbox directly (it handles itself)
      const checkbox = toggle.querySelector('input[type="checkbox"]');
      if (e.target === checkbox) return;

      checkbox.checked = !checkbox.checked;
      toggle.classList.toggle("checked", checkbox.checked);
    });

    // Also handle direct checkbox change
    const checkbox = toggle.querySelector('input[type="checkbox"]');
    checkbox.addEventListener("change", () => {
      toggle.classList.toggle("checked", checkbox.checked);
    });
  });

  // =========================================================================
  // 4. SUITABILITY SCORING ALGORITHM
  //    Weights can be tuned — this is the core matching logic.
  // =========================================================================

  const WEIGHTS = {
    budget: 35,      // Does the true monthly cost fit the student's budget?
    roomType: 25,    // Does the room type match what they want?
    floor: 15,       // Does the floor match their preference?
    amenities: 25,   // How many of their must-have amenities does this room have?
  };

  function getTrueMonthlyCost(room) {
    return room.baseRent + room.electricity + room.water + room.wifi;
  }

  function scoreRoom(room, prefs) {
    let score = 0;

    // --- Budget score (35%) ---
    const trueCost = getTrueMonthlyCost(room);
    if (prefs.budget > 0) {
      if (trueCost <= prefs.budget) {
        // Under budget is great; closer to budget = more value extracted
        const ratio = trueCost / prefs.budget;
        score += WEIGHTS.budget * (0.7 + 0.3 * ratio); // 70–100%
      } else {
        // Over budget: penalize proportionally, but don't go below 0
        const overRatio = Math.min((trueCost - prefs.budget) / prefs.budget, 1);
        score += WEIGHTS.budget * Math.max(0, 1 - overRatio * 2);
      }
    } else {
      score += WEIGHTS.budget * 0.5; // No budget set, neutral
    }

    // --- Room type score (25%) ---
    if (prefs.roomType === "any" || prefs.roomType === room.type) {
      score += WEIGHTS.roomType;
    } else {
      score += WEIGHTS.roomType * 0.2; // Slight partial credit
    }

    // --- Floor score (15%) ---
    if (prefs.floor === "any" || parseInt(prefs.floor) === room.floor) {
      score += WEIGHTS.floor;
    } else {
      const diff = Math.abs(parseInt(prefs.floor || 0) - room.floor);
      score += WEIGHTS.floor * Math.max(0, 1 - diff * 0.3);
    }

    // --- Amenity score (25%) ---
    if (prefs.amenities.length === 0) {
      score += WEIGHTS.amenities; // No preferences = full marks
    } else {
      const matched = prefs.amenities.filter((a) => room.amenities.includes(a)).length;
      score += WEIGHTS.amenities * (matched / prefs.amenities.length);
    }

    return Math.round(Math.min(score, 100));
  }

  // =========================================================================
  // 5. FORM SUBMISSION & RESULTS RENDERING
  // =========================================================================

  prefForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // Collect preferences
    const prefs = {
      budget: parseInt(budgetInput.value) || 0,
      roomType: roomTypeSelect.value,
      floor: floorSelect.value,
      amenities: Array.from(
        document.querySelectorAll('.amen-toggle input[type="checkbox"]:checked')
      ).map((cb) => cb.value),
    };

    // Score and sort rooms (available first, then by score desc)
    const scored = ROOMS.map((room) => ({
      ...room,
      score: scoreRoom(room, prefs),
      trueCost: getTrueMonthlyCost(room),
    }))
      .sort((a, b) => {
        // Available rooms first
        if (a.status === "available" && b.status !== "available") return -1;
        if (a.status !== "available" && b.status === "available") return 1;
        return b.score - a.score;
      });

    renderResults(scored, prefs);
  });

  function renderResults(rooms, prefs) {
    emptyState.style.display = "none";
    resultsHeader.style.display = "flex";

    const availableCount = rooms.filter((r) => r.status === "available").length;
    resultsTitle.textContent = `Your Top Matches — ${availableCount} available rooms`;

    roomResults.innerHTML = rooms
      .map(
        (room, i) => `
      <div class="col-md-6 col-xl-4 dash-animate-in" style="animation-delay: ${i * 0.06}s">
        <div class="dash-room-card h-100 d-flex flex-column">
          
          <span class="dash-room-card__badge dash-room-card__badge--${room.status}">
            ${room.status === "available" ? "Available" : "Occupied"}
          </span>

          <!-- Header: score ring + name -->
          <div class="d-flex align-items-center gap-3 mb-3">
            <div class="score-ring">
              <svg viewBox="0 0 64 64" width="64" height="64">
                <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(240,246,252,0.06)" stroke-width="5"></circle>
                <circle cx="32" cy="32" r="27" fill="none" 
                  stroke="${getScoreColor(room.score)}" 
                  stroke-width="5" stroke-linecap="round"
                  stroke-dasharray="${(room.score / 100) * 169.6} 169.6"
                  transform="rotate(-90 32 32)"></circle>
              </svg>
              <span class="score-ring__text">${room.score}%</span>
            </div>
            <div>
              <div class="dash-room-card__name">${room.name}</div>
              <div class="dash-room-card__type">${room.typeLabel} · Floor ${room.floor}</div>
            </div>
          </div>

          <!-- Description -->
          <p class="small mb-3" style="color: var(--hb-text-secondary); line-height: 1.5;">${room.description}</p>

          <!-- Amenity tags -->
          <div class="d-flex flex-wrap gap-1 mb-3">
            ${room.amenities
              .map(
                (a) => `
              <span class="room-amen-tag ${prefs.amenities.includes(a) ? "room-amen-tag--match" : ""}">
                ${getAmenityLabel(a)}
              </span>`
              )
              .join("")}
          </div>

          <!-- True monthly cost breakdown -->
          <div class="mt-auto">
            <div class="cost-row">
              <span class="cost-row__label">Base rent</span>
              <span class="cost-row__value">₱${room.baseRent.toLocaleString()}</span>
            </div>
            <div class="cost-row">
              <span class="cost-row__label">Electricity (est.)</span>
              <span class="cost-row__value">₱${room.electricity.toLocaleString()}</span>
            </div>
            <div class="cost-row">
              <span class="cost-row__label">Water</span>
              <span class="cost-row__value">₱${room.water.toLocaleString()}</span>
            </div>
            <div class="cost-row">
              <span class="cost-row__label">Wi-Fi</span>
              <span class="cost-row__value">₱${room.wifi.toLocaleString()}</span>
            </div>
            <div class="cost-row cost-total">
              <span class="cost-row__label">True monthly cost</span>
              <span class="cost-row__value">₱${room.trueCost.toLocaleString()}</span>
            </div>
            ${prefs.budget > 0
              ? `<p class="small mt-1 mb-0" style="color: ${room.trueCost <= prefs.budget ? "#10b981" : "#ef4444"};">
                  ${room.trueCost <= prefs.budget
                    ? `✓ ₱${(prefs.budget - room.trueCost).toLocaleString()} under your budget`
                    : `✕ ₱${(room.trueCost - prefs.budget).toLocaleString()} over your budget`
                  }
                </p>`
              : ""
            }

            <!-- Deposit note -->
            <p class="small mt-2 mb-3" style="color: var(--hb-text-muted);">
              One-time deposit: ₱${room.deposit.toLocaleString()}
            </p>

            ${room.status === "available"
              ? `<button class="btn-inquire w-100" data-room="${room.id}">
                  Inquire About This Room
                </button>`
              : `<button class="btn-inquire w-100" disabled style="opacity: 0.4; cursor: not-allowed;">
                  Currently Occupied
                </button>`
            }
          </div>
        </div>
      </div>`
      )
      .join("");

    // Attach inquiry handlers
    document.querySelectorAll("[data-room]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const room = ROOMS.find((r) => r.id === btn.dataset.room);
        if (room) {
          alert(
            `📩 Inquiry sent for ${room.name}!\n\nContact Ariante Dormitory:\n📞 ${DORM_CONFIG.contactPhone}\n✉️ ${DORM_CONFIG.contactEmail}\n\n(In the full version, this will open a messaging form.)`
          );
        }
      });
    });
  }

  // =========================================================================
  // 6. HELPERS
  // =========================================================================

  function getScoreColor(score) {
    if (score >= 80) return "#6366f1"; // Indigo — great match
    if (score >= 60) return "#f59e0b"; // Amber — decent
    return "#ef4444";                   // Red — poor fit
  }

  function getAmenityLabel(key) {
    const labels = {
      aircon: "Air-con",
      ownCR: "Own CR",
      wifi: "Wi-Fi",
      desk: "Study Desk",
      nearGate: "Near Gate",
    };
    return labels[key] || key;
  }
});
