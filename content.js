function injectButton() {
    const moreActionsMenu = document.querySelector('ytd-menu-renderer yt-icon-button.dropdown-trigger');
    const descriptionBox = document.querySelector('ytd-video-secondary-info-renderer');
    const targetElement = moreActionsMenu || descriptionBox;
    if (targetElement && !document.getElementById('askButton')) {
        const askButton = document.createElement('button');
        askButton.innerText = 'Summarize';
        askButton.id = 'askButton';
        askButton.className = 'style-scope ytd-menu-renderer action-button askButton';
        console.log('Binding click event to Ask button');
        askButton.onclick = extractTranscript;
        if (moreActionsMenu) {
            moreActionsMenu.before(askButton);
        } else {
            descriptionBox.appendChild(askButton);
        }
    } else if (!targetElement) {
        setTimeout(injectButton, 1000);
    }
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
    closeButton.onclick = () => {
        const sidePane = document.getElementById('summary-side-pane');
        if (sidePane) {
            sidePane.style.display = 'none'; 
        }
    };
    return closeButton;
}

function toggleSummarySidePane(formattedSummary) {
    let sidePane = document.getElementById('summary-side-pane');
    if (!sidePane) {
        sidePane = document.createElement('div');
        sidePane.id = 'summary-side-pane';
        sidePane.className = 'summarySidePane';
        const closeButton = createCloseButton();
        sidePane.appendChild(closeButton);
        document.body.appendChild(sidePane);
    } else {
        const closeButton = sidePane.firstChild;
        sidePane.innerHTML = '';
        sidePane.appendChild(closeButton);
    }
    const contentContainer = document.createElement('div');
    contentContainer.className = 'contentContainer';
    formattedSummary = formattedSummary.replace(/\n/g, '<br>');
    contentContainer.innerHTML = formattedSummary;
    sidePane.appendChild(contentContainer);
    sidePane.style.display = 'block';
}

function clickShowTranscriptButton() {
    const buttons = Array.from(document.querySelectorAll('button'));
    const showTranscriptButton = buttons.find(btn => btn.textContent.trim() === 'Show transcript');
    if (showTranscriptButton) {
        showTranscriptButton.click();
        console.log('Clicked on Show transcript');
    } else {
        console.error('Show transcript button not found.');
    }
}

function extractTranscript() {
    console.log('extractTranscript called');
    clickShowTranscriptButton();
    toggleSummarySidePane('Summarizing Video...');
    setTimeout(() => {
        const transcriptSegments = document.querySelectorAll('ytd-transcript-segment-renderer');
        let transcriptText = '';
        transcriptSegments.forEach(segment => {
            const time = segment.querySelector('div.segment-timestamp').innerText;
            const text = segment.querySelector('yt-formatted-string').innerText;
            transcriptText += time + ' ' + text + '\n';
        });
        if (!transcriptText) {
            console.error('Transcript segments not found.');
            return;
        }
        chrome.runtime.sendMessage({ action: 'summarize', text: transcriptText }, (response) => {
            if (chrome.runtime.lastError || !response) {
                console.error('Error:', chrome.runtime.lastError || 'No response received');
                return;
            }
            if (response.success) {
                console.log('Summarized text:', response.data);
                if (response.data.candidates &&
                    response.data.candidates.length > 0 &&
                    response.data.candidates[0].content &&
                    response.data.candidates[0].content.parts &&
                    response.data.candidates[0].content.parts.length > 0) {
                    const summarizedTextPart = response.data.candidates[0].content.parts[0].text;
                    console.log('Formatted summarized text:', summarizedTextPart);
                    toggleSummarySidePane(summarizedTextPart);
                } else {
                    console.error('Expected parts not found in response.');
                }
            } else {
                console.error('Error summarizing text:', response.error);
            }
        });
    }, 3000);
}

injectButton();
new MutationObserver(injectButton).observe(document.body, { childList: true, subtree: true });