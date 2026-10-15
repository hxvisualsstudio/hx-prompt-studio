/* =========================================
   HX PROMPT STUDIO — PROMPT DETAILS
   Supabase connection + full prompt + copy
   ========================================= */

const SUPABASE_URL = "https://ptguetcuvkbnspzdobkj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_rgJhqO8JwC5ZqI2fBVQ11Q_NjCL2BZS";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

document.addEventListener("DOMContentLoaded", () => {
    const loadingState = document.getElementById("loadingState");
    const errorState = document.getElementById("errorState");
    const errorMessage = document.getElementById("errorMessage");
    const promptDetails = document.getElementById("promptDetails");

    const detailImage = document.getElementById("detailImage");
    const detailTitle = document.getElementById("detailTitle");
    const detailPrompt = document.getElementById("detailPrompt");
    const promptNumber = document.getElementById("promptNumber");

    const copyButton = document.getElementById("copyFullPrompt");
    const copyButtonText = document.getElementById("copyButtonText");
    const copyStatus = document.getElementById("copyStatus");

    const currentYear = document.getElementById("currentYear");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    // Read the actual Supabase record ID from the URL.
    const params = new URLSearchParams(window.location.search);
    const promptId = params.get("id");
    const displayNumber = params.get("v");

    let completePrompt = "";

    function showError(message) {
        loadingState.hidden = true;
        promptDetails.hidden = true;
        errorState.hidden = false;
        errorMessage.textContent = message;
    }

    async function loadPrompt() {
        if (!promptId) {
            showError(
                "No prompt ID was provided. Please return to the gallery and select a prompt."
            );
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from("Prompts")
                .select("id, title, prompt, image_url, is_published")
                .eq("id", promptId)
                .eq("is_published", true)
                .maybeSingle();

            if (error) {
                console.error("Supabase prompt loading error:", error);

                showError(
                    "We couldn't load this prompt right now. Please check your connection and try again."
                );
                return;
            }

            if (!data) {
                showError(
                    "This prompt could not be found. It may have been removed or unpublished."
                );
                return;
            }

            // Safely display prompt information.
            detailTitle.textContent = data.title || "Untitled Prompt";
            completePrompt = data.prompt || "";
            detailPrompt.textContent =
                completePrompt || "No prompt text is available.";

            promptNumber.textContent = displayNumber
                ? `#${displayNumber}`
                : "";

            // Load the image.
            if (data.image_url) {
                detailImage.src = data.image_url;
                detailImage.alt = data.title || "AI-generated artwork";

                detailImage.onerror = () => {
                    detailImage.style.display = "none";
                };

                detailImage.onload = () => {
                    detailImage.style.display = "block";
                };
            } else {
                detailImage.style.display = "none";
            }

            // Update the browser tab title.
            document.title =
                `${data.title || "Prompt Details"} | HX Prompt Studio`;

            loadingState.hidden = true;
            errorState.hidden = true;
            promptDetails.hidden = false;

        } catch (err) {
            console.error("Unexpected prompt loading error:", err);

            showError(
                "Something went wrong while loading this prompt. Please try again."
            );
        }
    }

    // Copy the complete prompt.
    async function copyPrompt() {
        if (!completePrompt.trim()) {
            copyStatus.textContent = "No prompt text is available to copy.";
            return;
        }

        try {
            await navigator.clipboard.writeText(completePrompt);

            copyButtonText.textContent = "Copied Successfully!";
            copyStatus.textContent = "Full prompt copied to your clipboard.";

        } catch (err) {
            // Fallback for browsers where Clipboard API is unavailable.
            try {
                const temporaryTextArea = document.createElement("textarea");

                temporaryTextArea.value = completePrompt;
                temporaryTextArea.setAttribute("readonly", "");
                temporaryTextArea.style.position = "fixed";
                temporaryTextArea.style.opacity = "0";

                document.body.appendChild(temporaryTextArea);
                temporaryTextArea.select();

                const copied = document.execCommand("copy");
                temporaryTextArea.remove();

                if (copied) {
                    copyButtonText.textContent = "Copied Successfully!";
                    copyStatus.textContent =
                        "Full prompt copied to your clipboard.";
                } else {
                    throw new Error("Copy command was unsuccessful.");
                }

            } catch (fallbackError) {
                console.error("Copy failed:", fallbackError);

                copyStatus.textContent =
                    "Copy failed. Please select and copy the prompt manually.";
                return;
            }
        }

        copyButton.disabled = true;

        window.setTimeout(() => {
            copyButton.disabled = false;
            copyButtonText.textContent = "Copy Full Prompt";
            copyStatus.textContent = "";
        }, 2200);
    }

    if (copyButton) {
        copyButton.addEventListener("click", copyPrompt);
    }

    loadPrompt();
});