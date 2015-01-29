var Discover = require('node-discover');

var os = require('os');
var http = require('http');
var express = require('express');
var connect = require("connect");
var blessed = require('blessed');
var bodyParser = require('body-parser');
var app = express();
var election_on = 1;
var election_off = 0;
app.use(bodyParser.urlencoded());


var querystring = require('querystring');
var isMaster = false;
var nodeList;
var timerStarted = false;
var my_ip = "192.168.0.107";
var master_ip = "";
var firstElection = true;
var primeCount = 0;
var setTimer = false;
var currentMaster = {
    ip: my_ip,
    count: 999999
}
var changeMaster = false;
var masterRemoved = false;
var workNum = 0;
var workPrimeCount = 0;
var allNodes = [];
var currentNode = -1;
var time = 2000;
var masterPrimeCount = 2;
var masterPrimeNum = 3;

var http = require('http');
var fs = require('fs');
var querystring = require('querystring');
var commandLineArgs = process.argv.slice(2);
var delay = parseInt(commandLineArgs[0]);

// Create a screen object.
var screen = blessed.screen();
// Create a box perfectly centered horizontally and vertically.
var box = blessed.box({
        top: 'center',
        left: 'center',
        width: '75%',
        height: '75%',
        content: '',
        tags: true,
        border: {
            type: 'line'
        },
        style: {
            fg: 'white',
            bg: 'black',
            border: {
                fg: '#f0f0f0'
            },
            hover: {
                bg: 'black'
            }
        }
    });

primeCounter(3, 2, 5000 - delay);
var d;

box.setContent('this node (' + my_ip + ') Just joined. ');

screen.append(box);
screen.render();
app.set('port', process.env.PORT || 3000);

box.setContent('this node (' + my_ip + ') will attempt to send its token to other nodes on network. ');
screen.render();



function primeComplete() {
    console.log("My Count :" + primeCount);
    currentMaster.count = primeCount;
    d = new Discover();
    registerCallbacks();
}

function primeCounter(n, c, k_milli) {

    setTimeout(primeComplete, k_milli);
    num = n;
    primeCount = c;
    var prevTime = (new Date()).getTime();
    var status = 1;
    while (1) {
        var curTime = (new Date()).getTime();
        var deltaTime = curTime - prevTime;
        if (deltaTime > k_milli)
            break;
        var j = 2;
        for (j = 2; j <= Math.sqrt(num); j++) {
            if (num % j === 0) {
                status = 0;
                break;
            }
        }
        if (status !== 0) {
            primeCount++;
        }
        status = 1;
        num++;
    }
}



/*Register Call back Functions */

function registerCallbacks() {


    d.on("promotion", function() {

        isMaster = true;
        console.log("I am the master....");
        box.style.bg = 'green'; //green for get
        screen.render();
        setTimeout(assignWork, 5000);
    });


    d.on("demotion", function() {
        isMaster = false;
        setTimer = false;
        console.log("I was demoted from being a master.");
        allNodes = [];

        // box.style.bg = 'yellow';
        //screen.render();

    });

    d.on("added", function(obj) {

        console.log("New Nodes");
    });

    d.on("removed", function(obj) {
        console.log("A node has been removed.");
        if (master_ip.localeCompare(obj.address) === 0) {
            masterRemoved = true;
        }
    });


    d.on("master", function(obj) {

        console.log("A new master is in control");
        if (master_ip.length === 0 || masterRemoved) {
            master_ip = obj.address;
            var post_data4 = querystring.stringify({
                    election: 1,
                    ip: my_ip,
                    c: primeCount
                });
            console.log("Sending Count:" + primeCount);
            PostObject(post_data4);
            console.log(JSON.stringify(obj));
            masterRemoved = false;
        }

    });

    d.eachNode(function(node) {
        console.log("EachNode:" + node.address + "\n");
    });

}


function PostObject(post_data) {
    var post_options = {
        host: master_ip,
        port: '3000',
        path: '/do_post',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(post_data)
        }
    };

    // Set up the request
    var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function(chunk) {});
    });

    post_req.on('error', function(e, post_data) {
        console.log('problem with request: ' + post_data);
    });

    post_req.write(post_data);
    post_req.end();
}

/* handle POST requests --------------------------------------------------------------------------------- */

app.post('/do_post', function(req, res) {
    var the_body = req.body;
    console.log("------Recieved-------------" + JSON.stringify(the_body));

    if (!isMaster) {
        box.style.bg = 'yellow';
        screen.render();
    }

    if (the_body.election !== null && parseInt(the_body.election) === 1) {
        checkForLeader(the_body);
    }

    if (the_body.election !== null && parseInt(the_body.election) === 0) {
        if (the_body.master == 1) {
            updateMaster();
        }
    }

    if (isMaster) {
        if (parseInt(the_body.work) === 0) {
            console.log("Delegating ---work --");
            masterPrimeCount = parseInt(the_body.count);
            masterPrimeNum = parseInt(the_body.number);
            delegate();
        }

    } else {

        if (parseInt(the_body.work) === 1) {
            doPrimeWork(parseInt(the_body.number), parseInt(the_body.count), parseInt(the_body.time));
        }

    }


    res.json({
            "body": the_body,
            "id": JSON.stringify(my_ip)
        });

});



function updateMaster() {
    d.promote();
}



function PostObject(post_data, node_ip) {
    var post_options = {
        host: node_ip,
        port: '3000',
        path: '/do_post',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(post_data)
        }
    };

    // Set up the request
    var post_req = http.request(post_options, function(res) {
        res.setEncoding('utf8');
        res.on('data', function(chunk) {});
    });

    post_req.on('error', function(e, post_data) {
        console.log('problem with request: ' + post_data);
    });

    post_req.write(post_data);
    post_req.end();
}




/*Node Discover Call backs  ---------------------------------------------------------*/


function recieveMessage(data) {

    if (data !== null && data.Election === true) {
        primeNumbers(3, 2, 5000);
    }
    console.log("Received!!!!" + data.Election);
}

function doPrimeWork(n, c, k_milli) {
    //setTimeout(sendPrimeWork, k_milli);
    workNum = n;
    workPrimeCount = c;
    workPrimeCounter(workNum, workPrimeCount, k_milli);
}

function sendPrimeWork() {
    var post_data1 = querystring.stringify({
            work: 0,
            count: workPrimeCount,
            number: workNum
        });
    PostObject(post_data1, master_ip);
    console.log("prime work sent");
}

function Election() {

    console.log(my_ip);

}



function changeMasterFunc() {
    master_ip = currentMaster.ip;
    console.log("change master to  IP:" + currentMaster.ip + "Count:" + currentMaster.count);
    var post_data4 = querystring.stringify({
            election: 0,
            master: 1
        });

    PostObject(post_data4);

}


function checkForLeader(body) {
    var r_ip = body.ip;
    var r_count = parseInt(body.c);
    console.log("Check for leader  received IP:" + r_ip + "Count:" + r_count);
    console.log("Master count to compare : " + currentMaster.count);
    if (currentMaster.count > r_count) {
        currentMaster.ip = r_ip;
        currentMaster.count = r_count;
        if (changeMaster === false) {
            console.log("started Change Master timer");
            changeMaster = true;
            setTimeout(changeMasterFunc, 5000);
        }
    }

}



function assignWork() {
    console.log("isMaster(assignWork)" + isMaster);
    if (isMaster) {
        console.log("I win\n");
        for (var uuid in d.nodes) {
            console.log("nodes:" + JSON.stringify(d.nodes[uuid]));
            if ((d.nodes[uuid].address.localeCompare(my_ip)) !== 0)
                allNodes.push(d.nodes[uuid]);
        }
        console.log("allNodes Length:" + allNodes.length);

        if (allNodes.length > 0)
            delegate();


    }
}

function delegate() {
    currentNode = currentNode + 1;

    if (currentNode >= allNodes.length)
        currentNode = 0;

    console.log("currentNode value:" + currentNode);

    var post_data;
    var ipAddr = allNodes[currentNode].address;
    console.log("Sending work to " + ipAddr);
    var post_data1 = querystring.stringify({
            work: 1,
            time: time,
            count: masterPrimeCount,
            number: masterPrimeNum
        });
    PostObject(post_data1, ipAddr);
}


function workPrimeCounter(n, c, k_milli) {

    var prevTime = (new Date()).getTime();
    var status = 1;
    while (1) {
        var curTime = (new Date()).getTime();
        var deltaTime = curTime - prevTime;
        if (deltaTime > k_milli)
            break;
        var j = 2;
        for (j = 2; j <= Math.sqrt(workNum); j++) {
            if (workNum % j === 0) {
                status = 0;
                break;
            }
        }
        if (status !== 0) {
            workPrimeCount++;
        }
        status = 1;
        workNum++;
    }
}




// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
});

http.createServer(app).listen(app.get('port'), function() {
    // console.log("Express server listening on port " + app.get('port'));
});
