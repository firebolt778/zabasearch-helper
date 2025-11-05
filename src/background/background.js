// Listen for extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  // Open the side panel for the current window
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// Listen for messages from sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractNamesGoogle') {
    // Send message to content script to extract names from Google
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'extractNamesGoogle', firstname: request.firstname }, (response) => {
          sendResponse(response);
        });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'extractNamesContact') {
    // Send message to content script to extract names from ContactOut
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'extractNamesContact', firstname: request.firstname }, (response) => {
          sendResponse(response);
        });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'extractNamesFast') {
    // Send message to content script to extract names from FastPeopleSearch
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'extractNamesFast', firstname: request.firstname }, (response) => {
          sendResponse(response);
        });
      }
    });
    return true; // Keep message channel open for async response
  }

  if (request.action === 'fetchPageData') {
    // Fetch data from localhost page
    chrome.tabs.query({ url: 'https://www.zabasearch.com/*' }, async (tabs) => {
      let targetTab;

      if (tabs.length === 0) {
        // Open localhost if not exists
        targetTab = await chrome.tabs.create({ url: 'https://www.zabasearch.com/', active: false });

        // Wait for full load
        await new Promise(resolve => {
          chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
            if (tabId === targetTab.id && info.status === 'complete') {
              chrome.tabs.onUpdated.removeListener(listener);
              resolve();
            }
          });
        });

        // Now wait for the element
        await new Promise(resolve => {
          const interval = setInterval(() => {
            chrome.scripting.executeScript(
              {
                target: { tabId: targetTab.id },
                func: () => Boolean(document.querySelector('.containerbody'))
              },
              (results) => {
                if (results && results[0] && results[0].result) {
                  clearInterval(interval);
                  resolve();
                }
              }
            );
          }, 200);
        });
      } else {
        targetTab = tabs[0];
      }

      // Navigate to the search URL
      await chrome.tabs.update(targetTab.id, { url: request.url });

      // Wait for full load
      await new Promise(resolve => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === targetTab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            resolve();
          }
        });
      });

      // Now wait for the element
      await new Promise(resolve => {
        const interval = setInterval(() => {
          chrome.scripting.executeScript(
            {
              target: { tabId: targetTab.id },
              func: () => Boolean(document.querySelector('.containerbody'))
            },
            (results) => {
              if (results && results[0] && results[0].result) {
                clearInterval(interval);
                resolve();
              }
            }
          );
        }, 200);
      });

      // Execute script to extract data
      chrome.scripting.executeScript({
        target: { tabId: targetTab.id },
        func: () => {
          const persons = document.querySelectorAll(".person");
          const emails = [];
          for (let i = 0; i < persons.length; i++) {
            try {
              const sectionBoxes = persons[i].querySelectorAll(".section-box.flex.column-2");
              if (sectionBoxes.length > 0) {
                const showMoreLists = sectionBoxes[0].querySelectorAll("ul.showMore-list");
                if (showMoreLists.length > 1) {
                  const emailLis = showMoreLists[1].querySelectorAll("li");
                  emails.push(...Array.from(emailLis).map(el => el.textContent.trim()));
                }
              }
            } catch (err) {
              // Swallow any errors for this person, continue.
            }
          }
          return emails;
        }
      }, (results) => {
        if (results && results[0]) {
          sendResponse({ data: results[0].result });
        } else {
          sendResponse({ data: [] });
        }
      });
    });
    return true;
  }
});