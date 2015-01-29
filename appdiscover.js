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
var primeCount = 0;
var isMaster = false;
var my_ip = "192.168.0.101";
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

intialprimeCounter(3, 2, 5000);
var d;

// Append our box to the screen.
//.append(box);

app.set('port', process.env.PORT || 3000);

//box.setContent('this node (' + my_group[my_index] + ') will attempt to send its token to other nodes on network. ');
//screen.render();

var http = require('http');
var fs = require('fs');
var querystring = require('querystring');
//var commandLineArgs = process.argv.slice(2);
//var delay = parseInt(commandLineArgs[0]);




function primeComplete() {
    console.log("My Count :" + primeCount);
    d = new Discover({
            weight: (1 - primeCount)
        });
    registerCallbacks();
}

function primeCounter(n, c, k_milli) {

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



function intialprimeCounter(n, c, k_milli) {

    setTimeout(primeComplete, k_milli);
    num = n;
    primeCount = c;
    primeCounter(num, primeCount, k_milli);
}

var workNum = 0;
var workPrimeCount = 0;

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

function sendPrimeWork()
{
     var post_data1 = querystring.stringify({
            work: 0,
            count: workPrimeCount,
            number : workNum
        });
    PostObject(post_data1, master_ip);
    console.log("prime work sent");
}

function doPrimeWork(n, c, k_milli) {
    //setTimeout(sendPrimeWork, k_milli);
    workNum = n;
    workPrimeCount = c;
    workPrimeCounter(workNum, workPrimeCount, k_milli);
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


app.post('/do_post', function(req, res) {

    var the_body = req.body;
    console.log("----------Recieved-------------");
    if (isMaster) {
        if (parseInt(the_body.work) === 0) {
            
            masterPrimeCount =  parseInt(the_body.count);
            masterPrimeNum =  parseInt(the_body.number);
            delegate();
        }

    } else {

        if (parseInt(the_body.work) === 1) {
            doPrimeWork(parseInt(the_body.number), parseInt(the_body.count), parseInt(the_body.time));
        }

    }


    if (the_body) {}
    res.json({
            "body": the_body,
            "id": JSON.stringify(my_ip)
        });

});

var allNodes = [];
var currentNode = -1;
var time = 2000;
var masterPrimeCount = 2;
var masterPrimeNum = 3;
var master_ip = "";

function assignWork() {
  console.log("isMaster (assignWork) " + isMaster);
    if (isMaster) {
        console.log("I win\n");
        for (var uuid in d.nodes) {
            console.log("nodes:" + JSON.stringify(d.nodes[uuid]));
            if((d.nodes[uuid].address.localeCompare(my_ip)) !== 0)
                allNodes.push(d.nodes[uuid]);
        }
        if(allNodes.length > 0)
            delegate();
        console.log("allNodes Length:" + allNodes.length);
    }
}

function delegate() {
    
    if(currentNode < allNodes.length )
            currentNode =+1;
    else
        currentNode = 0;

    var post_data;
    console.log("currentNode is " + currentNode + " allNodes.length is " + allNodes.length)
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
var timerStarted == false;

function registerCallbacks() {


    d.on("promotion", function() {
        isMaster = true;
        console.log("I am the master...."+ my_ip);
        if(timerStarted === false)
        {
            setTimeout(assignWork, 10000);
            timerStarted = true;
        }
            
    });


    d.on("demotion", function() {
        isMaster = false;
        console.log("I was demoted from being a master.");
    });

    d.on("added", function(obj) {

        console.log("New Nodes" +obj.address);
    });


    d.on("removed", function(obj) {
        console.log("A node has been removed." + obj.address);

    });


    d.on("master", function(obj) {
        master_ip = obj.address;
        console.log("A new master is in control" + master_ip);
    });

    d.eachNode(function(node) {
        console.log("EachNode:" + node.address + "\n");
    });

}



// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
});  

// Focus our element.
//box.focus();

// Render the screen.
//screen.render();

http.createServer(app).listen(app.get('port'), function() {
    // console.log("Express server listening on port " + app.get('port'));
});
