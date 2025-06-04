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
        setTimeout(injectButton, 1000);
    }
}

function closeSummarySidePane() {
    const sidePane = document.getElementById('summary-side-pane');
    if (sidePane) {
        sidePane.innerHTML = '';
        sidePane.style.display = 'none';
    }
    if (restoreButton) {
        restoreButton.remove();
        restoreButton = null;
    }
    clearInterval(intervalId);
    isSummarizing = false;
    hideLoadingIndicator();
    hideSummaryLoading();
}

window.addEventListener('unload', closeSummarySidePane);

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

function ensureSidePane() {
    let sidePane = document.getElementById('summary-side-pane');
    if (!sidePane) {
        sidePane = document.createElement('div');
        sidePane.id = 'summary-side-pane';
        sidePane.className = 'summarySidePane';
        document.body.appendChild(sidePane);
    }
    if (!sidePane.querySelector('#summary-close-button')) {
        sidePane.appendChild(createCloseButton());
    }
    if (!sidePane.querySelector('#summary-minimize-button')) {
        sidePane.appendChild(createMinimizeButton());
    }
    return sidePane;
}

function createDynamicMessageContainer() {
    let dynamicMessage = document.getElementById('dynamic-message');
    if (!dynamicMessage) {
        dynamicMessage = document.createElement('div');
        dynamicMessage.id = 'dynamic-message';
        dynamicMessage.className = 'dynamicMessage';

        const sidePane = ensureSidePane();
        sidePane.prepend(dynamicMessage);
    }
    return dynamicMessage;
}

function updateDynamicMessage(message) {
    const dynamicMessage = createDynamicMessageContainer();
    dynamicMessage.innerHTML = message;
}

function showSummaryLoading() {
    const sidePane = ensureSidePane();
    createDynamicMessageContainer();

    const existing = sidePane.querySelector('.pane-loading-indicator');
    if (!existing) {
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

function appendSummaryChunkStreaming(formattedSummary) {
    hideSummaryLoading();
    let sidePane = document.getElementById('summary-side-pane');
    if (!sidePane) return;

    const contentContainer = document.createElement('div');
    contentContainer.className = 'contentContainer';
    sidePane.appendChild(contentContainer);

    const html = typeof marked !== 'undefined' ? marked.parse(formattedSummary) : formattedSummary.replace(/\n/g, '<br>');
    let index = 0;

    function type() {
        if (index <= html.length) {
            contentContainer.innerHTML = html.slice(0, index);
            index++;
            requestAnimationFrame(type);
        }
    }

    type();
    sidePane.style.display = 'block';
}

function toggleSummarySidePane(formattedSummary, append = false) {
    const sidePane = ensureSidePane();
    createDynamicMessageContainer();

    if (!append) {
        const contentContainers = sidePane.querySelectorAll('.contentContainer');
        contentContainers.forEach(container => container.remove());
    }

    const contentContainer = document.createElement('div');
    contentContainer.className = 'contentContainer';
    if (typeof marked !== 'undefined') {
        contentContainer.innerHTML = marked.parse(formattedSummary);
    } else {
        contentContainer.innerHTML = formattedSummary.replace(/\n/g, '<br>');
    }
    sidePane.appendChild(contentContainer);
    sidePane.style.display = 'block';
}

function clickShowTranscriptButton() {
    const buttons = Array.from(document.querySelectorAll('button'));
    const showTranscriptButton = buttons.find(btn => btn.textContent.trim() === 'Show transcript');
    if (showTranscriptButton) {
        showTranscriptButton.click();
        return true;
    } else {
        return false;
    }
}

function waitForTranscriptLoad(callback) {
    let attempts = 0;
    const checkTranscript = setInterval(() => {
        const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
        if (transcriptSegments.length > 0 || attempts > 10) {
            clearInterval(checkTranscript);
            callback(transcriptSegments);
        }
        attempts++;
    }, 500);
}

let intervalId;
let isSummarizing = false;
let restoreButton = null;

function extractTranscript() {
    if (isSummarizing) {
        console.log("Summarization is already in progress.");
        return;
    }
    isSummarizing = true;
    clearInterval(intervalId);

    showLoadingIndicator();
    showSummaryLoading();

    if (!clickShowTranscriptButton()) {
        updateDynamicMessage('Transcript not available for this video.');
        isSummarizing = false; 
        hideLoadingIndicator();
        return;
    }

    waitForTranscriptLoad((transcriptSegments) => {
        if (!transcriptSegments.length) {
            updateDynamicMessage('Transcript loading failed or not found.');
            hideLoadingIndicator();
            isSummarizing = false;  
            return;
        }

        let transcriptText = '';
        transcriptSegments.forEach(segment => {
            const time = segment.querySelector('div.segment-timestamp').innerText;
            const text = segment.querySelector('yt-formatted-string').innerText;
            transcriptText += time + ' ' + text + '\n';
        });

        processTranscriptInChunks(transcriptText);
    });
}

function processTranscriptInChunks(transcriptText) {
    const chunkSize = 20000;
    let position = 0;

    function summarizeNextChunk() {
        if (position >= transcriptText.length) {
            clearInterval(intervalId);
            hideLoadingIndicator();
            hideSummaryLoading();
            chrome.storage.local.remove('transcriptText', function () {
                console.log('Transcript text cleared after processing.');
            });
            isSummarizing = false;
            return;
        }

        const chunk = transcriptText.substring(position, Math.min(position + chunkSize, transcriptText.length));
        position += chunkSize;

        chrome.runtime.sendMessage({ action: 'summarize', text: chunk }, (response) => {
            if (!response.success) {
                clearInterval(intervalId);
                const errorText = response.error || 'Unknown error';
                toggleSummarySidePane('Error in processing summary: ' + errorText + '. Please reload and try again.');
                hideLoadingIndicator();
                isSummarizing = false;
                return;
            }
            appendSummaryChunkStreaming(response.data);
            summarizeNextChunk();
        });
    }

    summarizeNextChunk();
}

if (typeof module === 'undefined') {
    injectButton();
    new MutationObserver(injectButton).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('yt-navigate-start', closeSummarySidePane);
    window.addEventListener('yt-navigate-finish', () => {
        if (window.location.pathname !== '/watch') {
            closeSummarySidePane();
        }
        setTimeout(injectButton, 1000);
    });
} else {
    module.exports = {
        createDynamicMessageContainer,
        toggleSummarySidePane,
        closeSummarySidePane,
        showSummaryLoading,
        hideSummaryLoading,
        appendSummaryChunkStreaming
    };
}
