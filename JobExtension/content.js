console.log("JobExtension content.js loaded");
const getData = async () => {
    const docTitle = document.title;
    const url = window.location.href?? "Uknown";
    const parts = docTitle.split("@")
    const Title = parts[0].trim()?? "Unknown"
    const jobSite = parts[1]?.split("|")[1] ?? "Unknown";
    const Company = parts[1] ? parts[1].split("|")[0].trim() : "Unknown";
    const jobLocation =
    document.querySelector('[class*=location]')?.textContent ?? "Unknown";
    const dateNow = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }) ?? "Uknown";


    console.log("Title:", Title);
    console.log("Company:", Company);
    console.log("Location:", jobLocation);
    console.log("Date:", dateNow);
    console.log("Website:", jobSite);
    console.log("URL:", url);

    const data = {
        Title,
        Company,
        Location: jobLocation,
        Date: dateNow,
        Website: jobSite,
        url
    };

    return data;
}


async function getCount() {
    const { applicationCounter = 0 } = await chrome.storage.local.get("applicationCounter")

    return applicationCounter + 1
}

async function incrementCounter() {
    const { applicationCounter = 0 } = await chrome.storage.local.get("applicationCounter")
    
    await chrome.storage.local.set({ applicationCounter: applicationCounter + 1 })
}    
//console.log("Count:",count)


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



async function sendData() {
    try {


        
        const NewStatus = Status;
        const NewStrategy = Strategy;
        const NewCategory = Category;
        const data = await getData();
        const count = await getCount();

        const res = await fetch("http://localhost:5000/addJob", {
            method: "POST",
            body: JSON.stringify({
                "Title": data.Title,
                "Company": data.Company,
                "Location": data.jobLocation,
                "Date": data.dateNow,
                "Website": data.jobSite,
                "Count": count,
                "Status": NewStatus,
                "Strategy": NewStrategy,
                "Category": NewCategory,
                "URL":data.url
            }),
            headers: { "Content-Type": "application/json" }
        })

        console.log("Request sent")
        console.log("sent the data to backend")
        console.log("Response:", res)

    } catch(error){console.log("error",error)}

    
    
}



chrome.runtime.onMessage.addListener(
    async (request, sender, sendResponse) => {

        console.log("Message received in content script:", request);

        if(request.action === "saveJob") {  // save action

            await incrementCounter();
            console.log("Saving job...");
        
    
            sendData()
            .then(() => {
                sendResponse({ success: true });
            })
            .catch((err) => {
                sendResponse({
                    success: false,
                    error: err.message
                });
            });

        return true; 
            
        }

        if (request.type === "RELOAD") {
            window.location.reload()
            return true
        }
        
        if (request.type === "GET_DATA") {

            console.log("GET_DATA request received");

            try {
                const data = await getData();
                const count = await getCount();

                sendResponse({
                    Title: data.Title,
                    Company: data.Company,
                    Location: data.jobLocation,
                    Date: data.dateNow,
                    Website: data.jobSite,
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

