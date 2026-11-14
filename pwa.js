// pwa.js — سكريبت PWA
(function() {
  let deferredPrompt = null;
  let swRegistration = null;

  // ═══════════════════════════════════
  // REGISTER SERVICE WORKER
  // ═══════════════════════════════════
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((reg) => {
          swRegistration = reg;
          console.log("✅ Service Worker registered:", reg.scope);

          // لو فيه تحديث، أعد تحميل
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                showUpdateToast();
              }
            });
          });
        })
        .catch((err) => {
          console.error("❌ SW registration failed:", err);
        });
    });
  }

  // ═══════════════════════════════════
  // INSTALL PROMPT
  // ═══════════════════════════════════
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
    console.log("✅ beforeinstallprompt captured");
  });

  // لو المستخدم ثبّت التطبيق
  window.addEventListener("appinstalled", () => {
    console.log("✅ App installed");
    hideInstallButton();
    deferredPrompt = null;
    showToast("🎉 تثبّت التطبيق! افتحه من الشاشة الرئيسية");
  });

  // ═══════════════════════════════════
  // SHOW INSTALL BUTTON
  // ═══════════════════════════════════
  function showInstallButton() {
    // حيّد الزر القديم لو موجود
    const oldBtn = document.getElementById("pwaInstallBtn");
    if (oldBtn) oldBtn.remove();

    // حط الزر في الهيدر
    const headerActions = document.querySelector(".header-actions");
    if (!headerActions) return;

    const btn = document.createElement("button");
    btn.id = "pwaInstallBtn";
    btn.className = "icon-btn";
    btn.style.background = "linear-gradient(135deg, #4ade80, #16a34a)";
    btn.style.borderColor = "#22c55e";
    btn.style.color = "#fff";
    btn.title = "ثبّت التطبيق";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2.2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
    `;
    btn.onclick = installApp;

    // حطه أول واحد في الـ header-actions
    headerActions.insertBefore(btn, headerActions.firstChild);
  }

  function hideInstallButton() {
    const btn = document.getElementById("pwaInstallBtn");
    if (btn) btn.remove();
  }

  // ═══════════════════════════════════
  // INSTALL APP
  // ═══════════════════════════════════
  async function installApp() {
    if (!deferredPrompt) {
      showToast("التطبيق مثبّت من قبل أو ما يدعمش التثبيت", "error");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log("User choice:", outcome);

    if (outcome === "accepted") {
      showToast("🎉 جاري التثبيت...");
    } else {
      showToast("ما تم التثبيت", "error");
    }
    deferredPrompt = null;
    hideInstallButton();
  }

  // ═══════════════════════════════════
  // UPDATE TOAST
  // ═══════════════════════════════════
  function showUpdateToast() {
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      padding: 14px 20px;
      border-radius: 14px;
      background: #0d1424;
      border: 1px solid #22c55e;
      color: #4ade80;
      font-weight: 700;
      font-size: 0.85rem;
      z-index: 10001;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      gap: 10px;
      transition: transform 0.3s ease;
      font-family: 'Cairo', sans-serif;
    `;
    toast.innerHTML = `
      <span>🔄 فيه تحديث جديد!</span>
      <button style="
        background: linear-gradient(135deg, #4ade80, #16a34a);
        color: #fff;
        border: none;
        padding: 6px 14px;
        border-radius: 8px;
        font-weight: 700;
        cursor: pointer;
        font-family: inherit;
      " onclick="location.reload()">حدّث</button>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.style.transform = "translateX(-50%) translateY(0)", 100);
    setTimeout(() => {
      toast.style.transform = "translateX(-50%) translateY(100px)";
      setTimeout(() => toast.remove(), 300);
    }, 8000);
  }

  // ═══════════════════════════════════
  // TOAST HELPER
  // ═══════════════════════════════════
  function showToast(msg, type = "success") {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.className = "toast " + type;
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => t.classList.remove("show"), 3000);
  }

  // ═══════════════════════════════════
  // ONLINE / OFFLINE DETECTION
  // ═══════════════════════════════════
  window.addEventListener("online", () => {
    showToast("✅ رجعت الاتصال");
  });

  window.addEventListener("offline", () => {
    showToast("📡 ما فيهش اتصال — تخدم offline", "error");
  });

  // ═══════════════════════════════════
  // EXPOSE FUNCTIONS
  // ═══════════════════════════════════
  window.pwaInstall = installApp;
  window.pwaIsInstalled = () => window.matchMedia("(display-mode: standalone)").matches;

  // ═══════════════════════════════════
  // NOTIFICATION PERMISSION
  // ═══════════════════════════════════
  window.pwaRequestNotificationPermission = async function() {
    if (!("Notification" in window)) {
      showToast("المتصفح ما يدعمش الإشعارات", "error");
      return false;
    }

    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") {
      showToast("الإشعارات مرفوضة — فعّلها من إعدادات المتصفح", "error");
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      showToast("🔔 فعّلت الإشعارات!");
      return true;
    }
    return false;
  };

  window.pwaShowNotification = function(title, body) {
    if (!swRegistration) {
      showToast("Service Worker ما تسجلش", "error");
      return;
    }
    if (Notification.permission !== "granted") {
      showToast("لازم تفعّل الإشعارات الأول", "error");
      return;
    }
    swRegistration.showNotification(title, {
      body,
      icon: "/icon.png",
      badge: "/icon.png",
      vibrate: [200, 100, 200]
    });
  };
})();
