// Content script for YouTube summarizer – cleaned and de-duplicated
// Global state -----------------------------------------------------------------
var intervalId = null;   // ID for the streaming/typing interval
var isSummarizing = false;  // Prevent parallel summarisations
var cancelSummarization = false; // Flag to abort streaming early
var restoreButton = null;   // Button used when side-pane is minimised
var currentVideoId = null;  // Track current video to detect changes

// -----------------------------------------------------------------------------
//  UI helpers – inject the "Summarize" button into the watch page
// -----------------------------------------------------------------------------
function injectButton() {
    if (window.location.pathname !== '/watch') {
        return;
    }
    const moreActionsMenu = document.querySelector('ytd-menu-renderer yt-icon-button.dropdown-trigger');
    const descriptionBox = document.querySelector('ytd-video-secondary-info-renderer');
    const targetElement = moreActionsMenu || descriptionBox;

    if (targetElement && !document.getElementById('askButton')) {
        const askButton = document.createElement('button');
        askButton.innerText = 'Summarize';
        askButton.id = 'askButton';
        askButton.className = 'style-scope ytd-menu-renderer action-button askButton';
        askButton.onclick = extractTranscript;

        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.style.display = 'none';
        askButton.appendChild(loadingIndicator);

        if (moreActionsMenu) {
            moreActionsMenu.before(askButton);
        } else {
            descriptionBox.appendChild(askButton);
        }
    } else if (!targetElement) {
        // Wait for the page sections we need to exist.
        setTimeout(injectButton, 1000);
    }
}

// -----------------------------------------------------------------------------
//  Side-pane (summary) helpers
// -----------------------------------------------------------------------------
function closeSummarySidePane() {
    const sidePane = document.getElementById('summary-side-pane');
    if (sidePane) {
        // Remove existing summary chunks / loading spinners / messages.
        sidePane.querySelectorAll('.contentContainer').forEach(n => n.remove());
        const loading = sidePane.querySelector('.pane-loading-indicator');
        if (loading) loading.remove();
        const dynamicMessage = document.getElementById('dynamic-message');
        if (dynamicMessage) dynamicMessage.innerHTML = '';
        sidePane.style.display = 'none';
    }

    if (restoreButton) {
        restoreButton.remove();
        restoreButton = null;
    }
    clearInterval(intervalId);
    isSummarizing = false;
    cancelSummarization = true;

    hideLoadingIndicator();
    hideSummaryLoading();
}

function clearVideoData() {
    // Clear cached player response and current video tracking
    delete window.ytInitialPlayerResponse;
    currentVideoId = null;
}

window.addEventListener('unload', () => {
    closeSummarySidePane();
    delete window.ytInitialPlayerResponse;
    currentVideoId = null;
});

function showLoadingIndicator() {
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'inline-block';
}

function hideLoadingIndicator() {
    const loadingIndicator = document.querySelector('.loading-indicator');
    if (loadingIndicator) loadingIndicator.style.display = 'none';
}

function createCloseButton() {
    const closeButton = document.createElement('button');
    closeButton.setAttribute('aria-label', 'Close');
    closeButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
    closeButton.id = 'summary-close-button';
    closeButton.className = 'summaryCloseButton';
    closeButton.title = 'Close';
    closeButton.onclick = closeSummarySidePane;
    return closeButton;
}

function createMinimizeButton() {
    const minimizeButton = document.createElement('button');
    minimizeButton.setAttribute('aria-label', 'Minimize');
    minimizeButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
    minimizeButton.id = 'summary-minimize-button';
    minimizeButton.className = 'summaryMinimizeButton';
    minimizeButton.title = 'Minimize';
    minimizeButton.onclick = minimizeSummarySidePane;
    return minimizeButton;
}

function createDynamicMessageContainer() {
    let dynamicMessage = document.getElementById('dynamic-message');
    if (!dynamicMessage) {
        dynamicMessage = document.createElement('div');
        dynamicMessage.id = 'dynamic-message';
        dynamicMessage.className = 'dynamicMessage';

        let sidePane = document.getElementById('summary-side-pane');
        if (!sidePane) {
            sidePane = document.createElement('div');
            sidePane.id = 'summary-side-pane';
            sidePane.className = 'summarySidePane';
            document.body.appendChild(sidePane);
            sidePane.appendChild(createCloseButton());
            sidePane.appendChild(createMinimizeButton());
        }

        sidePane.prepend(dynamicMessage);
    }
    return dynamicMessage;
}

function updateDynamicMessage(message) {
    const dynamicMessage = createDynamicMessageContainer();
    dynamicMessage.innerHTML = message;
}

function showSummaryLoading() {
    let sidePane = document.getElementById('summary-side-pane');
    if (!sidePane) {
        sidePane = document.createElement('div');
        sidePane.id = 'summary-side-pane';
        sidePane.className = 'summarySidePane';
        document.body.appendChild(sidePane);
        sidePane.appendChild(createCloseButton());
        sidePane.appendChild(createMinimizeButton());
        sidePane.appendChild(createDynamicMessageContainer());
    }

    if (!sidePane.querySelector('.pane-loading-indicator')) {
        const loading = document.createElement('div');
        loading.className = 'pane-loading-indicator';
        loading.innerHTML = '<div class="spinner"></div>';
        sidePane.appendChild(loading);
    }
    sidePane.style.display = 'block';
}

function hideSummaryLoading() {
    const sidePane = document.getElementById('summary-side-pane');
    if (!sidePane) return;
    const loading = sidePane.querySelector('.pane-loading-indicator');
    if (loading) loading.remove();
}

function minimizeSummarySidePane() {
    const sidePane = document.getElementById('summary-side-pane');
    if (!sidePane || restoreButton) return;

    sidePane.style.display = 'none';

    restoreButton = document.createElement('button');
    restoreButton.id = 'summary-restore-button';
    restoreButton.className = 'summaryRestoreButton';
    restoreButton.title = 'Show Summary';
    restoreButton.setAttribute('aria-label', 'Show Summary');
    restoreButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19" stroke="white" stroke-width="2" stroke-linecap="round"/>
            <path d="M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>`;
    restoreButton.onclick = () => {
        sidePane.style.display = 'block';
        restoreButton.remove();
        restoreButton = null;
    };
    document.body.appendChild(restoreButton);
}

// -----------------------------------------------------------------------------
//  Streaming helpers
// -----------------------------------------------------------------------------
function appendSummaryChunkStreaming(formattedSummary) {
    if (cancelSummarization) return Promise.resolve();
    hideSummaryLoading();

    const sidePane = document.getElementById('summary-side-pane');
    if (!sidePane) return Promise.resolve();

    const contentContainer = document.createElement('div');
    contentContainer.className = 'contentContainer';
    sidePane.appendChild(contentContainer);

    const html = typeof marked !== 'undefined'
        ? marked.parse(formattedSummary)
        : formattedSummary.replace(/\n/g, '<br>');
    let index = 0;

    return new Promise(resolve => {
        function type() {
            if (cancelSummarization) { resolve(); return; }
            if (index <= html.length) {
                contentContainer.innerHTML = html.slice(0, index++);
                requestAnimationFrame(type);
            } else {
                resolve();
            }
        }
        type();
        sidePane.style.display = 'block';
    });
}

function toggleSummarySidePane(formattedSummary, append = false) {
    let sidePane = document.getElementById('summary-side-pane');
    if (!sidePane) {
        sidePane = document.createElement('div');
        sidePane.id = 'summary-side-pane';
        sidePane.className = 'summarySidePane';
        document.body.appendChild(sidePane);
        sidePane.appendChild(createCloseButton());
        sidePane.appendChild(createMinimizeButton());
        sidePane.appendChild(createDynamicMessageContainer());
    }

    if (!append) {
        sidePane.querySelectorAll('.contentContainer').forEach(c => c.remove());
    }

    const contentContainer = document.createElement('div');
    contentContainer.className = 'contentContainer';
    contentContainer.innerHTML = typeof marked !== 'undefined'
        ? marked.parse(formattedSummary)
        : formattedSummary.replace(/\n/g, '<br>');

    sidePane.appendChild(contentContainer);
    sidePane.style.display = 'block';
}

// -----------------------------------------------------------------------------
//  Transcript extraction helpers
// -----------------------------------------------------------------------------
function clickShowTranscriptButton() {
    const buttons = Array.from(document.querySelectorAll('button'));
    const showTranscriptButton = buttons.find(btn => btn.textContent.trim() === 'Show transcript');
    if (showTranscriptButton) {
        showTranscriptButton.click();
        return true;
    }
    return false;
}

function getCurrentVideoId() {
    // Get video ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    let videoId = urlParams.get('v');
    if (!videoId) {
        const match = window.location.pathname.match(/\/shorts\/([a-zA-Z0-9_-]+)/);
        if (match) videoId = match[1];
    }
    return videoId;
}

function fetchTranscriptFromCaptionsApi(retryCount = 0) {
    const maxRetries = 3;

    return new Promise((resolve, reject) => {
        try {
            const videoId = getCurrentVideoId();
            if (!videoId) {
                return reject('Could not determine video ID.');
            }

            // If this is a different video than we were tracking, clear old data
            if (currentVideoId !== videoId) {
                clearVideoData();
                currentVideoId = videoId;
            }

            let playerResponse = null;

            // Scan script tags for ytInitialPlayerResponse matching current video
            const scripts = Array.from(document.querySelectorAll('script'))
                .filter(s => s.textContent.includes('ytInitialPlayerResponse'));

            for (const script of scripts) {
                const matches = script.textContent.match(/ytInitialPlayerResponse\s*=\s*(\{[^;]*\});/s);
                if (matches && matches[1]) {
                    try {
                        const candidate = JSON.parse(matches[1]);
                        const vid = candidate?.videoDetails?.videoId;
                        if (vid === videoId) {
                            playerResponse = candidate;
                            // Only cache if it matches current video
                            window.ytInitialPlayerResponse = candidate;
                            break;
                        }
                    } catch (parseError) {
                        console.log('Parse error for script content, trying next...', parseError);
                    }
                }
            }

            // If no fresh player response found and we have a cached one, check if it's valid
            if (!playerResponse && window.ytInitialPlayerResponse) {
                const cached = window.ytInitialPlayerResponse;
                const cachedId = cached?.videoDetails?.videoId;
                if (cachedId === videoId) {
                    playerResponse = cached;
                }
            }

            // If still no player response, try to wait and retry
            if (!playerResponse) {
                if (retryCount < maxRetries) {
                    console.log(`No player response found, retrying... (${retryCount + 1}/${maxRetries})`);
                    setTimeout(() => {
                        fetchTranscriptFromCaptionsApi(retryCount + 1)
                            .then(resolve)
                            .catch(reject);
                    }, 1000 * (retryCount + 1)); // Exponential backoff
                    return;
                } else {
                    return reject('Transcript not available for this video.');
                }
            }

            // Extract caption tracks
            const tracks = playerResponse.captions?.playerCaptionsTracklistRenderer?.captionTracks;
            if (!tracks?.length) {
                return reject('Transcript not available for this video.');
            }

            const track = tracks.find(t => t.languageCode === 'en') || tracks[0];
            const url = track.baseUrl + '&fmt=json3';

            fetch(url)
                .then(res => {
                    if (!res.ok) {
                        throw new Error('Transcript fetch failed');
                    }
                    return res.json();
                })
                .then(resolve)
                .catch(reject);

        } catch (error) {
            if (retryCount < maxRetries) {
                console.log(`Error occurred, retrying... (${retryCount + 1}/${maxRetries})`, error);
                setTimeout(() => {
                    fetchTranscriptFromCaptionsApi(retryCount + 1)
                        .then(resolve)
                        .catch(reject);
                }, 1000 * (retryCount + 1));
            } else {
                reject('Transcript not available for this video.');
            }
        }
    });
}

// -----------------------------------------------------------------------------
//  Summarisation pipeline
// -----------------------------------------------------------------------------
function waitForTranscriptLoad(callback) {
    let attempts = 0;
    const checkTranscript = setInterval(() => {
        const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
        if (segments.length > 0 || attempts > 10) {
            clearInterval(checkTranscript);
            callback(segments);
        }
        attempts++;
    }, 500);
}

function extractTranscript() {
    if (isSummarizing) {
        console.log('Summarisation is already in progress.');
        return;
    }

    // Check if we're on a new video and clear data if needed
    const videoId = getCurrentVideoId();
    if (currentVideoId !== videoId) {
        clearVideoData();
        currentVideoId = videoId;
    }

    isSummarizing = true;
    cancelSummarization = false;
    clearInterval(intervalId);

    showLoadingIndicator();
    showSummaryLoading();

    // Add a small delay to ensure page has loaded after navigation
    setTimeout(() => {
        fetchTranscriptFromCaptionsApi()
            .then(data => {
                if (cancelSummarization) {
                    isSummarizing = false;
                    hideLoadingIndicator();
                    hideSummaryLoading();
                    return;
                }

                if (!data || !data.events) {
                    throw new Error('Transcript loading failed or not found.');
                }

                let transcriptText = '';
                data.events.forEach(event => {
                    if (!event.segs) return;
                    const time = new Date(event.tStartMs).toISOString().substr(11, 8);
                    const text = event.segs.map(s => s.utf8).join('');
                    transcriptText += time + ' ' + text + '\n';
                });

                processTranscriptInChunks(transcriptText);
            })
            .catch(err => {
                console.error('Transcript extraction failed:', err);
                updateDynamicMessage(typeof err === 'string' ? err : err.message);
                hideLoadingIndicator();
                hideSummaryLoading();
                isSummarizing = false;
            });
    }, 500); // Wait 500ms for page to settle after navigation
}

function processTranscriptInChunks(transcriptText) {
    const chunkSize = 20000;
    let position = 0;

    function summarizeNextChunk() {
        if (cancelSummarization) {
            hideLoadingIndicator();
            hideSummaryLoading();
            isSummarizing = false;
            return;
        }

        if (position >= transcriptText.length) {
            clearInterval(intervalId);
            hideLoadingIndicator();
            hideSummaryLoading();
            isSummarizing = false;
            return;
        }

        const chunk = transcriptText.substring(position, Math.min(position + chunkSize, transcriptText.length));
        position += chunkSize;

        chrome.runtime.sendMessage({ action: 'summarize', text: chunk }, response => {
            if (!response.success) {
                clearInterval(intervalId);
                toggleSummarySidePane('Error: ' + (response.error || 'Unknown') + '. Please reload and try again.');
                hideLoadingIndicator();
                isSummarizing = false;
                return;
            }
            appendSummaryChunkStreaming(response.data).then(() => {
                summarizeNextChunk();
            });
        });
    }

    summarizeNextChunk();
}

// -----------------------------------------------------------------------------
//  Bootstrapping
// -----------------------------------------------------------------------------
injectButton();
new MutationObserver(injectButton).observe(document.body, { childList: true, subtree: true });

window.addEventListener('yt-navigate-start', () => {
    clearVideoData();
    closeSummarySidePane();
});

window.addEventListener('yt-navigate-finish', () => {
    if (window.location.pathname !== '/watch') {
        closeSummarySidePane();
    }
    // Wait longer for YouTube to fully load the new video data
    setTimeout(injectButton, 2000);
});

// Export for tests (ignored in browser)
if (typeof module !== 'undefined') {
    module.exports = {
        createDynamicMessageContainer,
        toggleSummarySidePane,
        closeSummarySidePane,
        showSummaryLoading,
        hideSummaryLoading,
        appendSummaryChunkStreaming,
        fetchTranscriptFromCaptionsApi,
        extractTranscript
    };
}