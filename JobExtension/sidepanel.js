

document
.getElementById("reloadPage")
.addEventListener("click", async () => {

    const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
    });
    
    
    const res = await chrome.tabs.sendMessage(tab.id, { type: "RELOAD" })
    

})

document
.getElementById("getdetails")
.addEventListener("click", async () => {
    
    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });
    
    
    try {
        const data = await chrome.tabs.sendMessage(tab.id, { type: "GET_DATA" });
        
        console.log("Data received from content script:", data);
        
        
        
        jobInfo.innerHTML = `
        <hr>
        
        <p>
        <b>Title:</b> ${ data.Title }
        </p>
        
        <p>
        <b>Company:</b> ${ data.Company }
        </p>
        
        <p>
        <b>URL:</b> 
        <a href="${ data.URL }" target="_blank">
        Open Job
        </a>
        </p>


        <p>
        <b> Location:</b> ${data.Location}
        </p>

        <p>
        <b> Date:</b> ${data.Date}
        </p>

        <p>
        <b> Website:</b> ${data.Website}
        </p>

        <p>
        <b> Count:</b> ${data.Count}
        </p>

        <p>
        <b> Status:</b> ${data.Status}
        </p>

        <p>
        <b> Strategy:</b> ${data.Strategy}
        </p>

        <p>
        <b> Category:</b> ${data.Category}
        </p>


        `;

        //         "Title": Title,
        //         "Company": Company,
        //         "Location": jobLocation,
        //         "Date": dateNow,
        //         "Website": jobSite,
        //         "Count": count
    } catch (err) {
        console.log(err)
    }})
    

document
    .getElementById("saveJob")
    .addEventListener("click", async () => {
    
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });
        try {
            const res = await chrome.tabs.sendMessage(tab.id, {
                action: "saveJob"
            });
            console.log("res:",res)
        
        
            } catch (err) {
                console.log(err)
            }
        }
);
            
document
.getElementById("selectValues")
.addEventListener("click", async () => {

    const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
    });


    const selectedData = {
        Status: document.getElementById("Status").value,
        Strategy: document.getElementById("Strategy").value,
        Category: document.getElementById("Category").value
    };


    try {
        await chrome.tabs.sendMessage(tab.id, {
            type: "SELECT_JOB",
            data: selectedData
        });
    } catch (err) {
        console.error(err);
    }

});


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


    } catch(error) {

        console.error(
            "Failed getting description:",
            error
        );

    }

});


document
.getElementById("analyze")
.addEventListener("click", async () => {

    try {

        // Get active tab
        const [tab] = await chrome.tabs.query({
            active: true,
            currentWindow: true
        });


        // Get job description from content.js
        const job = await chrome.tabs.sendMessage(
            tab.id,
            {
                type: "GET_DESCRIPTION"
            }
        );


        console.log("Job Description:", job.description);


        // Get uploaded resume
        const file = document
            .getElementById("resume")
            .files[0];


        if (!file) {
            console.log("Upload resume first");
            return;
        }


        const resumeText = await file.text();


        // Custom prompt
        const customPrompt = document
            .getElementById("customPrompt")
            .value;


        // Call OpenAI directly
        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer YOUR_API_KEY"
                },

                body: JSON.stringify({

                    model: "gpt-5-mini",

                    messages: [

                        {
                            role: "system",
                            content:
                            "You are an expert ATS resume analyzer."
                        },

                        {
                            role: "user",
                            content:
`
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


        document.getElementById("results").innerHTML =
        `
        <h3>Analysis</h3>
        <pre>
        ${data.choices[0].message.content}
        </pre>
        `;


    } catch(error) {

        console.error(
            "GPT Analysis Error:",
            error
        );

    }

});