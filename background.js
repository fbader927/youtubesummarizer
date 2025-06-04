chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'summarize' && request.text) {
        // The API expects plain text within the JSON payload, so avoid encoding
        // the text here. Encoding led to mismatched handling on the backend
        // which occasionally returned unencoded strings containing percent
        // symbols (e.g. "100%"), causing `decodeURIComponent` to throw a
        // "URI malformed" error when processing the response.
        const requestBody = JSON.stringify({ text: request.text });

        fetch('https://summarizer-pcsze5jcyq-wl.a.run.app/api/summarize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: requestBody
        })
            .then(response => response.ok ? response.json() : Promise.reject('HTTP error, status = ' + response.status))
            // The response content is plain text, so avoid decoding to prevent
            // "URI malformed" errors when the text contains stray percent
            // characters.
            .then(data => sendResponse({ success: true, data: data.choices[0].message.content }))
            .catch(error => {
                const errorMessage = error && error.message ? error.message : String(error);
                sendResponse({ success: false, error: errorMessage });
            });

        return true;
    }
});
