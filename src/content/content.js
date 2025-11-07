function processNames(names = [""]) {
  const newList = new Set();
  for (let name of names) {
    const personNames = name.split(" ");
    let lastname = (personNames[personNames.length - 1] || "");
    if (lastname.length === 1 || lastname.endsWith(".")) {
      continue;
    }
    if (lastname.includes("-")) {
      lastname = lastname.split("-")[0];
    }
    if (lastname.includes("'")) {
      lastname = lastname.split("'")[1];
    }
    const firstname = personNames[0];
    newList.add(`${firstname} ${lastname}`);
  }
  return Array.from(newList);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractNamesGoogle') {
    (async () => {
      try {
        const names = await extractNamesFromGoogle(request.firstname);
        sendResponse({ success: true, names: processNames(names) });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    // Return true to indicate response will be sent asynchronously
    return true;
  }
  if (request.action === 'extractNamesContact') {
    (async () => {
      try {
        const names = await extractNamesFromContactOut(request.firstname);
        sendResponse({ success: true, names: processNames(names) });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    // Return true to indicate response will be sent asynchronously
    return true;
  }
  if (request.action === 'extractNamesFast') {
    (async () => {
      try {
        const names = await extractNamesFromFPS(request.firstname);
        sendResponse({ success: true, names: processNames(names) });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    // Return true to indicate response will be sent asynchronously
    return true;
  }

  if (request.action === 'copyBarkContent') {
    (async () => {
      try {
        const d = await extractBarkDashboardContent();
        const content = `${d.title}\n\nDetails\n${d.details.join("\n")}`;
        await copyToClipboard(content);
        sendResponse({ success: true, message: 'Content extracted and copied to clipboard' });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    // Return true to indicate response will be sent asynchronously
    return true;
  }

  if (request.action === 'getBarkData') {
    (async () => {
      try {
        const d = await extractBarkDashboardContent();
        const searchTerm = `${d.client} living in ${d.location}; ${d.phone}-`;
        await copyToClipboard(searchTerm);
        sendResponse({ success: true, data: d });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    // Return true to indicate response will be sent asynchronously
    return true;
  }
});

async function getNames(text, firstname) {
  const apiKey = await new Promise((resolve, reject) => {
    chrome.storage.local.get(['apiKey'], (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.apiKey);
      }
    });
  });
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are an expert at extracting first and last names from plain text. 
Given a block of text and the value "${firstname}", perform the following steps, returning only the required JSON (do not include code blocks or extra explanation):

1. Find all unique combinations of first and last names where either the first name or last name exactly matches "${firstname}". Ignore any middle names, initials, prefixes, or suffixes.
2. Standardize each result to "First Last" format (do not include middle names).
3. Output the result as: {"names": ["First Last", ...]}

Return only the JSON object as your output, with no surrounding text or formatting. If there are no matches, return {"names": []}
`
        },
        {
          role: "user",
          content: text
        }
      ],
      temperature: 0
    })
  });

  const data = await response.json();
  // Try to parse response as JSON object with `names` array
  let names = [];
  try {
    const content = data.choices[0].message.content;
    const match = content.match(/\{[\s\S]*names[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.names)) names = parsed.names;
    }
  } catch (e) {
    // fallback or leave names empty
  }
  return { names };
}

async function extractNamesFromGoogle(firstname) {
  const nameList = new Set();

  // Extract from search result titles and snippets
  const searchResults = document.querySelectorAll('#search > div > div > div');

  const contents = [];

  searchResults.forEach(result => contents.push(result.textContent.trim()));
  const { names } = await getNames(contents.join("\n"), firstname);
  names.forEach(name => nameList.add(name));

  return Array.from(nameList).sort();
}

async function extractNamesFromContactOut(firstname) {
  const nameList = new Set();
  let pageNum = 1;
  while (pageNum < 21) {
    const contents = [];
    const nameElements = document.querySelectorAll(".search-container span.hover\\:underline");
    nameElements.forEach(el => contents.push(el.textContent));
    const { names } = await getNames(contents.join("\n"), firstname);
    names.forEach(name => nameList.add(name));

    const nextBtn = document.querySelectorAll('div[data-testid="search-pagination"] button')[1];
    if (nextBtn.classList.contains("text-gray-300")) {
      break;
    } else {
      nextBtn.click();
      pageNum++;
      await new Promise(resolve => setTimeout(resolve, 1000));
      await new Promise(resolve => {
        const checkBtn = () => {
          const submitBtn = document.querySelector('button[type="submit"]');
          if (submitBtn && submitBtn.classList.contains("bg-primary-700")) {
            resolve();
          } else {
            setTimeout(checkBtn, 200);
          }
        };
        checkBtn();
      });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  return Array.from(nameList).sort();
}

async function extractNamesFromFPS(firstname) {
  const nameList = new Set();
  const contents = [];
  const nameElements = document.querySelectorAll("span.larger");
  nameElements.forEach(el => contents.push(el.textContent));
  const { names } = await getNames(contents.join("\n"), firstname);
  names.forEach(name => nameList.add(name));
  return Array.from(nameList).sort();
}

function formatState(state = "") {
  if (!state) return "";
  // Normalize US state abbreviation or name to lowercased full state name,
  // or just lowercased input if not matched
  const states = {
    al: "alabama",
    ak: "alaska",
    az: "arizona",
    ar: "arkansas",
    ca: "california",
    co: "colorado",
    ct: "connecticut",
    de: "delaware",
    fl: "florida",
    ga: "georgia",
    hi: "hawaii",
    id: "idaho",
    il: "illinois",
    in: "indiana",
    ia: "iowa",
    ks: "kansas",
    ky: "kentucky",
    la: "louisiana",
    me: "maine",
    md: "maryland",
    ma: "massachusetts",
    mi: "michigan",
    mn: "minnesota",
    ms: "mississippi",
    mo: "missouri",
    mt: "montana",
    ne: "nebraska",
    nv: "nevada",
    nh: "new hampshire",
    nj: "new jersey",
    nm: "new mexico",
    ny: "new york",
    nc: "north carolina",
    nd: "north dakota",
    oh: "ohio",
    ok: "oklahoma",
    or: "oregon",
    pa: "pennsylvania",
    ri: "rhode island",
    sc: "south carolina",
    sd: "south dakota",
    tn: "tennessee",
    tx: "texas",
    ut: "utah",
    vt: "vermont",
    va: "virginia",
    wa: "washington",
    wv: "west virginia",
    wi: "wisconsin",
    wy: "wyoming",
    "district of columbia": "district of columbia",
    dc: "district of columbia"
  };
  const lower = state.trim().toLowerCase();
  if (states[lower]) return states[lower];
  const found = Object.values(states).find(s => s === lower);
  if (found) return found;
  return lower;
}

async function extractBarkDashboardContent() {
  const extractedData = {
    client: "",
    title: "",
    location: "",
    city: "",
    state: "",
    phone: "",
    email: "",
    details: [],
  };

  try {
    const clientEl = document.querySelector(".project-top .project-name-location .buyer_name");
    const titleEl = document.querySelector(".project-top .project-title");
    const locationEl = document.querySelector(".project-top .project-name-location .location");
    const phoneEl = document.querySelector(".project-top .buyer-telephone-display");
    const emailEl = document.querySelector(".project-top .buyer-email-display");
    const detailEls = document.querySelectorAll(".project-questions-answers > div");

    let location = (locationEl?.textContent || "").trim();
    if (location.includes(" (")) {
      location = location.split(" (")[0];
    }
    const locationArr = location.split(", ");
    const city = locationArr[0] || location;
    const state = formatState(locationArr[1] || "");

    const phone = (phoneEl?.textContent || "").trim();
    if (phone.includes("(")) {
      extractedData.phone = phone.slice(1, 4);
    } else {
      extractedData.phone = phone.replace(/\*/g, "");
    }

    const details = [];
    for (let i = 0; i < detailEls.length; i++) {
      details.push(detailEls[i].textContent.trim());
    }

    extractedData.title = (titleEl?.textContent || "").trim();
    extractedData.client = (clientEl?.textContent || "").trim();
    extractedData.email = (emailEl?.textContent || "").trim().toLowerCase();
    extractedData.location = location;
    extractedData.city = city;
    extractedData.state = state;
    extractedData.details = details;
    return extractedData;
  } catch (error) {
    console.error('Error extracting Bark content:', error);
    // Fallback: return main content text
    return extractedData;
  }
}

async function copyToClipboard(text) {
  try {
    // Use the Clipboard API
    await navigator.clipboard.writeText(text);
    console.log('Content copied to clipboard successfully');
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    // Fallback method for older browsers
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    } catch (fallbackError) {
      console.error('Fallback copy method also failed:', fallbackError);
      throw new Error('Failed to copy to clipboard');
    }
  }
}
