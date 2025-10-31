const apiKey = "";

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractLastNames') {
    (async () => {
      try {
        const lastNames = await extractLastNamesFromPage();
        sendResponse({ success: true, lastNames });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    })();
    // Return true to indicate response will be sent asynchronously
    return true;
  }
});

async function getLastNames(text) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Extract all last names found in the following text, return only a JSON array called last_names of unique last names. Example: {\"last_names\": [\"Smith\", \"Brown\"]}"
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 4096,
      temperature: 0
    })
  });

  const data = await response.json();
  // Try to parse response as JSON object with `last_names` array
  let last_names = [];
  try {
    const content = data.choices[0].message.content;
    const match = content.match(/\{[\s\S]*last_names[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.last_names)) last_names = parsed.last_names;
    }
  } catch (e) {
    // fallback or leave last_names empty
  }
  return { last_names };
}

async function extractLastNamesFromPage() {
  const lastNames = new Set();

  // Extract from search result titles and snippets
  const searchResults = document.querySelectorAll('#search > div > div > div');

  const contents = [];

  searchResults.forEach(result => contents.push(result.textContent.trim()));
  const { last_names } = await getLastNames(contents.join("\n"));
  last_names.forEach(name => lastNames.add(name));

  return Array.from(lastNames).sort();
}