// ============================
// PARTICLE ANIMATION
// ============================
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2;
    this.speedX = (Math.random() - 0.5) * 0.5;
    this.speedY = (Math.random() - 0.5) * 0.5;
    this.opacity = Math.random() * 0.5 + 0.2;
    this.color = Math.random() > 0.5 ? "#36f0ff" : "#1e8e3e";
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x > canvas.width + 10) this.x = -10;
    if (this.x < -10) this.x = canvas.width + 10;
    if (this.y > canvas.height + 10) this.y = -10;
    if (this.y < -10) this.y = canvas.height + 10;

    this.opacity += (Math.random() - 0.5) * 0.02;
    this.opacity = Math.max(0.1, Math.min(0.6, this.opacity));
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

console.log("🌿 MadurAI Urban Intelligence Grid (MUIG) – Loaded & Ready for Governance");
for (let i = 0; i < 40; i++) {
  particles.push(new Particle());
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach((particle) => {
    particle.update();
    particle.draw();
  });

  requestAnimationFrame(animateParticles);
}

animateParticles();

// ============================
// SCROLL REVEAL
// ============================
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, observerOptions);

document.querySelectorAll(".section").forEach((section) => {
  observer.observe(section);
});

// ============================
// AUDIO TOGGLE
// ============================
const audioToggle = document.getElementById("audioToggle");
let audioEnabled = false;

audioToggle.addEventListener("click", () => {
  audioEnabled = !audioEnabled;
  audioToggle.textContent = `Audio: ${audioEnabled ? "On" : "Off"}`;
  
  if (audioEnabled) {
    // Subtle ambient sound effect simulation (web audio API)
    playAmbientTone();
  }
});

function playAmbientTone() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 120;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.6);
  } catch (e) {
    console.log("Web Audio API not supported");
  }
}

// ============================
// CTA BUTTONS
// ============================
document.querySelectorAll(".primary, .ghost").forEach((button) => {
  button.addEventListener("click", function (e) {
    const ripple = document.createElement("span");
    ripple.style.position = "absolute";
    ripple.style.width = "20px";
    ripple.style.height = "20px";
    ripple.style.backgroundColor = "rgba(255, 255, 255, 0.5)";
    ripple.style.borderRadius = "50%";
    ripple.style.pointerEvents = "none";
    ripple.style.animation =
      "ripple-out 0.6s ease-out forwards";

    this.style.position = "relative";
    this.style.overflow = "hidden";

    const rect = this.getBoundingClientRect();
    ripple.style.left = e.clientX - rect.left - 10 + "px";
    ripple.style.top = e.clientY - rect.top - 10 + "px";

    this.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  });
});

// Add ripple animation
const style = document.createElement("style");
style.textContent = `
  @keyframes ripple-out {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ============================
// SMOOTH SCROLL & ACTIVE NAV
// ============================
const navLinks = document.querySelectorAll(".nav a");

navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute("href"));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

// ============================
// DYNAMIC DASHBOARD UPDATES
// ============================
function updateDashboardMetrics() {
  const metrics = document.querySelectorAll(".metric");
  const trends = document.querySelectorAll(".trend");

  // Simulate live data updates
  setInterval(() => {
    metrics.forEach((metric) => {
      // Subtle random fluctuation
      if (metric.textContent.includes(".")) {
        const value = parseFloat(metric.textContent);
        const change = (Math.random() - 0.5) * 0.5;
        const newValue = Math.max(0, value + change).toFixed(1);
        metric.textContent = newValue + metric.textContent.slice(-6);
      }
    });
  }, 3000);
}

updateDashboardMetrics();

// ============================
// LAZY LOAD IMAGES (if any)
// ============================
if ("IntersectionObserver" in window) {
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.target.dataset.src) {
        entry.target.src = entry.target.dataset.src;
        entry.target.removeAttribute("data-src");
        imageObserver.unobserve(entry.target);
      }
    });
  });

  document.querySelectorAll("img[data-src]").forEach((img) => {
    imageObserver.observe(img);
  });
}

// ============================
// PAGE LOAD ANIMATION
// ============================
window.addEventListener("load", () => {
  document.body.style.opacity = "1";
});

// ============================
// KEYBOARD SHORTCUTS
// ============================
document.addEventListener("keydown", (e) => {
  if (e.key === "?") {
    alert(
        "MadurAI Urban Intelligence Grid (MUIG)\n\nKeyboard Shortcuts:\n↓ Scroll\nAlt+D: Dashboard\nEsc: Close modals\n\nPowered by Gemini AI"
    );
  }
});

// ============================
// PERFORMANCE MONITORING
// ============================
if ("PerformanceObserver" in window) {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      console.log(
        `${entry.name}: ${entry.duration.toFixed(2)}ms`
      );
    });
  });
  observer.observe({ entryTypes: ["measure"] });
}

// ============================
// PROGRESSIVE ENHANCEMENT
// ============================
document.addEventListener("DOMContentLoaded", () => {
  // Ensure all interactive elements have keyboard support
  document.querySelectorAll("button, a").forEach((el) => {
    if (!el.hasAttribute("tabindex") && !el.hasAttribute("href")) {
      el.setAttribute("tabindex", "0");
    }
  });

  // Add feedback on button presses
  document.addEventListener("keypress", (e) => {
    if (e.target.tagName === "BUTTON" && e.key === "Enter") {
      e.target.click();
    }
  });
});

console.log("🌿 MadurAI Urban Intelligence Grid (MUIG) – Loaded & Ready for Governance");
console.log(
  "Status: Government-grade AI intelligence layer active. Powered by Gemini AI."
);
