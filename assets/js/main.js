(() => {
  const storageKey = "theme";
  const legacyThemeKey = "alyaqeen-theme";
  const languageStorageKey = "alyaqeen-lang";
  const componentAttribute = "data-include";
  const fallbackLanguage = "en";
  let activeLanguage = fallbackLanguage;

  const themeLogoMap = {
    light: "assets/images/logo_primary.png",
    dark: "assets/images/logo_white.png",
  };

  const getDictionaries = () => (typeof window !== "undefined" && window.translations) || {};

  const resolveDictionary = (lang) => {
    const dictionaries = getDictionaries();
    const primary = dictionaries[lang] || dictionaries[fallbackLanguage] || {};
    const fallback = dictionaries[fallbackLanguage] || {};
    return { primary, fallback };
  };

  const translateDynamicNodes = (primary, fallback) => {
    document.querySelectorAll("[data-i18n-dynamic]").forEach((el) => {
      const key = el.dataset.i18nDynamic;
      if (!key) return;
      const value = primary[key] ?? fallback[key];
      if (typeof value === "string") {
        el.textContent = value;
      }
    });
  };

  const applyTranslations = (lang) => {
    const { primary, fallback } = resolveDictionary(lang);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const value = primary[key] ?? fallback[key];
      if (typeof value === "string") {
        el.textContent = value;
      }
    });

    const attributeBindings = [
      ["[data-i18n-placeholder]", "placeholder", "i18nPlaceholder"],
      ["[data-i18n-aria-label]", "aria-label", "i18nAriaLabel"],
      ["[data-i18n-title]", "title", "i18nTitle"],
      ["[data-i18n-value]", "value", "i18nValue"],
      ["[data-i18n-alt]", "alt", "i18nAlt"],
      ["[data-i18n-content]", "content", "i18nContent"],
    ];

    attributeBindings.forEach(([selector, attribute, datasetKey]) => {
      document.querySelectorAll(selector).forEach((el) => {
        const key = el.dataset[datasetKey];
        if (!key) return;
        const value = primary[key] ?? fallback[key];
        if (typeof value === "string") {
          el.setAttribute(attribute, value);
        }
      });
    });

    const titleNode = document.querySelector("title[data-i18n]");
    if (titleNode) {
      const titleKey = titleNode.getAttribute("data-i18n");
      if (titleKey) {
        const titleValue = primary[titleKey] ?? fallback[titleKey];
        if (typeof titleValue === "string") {
          titleNode.textContent = titleValue;
          document.title = titleValue;
        }
      }
    }

    translateDynamicNodes(primary, fallback);
  };

  const setLanguage = (lang) => {
    const dictionaries = getDictionaries();
    const nextLanguage = dictionaries[lang] ? lang : fallbackLanguage;
    activeLanguage = nextLanguage;

    document.documentElement.setAttribute("lang", nextLanguage);
    document.documentElement.dir = nextLanguage === "ar" ? "rtl" : "ltr";

    applyTranslations(nextLanguage);

    const switcher = document.getElementById("langSwitcher");
    if (switcher) {
      const label =
        nextLanguage === "ar" ? "التبديل إلى الإنجليزية" : "Switch to Arabic";
      switcher.setAttribute("aria-label", label);
    }

    localStorage.setItem(languageStorageKey, nextLanguage);

    if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
      window.dispatchEvent(
        new CustomEvent("app:languagechange", { detail: { lang: nextLanguage } })
      );
    }
  };

  const t = (key) => {
    const { primary, fallback } = resolveDictionary(activeLanguage);
    return primary[key] ?? fallback[key] ?? key;
  };

  if (typeof window !== "undefined") {
    window.setAppLanguage = setLanguage;
  }

  const loadComponents = async () => {
    let includeElements = document.querySelectorAll(`[${componentAttribute}]`);
    while (includeElements.length) {
      await Promise.all(
        Array.from(includeElements).map(async (el) => {
          const path = el.getAttribute(componentAttribute);
          if (!path) return;
          try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Failed to load ${path}`);
            const html = await response.text();
            el.innerHTML = html;
            el.removeAttribute(componentAttribute);
          } catch (error) {
            console.error(error);
            el.innerHTML = `<div class="component-error">${t("component_error")}</div>`;
          }
        })
      );
      includeElements = document.querySelectorAll(`[${componentAttribute}]`);
    }
  };

  const updateLogoForTheme = (theme) => {
    const logo = document.getElementById("mainLogo");
    if (!logo) return;
    const nextSrc = themeLogoMap[theme] || themeLogoMap.light;
    if (logo.getAttribute("src") !== nextSrc) {
      logo.setAttribute("src", nextSrc);
    }
  };

  const applyTheme = (theme) => {
    const root = document.documentElement;
    if (!root) return;
    const normalized = theme === "dark" ? "dark" : "light";
    root.setAttribute("data-theme", normalized);
    if (document.body) {
      document.body.classList.toggle("dark-mode", normalized === "dark");
      updateLogoForTheme(normalized);
    }
    localStorage.setItem(storageKey, normalized);
    if (legacyThemeKey) {
      localStorage.setItem(legacyThemeKey, normalized);
    }
  };

  const toggleTheme = () => {
    const isDark = document.body?.classList.contains("dark-mode");
    const next = isDark ? "light" : "dark";
    if (document.body) {
      document.body.classList.add("theme-transition");
    }
    applyTheme(next);
    window.setTimeout(
      () => document.body && document.body.classList.remove("theme-transition"),
      400
    );
  };

  const initThemeToggle = () => {
    const savedTheme =
      localStorage.getItem(storageKey) || localStorage.getItem(legacyThemeKey);
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");
    applyTheme(initialTheme);

    const toggleButton = document.getElementById("themeToggle");
    if (!toggleButton) return;

    toggleButton.addEventListener("click", toggleTheme);
  };

  const initNavigation = () => {
    const menuToggle = document.querySelector(".menu-toggle");
    const nav = document.getElementById("primary-navigation");
    if (!menuToggle || !nav) return;

    const closeNav = () => {
      document.body.classList.remove("nav-open");
      menuToggle.setAttribute("aria-expanded", "false");
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = document.body.classList.toggle("nav-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 960) {
          closeNav();
        }
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 960) {
        document.body.classList.remove("nav-open");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  };

  const initScrollReveal = () => {
    const revealElements = document.querySelectorAll(".reveal-on-scroll");
    if (!("IntersectionObserver" in window) || revealElements.length === 0) {
      revealElements.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -60px 0px",
      }
    );

    revealElements.forEach((el) => observer.observe(el));
  };

  const initContactForm = () => {
    const form = document.getElementById("contactForm");
    if (!form) return;

    const feedback = form.querySelector(".form-feedback");
    const showError = (field, messageKey) => {
      const errorNode = form.querySelector(`[data-error-for="${field.id}"]`);
      if (errorNode) {
        if (messageKey) {
          errorNode.dataset.i18nDynamic = messageKey;
          errorNode.textContent = t(messageKey);
        } else {
          delete errorNode.dataset.i18nDynamic;
          errorNode.textContent = "";
        }
      }
      field.setAttribute("aria-invalid", messageKey ? "true" : "false");
    };

    const validateEmail = (value) =>
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).toLowerCase());

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      let hasError = false;

      const name = form.elements.namedItem("name");
      const email = form.elements.namedItem("email");
      const message = form.elements.namedItem("message");

      if (name instanceof HTMLInputElement) {
        if (name.value.trim().length < 2) {
          showError(name, "form_error_name");
          hasError = true;
        } else {
          showError(name, "");
        }
      }

      if (email instanceof HTMLInputElement) {
        if (!validateEmail(email.value)) {
          showError(email, "form_error_email");
          hasError = true;
        } else {
          showError(email, "");
        }
      }

      if (message instanceof HTMLTextAreaElement) {
        if (message.value.trim().length < 10) {
          showError(message, "form_error_message");
          hasError = true;
        } else {
          showError(message, "");
        }
      }

      if (hasError) {
        if (feedback) {
          feedback.hidden = false;
          feedback.dataset.i18nDynamic = "form_error_summary";
          feedback.textContent = t("form_error_summary");
          feedback.style.color = "#f35c6e";
        }
        return;
      }

      if (feedback) {
        feedback.hidden = false;
        feedback.dataset.i18nDynamic = "form_success_message";
        feedback.textContent = t("form_success_message");
        feedback.style.color = "";
      }

      form.reset();
    });
  };

  const initFooterYear = () => {
    const yearNode = document.querySelector("[data-year]");
    if (yearNode) {
      yearNode.textContent = new Date().getFullYear();
    }
  };

  const initSmoothAnchors = () => {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      event.preventDefault();
      const destination = document.querySelector(href);
      if (destination) {
        destination.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  };

  const initLanguage = () => {
    const savedLang = localStorage.getItem(languageStorageKey) || fallbackLanguage;
    setLanguage(savedLang);

    const switcher = document.getElementById("langSwitcher");
    if (switcher) {
      switcher.addEventListener("click", () => {
        const nextLang = activeLanguage === "en" ? "ar" : "en";
        setLanguage(nextLang);
      });
    }
  };

  window.addEventListener("app:languagechange", () => {
    const { primary, fallback } = resolveDictionary(activeLanguage);
    translateDynamicNodes(primary, fallback);
  });

  const init = async () => {
    await loadComponents();
    initFooterYear();
    initLanguage();
    initNavigation();
    initThemeToggle();
    initScrollReveal();
    initContactForm();
    initSmoothAnchors();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

