import {runSmoke, config, splat } from './script.js';
// import {WebCamFlow} from './oflow.js';
// import * as oflow from './oflow.js';

export {smokeFlare};
// ===========
// = GLOBALS =
// ===========
const DEFAULT_COLOR = {r:0.9, g:0.1, b:0.1};
// FIXME: find an actual purple color...
const PURPLE_COLOR = {r:0.8, g:0.1, b:0.3};
let oflowFramesSeen = 0;
let client;
let webCamFlow;

// let topic = 'splat';
let topic = 'flare';
let hostname = '0.0.0.0';
let port = '9001';

// // console.log-to-div, from: https://stackoverflow.com/a/20256785
function swapConsoleLog() {
    // FIXME: catch errors here in case we can't find a 'log' div or otherwise
    var old = console.log;
    var logger = document.getElementById('log');
    console.log = function (message) {
        old(message);
        let asStr = message;
        if (typeof message == 'object' && JSON && JSON.stringify) {
            asStr = JSON.stringify(message, null, 4);
        }
        logger.innerHTML += asStr.replace('\n', '<br/>') + '<br />';
    }
};

function smokeFlare(startX, startY, length, nauticalDegrees, durationMillis=1000, tuningParam=1, frequencyMs=30) {
    // startX, startY & length should all be in normalized coordinates ( [0,1])
    // tuningParam affects the size of the bloom of each flare
    // frequencyMs specifies how often (milliseconds) a splat is made

    // fire off a set of events in a line radially out from x,y over durationMillis.
    // let frequencyMs = 30;
    let steps = Math.trunc(durationMillis/frequencyMs);
    let step_length = length / steps;
    let x, y;
    let [dx, dy] = polarVectorAdd(startX, startY, step_length, 180- nauticalDegrees);
    dx -= startX;
    dy -= startY;

    let splatDx = dx * tuningParam * config.SPLAT_FORCE;
    let splatDy = dy * tuningParam * config.SPLAT_FORCE;

    console.log(`mouseFlare: ${startX}, ${startY}, ${step_length} ${dx} ${dy}`);
    for (let i = 0; i< steps; i+= 1){
        x = startX + i * dx;
        y = startY + i * dy;
        setTimeout(splat, frequencyMs*i, x, y, splatDx, splatDy, DEFAULT_COLOR);
    }
}    

function polarVectorAdd(xPixels, yPixels, lengthPixels, nauticalDegrees){
    // TODO: I think there's some important checking to do here to make up 
    // for non-square pixels
    let degrees = -(90 - nauticalDegrees)
    let radians = degrees * 0.017453292519943295; // = pi/180
    let endX = xPixels + lengthPixels * Math.cos(radians);
    let endY = yPixels + lengthPixels * Math.sin(radians);
    return [endX, endY];
}

function logEvent(e){
    // console.log(``);
    let DEBUG = false;
    // DEBUG = true;
    if (DEBUG){
        console.log(`${Date.now()} ${e.type} (${e.offsetX}, ${e.offsetY})`);
    }
}

function customizeConfig(config){
    // `config` is defined in the original script.js
    config.COLORFUL = false; // If COLORFUL, our colors get changed on us
    // config.BACK_COLOR = { r: 255, g: 255, b: 255 }; // white background
    // config.TRANSPARENT = true;
}

// =========
// = MGQTT =
// =========

function initMQTTClient(){
    /* 
        This relies on having included the mqtt script in a <script> tag 
        in the loading HTML. Optimally, we'd swap that out for a module import.
        
        Note that we also need to have a websocket-enabled MQTT broker 
        running on hostname:port.  I've been using `mosquitto` for this. 
     -ETJ 19 March 2020
    */
    // let topic = 'splat';
    // let hostname = '0.0.0.0';
    // let port = '9001';
    client = new Paho.MQTT.Client(hostname, Number(port), "clientId");
    client.connect({onSuccess:onConnect, onFailure: ()=>{}});

    return client;
}

function onConnect() {
    // let topic = 'splat';

    // Once a connection has been made, make a subscription and send a message.
    console.log("onConnect");
    client.subscribe(topic);
    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    sendMessage('Hello from browser', topic);

    // message = new Paho.MQTT.Message("Hello from browser");
    // message.destinationName = "World";
    // client.send(message);
}

function onConnectionLost(responseObject) {
    if (responseObject.errorCode !== 0) {
        console.log("onConnectionLost:"+responseObject.errorMessage);
    }
    // ETJ DEBUG
    else{
        console.log(`onConnectionLost: ${responseObject}`);
    }
    // END DEBUG
}

function onMessageArrived(message) {
    console.log("onMessageArrived:"+message.payloadString);
    showLog(message.payloadString);
    // console.log(`message: ${JSON.stringify(message, null, 4)}`);
    // TODO: call methods based on topic called. 
    let args;
    try {
        args = JSON.parse(message.payloadString);
    }
    catch(error){
        console.log(`Received non-JSON MQTT info. Ignoring. Text was: \n${message.payloadString}`);
        return;
    }
    if (message.destinationName == 'splat'){
        try {
            // e.g.: {"x":0.5, "y":0.5, "dx":2000, "dy":0, "color":{"r": 0.8, "g":0.2, "b": 0.2}}
            let {x, y, dx, dy, color} = args;
            splat(x, y, dx, dy, color);
        } catch (error) {
            console.log(`splat failed: ` + error);
        }
    }
    else if (message.destinationName == 'flare'){
        try {
            // e.g. {"startX": 0.5, "startY": 0.5 , "length": 0.3 , "nauticalDegrees":-45, "durationMillis": 300 , "tuningParam":1 , "frequencyMs": 30}
            let {startX, startY, length, nauticalDegrees, durationMillis, tuningParam, frequencyMs} = args;
            smokeFlare(startX, startY, length, nauticalDegrees, durationMillis, tuningParam, frequencyMs);
        } 
        catch (error) {
            console.log(`smokeFlare failed: ` + error);
        }        
    }
}    

function showLog(msg){
    let e = document.getElementById('log');
    e.innerHTML += msg + '<br/>';
}

function sendMessage(text, topic='splat'){
    console.log('sendMessage()');
    let message = new Paho.MQTT.Message(text);
    message.destinationName = topic;
    client.send(message);

}

// ================
// = OPTICAL FLOW =
// ================
function initOpticalFlow(videoElement, zoneSize = 16) {
    console.log(`initOpticalFlow()`);
    console.log(`videoElement: ${Object.keys(videoElement)}`);
    // let keys= Object.keys(oflow);
    // let keys = [];
    // for (let k in oflow){ keys.push(k);}
    // console.log(`keys: ${JSON.stringify(keys, null, 4)}`);
    webCamFlow = new oflow.WebCamFlow(videoElement, zoneSize);
    webCamFlow.onCalculated(oflowCallback);
    webCamFlow.startCapture();

}

function oflowCallback(flowStructure){
    oflowFramesSeen += 1;

    let {zones} = flowStructure;
    // The onCalculated() function gets called more often than we get new
    // camera frames, meaning we often get called with redundant, all-zero
    // values for flowStructure.zones. Return if that's the case so we don't
    // get bad flicker.
    // TODO: this could probably be done faster by just checking a few values, 
    // rather than reducing the entire array. 
    let nonZeroCount = flowStructure.zones.reduce((prev, cur) => {return prev + (Math.abs(cur.u) < 1? 0: 1)}, 0);
    if (nonZeroCount == 0){
        return;
    }

    let skipFrames = 2;
    if (oflowFramesSeen%skipFrames == 0){
        alterSmokeFromFlow(flowStructure.zones);
    }

}

function alterSmokeFromFlow( zones){
    /*
    zones is a list: [{x:intPixels, y:intPixels, u:float, v:float}, {x,y,u,v}]
    */  
    // FIXME: get these from the video element directly. Note that this 
    // isn't the same as the CSS size of the element
    let elementHeight = 480;
    let elementWidth = 640;

    let normalX = 1.0/elementWidth;
    let normalY = 1.0/elementHeight;

    let maxFlares = 1;
    let flareThreshold = 200;
    let flareMinDistance = 0.05;

    let zoneMagSquared = ({x,y,u,v}) => {return (u*u + v*v)}; 
    let zoneDistanceSquared = (a,b) => { return ((a.x-b.x)*(a.x-b.x) + (a.y - b.y)*(a.y - b.y))};
    let normalizeZone = ({x,y,u,v}) => {return {x:x*normalX, y:y*normalY, u, v}};
    let sortedZones = zones.sort((a,b)=> zoneMagSquared(b) - zoneMagSquared(a) ); // highest first

    // We want to make flares at points that: 
    // a) have at least a minimum motion magnitude, and
    // b) aren't right next to each other,
    // We'll only take maxFlares.
    let zonesToFlare = [];
    for (let i=0; i< sortedZones.length; i+=1){
        let z = normalizeZone(sortedZones[i]);
        if (zonesToFlare.length == maxFlares || // Do we have all the flares we want?
            zoneMagSquared(z) < flareThreshold){    // Or are there no more flareable zones?
            break;
        }
        if (zonesToFlare.every((ztf)=> zoneDistanceSquared(ztf, z) >= flareMinDistance)){
            zonesToFlare.push(z);
        }
    }

    let multiplier = 10;
    // let msgs = zonesToFlare.map(({x,y,u,v}))
    zonesToFlare.forEach(({x,y,u,v})=> splat(1-x,1-y,(1-u)*multiplier,(1-v)*multiplier, PURPLE_COLOR));
       
}




// ===============
// = ENTRY POINT =
// ===============
export function main(){
    // swapConsoleLog();
    customizeConfig(config);
    let videoElement = document.getElementById('videoOut');
    initOpticalFlow(videoElement);
    // initMQTTClient(); 
    runSmoke();
}
// main();
