"use strict";

document.addEventListener("DOMContentLoaded", () => {
    /* =========================================
       HX PROMPT STUDIO — GALLERY SCRIPT
       ========================================= */

    const SUPABASE_URL =
        "https://ptguetcuvkbnspzdobkj.supabase.co";

    const SUPABASE_KEY =
        "sb_publishable_rgJhqO8JwC5ZqI2fBVQ11Q_NjCL2BZS";

    const galleryGrid = document.getElementById("galleryGrid");
    const searchInput = document.getElementById("searchInput");
    const noResults = document.getElementById("noResults");
    const currentYear = document.getElementById("currentYear");

    const giftButton = document.getElementById("giftButton");
    const creatorModal = document.getElementById("creatorModal");
    const closeModal = document.getElementById("closeModal");
    const modalDone = document.getElementById("modalDone");

    const flowerLayer = document.getElementById("flower-layer");

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    let supabaseClient = null;
    let allPrompts = [];
    let searchTimer = null;

    /* =========================================
       PREMIUM COLLECTION POPUP
       ========================================= */

    const premiumModal = document.getElementById("premiumModal");
    const premiumModalClose =
        document.getElementById("premiumModalClose");
    const premiumModalLater =
        document.getElementById("premiumModalLater");

    const premiumNavLinks =
        document.querySelectorAll(".premium-nav-link");

    const premiumModalDialog = premiumModal
        ? premiumModal.querySelector(".premium-modal")
        : null;

    let previousPremiumFocus = null;
    let premiumAutoTimer = null;

    function openPremiumModal() {
        if (!premiumModal) return;

        previousPremiumFocus = document.activeElement;

        premiumModal.hidden = false;
        document.body.classList.add("premium-modal-open");

        try {
            sessionStorage.setItem("hxPremiumPopupShown", "1");
        } catch (error) {
            // The popup still works if session storage is unavailable.
        }

        window.requestAnimationFrame(() => {
            if (premiumModalClose) {
                premiumModalClose.focus();
            } else if (premiumModalDialog) {
                premiumModalDialog.focus();
            }
        });
    }

    function closePremiumModal() {
        if (!premiumModal || premiumModal.hidden) return;

        premiumModal.hidden = true;
        document.body.classList.remove("premium-modal-open");

        if (
            previousPremiumFocus &&
            typeof previousPremiumFocus.focus === "function"
        ) {
            previousPremiumFocus.focus();
        }
    }

    if (premiumModalClose) {
        premiumModalClose.addEventListener(
            "click",
            closePremiumModal
        );
    }

    if (premiumModalLater) {
        premiumModalLater.addEventListener(
            "click",
            closePremiumModal
        );
    }

    if (premiumModal) {
        premiumModal.addEventListener("click", (event) => {
            if (event.target === premiumModal) {
                closePremiumModal();
            }
        });
    }

    premiumNavLinks.forEach((link) => {
        link.addEventListener("click", (event) => {
            event.preventDefault();

            if (premiumAutoTimer) {
                window.clearTimeout(premiumAutoTimer);
            }

            openPremiumModal();
        });
    });

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            premiumModal &&
            !premiumModal.hidden
        ) {
            closePremiumModal();
        }
    });

    // Automatically display the popup once per browser tab session.
    let premiumAlreadyShown = false;

    try {
        premiumAlreadyShown =
            sessionStorage.getItem("hxPremiumPopupShown") === "1";
    } catch (error) {
        premiumAlreadyShown = false;
    }

    if (premiumModal && !premiumAlreadyShown) {
        premiumAutoTimer = window.setTimeout(() => {
            openPremiumModal();
        }, 1200);
    }

    /* =========================================
       INITIAL SETUP
       ========================================= */

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    if (!galleryGrid) {
        console.error(
            "HX Prompt Studio: #galleryGrid was not found in index.html."
        );
        return;
    }

    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {
        showGalleryMessage(
            "The gallery service could not start. Please refresh the page."
        );

        console.error(
            "Supabase library is missing. Check the Supabase CDN script."
        );

        return;
    }

    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_KEY
        );
    } catch (error) {
        console.error("Supabase initialization failed:", error);

        showGalleryMessage(
            "Unable to initialize the gallery. Please try again later."
        );

        return;
    }

    /* =========================================
       SAFE TEXT HELPERS
       ========================================= */

    function makeElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined && text !== null) {
            element.textContent = String(text);
        }

        return element;
    }

    function normalizeText(value) {
        return String(value || "")
            .toLocaleLowerCase()
            .trim();
    }

    function showGalleryMessage(message) {
        if (!galleryGrid) return;

        galleryGrid.replaceChildren();

        const messageBox = makeElement(
            "p",
            "gallery-status-message",
            message
        );

        messageBox.setAttribute("role", "status");
        galleryGrid.appendChild(messageBox);

        if (noResults) {
            noResults.hidden = true;
        }
    }

    function isValidImageUrl(value) {
        if (typeof value !== "string" || !value.trim()) {
            return false;
        }

        try {
            const url = new URL(value);

            return (
                url.protocol === "https:" ||
                url.protocol === "http:"
            );
        } catch {
            return false;
        }
    }

    /* =========================================
       PROMPT CARD CREATION
       ========================================= */

    function createPromptCard(item, displayNumber) {
        const card = makeElement("article", "prompt-card");

        const imageLink = makeElement("a", "prompt-image-link");

        imageLink.href =
            "prompt.html?id=" +
            encodeURIComponent(String(item.id)) +
            "&v=" +
            encodeURIComponent(String(displayNumber));

        imageLink.setAttribute(
            "aria-label",
            "View prompt: " + (item.title || "Untitled prompt")
        );

        const imageWrapper = makeElement(
            "div",
            "prompt-image-wrapper"
        );

        const image = document.createElement("img");

        image.className = "prompt-image";
        image.alt = item.title || "AI artwork";
        image.loading = displayNumber <= 3 ? "eager" : "lazy";
        image.decoding = "async";
        image.referrerPolicy = "no-referrer";

        if (displayNumber <= 3) {
            image.fetchPriority = "high";
        }

        if (isValidImageUrl(item.image_url)) {
            image.src = item.image_url;

            image.addEventListener(
                "error",
                () => {
                    image.classList.add("image-load-failed");
                    image.alt = "Image could not be loaded";
                },
                { once: true }
            );
        } else {
            image.classList.add("image-load-failed");
            image.alt = "No image available";
        }

        imageWrapper.appendChild(image);

        const imageOverlay = makeElement(
            "span",
            "prompt-image-overlay",
            "VIEW PROMPT ↗"
        );

        imageWrapper.appendChild(imageOverlay);
        imageLink.appendChild(imageWrapper);

        const cardBody = makeElement(
            "div",
            "prompt-card-body"
        );

        const numberLabel = makeElement(
            "span",
            "prompt-card-number",
            "PROMPT " + String(displayNumber).padStart(2, "0")
        );

        const title = makeElement(
            "h3",
            "prompt-card-title",
            item.title || "Untitled Prompt"
        );

        const promptText = String(item.prompt || "").trim();

        const preview = makeElement(
            "p",
            "prompt-card-description",
            promptText.length > 160
                ? promptText.slice(0, 160).trimEnd() + "…"
                : promptText
        );

        const actions = makeElement(
            "div",
            "prompt-card-actions"
        );

        const viewButton = makeElement(
            "a",
            "primary-button prompt-view-button",
            "Explore Prompt ↗"
        );

        viewButton.href = imageLink.href;

        actions.appendChild(viewButton);

        cardBody.append(
            numberLabel,
            title,
            preview,
            actions
        );

        card.append(imageLink, cardBody);

        // Keep categories hidden from the public prompt cards.
        card.dataset.search = normalizeText(
            (item.title || "") + " " + promptText
        );

        return card;
    }

    /* =========================================
       LOAD PUBLISHED PROMPTS FROM SUPABASE
       ========================================= */

    async function loadPublishedPrompts() {
        showGalleryMessage("Loading creative inspiration…");

        try {
            const { data, error } = await supabaseClient
                .from("Prompts")
                .select("id, title, prompt, image_url, created_at")
                .eq("is_published", true)
                .order("created_at", { ascending: false });

            if (error) {
                throw error;
            }

            if (!Array.isArray(data)) {
                throw new Error(
                    "Supabase returned an unexpected gallery response."
                );
            }

            allPrompts = data.filter((item) => {
                return (
                    item &&
                    item.id !== undefined &&
                    item.id !== null
                );
            });

            renderGallery(allPrompts);

            console.info(
                "HX Prompt Studio: loaded",
                allPrompts.length,
                "published prompts."
            );
        } catch (error) {
            console.error(
                "HX Prompt Studio: failed to load prompts.",
                error
            );

            showGalleryMessage(
                "We couldn't load the prompts right now. Please refresh and try again."
            );
        }
    }

    /* =========================================
       RENDER GALLERY
       ========================================= */

    function renderGallery(prompts) {
galleryGrid.replaceChildren();

if (!prompts.length) {
    const emptyMessage = makeElement(
        "p",
        "gallery-status-message",
        allPrompts.length
            ? "No prompts match your search. Try another keyword."
            : "No published prompts are available yet."
    );

    emptyMessage.setAttribute("role", "status");
    galleryGrid.appendChild(emptyMessage);

    if (noResults) {
        noResults.hidden = true;
    }

    return;
}

const fragment = document.createDocumentFragment();

const isSearching = normalizeText(searchInput?.value).length > 0;

// Homepage: show only 5 prompts.
// Search: search across all published prompts.
const visiblePrompts = isSearching
    ? prompts
    : prompts.slice(0, 5);

visiblePrompts.forEach((item) => {
    const originalIndex = allPrompts.findIndex(
        (prompt) => String(prompt.id) === String(item.id)
    );

    const displayNumber =
        originalIndex >= 0 ? originalIndex + 1 : 1;

    fragment.appendChild(
        createPromptCard(item, displayNumber)
    );
});

// Show More Prompts card only when additional prompts exist.
if (!isSearching && allPrompts.length > 5) {
    const moreCard = makeElement("a", "more-prompts-card");

    moreCard.href = "more-prompts.html";
    moreCard.setAttribute("aria-label", "Explore more prompts");

    const moreContent = makeElement("div", "more-prompts-content");

    moreContent.appendChild(
        makeElement("span", "more-prompts-icon", "✦")
    );

    moreContent.appendChild(
        makeElement("span", "more-prompts-title", "MORE PROMPTS")
    );

    moreContent.appendChild(
        makeElement("span", "more-prompts-arrow", "EXPLORE ALL ↗")
    );

    moreCard.appendChild(moreContent);
    fragment.appendChild(moreCard);
}

galleryGrid.appendChild(fragment);

if (noResults) {
    noResults.hidden = true;
}

}


    /* =========================================
       SEARCH
       ========================================= */

    function filterGallery() {
        const query = normalizeText(searchInput?.value);

        if (!query) {
            renderGallery(allPrompts);
            return;
        }

        const filteredPrompts = allPrompts.filter((item) => {
            const searchableText = normalizeText(
                (item.title || "") + " " + (item.prompt || "")
            );

            return searchableText.includes(query);
        });

        renderGallery(filteredPrompts);

        if (noResults) {
            noResults.hidden = filteredPrompts.length > 0;
        }
    }

    if (searchInput) {
        searchInput.addEventListener("input", () => {
            window.clearTimeout(searchTimer);

            searchTimer = window.setTimeout(filterGallery, 100);
        });

        searchInput.addEventListener("search", filterGallery);
    }

    /* =========================================
       CREATOR POPUP
       ========================================= */

    function openCreatorModal() {
        if (!creatorModal) {
            return;
        }

        creatorModal.hidden = false;
        document.body.classList.add("modal-open");

        if (closeModal) {
            closeModal.focus();
        }
    }

    function closeCreatorModal() {
        if (!creatorModal) {
            return;
        }

        creatorModal.hidden = true;
        document.body.classList.remove("modal-open");

        if (giftButton) {
            giftButton.focus();
        }
    }

    if (giftButton) {
        giftButton.addEventListener("click", openCreatorModal);
    }

    if (closeModal) {
        closeModal.addEventListener(
            "click",
            closeCreatorModal
        );
    }

    if (modalDone) {
        modalDone.addEventListener(
            "click",
            closeCreatorModal
        );
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

    /* =========================================
       FLOATING TEXT EFFECT
       ========================================= */

    function createFloatingWords() {
        if (!flowerLayer || prefersReducedMotion.matches) {
            return;
        }

        flowerLayer.replaceChildren();

        const words = [
            "IMAGINE",
            "CREATE",
            "INSPIRE",
            "INNOVATE",
            "HX",
            "CREATIVITY"
        ];

        const fragment = document.createDocumentFragment();

        words.forEach((word, index) => {
            const item = makeElement(
                "span",
                "floating-word",
                word
            );

            item.setAttribute("aria-hidden", "true");

            item.style.setProperty(
                "--float-index",
                String(index)
            );

            item.style.setProperty(
                "--float-left",
                (8 + index * 16) + "%"
            );

            fragment.appendChild(item);
        });

        flowerLayer.appendChild(fragment);
    }

    createFloatingWords();

    if (
        typeof prefersReducedMotion.addEventListener === "function"
    ) {
        prefersReducedMotion.addEventListener("change", (event) => {
            if (event.matches && flowerLayer) {
                flowerLayer.replaceChildren();
            } else {
                createFloatingWords();
            }
        });
    }

    /* =========================================
       SMOOTH INTERNAL NAVIGATION
       ========================================= */

    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener("click", (event) => {
            const href = link.getAttribute("href");

            if (!href || href === "#") {
                return;
            }

            const target = document.querySelector(href);

            if (!target) {
                return;
            }

            event.preventDefault();

            target.scrollIntoView({
                behavior: prefersReducedMotion.matches
                    ? "auto"
                    : "smooth",
                block: "start"
            });

            if (history.replaceState) {
                history.replaceState(null, "", href);
            }
        });
    });

    /* =========================================
       SCROLL REVEAL
       ========================================= */

    if (
        !prefersReducedMotion.matches &&
        "IntersectionObserver" in window
    ) {
        const revealElements = document.querySelectorAll(
            ".reveal, .scroll-reveal"
        );

        if (revealElements.length) {
            const revealObserver = new IntersectionObserver(
                (entries, observer) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add("is-visible");
                            observer.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.12 }
            );

            revealElements.forEach((element) => {
                revealObserver.observe(element);
            });
        }
    }

    /* =========================================
       START GALLERY
       ========================================= */

    loadPublishedPrompts();
});