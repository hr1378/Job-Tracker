document
.getElementById("reloadPage")
.addEventListener("click", async () => {

    const button = document.getElementById("reloadPage");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Reloading...";

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        const res = await chrome.tabs.sendMessage(tab.id, { type: "RELOAD" });
        console.log("Page reload triggered:", res);

    } catch (err) {
        console.error("Failed to reload page:", err);
        alert("Failed to reload page. Make sure you're on a valid webpage.");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});

document
.getElementById("getdetails")
.addEventListener("click", async () => {

    const button = document.getElementById("getdetails");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Loading...";

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        const data = await chrome.tabs.sendMessage(tab.id, { type: "GET_DATA" });

        console.log("Data received from content script:", data);

        const jobInfo = document.getElementById("jobInfo");

        if (data.Title === "Unknown" || data.Company === "Unknown" || data.Location === "Unknown") {
            jobInfo.innerHTML = `
            <p style="margin: 0; color: #ef4444; font-size: 11px;">⚠️ Automatic extraction incomplete. Auto-triggering Manual Select...</p>
            `;

            button.disabled = false;
            button.textContent = originalText;

            // Auto-trigger manual select
            setTimeout(async () => {
                await chrome.tabs.sendMessage(tab.id, {
                    type: "ENABLE_SELECTION_MODE"
                });
                alert("Automatic extraction incomplete. Manual Select mode activated. Please click on Company, Title, and Location elements in order.");

                // After manual selection completes, auto-refresh data
                setTimeout(async () => {
                    const updatedData = await chrome.tabs.sendMessage(tab.id, { type: "GET_DATA" });
                    console.log("Updated data after manual selection:", updatedData);

                    if (updatedData.Title === "Unknown" && updatedData.Company === "Unknown" && updatedData.Location === "Unknown") {
                        jobInfo.innerHTML = `
                        <p style="margin: 0; color: #ef4444; font-size: 11px;">⚠️ All extraction methods failed. Fields remain Unknown.</p>
                        `;
                    } else {
                        jobInfo.innerHTML = `
                        <p style="margin: 0; color: #10b981; font-size: 11px;">✓ Data extracted. Please click 'Apply Selection' to view details.</p>
                        `;
                    }
                }, 8000);
            }, 500);

        } else {
            jobInfo.innerHTML = `
            <p style="margin: 0; color: #10b981; font-size: 11px;">✓ Data extracted successfully. Please click 'Apply Selection' to view details.</p>
            `;
        }

    } catch (err) {
        console.error("Failed to get job details:", err);
        alert("Failed to get job details. Make sure you're on a job page.");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});

document
.getElementById("saveJob")
.addEventListener("click", async () => {

    const button = document.getElementById("saveJob");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Saving...";

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        const res = await chrome.tabs.sendMessage(tab.id, {
            action: "saveJob"
        });

        if (!res?.success || !res.data) {
            throw new Error(res?.error || "Failed to prepare job data");
        }

        const response = await fetch("http://localhost:5000/addJob", {
            method: "POST",
            body: JSON.stringify(res.data),
            headers: { "Content-Type": "application/json" }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to save job");
        }

        console.log("Job saved:", data);
        alert("Job saved successfully!");

    } catch (err) {
        console.error("Failed to save job:", err);
        alert("Failed to save job. Please try again.");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});

document
.getElementById("selectValues")
.addEventListener("click", async () => {

    const button = document.getElementById("selectValues");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Applying...";

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        const selectedData = {
            Status: document.getElementById("Status").value,
            Strategy: document.getElementById("Strategy").value,
            Category: document.getElementById("Category").value
        };

        await chrome.tabs.sendMessage(tab.id, {
            type: "SELECT_JOB",
            data: selectedData
        });

        console.log("Values selected:", selectedData);

        // Now fetch and display the full job details
        const data = await chrome.tabs.sendMessage(tab.id, { type: "GET_DATA" });

        const jobInfo = document.getElementById("jobInfo");

        jobInfo.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
          <div><strong>Title:</strong> ${data.Title || "Unknown"}</div>
          <div><strong>Company:</strong> ${data.Company || "Unknown"}</div>
          <div><strong>Location:</strong> ${data.Location || "Unknown"}</div>
          <div><strong>Website:</strong> ${data.Website || "Unknown"}</div>
          <div><strong>Status:</strong> ${data.Status || "Unknown"}</div>
          <div><strong>Strategy:</strong> ${data.Strategy || "Unknown"}</div>
          <div><strong>Category:</strong> ${data.Category || "Unknown"}</div>
          <div><strong>Date:</strong> ${data.Date || "Unknown"}</div>
        </div>
        <div style="margin-top: 6px;">
          <a href="${data.URL || "#"}" target="_blank" style="color: #2563eb; text-decoration: none; font-size: 10px;">Open Job URL →</a>
        </div>
        <div style="margin-top: 6px; color: #10b981; font-size: 10px;">✓ Selection applied</div>
        `;

    } catch (err) {
        console.error("Failed to select values:", err);
        alert("Failed to select values. Please try again.");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});


// Load custom values from storage and populate dropdowns
async function loadCustomValues() {
    const data = await chrome.storage.local.get(["customStatus", "customStrategy", "customCategory"]);

    const statusSelect = document.getElementById("Status");
    const strategySelect = document.getElementById("Strategy");
    const categorySelect = document.getElementById("Category");

    if (data.customStatus && Array.isArray(data.customStatus)) {
        data.customStatus.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            statusSelect.appendChild(option);
        });
    }

    if (data.customStrategy && Array.isArray(data.customStrategy)) {
        data.customStrategy.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            strategySelect.appendChild(option);
        });
    }

    if (data.customCategory && Array.isArray(data.customCategory)) {
        data.customCategory.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            categorySelect.appendChild(option);
        });
    }
}


// Add custom value functions
document
.getElementById("addCustomStatus")
.addEventListener("click", async () => {

    const customValue = prompt("Enter custom Status value:");

    if (customValue && customValue.trim()) {
        const trimmedValue = customValue.trim();

        const data = await chrome.storage.local.get(["customStatus"]);
        const customStatus = data.customStatus || [];

        if (!customStatus.includes(trimmedValue)) {
            customStatus.push(trimmedValue);
            await chrome.storage.local.set({ customStatus });

            const statusSelect = document.getElementById("Status");
            const option = document.createElement("option");
            option.value = trimmedValue;
            option.textContent = trimmedValue;
            statusSelect.appendChild(option);
            statusSelect.value = trimmedValue;

            alert("Custom Status added: " + trimmedValue);
        } else {
            alert("This Status already exists.");
        }
    }
});


document
.getElementById("addCustomStrategy")
.addEventListener("click", async () => {

    const customValue = prompt("Enter custom Strategy value:");

    if (customValue && customValue.trim()) {
        const trimmedValue = customValue.trim();

        const data = await chrome.storage.local.get(["customStrategy"]);
        const customStrategy = data.customStrategy || [];

        if (!customStrategy.includes(trimmedValue)) {
            customStrategy.push(trimmedValue);
            await chrome.storage.local.set({ customStrategy });

            const strategySelect = document.getElementById("Strategy");
            const option = document.createElement("option");
            option.value = trimmedValue;
            option.textContent = trimmedValue;
            strategySelect.appendChild(option);
            strategySelect.value = trimmedValue;

            alert("Custom Strategy added: " + trimmedValue);
        } else {
            alert("This Strategy already exists.");
        }
    }
});


document
.getElementById("addCustomCategory")
.addEventListener("click", async () => {

    const customValue = prompt("Enter custom Category value:");

    if (customValue && customValue.trim()) {
        const trimmedValue = customValue.trim();

        const data = await chrome.storage.local.get(["customCategory"]);
        const customCategory = data.customCategory || [];

        if (!customCategory.includes(trimmedValue)) {
            customCategory.push(trimmedValue);
            await chrome.storage.local.set({ customCategory });

            const categorySelect = document.getElementById("Category");
            const option = document.createElement("option");
            option.value = trimmedValue;
            option.textContent = trimmedValue;
            categorySelect.appendChild(option);
            categorySelect.value = trimmedValue;

            alert("Custom Category added: " + trimmedValue);
        } else {
            alert("This Category already exists.");
        }
    }
});


// Load custom values on page load
loadCustomValues();


document
.getElementById("getDescription")
.addEventListener("click", async () => {

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        const response = await chrome.tabs.sendMessage(
            tab.id,
            {
                type: "GET_DESCRIPTION"
            }
        );

        console.log("Description received:", response);
        alert("Job description extracted! Check console for details.");

    } catch(error) {
        console.error("Failed getting description:", error);
        alert("Failed to get job description. Make sure you're on a job page.");
    }
});

document
.getElementById("manualSelect")
.addEventListener("click", async () => {

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        const response = await chrome.tabs.sendMessage(
            tab.id,
            {
                type: "ENABLE_SELECTION_MODE"
            }
        );

        console.log("Selection mode enabled:", response);
        alert("Selection mode enabled! Click on elements to select Company, Title, and Location in order.");

        // Auto-refresh job info after selection completes
        setTimeout(async () => {
            const data = await chrome.tabs.sendMessage(tab.id, { type: "GET_DATA" });
            const jobInfo = document.getElementById("jobInfo");

            jobInfo.innerHTML = `
            <p style="margin: 0; color: #10b981; font-size: 11px;">✓ Manual selection complete. Please click 'Apply Selection' to view updated details.</p>
            `;
        }, 5000);

    } catch(error) {
        console.error("Failed enabling selection mode:", error);
        alert("Failed to enable selection mode. Please try again.");
    }
});

document
.getElementById("exportToSheet")
.addEventListener("click", async () => {

    const button = document.getElementById("exportToSheet");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Exporting...";

    try {
        console.log("Starting export...");
        const response = await fetch(
            "http://localhost:5000/exportToSheet",
            {
                method: "GET"
            }
        );

        console.log("Export response status:", response.status);

        if(response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "jobs_export_" + new Date().toISOString().split('T')[0] + ".csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            console.log("Export successful");
            alert("Jobs exported successfully!");

        } else {
            console.error("Export failed:", response.statusText);
            const errorText = await response.text();
            console.error("Error details:", errorText);
            alert("Export failed: " + response.statusText);
        }

    } catch(error) {
        console.error("Export error:", error);
        alert("Export error: " + error.message + ". Please make sure the backend server is running on localhost:5000.");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});

document
.getElementById("resetDB")
.addEventListener("click", async () => {

    const confirmation = prompt("Type 'reset db' to confirm database reset:");

    if(confirmation === "reset db") {

        const button = document.getElementById("resetDB");
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = "Resetting...";

        try {
            const response = await fetch(
                "http://localhost:5000/resetDB",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        confirmation: "reset db"
                    })
                }
            );

            const data = await response.json();

            if(response.ok) {
                await chrome.storage.local.set({ applicationCounter: 0 });
                console.log("Database reset successful:", data);
                alert("Database reset successfully. Deleted " + data.deletedCount + " records.");
            } else {
                console.error("Reset failed:", data.error);
                alert("Reset failed: " + data.error);
            }

        } catch(error) {
            console.error("Reset error:", error);
            alert("Reset error. Please make sure the backend server is running.");
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }

    } else if(confirmation !== null) {
        alert("Invalid confirmation. Database reset cancelled.");
    }
});

document
.getElementById("analyze")
.addEventListener("click", async () => {

    const button = document.getElementById("analyze");
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Analyzing...";

    try {
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });

        const job = await chrome.tabs.sendMessage(
            tab.id,
            {
                type: "GET_DESCRIPTION"
            }
        );

        console.log("Job Description:", job.description);

        const file = document.getElementById("resume").files[0];

        if (!file) {
            alert("Please upload a resume PDF first.");
            return;
        }

        const apiKey = document.getElementById("apiKey").value;

        if (!apiKey) {
            alert("Please enter your OpenAI API key.");
            return;
        }

        const resumeText = await file.text();
        const customPrompt = document.getElementById("customPrompt").value;

        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert ATS resume analyzer."
                        },
                        {
                            role: "user",
                            content: `
${customPrompt}

JOB DESCRIPTION:

${job.description}

RESUME:

${resumeText}

Return:
- Important ATS keywords
- Missing keywords
- Skills match percentage
- Suggestions
`
                        }
                    ]
                })
            }
        );

        const data = await response.json();
        console.log(data);

        document.getElementById("results").innerHTML = `
        <h3>Analysis</h3>
        <pre>${data.choices[0].message.content}</pre>
        `;

    } catch(error) {
        console.error("GPT Analysis Error:", error);
        alert("Analysis failed. Please check your API key and try again.");
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
});