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
var my_ip = "192.168.0.101";
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

//screen.append(box);
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


function changeMasterFunc() {
    
    console.log("Changing  leader---" + currentMaster.ip);
    var success1 = d.send(my_ip, { For:currentMaster.ip, Election:0 , From: my_ip });
    if (!success1) {
        console.log("did not send the master message");
    }
    changeMaster = false;

}


function checkForLeader(data) {
    
    var r_ip = data.From;
    var r_count = parseInt(data.Count);
    console.log("Check for leader  received IP:" + r_ip + "Count:" + r_count);
    console.log("Master count to compare : " + currentMaster.count);
    if (currentMaster.count > r_count) {
        currentMaster.ip =  r_ip;
        currentMaster.count =  r_count;
        if (changeMaster === false) {
            console.log("started Change Master timer");
            changeMaster = true;
            setTimeout(changeMasterFunc, 5000);
        }
    }

}


function registerCallbacks() {


    d.on("promotion", function() {
        
        isMaster = true;
        var success = d.join(my_ip, function (data) {
         console.log("master reciever message");
           if( data.For.localeCompare(my_ip) === 0){
               console.log("For me master---");
               if( data.Election === 1){
                                  
                  checkForLeader(data);
               }
           }
        });
        if (!success) {
            console.log("could not join that channel; probably because it is reserved");
        }
        console.log("I am the master....");
        //box.style.bg = 'green'; //green for get
        //screen.render();
        //setTimeout(assignWork, 5000);
    });


    d.on("demotion", function() {
        isMaster = false;
        setTimer = false;
        console.log("I was demoted from being a master.");
    });

    d.on("added", function(obj) {
        console.log("New Nodes");
    });

    d.on("removed", function(obj) {
        console.log("A node has been removed.");
    });


    d.on("master", function(obj) {
        master_ip =  obj.address;
        var success = d.join(master_ip, function (data) {
            console.log("slave reciever message..");
            if( data.For.localeCompare(my_ip) === 0){
                console.log("My message.."+my_ip);                
                if(data.Election === 0){
                    console.log("I am promoting --");                
                    d.promote();
                }
            }
        });

        if (!success) {
            console.log("slave could not join that channel; probably because it is reserved");
        }
        
        var success1 = d.send(master_ip, { For:master_ip, Election:1 , Count : primeCount, From: my_ip });

        if (!success1) {
            console.log("slave could not send on that channel; probably because it is reserved");
            }

        console.log("A new master is in control");

    });



}


function doPrimeWork(n, c, k_milli) {
    //setTimeout(sendPrimeWork, k_milli);
    workNum = n;
    workPrimeCount = c;
    workPrimeCounter(workNum, workPrimeCount, k_milli);
}

function sendPrimeWork() {

    console.log("prime work sent");
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
