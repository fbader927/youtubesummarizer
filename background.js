chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'summarize' && request.text) {
        const encodedText = encodeURIComponent(request.text);
        const requestBody = JSON.stringify({ text: encodedText });

        fetch('https://summarizer-pcsze5jcyq-wl.a.run.app/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
        })
            .then(response => response.ok ? response.json() : Promise.reject('HTTP error, status = ' + response.status))
            .then(data => sendResponse({ success: true, data: decodeURIComponent(data.choices[0].message.content) }))
            .catch(error => sendResponse({ success: false, error: error }));

        return true;
    }
});
