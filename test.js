const fs = require('fs');
fetch('http://localhost:8811/sse').then(res => {
    const sessionId = res.headers.get('set-cookie')?.split('sessionId=')[1]?.split(';')[0];
    return fetch('http://localhost:8811/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': 'sessionId=' + sessionId },
        body: JSON.stringify({ method: 'tools/call', params: { name: 'get_contract_source', arguments: {} } })
    });
}).then(res => res.text()).then(console.log);
