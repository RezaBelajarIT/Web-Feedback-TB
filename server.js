const http = require('http');
const fs = require('fs');
const path = require('path');

function loadLocalEnv() {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;

    fs.readFileSync(envPath, 'utf8').split(/\r?\n/).forEach((line) => {
        const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
        if (!match) return;
        const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
        if (!process.env[match[1]]) process.env[match[1]] = value;
    });
}

loadLocalEnv();

const port = Number(process.env.PORT || 3000);
const root = __dirname;
const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

function sendJson(response, status, payload) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(payload));
}

function sendFile(response, filePath) {
    const extensions = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png' };
    response.writeHead(200, {
        'Content-Type': extensions[path.extname(filePath)] || 'application/octet-stream',
        'Cache-Control': 'no-store'
    });
    fs.createReadStream(filePath).pipe(response);
}

function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        let body = '';
        request.on('data', (chunk) => { body += chunk; });
        request.on('end', () => resolve(body));
        request.on('error', reject);
    });
}

const server = http.createServer((request, response) => {
    if (request.method === 'GET' && (request.url === '/' || request.url === '/WEB.html')) {
        sendFile(response, path.join(root, 'WEB.html'));
        return;
    }

    if (request.method === 'GET' && request.url === '/tb.png') {
        sendFile(response, path.join(root, 'tb.png'));
        return;
    }

    if (request.method === 'POST' && request.url === '/api/chat') {
        readRequestBody(request).then(async (body) => {
            let message;
            try {
                message = JSON.parse(body).message?.trim();
            } catch (error) {
                sendJson(response, 400, { error: 'Format pesan tidak valid.' });
                return;
            }

            if (!message) {
                sendJson(response, 400, { error: 'Pesan tidak boleh kosong.' });
                return;
            }
            if (!geminiApiKey) {
                sendJson(response, 503, { error: 'GEMINI_API_KEY belum diatur di server.' });
                return;
            }

            try {
                const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: 'Kamu adalah NARA, asisten sekolah yang ramah, aman, dan singkat. Jawab dalam bahasa Indonesia.' }] },
                        contents: [{ role: 'user', parts: [{ text: message }] }]
                    })
                });
                const result = await geminiResponse.json();
                if (!geminiResponse.ok) throw new Error(result.error?.message || 'Gemini gagal merespons.');
                const reply = result.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!reply) throw new Error('Gemini mengirim jawaban kosong.');
                sendJson(response, 200, { reply });
            } catch (error) {
                sendJson(response, 502, { error: error.message });
            }
        }).catch(() => sendJson(response, 400, { error: 'Gagal membaca pesan.' }));
        return;
    }

    sendJson(response, 404, { error: 'Halaman tidak ditemukan.' });
});

server.listen(port, () => {
    console.log(`NARA berjalan di http://localhost:${port}`);
});
