// DOM elements
const firstnameInput = document.getElementById('firstname');
const emailPatternInput = document.getElementById('emailPattern');
const cityInput = document.getElementById('city');
const stateInput = document.getElementById('state');
const namesTextarea = document.getElementById('nameList');
const extractGoogle = document.getElementById('extractGoogle');
const extractContact = document.getElementById('extractContact');
const extractFast = document.getElementById('extractFast');
const searchBtn = document.getElementById('searchBtn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');

// Load saved values from storage
chrome.storage.local.get(['firstname', 'emailPattern', 'city', 'state'], (data) => {
  if (data.firstname) firstnameInput.value = data.firstname;
  if (data.emailPattern) emailPatternInput.value = data.emailPattern;
  if (data.city) cityInput.value = data.city;
  if (data.state) stateInput.value = data.state;
});

// Save values on input
[firstnameInput, emailPatternInput, cityInput, stateInput].forEach(input => {
  input.addEventListener('input', () => {
    chrome.storage.local.set({
      [input.id]: input.value
    });
  });
});

// Extract names button (Google)
extractGoogle.addEventListener('click', async () => {
  extractGoogle.disabled = true;
  showStatus('Extracting names from Google search results...', 'info');

  try {
    const response = await chrome.runtime.sendMessage({ action: 'extractNamesGoogle', firstname: firstnameInput.value.trim() });

    if (response && response.success) {
      namesTextarea.value = response.names.join('\n');
      showStatus(`Successfully extracted ${response.names.length} names!`, 'success');
    } else {
      showStatus('Error: ' + (response?.error || 'Failed to extract names'), 'error');
    }
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  } finally {
    extractGoogle.disabled = false;
  }
});

// Extract names button (Contact Out)
extractContact.addEventListener('click', async () => {
  extractContact.disabled = true;
  showStatus('Extracting names from ContactOut ...', 'info');

  try {
    const response = await chrome.runtime.sendMessage({ action: 'extractNamesContact', firstname: firstnameInput.value.trim() });

    if (response && response.success) {
      namesTextarea.value = response.names.join('\n');
      showStatus(`Successfully extracted ${response.names.length} names!`, 'success');
    } else {
      showStatus('Error: ' + (response?.error || 'Failed to extract names'), 'error');
    }
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  } finally {
    extractContact.disabled = false;
  }
});

// Extract names button (Fast People Search)
extractFast.addEventListener('click', async () => {
  extractFast.disabled = true;
  showStatus('Extracting names from FastPeopleSearch ...', 'info');

  try {
    const response = await chrome.runtime.sendMessage({ action: 'extractNamesFast', firstname: firstnameInput.value.trim() });

    if (response && response.success) {
      namesTextarea.value = response.names.join('\n');
      showStatus(`Successfully extracted ${response.names.length} names!`, 'success');
    } else {
      showStatus('Error: ' + (response?.error || 'Failed to extract names'), 'error');
    }
  } catch (error) {
    showStatus('Error: ' + error.message, 'error');
  } finally {
    extractFast.disabled = false;
  }
});

// Search and process button
searchBtn.addEventListener('click', async () => {
  const firstname = firstnameInput.value.trim();
  const emailPattern = emailPatternInput.value.trim();
  const city = cityInput.value.trim();
  const state = stateInput.value.trim();
  const names = namesTextarea.value.split('\n').filter(name => name.trim());

  if (!firstname || !city || !state || names.length === 0) {
    showStatus('Please fill in all required fields and extract names first!', 'error');
    return;
  }

  searchBtn.disabled = true;
  resultsDiv.innerHTML = '';
  showStatus(`Processing ${names.length} names...`, 'info');

  const allResults = [];

  for (let i = 0; i < names.length; i++) {
    const name = names[i].trim();
    if (!name) continue;

    showStatus(`Processing ${i + 1}/${names.length}: ${name}...`, 'info');

    // Replace all symbols in state and city with '-'
    const sanitizedState = state.replace(/[^a-zA-Z0-9]/g, '-');
    const sanitizedCity = city.replace(/[^a-zA-Z0-9]/g, '-');
    // Construct URL
    const url = `https://www.zabasearch.com/people/${name.replace(" ", "-")}/${sanitizedState}/${sanitizedCity}/`;

    try {
      // Send message to background to fetch data
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'fetchPageData',
          url: url
        }, resolve);
      });

      if (response && response.data) {
        // Check conditions - you can modify this logic
        const matchedData = filterResults(response.data, emailPattern);

        allResults.push({
          name: name,
          url: url,
          data: matchedData,
          matched: matchedData.length > 0
        });

        displayResult({
          name: name,
          url: url,
          data: matchedData,
          matched: matchedData.length > 0
        });
      }

      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`Error processing ${name}:`, error);
    }
  }

  searchBtn.disabled = false;
  const matchedLen = allResults.filter(r => r.matched).length;
  showStatus(
    `Completed! Processed ${names.length} names, found ${matchedLen} matches.`,
    matchedLen ? 'success' : 'error'
  );
});

function filterResults(data, emailPattern) {
  if (!emailPattern) return data;

  return data.filter(item => {
    if (typeof item === 'string') {
      const regexPattern = emailPattern.replace(/([.+?^${}()|[\]\\])/g, '\\$1').replace(/\*/g, '.');
      const emailRegex = new RegExp('^' + regexPattern + '$', 'i');
      return emailRegex.test(item);
    }
    return false;
  });
}

function displayResult(result) {
  if (!result.matched) return;
  const resultEl = document.createElement('div');
  resultEl.className = `result-item ${result.matched ? 'matched' : ''}`;

  resultEl.innerHTML = `
    <div class="result-name">${result.name}</div>
    <div class="result-data">
      <strong>Data found:</strong> ${result.data.length > 0 ? result.data.join(', ') : 'None'}
    </div>
  `;

  resultsDiv.appendChild(resultEl);
}

function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  statusDiv.style.display = 'block';
}