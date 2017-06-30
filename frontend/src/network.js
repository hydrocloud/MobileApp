export function makeRequest(method, url, data, headers) {
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open(method, url, true);
        if(headers) {
            for(let k in headers) {
                xhr.setRequestHeader(k, headers[k]);
            }
        }
        xhr.onreadystatechange = () => {
            if(xhr.readyState == xhr.DONE) {
                if(xhr.status < 200 || xhr.status >= 300) {
                    reject(xhr.responseText);
                } else {
                    resolve(xhr.responseText);
                }
            }
        };
        if(data) {
            if(typeof(data) == "object") { // encode to html form by default
                let t = "";
                Object.keys(data).forEach(k => {
                    t += encodeURIComponent(k) + "=" + encodeURIComponent(data[k]) + "&";
                });
                data = t.substring(0, t.length - 1); // remove the last char '&'
                if(!headers || !headers["Content-Type"]) xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            }
            xhr.send(data);
        }
        else xhr.send(null);
    });
}
