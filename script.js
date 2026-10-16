/* =========================================================
   HX PROMPT STUDIO
   PREMIUM DARK LUXURY EDITION
   Created by HIMANSHU SHEKHAR
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* 1. SUPABASE CONFIGURATION */

    const SUPABASE_URL =
        "https://ptguetcuvkbnspzdobkj.supabase.co";

    const SUPABASE_PUBLISHABLE_KEY =
        "sb_publishable_rgJhqO8JwC5ZqI2fBVQ11Q_NjCL2BZS";

    if (!window.supabase) {
        console.error("HX Prompt Studio: Supabase library not loaded.");
        return;
    }

    const supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );

    /* 2. GLOBAL ELEMENTS */

    const body = document.body;
    const giftButton = document.getElementById("giftButton");
    const creatorModal = document.getElementById("creatorModal");
    const closeModal = document.getElementById("closeModal");
    const modalDone = document.getElementById("modalDone");

    const searchInput = document.getElementById("searchInput");
    const galleryGrid = document.getElementById("galleryGrid");
    const noResults = document.getElementById("noResults");

    const textLayer = document.getElementById("flower-layer");
    const objectLayer = document.getElementById("falling-objects");
    const currentYear = document.getElementById("currentYear");

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    /* 3. CREATOR GIFT POPUP */

    let previousFocus = null;

    function openCreatorModal() {
        if (!creatorModal) return;

        previousFocus = document.activeElement;
        creatorModal.hidden = false;
        body.classList.add("modal-open");

        if (closeModal) closeModal.focus();
    }

    function closeCreatorModal() {
        if (!creatorModal || creatorModal.hidden) return;

        creatorModal.hidden = true;
        body.classList.remove("modal-open");

        if (previousFocus && typeof previousFocus.focus === "function") {
            previousFocus.focus();
        } else if (giftButton) {
            giftButton.focus();
        }
    }

    if (giftButton) {
        giftButton.addEventListener("click", openCreatorModal);
    }

    if (closeModal) {
        closeModal.addEventListener("click", closeCreatorModal);
    }

    if (modalDone) {
        modalDone.addEventListener("click", closeCreatorModal);
    }

    if (creatorModal) {
        creatorModal.addEventListener("click", (event) => {
            if (event.target === creatorModal) {
                closeCreatorModal();
            }
        });
    }

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            creatorModal &&
            !creatorModal.hidden
        ) {
            closeCreatorModal();
        }
    });

    /* 4. SEARCH */

    function filterGallery() {
        if (!galleryGrid) return;

        const term = searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

        const cards = galleryGrid.querySelectorAll(".prompt-card");
        let visibleCount = 0;

        cards.forEach((card) => {
            const searchableText = (
                card.dataset.search || card.textContent || ""
            ).toLowerCase();

            const matches = searchableText.includes(term);
            card.hidden = !matches;

            if (matches) visibleCount++;
        });

        if (noResults) {
            noResults.hidden = visibleCount !== 0;
        }
    }

    if (searchInput) {
        searchInput.addEventListener("input", filterGallery);
    }

    /* 5. CREATE GALLERY CARD */

    function createPromptCard(item, displayNumber) {
        const card = document.createElement("article");
        card.className = "prompt-card";

        const titleText = item.title || "Untitled Prompt";
        const fullPrompt = item.prompt || "";

        card.dataset.search = `${titleText} ${fullPrompt}`;
        card.tabIndex = 0;
        card.setAttribute("role", "link");
        card.setAttribute(
            "aria-label",
            `View prompt: ${titleText}`
        );

        /*
         * Every card uses the actual Supabase ID.
         * v is only a display number, not the database ID.
         */

        const detailsURL = new URL("prompt.html", window.location.href);

        detailsURL.searchParams.set("id", String(item.id));

        detailsURL.searchParams.set(
            "v",
            String(displayNumber).padStart(3, "0")
        );

        function openDetailsPage() {
            window.location.href = detailsURL.href;
        }

        /* IMAGE */

        if (item.image_url) {
            const image = document.createElement("img");

            image.src = item.image_url;
            image.alt = titleText;
            image.className = "prompt-image";
            image.loading = "lazy";

            image.addEventListener("error", () => {
                image.hidden = true;
            });

            card.appendChild(image);
        }

        /* CONTENT */

        const content = document.createElement("div");
        content.className = "card-content";

        const title = document.createElement("h3");
        title.textContent = titleText;

        const promptText = document.createElement("p");
        promptText.className = "prompt-text";

        const words = fullPrompt.trim()
            ? fullPrompt.trim().split(/\s+/)
            : [];

        const wordLimit = 24;

        promptText.textContent = words.length > wordLimit
            ? words.slice(0, wordLimit).join(" ") + "..."
            : fullPrompt;

        /* VIEW PROMPT BUTTON */

        const viewButton = document.createElement("button");

        viewButton.type = "button";
        viewButton.className = "copy-button";
        viewButton.textContent = "View Prompt →";

        viewButton.setAttribute(
            "aria-label",
            `View full prompt: ${titleText}`
        );

        viewButton.addEventListener("click", (event) => {
            event.stopPropagation();
            openDetailsPage();
        });

        content.append(title, promptText, viewButton);
        card.appendChild(content);

        /* CLICKING THE CARD OPENS DETAILS */

        card.addEventListener("click", openDetailsPage);

        card.addEventListener("keydown", (event) => {
            if (
                event.target === card &&
                (event.key === "Enter" || event.key === " ")
            ) {
                event.preventDefault();
                openDetailsPage();
            }
        });

        return card;
    }

    /* 6. LOAD PUBLISHED PROMPTS FROM SUPABASE */

    async function loadPublishedPrompts() {
        if (!galleryGrid) return;

        galleryGrid.setAttribute("aria-busy", "true");
        galleryGrid.replaceChildren();

        const loadingMessage = document.createElement("p");

        loadingMessage.textContent = "Loading prompts...";

        galleryGrid.appendChild(loadingMessage);

        try {
            const { data, error } = await supabaseClient
                .from("Prompts")
                .select("id, title, prompt, image_url, created_at")
                .eq("is_published", true)
                .order("created_at", { ascending: false });

            if (error) throw error;

            galleryGrid.replaceChildren();

            if (!data || data.length === 0) {
                if (noResults) {
                    noResults.hidden = false;
                    noResults.textContent = "No published prompts yet.";
                }

                return;
            }

            const fragment = document.createDocumentFragment();

            data.forEach((item, index) => {
                fragment.appendChild(
                    createPromptCard(item, index + 1)
                );
            });

            galleryGrid.appendChild(fragment);

            filterGallery();
            observeNewPromptCards();

        } catch (error) {
            console.error(
                "HX Prompt Studio: Failed to load prompts.",
                error
            );

            galleryGrid.replaceChildren();

            const message = document.createElement("p");

            message.textContent =
                "Prompts could not be loaded. Please try again later.";

            galleryGrid.appendChild(message);

        } finally {
            galleryGrid.setAttribute("aria-busy", "false");
        }
    }

    /* 7. FLOATING TEXT */

    function createFloatingWords() {
        if (!textLayer) return;

        textLayer.replaceChildren();

        const words = [
            "AI MASTER",
            "HIMANSHU",
            "HX PROMPT STUDIO",
            "IMAGINE",
            "CREATE",
            "AI MASTER",
            "HIMANSHU",
            "VISUAL STORYTELLING"
        ];

        words.forEach((word, index) => {
            const element = document.createElement("span");

            element.className = "floating-word";
            element.textContent = word;

            element.style.left = `${3 + Math.random() * 87}%`;

            element.style.animationDelay = `${index * -2.3}s`;

            element.style.animationDuration =
                `${17 + Math.random() * 12}s`;

            textLayer.appendChild(element);
        });
    }

    /* 8. FALLING OBJECTS */

    function createFallingObjects() {
        if (!objectLayer) return;

        objectLayer.replaceChildren();

        const objects = [
            ["💸", "falling-money"],
            ["📸", "falling-camera"],
            ["💵", "falling-cash"],
            ["✨", "falling-sparkle"],
            ["📷", "falling-camera"],
            ["💰", "falling-money"],
            ["💸", "falling-cash"],
            ["✦", "falling-sparkle"],
            ["📸", "falling-camera"],
            ["✨", "falling-sparkle"]
        ];

        objects.forEach(([symbol, className], index) => {
            const element = document.createElement("span");

            element.className = `falling-object ${className}`;

            element.textContent = symbol;

            element.setAttribute("aria-hidden", "true");

            element.style.left = `${2 + Math.random() * 94}%`;

            element.style.animationDelay = `${index * -1.8}s`;

            element.style.animationDuration =
                `${15 + Math.random() * 12}s`;

            element.style.setProperty(
                "--object-size",
                `${20 + Math.random() * 15}px`
            );

            objectLayer.appendChild(element);
        });
    }

    /* 9. MOTION ACCESSIBILITY */

    function initialiseDecorations() {
        const shouldReduceMotion = reduceMotion.matches;

        if (textLayer) {
            textLayer.hidden = shouldReduceMotion;

            if (shouldReduceMotion) {
                textLayer.replaceChildren();
            } else {
                createFloatingWords();
            }
        }

        if (objectLayer) {
            objectLayer.hidden = shouldReduceMotion;

            if (shouldReduceMotion) {
                objectLayer.replaceChildren();
            } else {
                createFallingObjects();
            }
        }

        document.documentElement.classList.toggle(
            "reduce-motion",
            shouldReduceMotion
        );
    }

    initialiseDecorations();

    if (typeof reduceMotion.addEventListener === "function") {
        reduceMotion.addEventListener("change", initialiseDecorations);
    }

    /* 10. SMOOTH INTERNAL NAVIGATION */

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener("click", (event) => {
            const targetId = link.getAttribute("href");

            if (!targetId || targetId === "#") return;

            const target = document.querySelector(targetId);

            if (!target) return;

            event.preventDefault();

            target.scrollIntoView({
                behavior: reduceMotion.matches ? "auto" : "smooth",
                block: "start"
            });
        });
    });

    /* 11. SCROLL REVEAL */

    let revealObserver = null;

    function observeNewPromptCards() {
        if (!revealObserver || !galleryGrid) return;

        galleryGrid.querySelectorAll(
            ".prompt-card:not([data-reveal-observed])"
        ).forEach((card) => {
            card.dataset.revealObserved = "true";

            card.classList.add("reveal-on-scroll");

            revealObserver.observe(card);
        });
    }

    const revealElements = document.querySelectorAll(
        ".section-heading, .about-content, " +
        ".about-decoration, .contact-card, .contact-heading"
    );

    if ("IntersectionObserver" in window && !reduceMotion.matches) {
        revealObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;

                    entry.target.classList.add("is-visible");

                    observer.unobserve(entry.target);
                });
            },
            {
                threshold: 0.12,
                rootMargin: "0px 0px -30px 0px"
            }
        );

        revealElements.forEach((element) => {
            element.classList.add("reveal-on-scroll");

            revealObserver.observe(element);
        });

    } else {
        revealElements.forEach((element) => {
            element.classList.add("is-visible");
        });
    }

    /* 12. GIFT BUTTON ENTRANCE */

    if (giftButton && !reduceMotion.matches) {
        giftButton.animate(
            [
                {
                    opacity: 0,
                    transform: "translateY(-8px) scale(0.92)"
                },
                {
                    opacity: 1,
                    transform: "translateY(0) scale(1)"
                }
            ],
            {
                duration: 650,
                easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
                fill: "both"
            }
        );
    }

    /* 13. INITIALISE GALLERY */

    loadPublishedPrompts();

    console.log(
        "%c HX PROMPT STUDIO ",
        "background:#241d19;color:#dfc7a5;padding:8px 12px;" +
        "font-weight:bold;border:1px solid #92734f;"
    );

    console.log("Created by HIMANSHU SHEKHAR.");

    console.log("Gallery and View Prompt buttons initialized.");
});
