// ======================================================
// MyVault - script.js
// Complete replacement
// Clean JWT authentication flow
// ======================================================

const API_URL = "http://127.0.0.1:8000";

console.log("MyVault script.js loaded");

// ======================================================
// SECURITY / HTML HELPERS
// ======================================================

function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ======================================================
// AUTHENTICATION
// ======================================================

function getAccessToken() {
    return localStorage.getItem("access_token");
}


function getStoredUser() {
    return {
        user_id: localStorage.getItem("user_id"),
        name: localStorage.getItem("user_name") || "User",
        email: localStorage.getItem("user_email") || ""
    };
}


function isLoggedIn() {
    return !!getAccessToken() && !!localStorage.getItem("user_id");
}


function getAuthHeaders() {

    const token = getAccessToken();

    if (!token) {
        return {};
    }

    return {
        Authorization: `Bearer ${token}`
    };
}


// ======================================================
// CLEAR SESSION
// ======================================================

function clearSession() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("user_email");
}


// ======================================================
// HANDLE AUTHENTICATION FAILURE
// ======================================================

function handleAuthenticationFailure(showAlert = true) {

    clearSession();

    if (showAlert) {
        alert("Your session has expired. Please login again.");
    }

    showLogin();
}


// ======================================================
// SECURE FETCH
// All protected API requests use this function
// ======================================================

async function secureFetch(url, options = {}) {

    const token = getAccessToken();

    if (!token) {
        handleAuthenticationFailure(false);
        throw new Error("Authentication required.");
    }

    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    if (response.status === 401) {

        handleAuthenticationFailure(true);

        throw new Error("Authentication expired.");
    }

    return response;
}


// ======================================================
// API RESPONSE HELPER
// ======================================================

async function readResponse(response) {

    const contentType =
        response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {

        try {
            return await response.json();
        } catch (error) {
            return {};
        }
    }

    try {

        const text = await response.text();

        return {
            detail: text
        };

    } catch (error) {

        return {};
    }
}


// ======================================================
// ERROR MESSAGE HELPER
// ======================================================

function getErrorMessage(data, fallback) {

    if (!data) {
        return fallback;
    }

    if (typeof data.detail === "string") {
        return data.detail;
    }

    if (Array.isArray(data.detail)) {

        return data.detail
            .map(item => item.msg || JSON.stringify(item))
            .join(", ");
    }

    if (typeof data.message === "string") {
        return data.message;
    }

    return fallback;
}


// ======================================================
// SHOW REGISTER
// ======================================================

function showRegister() {

    const content =
        document.getElementById("content");

    if (!content) {
        return;
    }

    content.innerHTML = `

        <div class="register-section">

            <h2>📝 Create Account</h2>

            <form onsubmit="register(event)">

                <input
                    type="text"
                    id="registerName"
                    placeholder="Full Name"
                    maxlength="100"
                    required
                >

                <input
                    type="email"
                    id="registerEmail"
                    placeholder="Email"
                    maxlength="150"
                    required
                >

                <input
                    type="password"
                    id="registerPassword"
                    placeholder="Password"
                    minlength="8"
                    required
                >

                <button type="submit">
                    Register
                </button>

            </form>

            <p id="registerMessage"></p>

            <button onclick="showLogin()">
                Already have an account? Login
            </button>

        </div>

    `;
}


// ======================================================
// REGISTER
// ======================================================

async function register(event) {

    event.preventDefault();

    const name =
        document.getElementById("registerName").value.trim();

    const email =
        document.getElementById("registerEmail").value.trim();

    const password =
        document.getElementById("registerPassword").value;

    const message =
        document.getElementById("registerMessage");


    if (!name) {

        message.innerText =
            "❌ Please enter your name.";

        return;
    }


    if (!email) {

        message.innerText =
            "❌ Please enter your email.";

        return;
    }


    if (password.length < 8) {

        message.innerText =
            "❌ Password must contain at least 8 characters.";

        return;
    }


    message.innerText =
        "⏳ Creating account...";


    try {

        const response = await fetch(
            `${API_URL}/register`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            }
        );


        const data =
            await readResponse(response);


        if (!response.ok) {

            message.innerText =
                "❌ " +
                getErrorMessage(
                    data,
                    "Registration failed."
                );

            return;
        }


        message.innerText =
            "✅ Registration successful!";


        setTimeout(() => {
            showLogin();
        }, 1000);


    } catch (error) {

        console.error(
            "Registration error:",
            error
        );

        message.innerText =
            "❌ Could not connect to server.";
    }
}


// ======================================================
// SHOW LOGIN
// ======================================================

function showLogin() {

    const content =
        document.getElementById("content");

    if (!content) {
        return;
    }

    content.innerHTML = `

        <div class="login-section">

            <h2>🔐 Login</h2>

            <form onsubmit="login(event)">

                <input
                    type="email"
                    id="loginEmail"
                    placeholder="Email"
                    required
                >

                <input
                    type="password"
                    id="loginPassword"
                    placeholder="Password"
                    required
                >

                <button type="submit">
                    Login
                </button>

            </form>

            <p id="loginMessage"></p>

            <button onclick="showRegister()">
                Create Account
            </button>

        </div>

    `;
}


// ======================================================
// LOGIN
// ======================================================

async function login(event) {

    event.preventDefault();

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;

    const message =
        document.getElementById("loginMessage");


    if (!email) {

        message.innerText =
            "❌ Please enter your email.";

        return;
    }


    if (!password) {

        message.innerText =
            "❌ Please enter your password.";

        return;
    }


    message.innerText =
        "⏳ Logging in...";


    try {

        const response = await fetch(
            `${API_URL}/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email,
                    password
                })
            }
        );


        const data =
            await readResponse(response);


        console.log(
            "Login response:",
            data
        );


        if (!response.ok) {

            message.innerText =
                "❌ " +
                getErrorMessage(
                    data,
                    "Login failed."
                );

            return;
        }


        // ----------------------------------------------
        // Verify JWT
        // ----------------------------------------------

        if (!data.access_token) {

            console.error(
                "Missing access_token:",
                data
            );

            message.innerText =
                "❌ Login response is missing access token.";

            return;
        }


        // ----------------------------------------------
        // Verify user
        // ----------------------------------------------

        if (
            data.user_id === undefined ||
            data.user_id === null
        ) {

            console.error(
                "Missing user_id:",
                data
            );

            message.innerText =
                "❌ Login response is missing user information.";

            return;
        }


        // ----------------------------------------------
        // Save authentication state
        // ----------------------------------------------

        localStorage.setItem(
            "access_token",
            data.access_token
        );

        localStorage.setItem(
            "user_id",
            String(data.user_id)
        );

        localStorage.setItem(
            "user_name",
            data.name || "User"
        );

        localStorage.setItem(
            "user_email",
            data.email || email
        );


        message.innerText =
            "✅ Login successful!";


        setTimeout(() => {

            showDashboard({
                user_id: data.user_id,
                name: data.name || "User",
                email: data.email || email
            });

        }, 300);


    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        message.innerText =
            "❌ Could not connect to server.";
    }
}


// ======================================================
// DASHBOARD
// ======================================================

function showDashboard(user) {

    if (!user || !user.user_id) {

        showLogin();

        return;
    }


    const content =
        document.getElementById("content");

    if (!content) {
        return;
    }


    content.innerHTML = `

        <div class="dashboard">

            <h2>
                Welcome,
                ${escapeHTML(user.name || "User")}! 👋
            </h2>

            <p>
                ${escapeHTML(user.email || "")}
            </p>

            <hr>

            <h3>
                MyVault Dashboard
            </h3>

            <div class="dashboard-buttons">

                <button onclick="uploadDocument()">
                    📤 Upload Document
                </button>

                <button onclick="showDocuments()">
                    📁 My Documents
                </button>

                <button onclick="showEvents()">
                    📅 My Events
                </button>

                <button onclick="searchDocuments()">
                    🔎 Search
                </button>

            </div>

            <div class="vault-info">

                <div>
                    📄
                    <h4>Bills</h4>
                    <p id="billCount">
                        Loading...
                    </p>
                </div>

                <div>
                    🧾
                    <h4>Receipts</h4>
                    <p id="receiptCount">
                        Loading...
                    </p>
                </div>

                <div>
                    📑
                    <h4>Certificates</h4>
                    <p id="certificateCount">
                        Loading...
                    </p>
                </div>

            </div>

            <button onclick="logout()">
                Logout
            </button>

        </div>

    `;


    loadDashboardStats();
}


// ======================================================
// DASHBOARD STATISTICS
// ======================================================

async function loadDashboardStats() {

    if (!isLoggedIn()) {
        return;
    }


    try {

        const response =
            await secureFetch(
                `${API_URL}/files`
            );


        const data =
            await readResponse(response);


        if (!response.ok) {

            console.error(
                getErrorMessage(
                    data,
                    "Could not load statistics."
                )
            );

            return;
        }


        let files = data;


        if (
            data &&
            !Array.isArray(data) &&
            Array.isArray(data.files)
        ) {

            files = data.files;
        }


        let bills = 0;
        let receipts = 0;
        let certificates = 0;


        if (Array.isArray(files)) {

            files.forEach(file => {

                const category =
                    String(
                        file.category || ""
                    )
                    .toLowerCase()
                    .trim();


                if (category === "bill") {
                    bills++;
                }

                else if (category === "receipt") {
                    receipts++;
                }

                else if (category === "certificate") {
                    certificates++;
                }

            });
        }


        const billCount =
            document.getElementById("billCount");

        const receiptCount =
            document.getElementById("receiptCount");

        const certificateCount =
            document.getElementById("certificateCount");


        if (billCount) {

            billCount.innerText =
                `${bills} document${bills !== 1 ? "s" : ""}`;
        }


        if (receiptCount) {

            receiptCount.innerText =
                `${receipts} document${receipts !== 1 ? "s" : ""}`;
        }


        if (certificateCount) {

            certificateCount.innerText =
                `${certificates} document${certificates !== 1 ? "s" : ""}`;
        }


    } catch (error) {

        console.error(
            "Dashboard statistics error:",
            error
        );
    }
}


// ======================================================
// UPLOAD PAGE
// ======================================================

function uploadDocument() {

    if (!isLoggedIn()) {

        alert("Please login first.");

        showLogin();

        return;
    }


    document.getElementById("content").innerHTML = `

        <div class="upload-section">

            <h2>
                📤 Upload Document
            </h2>

            <p>
                Select a bill, receipt, certificate,
                PDF, or image.
            </p>

            <input
                type="file"
                id="documentFile"
                accept=".pdf,.jpg,.jpeg,.png"
                required
            >

            <br><br>

            <label>
                Category:
            </label>

            <select id="documentCategory">

                <option value="bill">
                    Bill
                </option>

                <option value="receipt">
                    Receipt
                </option>

                <option value="certificate">
                    Certificate
                </option>

                <option value="other">
                    Other
                </option>

            </select>

            <br><br>

            <label>
                Document Date:
            </label>

            <input
                type="date"
                id="documentDate"
            >

            <br><br>

            <button onclick="sendDocument()">
                📤 Upload
            </button>

            <button onclick="goBackToDashboard()">
                ← Back to Dashboard
            </button>

            <p id="uploadMessage"></p>

        </div>

    `;
}


// ======================================================
// SEND DOCUMENT
// ======================================================

async function sendDocument() {

    const fileInput =
        document.getElementById("documentFile");

    const message =
        document.getElementById("uploadMessage");

    const categorySelect =
        document.getElementById("documentCategory");

    const documentDate =
        document.getElementById("documentDate");


    if (
        !fileInput ||
        !fileInput.files ||
        fileInput.files.length === 0
    ) {

        message.innerText =
            "❌ Please select a file first.";

        return;
    }


    const file =
        fileInput.files[0];


    if (!isLoggedIn()) {

        message.innerText =
            "❌ Please login first.";

        showLogin();

        return;
    }


    // ----------------------------------------------
    // File type validation
    // ----------------------------------------------

    const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png"
    ];


    if (
        file.type &&
        !allowedTypes.includes(file.type)
    ) {

        message.innerText =
            "❌ Only PDF, JPG, JPEG and PNG files are allowed.";

        return;
    }


    // ----------------------------------------------
    // File size validation
    // ----------------------------------------------

    const maxFileSize =
        10 * 1024 * 1024;


    if (file.size > maxFileSize) {

        message.innerText =
            "❌ File size must be 10 MB or less.";

        return;
    }


    // ----------------------------------------------
    // Category detection
    // ----------------------------------------------

    let category =
        categorySelect.value;

    const filename =
        file.name.toLowerCase();


    if (
        filename.includes("bill") ||
        filename.includes("electricity") ||
        filename.includes("water") ||
        filename.includes("gas") ||
        filename.includes("utility")
    ) {

        category = "bill";
        categorySelect.value = "bill";
    }

    else if (
        filename.includes("receipt") ||
        filename.includes("invoice")
    ) {

        category = "receipt";
        categorySelect.value = "receipt";
    }

    else if (
        filename.includes("certificate") ||
        filename.includes("degree") ||
        filename.includes("marksheet")
    ) {

        category = "certificate";
        categorySelect.value = "certificate";
    }


    // ----------------------------------------------
    // FormData
    // ----------------------------------------------

    const formData =
        new FormData();


    formData.append(
        "uploaded_file",
        file
    );


    message.innerText =
        "⏳ Uploading...";


    try {

        let url =
            `${API_URL}/upload` +
            `?user_id=${encodeURIComponent(
                localStorage.getItem("user_id")
            )}` +
            `&category=${encodeURIComponent(category)}`;


        if (
            documentDate &&
            documentDate.value
        ) {

            url +=
                `&document_date=${encodeURIComponent(
                    documentDate.value
                )}`;
        }


        const response =
            await secureFetch(
                url,
                {
                    method: "POST",
                    body: formData
                }
            );


        const data =
            await readResponse(response);


        console.log(
            "Upload response:",
            data
        );


        if (!response.ok) {

            message.innerText =
                "❌ " +
                getErrorMessage(
                    data,
                    "Upload failed."
                );

            return;
        }


        message.innerText =
            `✅ ${
                data.message ||
                "Upload successful!"
            }`;


        fileInput.value = "";


        await loadDashboardStats();


    } catch (error) {

        console.error(
            "Upload error:",
            error
        );


        if (
            error.message !==
            "Authentication expired."
        ) {

            message.innerText =
                "❌ Could not connect to server.";
        }
    }
}


// ======================================================
// SHOW DOCUMENTS
// ======================================================

async function showDocuments() {

    if (!isLoggedIn()) {

        alert("Please login first.");

        showLogin();

        return;
    }


    document.getElementById("content").innerHTML = `

        <div class="documents-section">

            <h2>📁 My Documents</h2>

            <p>⏳ Loading documents...</p>

        </div>

    `;


    try {

        const response =
            await secureFetch(
                `${API_URL}/files`
            );


        const data =
            await readResponse(response);


        if (!response.ok) {

            document.getElementById(
                "content"
            ).innerHTML = `

                <div class="documents-section">

                    <h2>📁 My Documents</h2>

                    <p>
                        ❌ ${
                            escapeHTML(
                                getErrorMessage(
                                    data,
                                    "Could not load documents."
                                )
                            )
                        }
                    </p>

                    <button onclick="goBackToDashboard()">
                        ← Back to Dashboard
                    </button>

                </div>

            `;

            return;
        }


        let files = data;


        if (
            data &&
            !Array.isArray(data) &&
            Array.isArray(data.files)
        ) {

            files = data.files;
        }


        if (
            !Array.isArray(files) ||
            files.length === 0
        ) {

            document.getElementById(
                "content"
            ).innerHTML = `

                <div class="documents-section">

                    <h2>📁 My Documents</h2>

                    <p>
                        📭 No documents uploaded yet.
                    </p>

                    <button onclick="uploadDocument()">
                        📤 Upload Document
                    </button>

                    <button onclick="goBackToDashboard()">
                        ← Back to Dashboard
                    </button>

                </div>

            `;

            return;
        }


        let documentsHTML = "";


        files.forEach(file => {

            const id =
                Number(file.id);


            const filename =
                escapeHTML(
                    file.filename ||
                    "Unnamed file"
                );


            const category =
                escapeHTML(
                    file.category ||
                    "Other"
                );


            const documentDate =
                escapeHTML(
                    file.document_date ||
                    "Not available"
                );


            const fileType =
                escapeHTML(
                    file.file_type ||
                    "Unknown"
                );


            const createdAt =
                escapeHTML(
                    file.created_at ||
                    "Not available"
                );


            const ocrText =
                String(
                    file.ocr_text || ""
                );


            const safeOCR =
                escapeHTML(
                    ocrText.substring(0, 500)
                );


            documentsHTML += `

                <div class="document-card">

                    <h4>
                        📄 ${filename}
                    </h4>

                    <p>
                        <strong>Category:</strong>
                        ${category}
                    </p>

                    <p>
                        <strong>Document Date:</strong>
                        ${documentDate}
                    </p>

                    <p>
                        <strong>File Type:</strong>
                        ${fileType}
                    </p>

                    <p>
                        <strong>OCR Preview:</strong>
                    </p>

                    <div class="ocr-text">
                        ${
                            safeOCR ||
                            "No text extracted from this document."
                        }
                    </div>

                    <p>
                        <strong>Uploaded:</strong>
                        ${createdAt}
                    </p>

                    <button
                        onclick="viewDocument(${id})"
                    >
                        👁️ View
                    </button>

                    <button
                        onclick="viewOCR(${id})"
                    >
                        📝 View OCR Text
                    </button>

                    <button
                        onclick="showDocumentDetails(${id})"
                    >
                        ℹ️ Details
                    </button>

                    <button
                        onclick="deleteDocument(${id})"
                    >
                        🗑️ Delete
                    </button>

                </div>

            `;
        });


        document.getElementById(
            "content"
        ).innerHTML = `

            <div class="documents-section">

                <h2>📁 My Documents</h2>

                ${documentsHTML}

                <br>

                <button onclick="uploadDocument()">
                    📤 Upload Document
                </button>

                <button onclick="goBackToDashboard()">
                    ← Back to Dashboard
                </button>

            </div>

        `;


    } catch (error) {

        console.error(
            "showDocuments error:",
            error
        );

        if (
            error.message !==
            "Authentication expired."
        ) {

            document.getElementById(
                "content"
            ).innerHTML = `

                <div class="documents-section">

                    <h2>📁 My Documents</h2>

                    <p>
                        ❌ Could not connect to server.
                    </p>

                    <button onclick="goBackToDashboard()">
                        ← Back to Dashboard
                    </button>

                </div>

            `;
        }
    }
}


// ======================================================
// VIEW OCR
// ======================================================

async function viewOCR(fileId) {

    if (!isLoggedIn()) {

        alert("Please login first.");

        showLogin();

        return;
    }


    if (!fileId) {

        alert("Invalid document.");

        return;
    }


    try {

        const response =
            await secureFetch(
                `${API_URL}/files/${encodeURIComponent(fileId)}/ocr`
            );


        const data =
            await readResponse(response);


        console.log(
            "OCR status:",
            response.status
        );

        console.log(
            "OCR response:",
            data
        );


        if (!response.ok) {

            throw new Error(
                getErrorMessage(
                    data,
                    "Could not load OCR text."
                )
            );
        }


        const text =
            data.ocr_text || "";


        const filename =
            escapeHTML(
                data.filename ||
                "Document"
            );


        document.getElementById(
            "content"
        ).innerHTML = `

            <div class="document-text-section">

                <h2>
                    📄 ${filename}
                </h2>

                <hr>

                ${
                    text
                        ? `
                            <pre>${escapeHTML(text)}</pre>
                          `
                        : `
                            <p>
                                📭 No OCR text available.
                            </p>
                          `
                }

                <br>

                <button onclick="showDocuments()">
                    ← Back to Documents
                </button>

            </div>

        `;


    } catch (error) {

        console.error(
            "OCR viewer error:",
            error
        );


        if (
            error.message !==
            "Authentication expired."
        ) {

            alert(
                error.message ||
                "Could not load OCR text."
            );
        }
    }
}


// ======================================================
// EVENTS PAGE
// ======================================================

async function showEvents() {

    if (!isLoggedIn()) {

        alert("Please login first.");

        showLogin();

        return;
    }


    document.getElementById("content").innerHTML = `

        <div class="events-section">

            <h2>📅 My Events</h2>

            <div id="eventsList">

                <p>
                    ⏳ Loading events...
                </p>

            </div>

            <hr>

            <h3>
                ➕ Create Event
            </h3>

            <input
                type="text"
                id="eventTitle"
                placeholder="Event title"
                maxlength="200"
                required
            >

            <br><br>

            <textarea
                id="eventDescription"
                placeholder="Event description"
                maxlength="1000"
            ></textarea>

            <br><br>

            <input
                type="date"
                id="eventDate"
                required
            >

            <br><br>

            <button onclick="createMyVaultEvent()">
                ➕ Create Event
            </button>

            <button onclick="goBackToDashboard()">
                ← Back to Dashboard
            </button>

        </div>

    `;


    await loadEvents();
}


// ======================================================
// LOAD EVENTS
// ======================================================

async function loadEvents() {

    const eventsList =
        document.getElementById("eventsList");


    if (!eventsList) {
        return;
    }


    try {

        const response =
            await secureFetch(
                `${API_URL}/events`
            );


        const data =
            await readResponse(response);


        if (!response.ok) {

            eventsList.innerHTML = `

                <p>
                    ❌ ${
                        escapeHTML(
                            getErrorMessage(
                                data,
                                "Could not load events."
                            )
                        )
                    }
                </p>

            `;

            return;
        }


        let events = data;


        if (
            data &&
            !Array.isArray(data) &&
            Array.isArray(data.events)
        ) {

            events = data.events;
        }


        if (
            !Array.isArray(events) ||
            events.length === 0
        ) {

            eventsList.innerHTML = `

                <p>
                    📭 No events created yet.
                </p>

            `;

            return;
        }


        let html = "";


        events.forEach(event => {

            const id =
                Number(event.id);


            html += `

                <div class="event-card">

                    <h4>
                        📅 ${
                            escapeHTML(
                                event.title ||
                                "Untitled Event"
                            )
                        }
                    </h4>

                    <p>
                        <strong>Description:</strong>
                        ${
                            escapeHTML(
                                event.description ||
                                "No description"
                            )
                        }
                    </p>

                    <p>
                        <strong>Date:</strong>
                        ${
                            escapeHTML(
                                event.event_date ||
                                "Not available"
                            )
                        }
                    </p>

                    <button
                        onclick="deleteEvent(${id})"
                    >
                        🗑️ Delete
                    </button>

                </div>

            `;
        });


        eventsList.innerHTML =
            html;


    } catch (error) {

        console.error(
            "Load events error:",
            error
        );


        if (
            error.message !==
            "Authentication expired."
        ) {

            eventsList.innerHTML = `

                <p>
                    ❌ Could not connect to server.
                </p>

            `;
        }
    }
}


// ======================================================
// CREATE EVENT
// ======================================================

async function createMyVaultEvent() {

    const titleElement =
        document.getElementById("eventTitle");

    const descriptionElement =
        document.getElementById("eventDescription");

    const dateElement =
        document.getElementById("eventDate");


    if (
        !titleElement ||
        !descriptionElement ||
        !dateElement
    ) {

        alert("Event form is unavailable.");

        return;
    }


    const title =
        titleElement.value.trim();

    const description =
        descriptionElement.value.trim();

    const eventDate =
        dateElement.value;


    if (!title) {

        alert(
            "Please enter an event title."
        );

        return;
    }


    if (!eventDate) {

        alert(
            "Please select an event date."
        );

        return;
    }


    try {

        const response =
            await secureFetch(
                `${API_URL}/events`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        title,
                        description,
                        event_date: eventDate
                    })
                }
            );


        const data =
            await readResponse(response);


        if (!response.ok) {

            alert(
                "❌ " +
                getErrorMessage(
                    data,
                    "Could not create event."
                )
            );

            return;
        }


        alert(
            "✅ " +
            (
                data.message ||
                "Event created successfully."
            )
        );


        titleElement.value = "";
        descriptionElement.value = "";
        dateElement.value = "";


        await loadEvents();


    } catch (error) {

        console.error(
            "Create event error:",
            error
        );


        if (
            error.message !==
            "Authentication expired."
        ) {

            alert(
                "❌ Could not connect to server."
            );
        }
    }
}


// ======================================================
// DELETE EVENT
// ======================================================

async function deleteEvent(eventId) {

    if (!eventId) {

        alert("Invalid event.");

        return;
    }


    if (
        !confirm(
            "Are you sure you want to delete this event?"
        )
    ) {

        return;
    }


    try {

        const response =
            await secureFetch(
                `${API_URL}/events/${encodeURIComponent(eventId)}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await readResponse(response);


        if (!response.ok) {

            alert(
                "❌ " +
                getErrorMessage(
                    data,
                    "Could not delete event."
                )
            );

            return;
        }


        alert(
            "✅ " +
            (
                data.message ||
                "Event deleted successfully."
            )
        );


        await loadEvents();


    } catch (error) {

        console.error(
            "Delete event error:",
            error
        );


        if (
            error.message !==
            "Authentication expired."
        ) {

            alert(
                "❌ Could not connect to server."
            );
        }
    }
}


// ======================================================
// VIEW / DOWNLOAD DOCUMENT
// ======================================================

async function viewDocument(documentId) {

    if (!isLoggedIn()) {

        alert("Please login first.");

        showLogin();

        return;
    }


    if (!documentId) {

        alert("Invalid document.");

        return;
    }


    document.getElementById(
        "content"
    ).innerHTML = `

        <div class="preview-section">

            <h2>
                👁️ Document Preview
            </h2>

            <div id="documentPreview">

                <p>
                    ⏳ Loading document...
                </p>

            </div>

            <br>

            <button onclick="showDocuments()">
                ← Back to My Documents
            </button>

            <button
                id="openDownloadButton"
                type="button"
                disabled
            >
                ⬇️ Open / Download
            </button>

        </div>

    `;


    const url =
        `${API_URL}/files/${encodeURIComponent(documentId)}/download`;


    try {

        const response =
            await secureFetch(url);


        const contentType =
            response.headers.get("content-type") || "";


        if (!response.ok) {

            const data =
                await readResponse(response);


            document.getElementById(
                "documentPreview"
            ).innerHTML = `

                <p>
                    ❌ ${
                        escapeHTML(
                            getErrorMessage(
                                data,
                                "Could not load document."
                            )
                        )
                    }
                </p>

            `;

            return;
        }


        const blob =
            await response.blob();


        const blobUrl =
            URL.createObjectURL(blob);


        const button =
            document.getElementById(
                "openDownloadButton"
            );


        if (button) {

            button.disabled = false;


            button.onclick = () => {

                window.open(
                    blobUrl,
                    "_blank",
                    "noopener,noreferrer"
                );

            };
        }


        const preview =
            document.getElementById(
                "documentPreview"
            );


        // ----------------------------------------------
        // IMAGE
        // ----------------------------------------------

        if (
            contentType.includes("image")
        ) {

            preview.innerHTML = `

                <img
                    src="${blobUrl}"
                    alt="Document preview"
                    style="
                        max-width:100%;
                        max-height:600px;
                        border-radius:10px;
                    "
                >

            `;
        }


        // ----------------------------------------------
        // PDF
        // ----------------------------------------------

        else if (
            contentType.includes("pdf")
        ) {

            preview.innerHTML = `

                <iframe
                    src="${blobUrl}"
                    width="100%"
                    height="600px"
                    title="PDF document preview"
                    style="
                        border:1px solid #ccc;
                        border-radius:10px;
                    "
                ></iframe>

            `;
        }


        // ----------------------------------------------
        // OTHER
        // ----------------------------------------------

        else {

            preview.innerHTML = `

                <p>
                    📄 Preview is not available
                    for this file type.
                </p>

            `;
        }


    } catch (error) {

        console.error(
            "Preview error:",
            error
        );


        if (
            error.message !==
            "Authentication expired."
        ) {

            document.getElementById(
                "documentPreview"
            ).innerHTML = `

                <p>
                    ❌ Could not connect to server.
                </p>

            `;
        }
    }
}


// ======================================================
// DELETE DOCUMENT
// ======================================================

async function deleteDocument(documentId) {

    if (!isLoggedIn()) {

        alert("Please login first.");

        showLogin();

        return;
    }


    if (!documentId) {

        alert("Invalid document.");

        return;
    }


    if (
        !confirm(
            "Are you sure you want to delete this document?"
        )
    ) {

        return;
    }


    try {

        const response =
            await secureFetch(
                `${API_URL}/files/${encodeURIComponent(documentId)}`,
                {
                    method: "DELETE"
                }
            );


        const data =
            await readResponse(response);


        if (!response.ok) {

            alert(
                "❌ " +
                getErrorMessage(
                    data,
                    "Could not delete document."
                )
            );

            return;
        }


        alert(
            "✅ " +
            (
                data.message ||
                "Document deleted successfully."
            )
        );


        await showDocuments();


    } catch (error) {

        console.error(
            "Delete document error:",
            error
        );


        if (
            error.message !==
            "Authentication expired."
        ) {

            alert(
                "❌ Could not connect to server."
            );
        }
    }
}


// ======================================================
// SEARCH PAGE
// ======================================================

function searchDocuments() {

    if (!isLoggedIn()) {

        alert("Please login first.");

        showLogin();

        return;
    }


    document.getElementById(
        "content"
    ).innerHTML = `

        <div class="search-section">

            <h2>
                🔎 Search My Documents
            </h2>

            <input
                type="text"
                id="searchFilename"
                placeholder="Search filename..."
                maxlength="200"
            >

            <input
                type="text"
                id="searchText"
                placeholder="🔎 Search inside documents..."
                maxlength="500"
            >

            <select id="searchCategory">

                <option value="">
                    All Categories
                </option>

                <option value="bill">
                    Bills
                </option>

                <option value="receipt">
                    Receipts
                </option>

                <option value="certificate">
                    Certificates
                </option>

                <option value="other">
                    Other
                </option>

            </select>

            <input
                type="number"
                id="searchYear"
                placeholder="Year e.g. 2026"
                min="1900"
                max="2100"
            >

            <button onclick="performSearch()">
                🔎 Search
            </button>

            <div id="searchResults"></div>

            <button onclick="goBackToDashboard()">
                ← Back to Dashboard
            </button>

        </div>

    `;
}


// ======================================================
// SEARCH
// ======================================================

async function performSearch() {

    if (!isLoggedIn()) {

        alert("Please login first.");

        showLogin();

        return;
    }


    const filename =
        document.getElementById(
            "searchFilename"
        )?.value.trim() || "";


    const text =
        document.getElementById(
            "searchText"
        )?.value.trim() || "";


    const category =
        document.getElementById(
            "searchCategory"
        )?.value || "";


    const year =
        document.getElementById(
            "searchYear"
        )?.value || "";


    const results =
        document.getElementById(
            "searchResults"
        );


    if (
        !filename &&
        !text &&
        !category &&
        !year
    ) {

        results.innerHTML =
            `<p>Enter something to search.</p>`;

        return;
    }


    const params =
        new URLSearchParams();


    params.append(
        "user_id",
        localStorage.getItem("user_id")
    );


    if (filename) {
        params.append(
            "filename",
            filename
        );
    }


    if (text) {
        params.append(
            "search_text",
            text
        );
    }


    if (category) {
        params.append(
            "category",
            category
        );
    }


    if (year) {
        params.append(
            "year",
            year
        );
    }


    results.innerHTML =
        `<p>🔎 Searching...</p>`;


    try {

        const response =
            await secureFetch(
                `${API_URL}/files/search?${params.toString()}`
            );


        const data =
            await readResponse(response);


        if (!response.ok) {

            results.innerHTML = `

                <p>
                    ❌ ${
                        escapeHTML(
                            getErrorMessage(
                                data,
                                "Search failed."
                            )
                        )
                    }
                </p>

            `;

            return;
        }


        let files = data;


        if (
            data &&
            !Array.isArray(data) &&
            Array.isArray(data.files)
        ) {

            files = data.files;
        }


        if (
            !Array.isArray(files) ||
            files.length === 0
        ) {

            results.innerHTML =
                `<p>📭 No matching documents found.</p>`;

            return;
        }


        let html = "";


        files.forEach(file => {

            const id =
                Number(file.id);


            const ocrText =
                String(
                    file.ocr_text || ""
                );


            let previewText =
                ocrText.substring(0, 500);


            let escapedPreview =
                escapeHTML(
                    previewText
                );


            // ------------------------------------------
            // Highlight search text safely
            // ------------------------------------------

            if (
                text &&
                escapedPreview
            ) {

                const escapedTerm =
                    escapeHTML(text)
                        .replace(
                            /[.*+?^${}()|[\]\\]/g,
                            "\\$&"
                        );


                if (escapedTerm) {

                    escapedPreview =
                        escapedPreview.replace(
                            new RegExp(
                                escapedTerm,
                                "gi"
                            ),
                            match =>
                                `<mark>${match}</mark>`
                        );
                }
            }


            html += `

                <div class="document-card">

                    <h4>
                        📄 ${
                            escapeHTML(
                                file.filename ||
                                "Unnamed file"
                            )
                        }
                    </h4>

                    <p>
                        <strong>Category:</strong>
                        ${
                            escapeHTML(
                                file.category ||
                                "Other"
                            )
                        }
                    </p>

                    <p>
                        <strong>Document Date:</strong>
                        ${
                            escapeHTML(
                                file.document_date ||
                                "Not available"
                            )
                        }
                    </p>

                    <p>
                        <strong>File Type:</strong>
                        ${
                            escapeHTML(
                                file.file_type ||
                                "Unknown"
                            )
                        }
                    </p>

                    <p>
                        <strong>OCR Preview:</strong>
                    </p>

                    <div class="ocr-preview">

                        ${
                            escapedPreview ||
                            "No OCR text available."
                        }

                    </div>

                    <br>

                    <button
                        onclick="viewDocument(${id})"
                    >
                        👁️ View
                    </button>

                    <button
                        onclick="viewOCR(${id})"
                    >
                        📝 View OCR Text
                    </button>

                    <button
                        onclick="showDocumentDetails(${id})"
                    >
                        ℹ️ Details
                    </button>

                    <button
                        onclick="deleteDocument(${id})"
                    >
                        🗑️ Delete
                    </button>

                </div>

            `;
        });


        results.innerHTML =
            html;


    } catch (error) {

        console.error(
            "Search error:",
            error
        );


        if (
            error.message !==
            "Authentication expired."
        ) {

            results.innerHTML = `

                <p>
                    ❌ Could not connect to server.
                </p>

            `;
        }
    }
}


// ======================================================
// DOCUMENT DETAILS
// ======================================================

async function showDocumentDetails(documentId) {

    if (!isLoggedIn()) {

        alert("Please login first.");

        showLogin();

        return;
    }


    if (!documentId) {

        alert("Invalid document.");

        return;
    }


    try {

        const response =
            await secureFetch(
                `${API_URL}/files`
            );


        const data =
            await readResponse(response);


        if (!response.ok) {

            alert(
                getErrorMessage(
                    data,
                    "Could not load document details."
                )
            );

            return;
        }


        let files = data;


        if (
            data &&
            !Array.isArray(data) &&
            Array.isArray(data.files)
        ) {

            files = data.files;
        }


        if (!Array.isArray(files)) {

            alert(
                "Could not load document details."
            );

            return;
        }


        const file =
            files.find(
                item =>
                    Number(item.id) ===
                    Number(documentId)
            );


        if (!file) {

            alert(
                "Document not found."
            );

            return;
        }


        const ocrText =
            String(
                file.ocr_text || ""
            );


        document.getElementById(
            "content"
        ).innerHTML = `

            <div class="document-details">

                <h2>
                    📄 Document Details
                </h2>

                <hr>

                <p>
                    <strong>Filename:</strong>
                    ${
                        escapeHTML(
                            file.filename ||
                            "Not available"
                        )
                    }
                </p>

                <p>
                    <strong>Category:</strong>
                    ${
                        escapeHTML(
                            file.category ||
                            "Other"
                        )
                    }
                </p>

                <p>
                    <strong>Document Date:</strong>
                    ${
                        escapeHTML(
                            file.document_date ||
                            "Not available"
                        )
                    }
                </p>

                <p>
                    <strong>File Type:</strong>
                    ${
                        escapeHTML(
                            file.file_type ||
                            "Unknown"
                        )
                    }
                </p>

                <p>
                    <strong>Uploaded:</strong>
                    ${
                        escapeHTML(
                            file.created_at ||
                            "Not available"
                        )
                    }
                </p>

                <p>
                    <strong>OCR Status:</strong>

                    ${
                        ocrText
                            ? "✅ Text extracted"
                            : "❌ No text extracted"
                    }

                </p>

                <hr>

                <h3>
                    📝 OCR Preview
                </h3>

                <div class="ocr-text">

                    ${
                        ocrText
                            ? escapeHTML(
                                ocrText.substring(
                                    0,
                                    500
                                )
                            )
                            : "No OCR text available for this document."
                    }

                </div>

                <br>

                <button
                    onclick="viewDocument(${Number(file.id)})"
                >
                    👁️ View Document
                </button>

                <button
                    onclick="viewOCR(${Number(file.id)})"
                >
                    📝 View Full OCR Text
                </button>

                <button
                    onclick="deleteDocument(${Number(file.id)})"
                >
                    🗑️ Delete
                </button>

                <button
                    onclick="showDocuments()"
                >
                    ← Back to My Documents
                </button>

            </div>

        `;


    } catch (error) {

        console.error(
            "Document details error:",
            error
        );


        if (
            error.message !==
            "Authentication expired."
        ) {

            alert(
                "❌ Could not connect to server."
            );
        }
    }
}


// ======================================================
// LOGOUT
// ======================================================

function logout() {

    clearSession();

    showLogin();
}


// ======================================================
// BACK TO DASHBOARD
// ======================================================

function goBackToDashboard() {

    const user =
        getStoredUser();


    if (!isLoggedIn() || !user.user_id) {

        showLogin();

        return;
    }


    showDashboard(user);
}


// ======================================================
// AUTO LOGIN / INITIAL PAGE
// ======================================================

window.addEventListener(
    "DOMContentLoaded",
    () => {

        console.log(
            "MyVault DOM loaded"
        );


        const token =
            getAccessToken();

        const user =
            getStoredUser();


        // ----------------------------------------------
        // Valid local session
        // ----------------------------------------------

        if (
            token &&
            user.user_id
        ) {

            showDashboard(user);

        }

        // ----------------------------------------------
        // No session
        // ----------------------------------------------

        else {

            clearSession();

            showLogin();
        }

    }
);