console.log("JobExtension content.js loaded");

let Title = "Unknown";
let Company = "Unknown";
let jobLocation = "Unknown";
let jobDate = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
});
let Status = "Unknown";
let Strategy = "Unknown";
let Category = "Unknown";

// Manual selections override auto-extraction per field, and only for the
// current page. They are cleared when the user navigates (including SPA routing).
const manualOverrides = {};
let currentUrl = window.location.href || "";

function syncPageState() {
    const url = window.location.href || "";
    if (url !== currentUrl) {
        currentUrl = url;
        for (const key of Object.keys(manualOverrides)) {
            delete manualOverrides[key];
        }
        console.log("Navigated to a new page. Manual overrides cleared.");
    }
}

// Extracts the role title from a tab title such as:
//   "Software Engineer @ Current | Jobright.ai"   -> "Software Engineer"
//   "Software Engineer at Current | LinkedIn"     -> "Software Engineer"
//   "Data Analyst | Some Site"                    -> "Data Analyst"
function extractRoleTitle(docTitle) {
    const title = (docTitle || "").trim();
    if (!title) return "Unknown";

    // Drop the site name: "Role @ Company | Site" -> "Role @ Company"
    let candidate = title.split("|")[0].trim() || title;

    // Strip the company: "Role @ Company" / "Role at Company" / "Role - Company"
    const match = candidate.match(/^(.*?)\s+(?:@|at|@|–|—|-)\s+[A-Za-z0-9]/i);
    if (match && match[1].trim()) {
        candidate = match[1].trim();
    }

    return candidate || "Unknown";
}

// Extracts the company from a tab title such as:
//   "Software Engineer @ Current | Jobright.ai" -> "Current"
function extractCompany(docTitle) {
    const title = (docTitle || "").trim();
    if (!title) return "Unknown";

    const match = title.match(/^.*?\s+(?:@|at)\s+([^|]+?)(?:\s*\|\s*.*)?$/i);
    if (match && match[1] && match[1].trim()) {
        return match[1].trim();
    }

    return "Unknown";
}

function extractWebsite(docTitle) {
    const title = (docTitle || "").trim();
    if (!title) return "Unknown";

    const parts = title.split("|");
    if (parts.length > 1) {
        return parts[parts.length - 1].trim() || "Unknown";
    }

    return "Unknown";
}

const getData = async () => {
    syncPageState();

    const url = window.location.href || "Unknown";
    const docTitle = document.title || "";

    const auto = {
        Title: extractRoleTitle(docTitle),
        Company: extractCompany(docTitle),
        Location: document.querySelector('[class*=location]')?.textContent?.trim() || "Unknown",
        Website: extractWebsite(docTitle)
    };

    // Manual selections win when present; otherwise use fresh auto-extraction
    // so the values always come from the current page.
    Title = manualOverrides.title || auto.Title || "Unknown";
    Company = manualOverrides.company || auto.Company || "Unknown";
    jobLocation = manualOverrides.location || auto.Location || "Unknown";
    const Website = auto.Website;

    console.log("Title:", Title);
    console.log("Company:", Company);
    console.log("Location:", jobLocation);
    console.log("Date:", jobDate);
    console.log("Website:", Website);
    console.log("URL:", url);

    const data = {
        Title,
        Company,
        Location: jobLocation,
        Date: jobDate,
        Website,
        url
    };

    return data;
}


async function getCount() {
    const { applicationCounter = 0 } = await chrome.storage.local.get("applicationCounter");
    return applicationCounter + 1;
}

async function incrementCounter() {
    const { applicationCounter = 0 } = await chrome.storage.local.get("applicationCounter");
    await chrome.storage.local.set({ applicationCounter: applicationCounter + 1 });
}

let selectionModeActive = false;
let selectionClickListener = null;
let currentSelectionStep = 0;
const selectionSteps = ["company", "title", "location"];

function enableSelectionMode() {
    if(selectionModeActive) return;

    console.log("Enabling selection mode...");
    selectionModeActive = true;
    currentSelectionStep = 0;
    document.body.style.cursor = "crosshair";
    promptForSelection();
}

function promptForSelection() {
    console.log("Prompt for selection, step:", currentSelectionStep, "of", selectionSteps.length);

    if(currentSelectionStep >= selectionSteps.length) {
        console.log("Selection steps completed, disabling selection mode");
        disableSelectionMode();
        return;
    }

    const currentField = selectionSteps[currentSelectionStep];
    console.log("Current field to select:", currentField);
    const message = "Select " + currentField.toUpperCase() + " on the screen\n\nClick OK to select, or Cancel to skip (will use 'Unknown')";

    if(confirm(message)) {
        console.log("User confirmed, waiting for click on element...");
        selectionClickListener = function(event) {
            console.log("Click detected on element:", event.target);
            event.preventDefault();
            event.stopPropagation();

            const element = event.target;
            const text = element.innerText?.trim() || element.textContent?.trim();

            console.log("Extracted text:", text);

            if(text && text.length > 0) {
                manualOverrides[currentField] = text;
                console.log("Stored " + currentField + ": " + text);
                alert(currentField + " stored: " + text);
            }

            document.removeEventListener("click", selectionClickListener, true);
            selectionClickListener = null;

            currentSelectionStep++;
            promptForSelection();
        };

        document.addEventListener("click", selectionClickListener, true);
        console.log("Click listener added");

    } else {
        console.log("User cancelled, setting field to Unknown");
        manualOverrides[currentField] = "Unknown";
        console.log(currentField + " set to: Unknown");
        alert(currentField + " set to: Unknown");

        currentSelectionStep++;
        promptForSelection();
    }
}

function disableSelectionMode() {
    console.log("Disabling selection mode...");
    if(!selectionModeActive) return;

    selectionModeActive = false;
    document.body.style.cursor = "default";

    if(selectionClickListener) {
        document.removeEventListener("click", selectionClickListener, true);
        selectionClickListener = null;
    }

    console.log("Selection mode completed. Manual selections override auto-extraction for this page.");
    console.log("Final values - Title:", Title, "Company:", Company, "Location:", jobLocation);
}


function isHumanReadable(text) {

    if(!text || text.length < 10) return false;


    if(text.startsWith("{") || text.startsWith("[")) return false;


    if(text.includes("function(") || text.includes("=>")) return false;


    if(text.includes("props") && text.includes("pageProps")) return false;


    if(text.length > 5000) return false;


    if(text.includes("script") || text.includes("impactcdn")) return false;


    if(/https?:\/\/[^\s]+/.test(text) && text.length > 100) return false;


    if(text.includes("buildId") || text.includes("assetPrefix")) return false;


    return true;
}


function extractJobSections() {

    const sections = {
        responsibilities: [],
        qualifications: [],
        requirements: []
    };


    const headings = document.querySelectorAll(
        "h1,h2,h3,h4,h5,h6,strong,b,p,div"
    );


    headings.forEach((heading)=>{

        const title = heading.innerText
            .toLowerCase()
            .trim();


        let type = null;


        if(
            title.includes("responsibil") ||
            title.includes("duties") ||
            title.includes("what you'll do") ||
            title.includes("role") ||
            title.includes("about the job") ||
            title.includes("what you will do")
        ){
            type = "responsibilities";
        }


        if(
            title.includes("qualification") ||
            title.includes("qualifications") ||
            title.includes("skills") ||
            title.includes("experience") ||
            title.includes("background")
        ){
            type = "qualifications";
        }


        if(
            title.includes("required") ||
            title.includes("requirements") ||
            title.includes("must have") ||
            title.includes("nice to have") ||
            title.includes("preferred")
        ){
            type = "requirements";
        }


        if(!type) return;


        let current = heading.nextElementSibling;


        while(
            current &&
            ![
                "H1",
                "H2",
                "H3",
                "H4",
                "H5",
                "H6"
            ].includes(current.tagName)
        ){

            const text =
                current.innerText?.trim() ||
                current.textContent?.trim();


            if(text && text.length > 5 && isHumanReadable(text)){
                sections[type].push(text);
            }


            current = current.nextElementSibling;
        }

    });


    if(
        sections.responsibilities.length === 0 &&
        sections.qualifications.length === 0 &&
        sections.requirements.length === 0
    ){

        const allLists = document.querySelectorAll("ul, ol");


        allLists.forEach(list => {

            const listItems = list.querySelectorAll("li");


            listItems.forEach(li => {

                const text = li.innerText?.trim() || li.textContent?.trim();


                if(text && text.length > 5 && isHumanReadable(text)){
                    sections.responsibilities.push(text);
                }
            });
        });
    }


    if(
        sections.responsibilities.length === 0 &&
        sections.qualifications.length === 0 &&
        sections.requirements.length === 0
    ){

        const jobDescSelectors = [
            '[class*="description"]',
            '[class*="job"]',
            '[class*="posting"]',
            '[id*="description"]',
            '[id*="job"]',
            'section',
            'article',
            'main'
        ];


        for(const selector of jobDescSelectors){

            const elements = document.querySelectorAll(selector);


            for(const el of elements){

                const text = el.innerText?.trim() || el.textContent?.trim();


                if(text && text.length > 50 && isHumanReadable(text)){

                    const bullets = text.split(/\n|•|·|●|○|■|□|▪|▫|–|—|/);


                    bullets.forEach(bullet => {

                        const cleanBullet = bullet.trim();


                        if(cleanBullet && cleanBullet.length > 5 && isHumanReadable(cleanBullet)){
                            sections.responsibilities.push(cleanBullet);
                        }
                    });
                }
            }


            if(sections.responsibilities.length > 0) break;
        }
    }


    if(
        sections.responsibilities.length === 0 &&
        sections.qualifications.length === 0 &&
        sections.requirements.length === 0
    ){

        const bodyText = document.body.innerText || document.body.textContent;


        if(bodyText && bodyText.length > 100 && isHumanReadable(bodyText)){

            const bullets = bodyText.split(/\n|•|·|●|○|■|□|▪|▫|–|—|/);


            bullets.forEach(bullet => {

                const cleanBullet = bullet.trim();


                if(cleanBullet && cleanBullet.length > 10 && isHumanReadable(cleanBullet)){
                    sections.responsibilities.push(cleanBullet);
                }
            });
        }
    }


    return sections;
}



async function buildJobData() {
    const data = await getData();
    const count = await getCount();

    return {
        Title: data.Title,
        Company: data.Company,
        Location: data.Location,
        Date: jobDate,
        Website: data.Website,
        Count: count,
        Status,
        Strategy,
        Category,
        URL: data.url
    };
}



chrome.runtime.onMessage.addListener(
    async (request, sender, sendResponse) => {

        console.log("Message received in content script:", request);

        if(request.action === "saveJob") {
            try {
                const jobData = await buildJobData();
                await incrementCounter();

                console.log("Saving job...", jobData);
                sendResponse({ success: true, data: jobData });
            } catch (err) {
                sendResponse({
                    success: false,
                    error: err.message
                });
            }

            return true;
        }

        if (request.type === "RELOAD") {
            window.location.reload()
            return true
        }

        if (request.type === "ENABLE_SELECTION_MODE") {

            enableSelectionMode();
            sendResponse({ success: true });
            return true;
        }
        
        if (request.type === "GET_DATA") {

            console.log("GET_DATA request received");

            try {
                const data = await getData();
                const count = await getCount();

                sendResponse({
                    Title: data.Title,
                    Company: data.Company,
                    Location: data.Location,
                    Date: jobDate,
                    Website: data.Website,
                    Count: count,
                    Status: Status ?? "Unknown",
                    Strategy: Strategy ?? "Unknown",
                    Category: Category ?? "Unknown",
                    URL: data.url
                });

                console.log("GET_DATA response sent");

            } catch (error) {

                console.error("GET_DATA failed:", error);

                sendResponse({
                    success: false,
                    error: error.message
                });
            }

            return true;
                }
        

        
        if (request.type === "GET_DESCRIPTION") {

            const description = extractJobSections();

            console.log(
                "Extracted description:",
                description
            );


            sendResponse({
                description
            });

            return true;
        }
        
        
        if (request.type === "SELECT_JOB") {

            console.log("Selected dropdown data:", request.data);

            Status = request.data.Status;
            Strategy = request.data.Strategy;
            Category = request.data.Category;

            console.log("Stored in variables:", {
                Status,
                Strategy,
                Category
            });

            sendResponse({ success: true });
            return true;
        }
    }
);

