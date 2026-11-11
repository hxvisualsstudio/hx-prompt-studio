"use strict";

document.addEventListener("DOMContentLoaded", async () => {

const SUPABASE_URL = "https://ptguetcuvkbnspzdobkj.supabase.co";
const SUPABASE_KEY = "sb_publishable_rgJhqO8JwC5ZqI2fBVQ11Q_NjCL2BZS";

const grid = document.getElementById("morePromptsGrid");
const status = document.getElementById("morePromptsStatus");

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

try {
    const { data, error } = await supabaseClient
        .from("Prompts")
        .select("id, image_url, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

    if (error) throw error;

    const extraPrompts = (data || []).slice(5);

    if (!extraPrompts.length) {
        status.textContent = "More prompts coming soon!";
        return;
    }

    const fragment = document.createDocumentFragment();

    extraPrompts.forEach((item, index) => {
        if (!item.image_url) return;

        const link = document.createElement("a");
        link.className = "more-prompt-image-link";

        const promptNumber = index + 6;

        link.href = `prompt.html?id=${encodeURIComponent(item.id)}&v=${promptNumber}`;
        link.setAttribute("aria-label", `Open prompt ${promptNumber}`);

        const img = document.createElement("img");
        img.className = "more-prompt-image";
        img.src = item.image_url;
        img.alt = `AI prompt ${promptNumber}`;
        img.loading = "lazy";
        img.decoding = "async";

        link.appendChild(img);
        fragment.appendChild(link);
    });

    grid.appendChild(fragment);

    status.textContent = grid.children.length
        ? ""
        : "More images coming soon!";

} catch (error) {
    console.error("More prompts loading error:", error);
    status.textContent = "Unable to load images. Please try again later.";
}

});
