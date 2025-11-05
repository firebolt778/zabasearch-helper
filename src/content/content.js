const apiKey = "";

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractNamesGoogle') {
    (async () => {
      try {
        const names = await extractNamesFromGoogle(request.firstname);
        sendResponse({ success: true, names });
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
        sendResponse({ success: true, names });
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
        sendResponse({ success: true, names });
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
          content: `Extract all full names where the first or last name matches "${firstname}". Output a JSON object like this: {"names": ["First Last", ...]}. Only include unique "First Last" combinations (without middle name). Do not include anything except the JSON.`
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
  const contents = [];
  const nameElements = document.querySelectorAll(".search-container span.hover\\:underline");
  nameElements.forEach(el => contents.push(el.textContent));
  const { names } = await getNames(contents.join("\n"), firstname);
  names.forEach(name => nameList.add(name));
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
