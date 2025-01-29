document.addEventListener("DOMContentLoaded", function () {
  const tabsList = document.getElementById("tabs-list");
  const closeButton = document.getElementById("close-tabs");

  // ------------------ SEARCH FUNCTIONALITY ------------------ //

  const searchInput = document.getElementById("search-input");
  const prevMatchBtn = document.getElementById("prev-match");
  const nextMatchBtn = document.getElementById("next-match");
  const searchStatus = document.getElementById("search-status");

  let searchResults = [];
  let currentIndex = -1;

  // Function to clear previous highlights and reset search
  function clearSearch() {
    searchStatus.textContent = "0/0";
    document.querySelectorAll(".tab-label").forEach((label) => {
      label.classList.remove("highlight");
    });
    searchResults = [];
    currentIndex = -1;
  }

  // Function to perform search and highlight matches
  function performSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    clearSearch();

    if (searchTerm.trim() !== "") {
      document.querySelectorAll(".tab-label").forEach((label, index) => {
        if (label.textContent.toLowerCase().includes(searchTerm)) {
          label.classList.add("highlight");
          searchResults.push(label);
        }
      });

      if (searchResults.length > 0) {
        currentIndex = 0;
        updateSearchStatus();
        searchResults[currentIndex].scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }

  // Function to navigate through search results
  function navigateSearch(direction) {
    if (searchResults.length > 0) {
      currentIndex += direction;
      if (currentIndex < 0) {
        currentIndex = searchResults.length - 1;
      } else if (currentIndex >= searchResults.length) {
        currentIndex = 0;
      }

      updateSearchStatus();
      searchResults[currentIndex].scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }

  // Function to update the search status display
  function updateSearchStatus() {
    searchStatus.textContent = `${currentIndex + 1}/${searchResults.length}`;
  }

  // Event listeners for search and navigation buttons
  searchInput.addEventListener("input", performSearch);
  prevMatchBtn.addEventListener("click", () => navigateSearch(-1));
  nextMatchBtn.addEventListener("click", () => navigateSearch(1));

  // ------------------ END SEARCH FUNCTIONALITY ------------------ //


  // ------------------ REPORT ISSUE FUNCTIONALITY ------------------ //
  const reportIssueLink = document.getElementById("report-issue-link");

  reportIssueLink.addEventListener("click", function (event) {
    event.preventDefault(); // Prevent link from showing in the status bar

    // Obfuscated email parts
    const user = "p.rishiraj";
    const domain = "gmail.com";
    const subject = encodeURIComponent("Tab Manager Issue Report");
    const body = encodeURIComponent("Describe your issue here...");

    // Construct email dynamically
    window.location.href = `mailto:${user}@${domain}?subject=${subject}&body=${body}`;
  });
  // ------------------ END REPORT ISSUE FUNCTIONALITY ------------------ //

  
  // Function to extract the base domain from a URL
  function getBaseDomain(domain) {
    const parts = domain.split(".");
    if (parts.length > 2) {
      return parts.slice(-2).join("."); // Get the last two parts (e.g., amazon.com)
    }
    return domain;
  }

  // Function to render tabs in the UI
  function renderTabs(currentTabId) {
    chrome.tabs.query({}, function (tabs) {
      tabsList.innerHTML = ""; // Clear existing list
      const groupedTabs = {};

      tabs.forEach((tab) => {
        // Prepend "(Current)" to the current active tab
        if (tab.id === currentTabId) {
          tab.title = "(Current) " + tab.title;
        }

        const domain = new URL(tab.url).hostname;
        if (!groupedTabs[domain]) {
          groupedTabs[domain] = [];
        }
        groupedTabs[domain].push(tab);
      });

      // Sort groups by base domain and then full domain
      const sortedDomains = Object.keys(groupedTabs).sort((a, b) => {
        const baseA = getBaseDomain(a);
        const baseB = getBaseDomain(b);
        if (baseA !== baseB) {
          return baseA.localeCompare(baseB);
        }
        return a.localeCompare(b);
      });

      sortedDomains.forEach((domain) => {
        const groupDiv = document.createElement("div");
        groupDiv.className = "tab-group";

        // Collapsible Header
        const groupHeader = document.createElement("div");
        groupHeader.className = "tab-group-header";

        const selectAllCheckbox = document.createElement("input");
        selectAllCheckbox.type = "checkbox";
        selectAllCheckbox.className = "select-all-checkbox";

        const groupTitle = document.createElement("h2");
        groupTitle.textContent = `${domain} (${groupedTabs[domain].length})`;

        const toggleButton = document.createElement("span");
        toggleButton.className = "toggle-button";
        toggleButton.textContent = "▼"; // Initially expanded

        groupHeader.appendChild(selectAllCheckbox);
        groupHeader.appendChild(groupTitle);
        groupTitle.appendChild(toggleButton);
        groupDiv.appendChild(groupHeader);

        const tabItemsContainer = document.createElement("div");
        tabItemsContainer.className = "tab-items-container";

        groupedTabs[domain].forEach((tab) => {
          const tabItem = document.createElement("div");
          tabItem.className = "tab-item";

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "tab-checkbox";
          checkbox.value = tab.id;
          tabItem.appendChild(checkbox);

          // Add sound icon if tab is audible
          if (tab.audible) {
            const soundIcon = document.createElement("span");
            soundIcon.textContent = tab.mutedInfo.muted ? " 🔇" : " 🔊";
            soundIcon.className = "sound-icon";
            soundIcon.style.cursor = "pointer";
            soundIcon.style.color = "red";

            soundIcon.addEventListener("click", (event) => {
              event.stopPropagation();
              chrome.tabs.update(tab.id, { muted: !tab.mutedInfo.muted });
              renderTabs(currentTabId);
            });

            tabItem.appendChild(soundIcon);
          }

          const label = document.createElement("label");
          label.textContent = tab.title;
          label.title = tab.url;
          label.className = "tab-label";

          label.addEventListener("click", () => {
            chrome.tabs.update(tab.id, { active: true });
            chrome.windows.update(tab.windowId, { focused: true }, () => {
              window.close();
            });
          });

          tabItem.appendChild(label);
          tabItemsContainer.appendChild(tabItem);
        });

        groupDiv.appendChild(tabItemsContainer);
        tabsList.appendChild(groupDiv);

        toggleButton.addEventListener("click", function () {
          if (tabItemsContainer.style.display === "none") {
            tabItemsContainer.style.display = "block";
            toggleButton.textContent = "▼";
          } else {
            tabItemsContainer.style.display = "none";
            toggleButton.textContent = "▲";
          }
        });

        selectAllCheckbox.addEventListener("change", function () {
          const checkboxes =
            tabItemsContainer.querySelectorAll(".tab-checkbox");
          checkboxes.forEach((cb) => {
            cb.checked = selectAllCheckbox.checked;
          });
        });
      });
    });
  }

  // Load the tab data
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs.length > 0) {
      renderTabs(tabs[0].id);
    }
  });

  // Close selected tabs when button is clicked
  closeButton.addEventListener("click", function () {
    const selectedTabCheckboxes = document.querySelectorAll(
      ".tab-checkbox:checked"
    );

    selectedTabCheckboxes.forEach((checkbox) => {
      const tabId = parseInt(checkbox.value);
      chrome.tabs.remove(tabId, function () {
        const tabItem = checkbox.closest(".tab-item");
        const groupContainer = tabItem.closest(".tab-group");

        tabItem.remove();
        if (groupContainer.querySelectorAll(".tab-item").length === 0) {
          groupContainer.remove();
        }
      });
    });
  });
});
