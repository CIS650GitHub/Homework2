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
var my_ip = "";
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
var workNum = 3;
var workPrimeCount = 2;
var allNodes = [];
var currentNode = -1;
var time = 500;
var masterPrimeCount = 2;
var masterPrimeNum = 3;
var newnNodeAdded =  false;

var http = require('http');
var fs = require('fs');
var querystring = require('querystring');
var commandLineArgs = process.argv.slice(2);
var delay = 0;
if (commandLineArgs !== null)
    delay = parseInt(commandLineArgs[0]);
// Create a screen object.
var screen = blessed.screen();
// Create a box perfectly centered horizontally and vertically.
var box = blessed.box({
        top: 'center',
        left: 'center',
        width: '100%',
        height: '100%',
        content: '',
        tags: true,
        scrollable: true,
        border: {
            type: 'line'
        },
        style: {
            fg: 'white',
            bg: 'blue',
            border: {
                fg: '#f0f0f0'
            },
            hover: {
                bg: 'black'
            }
        }
    });

var ifaces = os.networkInterfaces();

var workPostFail = false;

Object.keys(ifaces).forEach(function(ifname) {
    var alias = 0;

    ifaces[ifname].forEach(function(iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
            console.log("skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses");
            return;
        }

        if (alias >= 1) {
            console.log("here---" + ifname + ':' + alias, iface.address);
            if (my_ip.length === 0)
                my_ip = iface.address;
        } else {
            console.log("here" + ifname, iface.address);
            if (my_ip.length === 0)
                my_ip = iface.address;
        }
    });
});

primeCounter(3, 2, 5000 - delay);
var d;

box.setContent('(' + my_ip + ') joined Counting Prime with delay.  ' + delay);
// console.log('(' + my_ip + ') joined Counting Prime with delay.  ' + delay);

screen.append(box);
screen.render();
app.set('port', process.env.PORT || 3000);
screen.render();


function primeComplete() {
   //console.log("My Count :" + primeCount + "My_Ip" + my_ip);
    currentMaster.count = primeCount;
    var node_weight = (-1 * primeCount);
    d = new Discover({
            helloInterval: 3000,
            checkInterval: 4000,
            nodeTimeout: 4000,
            masterTimeout: 4000,
            weight: node_weight
        });
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
        box.setContent("I am the master ");
        currentMaster.ip = my_ip;
        currentMaster.count = primeCount;
        box.style.bg = 'green'; //green for get
        screen.render();
        masterPrimeNum =  workNum;
        masterPrimeCount =  workPrimeCount;
        //console.log("Will call late delegate after 10 sec ");
        newnNodeAdded =  true;
        setTimeout(lateDelegate, 10000);
    });

    d.on("demotion", function() {
        isMaster = false;
        setTimer = false;
        box.setContent("I was demoted from being a master");
        allNodes = [];
        box.style.bg = 'blue';
        screen.render();

    });

    d.on("added", function(obj) {
       if(isMaster)
       {
        newnNodeAdded = true;
       }
       box.setContent("New Node" + obj.address);
    });

    d.on("removed", function(obj) {
       box.setContent("Node Removed" + obj.address);
        if (master_ip.localeCompare(obj.address) === 0) {
            masterRemoved = true;
        }
        if(isMaster)
        {
            newnNodeAdded = true;
            lateDelegate();
        }    
    });
    d.on("master", function(obj) {


        if (master_ip.length === 0 || masterRemoved) {
            master_ip = obj.address;
            var post_data4 = querystring.stringify({
                    election: 1,
                    ip: my_ip,
                    c: primeCount
                });
          // console.log("Sending Count to:" + master_ip);
            PostObject(post_data4, master_ip);
            masterRemoved = false;
        }
        master_ip = obj.address;
      // console.log("Master" + obj.address);
    });

    d.eachNode(function(node) {});

}

var delegateTimer;

app.post('/do_post', function(req, res) {
    var the_body = req.body;

    if (!isMaster) {
        box.style.bg = 'blue';
        screen.render();
    }

    if (isMaster && the_body.election !== null && parseInt(the_body.election) === 1) {
       box.setContent("Election Going on!!!!!");
        screen.render();
        checkForLeader(the_body);
    }

    if (the_body.election !== null && parseInt(the_body.election) === 0) {
        if (the_body.master == 1) {
           box.setContent("Election Over: See the colors!!!");
            screen.render();
            updateMaster();
        }
    }


    if (isMaster) {
        if (parseInt(the_body.work) === 0) {

            masterPrimeCount = parseInt(the_body.count);
            masterPrimeNum = parseInt(the_body.number);
           //console.log("Recieved Num:" + masterPrimeNum + "-Count:" + masterPrimeCount);
            // delegateTimer =  setTimeout(lateDelegate, 1000);
            lateDelegate();
        }

    } else {

        if (parseInt(the_body.work) === 1) {
          box.setContent("Doing work!!!!!");
            box.style.bg = 'yellow';
            screen.render();
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
        //console.log('problem with request: ' + post_data);
        if(isMaster)
        {
          if (allNodes.length > 0)
                delegate();  
        }
    });

    post_req.write(post_data);
    post_req.end();
}

function changeMasterFunc() {
    changeMaster = false;
    master_ip = currentMaster.ip;
   //console.log("Change master to:" + currentMaster.ip + "Count:" + currentMaster.count);
    var post_data4 = querystring.stringify({
            election: 0,
            master: 1
        });
    PostObject(post_data4, master_ip);
}


function checkForLeader(body) {
    var r_ip = body.ip;
    var r_count = parseInt(body.c);
  // console.log("Check for leader  received IP:" + r_ip + "Count:" + r_count);
    if (currentMaster.count > r_count) {
        currentMaster.ip = r_ip;
        currentMaster.count = r_count;
        if (changeMaster === false) {
            changeMaster = true;
            setTimeout(changeMasterFunc, 5000);
        }
    } else {
       //console.log("I am still the master!!!!!");
        screen.render();
    }
}




/*******************************************************************Work Functions ****************************************************/


function lateDelegate() {
    if (newnNodeAdded) {
        allNodes = [];
        assignWork();
        newnNodeAdded = false;

    } else {
        if(allNodes.length >0)
            delegate();
    }
}


function assignWork() {
   // console.log("isMaster(assignWork)" + isMaster);
    if (isMaster) {
        for (var uuid in d.nodes) {
            if ((d.nodes[uuid].address.localeCompare(my_ip)) !== 0)
                allNodes.push(d.nodes[uuid]);
        }
       // console.log("allNodes Length:" + allNodes.length);
        if (allNodes.length > 0)
            delegate();
    }
}
function increment(cnode)
{
    cnode = cnode + 1;
    if (cnode >= allNodes.length)
        cnode = 0;
    return cnode;   
}

function delegate() {
    if (!isMaster)
        return;
    currentNode =  increment(currentNode);
  
    if(allNodes[currentNode] === null)
    {
         currentNode =  increment(currentNode);
    }
    
   
   //console.log("Current Node " + currentNode);
    var ipAddr = allNodes[currentNode].address;
    //console.log("Sending work to " + ipAddr);
    var post_data1 = querystring.stringify({
            work: 1,
            time: time,
            count: masterPrimeCount,
            number: masterPrimeNum
        });
    
    PostObject(post_data1, ipAddr);

}


function doPrimeWork(n, c, k_milli) {
    setTimeout(sendPrimeWork, k_milli);
    workNum = n;
    workPrimeCount = c;
  box.setContent("Counting from!!!!!" + workPrimeCount); 
  box.setContent("Counting from!!!!!" + workPrimeCount);
    box.style.bg = 'yellow'; //green for get
    screen.render();
    workPrimeCounter(k_milli);
}
function changeColor(){
    console.log("Prime work sent !!" + workPrimeCount);
    box.style.bg = 'blue'; //green for get
    screen.render();
}


function sendPrimeWork() {
    var post_data1 = querystring.stringify({
            work: 0,
            count: workPrimeCount,
            number: workNum
        });
    PostObject(post_data1, master_ip);
  // console.log("Prime work sent !!" + workPrimeCount);
  //  console.log("Prime work sent !!" + workPrimeCount);
    box.style.bg = 'blue'; //green for get
    screen.render();
    
}

function workPrimeCounter(k_milli) {

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




box.focus();
// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
});

http.createServer(app).listen(app.get('port'), function() {
    // console.log("Express server listening on port " + app.get('port'));
});