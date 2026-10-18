// ======================================
// HX PROMPT STUDIO — ADMIN
// Created by HIMANSHU SHEKHAR
// ======================================


// ======================================
// SUPABASE CONFIGURATION
// ======================================

const SUPABASE_URL =
    "https://ptguetcuvkbnspzdobkj.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_rgJhqO8JwC5ZqI2fBVQ11Q_NjCL2BZS";

const ADMIN_USER_ID =
    "464c9d06-fad7-4c89-9a6a-2e2c54c0d8e8";

const STORAGE_BUCKET = "prompt-images";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

let supabaseClient = null;
let isBusy = false;

const $ = (id) => document.getElementById(id);


// ======================================
// INITIALIZE
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    initializeAdmin
);

async function initializeAdmin() {
    if (!window.supabase) {
        showMessage(
            "loginMessage",
            "Supabase library load nahi hui. Internet aur HTML script order check karo.",
            true
        );

        return;
    }

    try {
        supabaseClient = window.supabase.createClient(
            SUPABASE_URL,
            SUPABASE_PUBLISHABLE_KEY
        );

        const loginForm = $("loginForm");
        const logoutButton = $("logoutButton");
        const promptForm = $("promptForm");
        const saveDraftButton = $("saveDraftButton");
        const refreshButton = $("refreshButton");
        const imageUpload = $("imageUpload");

        if (
            !loginForm ||
            !logoutButton ||
            !promptForm ||
            !saveDraftButton ||
            !refreshButton ||
            !imageUpload
        ) {
            throw new Error(
                "Required HTML elements nahi mile. admin/index.html ke IDs check karo."
            );
        }

        loginForm.addEventListener(
            "submit",
            handleLogin
        );

        logoutButton.addEventListener(
            "click",
            handleLogout
        );

        promptForm.addEventListener(
            "submit",
            function (event) {
                savePrompt(event, true);
            }
        );

        saveDraftButton.addEventListener(
            "click",
            function () {
                savePrompt(null, false);
            }
        );

        refreshButton.addEventListener(
            "click",
            loadPrompts
        );

        imageUpload.addEventListener(
            "change",
            handleImagePreview
        );

        const { data, error } =
            await supabaseClient.auth.getSession();

        if (error) {
            throw error;
        }

        if (data.session) {
            await verifyAdmin();
        } else {
            showLogin();
        }

        supabaseClient.auth.onAuthStateChange(
            function (event) {
                if (event === "SIGNED_OUT") {
                    showLogin();
                }
            }
        );

    } catch (error) {
        console.error(
            "Initialization error:",
            error
        );

        showMessage(
            "loginMessage",
            "Initialization failed: " + error.message,
            true
        );
    }
}


// ======================================
// LOGIN
// ======================================

async function handleLogin(event) {
    event.preventDefault();

    if (isBusy) return;

    const email = $("adminEmail").value.trim();
    const password = $("adminPassword").value;

    if (!email || !password) {
        showMessage(
            "loginMessage",
            "Email aur password dono bharo.",
            true
        );

        return;
    }

    isBusy = true;

    $("loginButton").disabled = true;
    $("loginButton").textContent = "Please wait...";

    showMessage(
        "loginMessage",
        "Logging in...",
        false
    );

    try {
        const { data, error } =
            await supabaseClient.auth.signInWithPassword({
                email: email,
                password: password
            });

        if (error) {
            throw error;
        }

        if (!data.user) {
            throw new Error(
                "Login ke baad user nahi mila."
            );
        }

        if (data.user.id !== ADMIN_USER_ID) {
            await supabaseClient.auth.signOut();

            throw new Error(
                "Is account ko admin access nahi diya gaya hai. Admin UID check karo."
            );
        }

        showMessage(
            "loginMessage",
            "",
            false
        );

        await showDashboard();

    } catch (error) {
        console.error(
            "Login error:",
            error
        );

        showLogin();

        showMessage(
            "loginMessage",
            "Login failed: " + error.message,
            true
        );

    } finally {
        isBusy = false;

        $("loginButton").disabled = false;
        $("loginButton").textContent = "Log In";
    }
}


// ======================================
// VERIFY ADMIN
// ======================================

async function verifyAdmin() {
    try {
        const { data, error } =
            await supabaseClient.auth.getUser();

        if (error) {
            throw error;
        }

        if (!data.user) {
            showLogin();
            return;
        }

        if (data.user.id !== ADMIN_USER_ID) {
            await supabaseClient.auth.signOut();

            showLogin();

            showMessage(
                "loginMessage",
                "Is account ko admin access nahi diya gaya hai.",
                true
            );

            return;
        }

        await showDashboard();

    } catch (error) {
        console.error(
            "Admin verification error:",
            error
        );

        showLogin();

        showMessage(
            "loginMessage",
            error.message ||
                "Admin verification failed.",
            true
        );
    }
}


// ======================================
// SHOW / HIDE PANELS
// ======================================

async function showDashboard() {
    $("loginPanel").hidden = true;
    $("dashboardPanel").hidden = false;

    await loadPrompts();
}

function showLogin() {
    $("loginPanel").hidden = false;
    $("dashboardPanel").hidden = true;
}


// ======================================
// LOGOUT
// ======================================

async function handleLogout() {
    if (!supabaseClient) return;

    try {
        const { error } =
            await supabaseClient.auth.signOut();

        if (error) {
            throw error;
        }

        showLogin();

        showMessage(
            "loginMessage",
            "You have logged out.",
            false
        );

    } catch (error) {
        console.error(
            "Logout error:",
            error
        );

        showMessage(
            "loginMessage",
            "Logout error: " + error.message,
            true
        );
    }
}


// ======================================
// MESSAGE HELPER
// ======================================

function showMessage(
    id,
    text,
    isError = false
) {
    const element = $(id);

    if (!element) return;

    element.textContent = text || "";

    element.classList.toggle(
        "error",
        Boolean(text) && isError
    );

    element.classList.toggle(
        "success",
        Boolean(text) && !isError
    );
}


// ======================================
// IMAGE PREVIEW
// ======================================

function handleImagePreview() {
    const imageUpload = $("imageUpload");
    const imagePreview = $("imagePreview");
    const previewImage = $("previewImage");

    const file = imageUpload.files[0];

    if (!file) {
        imagePreview.hidden = true;
        previewImage.removeAttribute("src");
        return;
    }

    if (!file.type.startsWith("image/")) {
        imageUpload.value = "";
        imagePreview.hidden = true;

        showMessage(
            "formMessage",
            "Sirf image file select karo.",
            true
        );

        return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
        imageUpload.value = "";
        imagePreview.hidden = true;

        showMessage(
            "formMessage",
            "Image maximum 5 MB ki honi chahiye.",
            true
        );

        return;
    }

    previewImage.src = URL.createObjectURL(file);

    imagePreview.hidden = false;

    showMessage(
        "formMessage",
        "",
        false
    );
}


// ======================================
// SAVE / PUBLISH PROMPT
// ======================================

async function savePrompt(event, publish) {
    if (event) {
        event.preventDefault();
    }

    if (isBusy) return;

    const title = $("promptTitle").value.trim();

    const prompt = $("promptText").value.trim();
    const tags = $("promptTags").value
        .split(",")
        .map(tag => tag.trim())
        .filter(Boolean);

    const file = $("imageUpload").files[0];

    // Validate required fields.

    if (!title || !prompt) {
        showMessage(
            "formMessage",
"Title aur prompt fill karo.",
            true
        );

        return;
    }

    if (!file || !file.type.startsWith("image/")) {
        showMessage(
            "formMessage",
            "Ek image select karna zaroori hai.",
            true
        );

        return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
        showMessage(
            "formMessage",
            "Image maximum 5 MB ki honi chahiye.",
            true
        );

        return;
    }

    isBusy = true;
    const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();

console.log("Current session:", sessionData.session);
console.log("Session error:", sessionError);
console.log("Current user ID:", sessionData.session?.user?.id);

    $("publishButton").disabled = true;
    $("saveDraftButton").disabled = true;

    showMessage(
        "formMessage",
        "Image upload aur prompt save ho raha hai...",
        false
    );

    try {
        // Verify the currently logged-in user.

        const {
            data: userData,
            error: userError
        } = await supabaseClient.auth.getUser();

        if (userError) {
            throw userError;
        }

        const user = userData.user;

        if (!user || user.id !== ADMIN_USER_ID) {
            throw new Error(
                "Admin authorization required."
            );
        }

        // Create a safe image filename.

        const safeName = file.name.replace(
            /[^a-zA-Z0-9._-]/g,
            "_"
        );

        const imagePath =
            `${user.id}/${Date.now()}-${safeName}`;

        // Upload the image to Supabase Storage.

        const {
            error: uploadError
        } = await supabaseClient.storage
            .from(STORAGE_BUCKET)
            .upload(imagePath, file, {
                cacheControl: "3600",
                upsert: false
            });

        if (uploadError) {
            throw uploadError;
        }

        // Get the public URL for the uploaded image.

        const {
            data: publicData
        } = supabaseClient.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(imagePath);

        if (!publicData || !publicData.publicUrl) {
            throw new Error(
                "Uploaded image ka public URL nahi mila."
            );
        }

        // Save the prompt to the Prompts table.
        // IMPORTANT: This insert block appears only once.

        const {
            error: insertError
        } = await supabaseClient
            .from("Prompts")
            .insert({
                title: title,
                prompt: prompt,
                category: "Other",
                tags: tags,
                image_url: publicData.publicUrl,
                is_published: publish
            });

        if (insertError) {
            throw insertError;
        }

        // Reset the form after a successful save.

        $("promptForm").reset();

        $("imagePreview").hidden = true;

        $("previewImage").removeAttribute("src");

        showMessage(
            "formMessage",
            publish
                ? "Prompt successfully published!"
                : "Draft saved successfully!",
            false
        );

        // Refresh the prompt list.

        await loadPrompts();

    } catch (error) {
        console.error(
            "Save prompt error:",
            error
        );

        showMessage(
            "formMessage",
            "Save failed: " +
                (error.message || String(error)),
            true
        );

    } finally {
        isBusy = false;

        $("publishButton").disabled = false;
        $("saveDraftButton").disabled = false;
    }
}


// ======================================
// LOAD PROMPTS
// ======================================

async function loadPrompts() {
    const listMessage = $("listMessage");
    const contentList = $("contentList");

    listMessage.textContent = "Loading prompts...";

    contentList.replaceChildren();

    try {
        const {
            data,
            error
        } = await supabaseClient
            .from("Prompts")
            .select(
                "id,title,prompt,category,tags,image_url,is_published,created_at"
            )
            .order(
                "created_at",
                { ascending: false }
            );

        if (error) {
            throw error;
        }

        const prompts = data || [];

        $("totalPrompts").textContent =
            prompts.length;

        $("publishedCount").textContent =
            prompts.filter(
                item => item.is_published
            ).length;

        $("draftCount").textContent =
            prompts.filter(
                item => !item.is_published
            ).length;

        listMessage.textContent = prompts.length
            ? `${prompts.length} prompt(s) in your library.`
            : "Abhi koi prompt nahi hai.";

        prompts.forEach(item => {
            const card =
                document.createElement("article");

            card.className = "prompt-card";

            // Prompt image.

            const image =
                document.createElement("img");

            image.src = item.image_url || "";

            image.alt =
                item.title || "Prompt image";

            image.loading = "lazy";

            // Prompt details container.

            const details =
                document.createElement("div");

            // Title.

            const title =
                document.createElement("h3");

            title.textContent =
                item.title || "Untitled Prompt";

            

            // Publication status.

            const status =
                document.createElement("span");

            status.className = "status";

            status.textContent =
                item.is_published
                    ? "Published"
                    : "Draft";

            // Prompt preview.

            const text =
                document.createElement("p");

            text.textContent =
                (item.prompt || "").slice(0, 220);

            // Delete button.

            const deleteButton =
                document.createElement("button");

            deleteButton.type = "button";

            deleteButton.className =
                "delete-button";

            deleteButton.textContent = "Delete";

            deleteButton.addEventListener(
                "click",
                function () {
                    deletePrompt(item.id);
                }
            );

           // Add everything to the card.

details.append(
    title,
    status,
    text,
    deleteButton
);

            card.append(
                image,
                details
            );

            contentList.append(card);
        });

    } catch (error) {
        console.error(
            "Load prompts error:",
            error
        );

        listMessage.textContent =
            "Prompts load nahi hue: " +
            error.message;
    }
}


// ======================================
// DELETE PROMPT
// ======================================

async function deletePrompt(id) {
    const confirmed = confirm(
        "Kya aap is prompt ko delete karna chahte hain?"
    );

    if (!confirmed) return;

    try {
        // Verify the logged-in administrator.

        const {
            data: userData,
            error: userError
        } = await supabaseClient.auth.getUser();

        if (userError) {
            throw userError;
        }

        if (
            !userData.user ||
            userData.user.id !== ADMIN_USER_ID
        ) {
            throw new Error(
                "Admin authorization required."
            );
        }

        // Delete the prompt record.

        const {
            error
        } = await supabaseClient
            .from("Prompts")
            .delete()
            .eq("id", id);

        if (error) {
            throw error;
        }

        // Refresh the list after deletion.

        await loadPrompts();

    } catch (error) {
        console.error(
            "Delete prompt error:",
            error
        );

        alert(
            "Delete failed: " + error.message
        );
    }
}