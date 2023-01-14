//######################################################################################################
//                                      IMPORTS & CONFIGURATIONS
//######################################################################################################
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');

//######################################################################################################
//                                          FUNCTIONS
//######################################################################################################
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, '"')
        .replace(/'/g, "'");
}

function reqInfo(req) {
    return `${req.ip} - ${req.method} - ${req.url} - ${req.get('User-Agent')}`;
}

//######################################################################################################
//                                           MIDDLEWARE
//######################################################################################################
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/public', express.static(__dirname + '/assets'));

//######################################################################################################
//                                              ROUTES
//######################################################################################################
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

//######################################################################################################
//                                              API
//######################################################################################################
app.post('/api/save', (req, res) => {
    //JSON file to be written to /grids/{gridID}.json
    let id = escapeHtml(req.body.id);
    let title = escapeHtml(req.body.title);
    let crossword = req.body.grid || [];

    //Check for errors
    //Error codes: 1 - missing grid ID, 2 - invalid grid ID, 3 - title too long, 4 - error saving grid, 5 - error reading logs.json, 6 - error writing logs.json

    if (!id || !crossword || crossword.length === 0) {
        console.log('[C R O S S W O R D] Invalid request - missing ' + (!id ? 'grid ID' : 'grid') + ' - ' + reqInfo(req));
        res.status(400).send({ error: true, message: 'Missing grid ID or grid', errorID: 1 });
        return;
    }
    if (id.length !== 5) {
        console.log('[C R O S S W O R D] Invalid request - invalid grid ID - ' + reqInfo(req));
        res.status(400).send({ error: true, message: 'Invalid grid ID', errorID: 2 });
        return;
    }
    if (title.length > 50) {
        console.log('[C R O S S W O R D] Invalid request - title too long - ' + reqInfo(req));
        res.status(400).send({ error: true, message: 'Title too long', errorID: 3 });
        return;
    }

    //Create JSON object
    let grid = {
        id: id,
        title: title,
        grid: crossword
    };

    //Write to file
    fs.writeFile(`./grids/${grid.id}.json`, JSON.stringify(grid), (err) => {
        if (err) {
            console.log(err);
            console.log('[C R O S S W O R D] Error saving grid - ' + reqInfo(req));
            res.status(500).send({ error: true, message: 'Error saving grid', errorID: 4 });
        } else {
            //get logs.json content for edit push entry to "saved" array
            fs.readFile('./logs.json', (err, data) => {
                if (err) {
                    console.log('[C R O S S W O R D] Error reading logs.json - ' + reqInfo(req));
                    console.log(err);
                    res.status(500).send({ error: true, message: 'Error saving grid', errorID: 5 });
                } else {
                    let logs = JSON.parse(data);
                    let date = new Date();
                    logs.saved.push({
                        id: grid.id,
                        title: grid.title,
                        date: date.toLocaleDateString() + ' ' + date.toLocaleTimeString(),
                        request: reqInfo(req)
                    });
                    //write logs.json with new entry
                    fs.writeFile('./logs.json', JSON.stringify(logs), (err) => {
                        if (err) {
                            console.log('[C R O S S W O R D] Error writing logs.json - ' + reqInfo(req));
                            console.log(err);
                            res.status(500).send({ error: true, message: 'Error saving grid', errorID: 6 });
                        } else {
                            console.log('[C R O S S W O R D] Grid saved - ' + reqInfo(req));
                            res.status(200).send({ error: false, message: 'Grid saved', errorID: 0 });
                        }
                    });
                }
            });
        }
    });
});

//######################################################################################################
//                                              404
//######################################################################################################
app.use((req, res) => {
    res.status(404).send('404 - Page not found');
});


//######################################################################################################
//                                              SERVER
//######################################################################################################
app.listen(3000, () => {
    console.log('[C R O S S W O R D] Server is running on port 3000');
});