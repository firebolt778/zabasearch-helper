const apiKey = "";

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
});

async function getNames(text, firstname) {
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      await new Promise(resolve => {
        const checkBtn = () => {
          const submitBtn = document.querySelector('button[type="submit"]');
          if (submitBtn && submitBtn.classList.contains("bg-primary-300")) {
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
