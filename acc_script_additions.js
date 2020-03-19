import {runSmoke, config, splat } from './script.js';
import {mousedownListener, mousemoveListener, mouseupListener} from './script.js';

export {touchFlare, mouseFlare};

var DEFAULT_COLOR = {r:0.9, g:0.1, b:0.1};

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

function remap(inputVal, fromMin, fromMax, toMin, toMax){
    // Mirror's TouchDesigner's tdu.remap
    let ratio = (inputVal-fromMin)/(fromMax - fromMin);
    return toMin + ratio * (toMax - toMin);
}

function mouseFlare(startX, startY, length, nauticalDegrees, durationMillis=1000, tuningParam=1, frequencyMs=30) {

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
function mouseFlareOrig(startX, startY, length, nauticalDegrees, durationMillis=1000) {

    // fire off a set of events in a line radially out from x,y over durationMillis.
    let frequencyMs = 30;
    let steps = Math.trunc(durationMillis/frequencyMs);
    let step_length = length / steps;

    let eventCallback;
    let offsetX, offsetY;
    for (let i=0; i< steps; i+= 1){
        // NOTE: curiously, reversing the length & degrees arguments yields
        // a cool-looking spiral
        [offsetX, offsetY] = polarVectorAdd(startX, startY, step_length*i, nauticalDegrees, );

        if      (i==0)          { eventCallback = mousedownListener;}
        else if (i == steps - 1){ eventCallback = mouseupListener;}
        else                    { eventCallback = mousemoveListener;}

        // console.log(`${i} x, y: ${x}, ${y},  offsets: ${offsetX}, ${offsetY}, callback: ${eventCallback}`);

        setTimeout(eventCallback, frequencyMs*i, {offsetX, offsetY});
    }
}

function touchFlare(startX, startY, length,  nauticalDegrees, durationMillis=500, color=DEFAULT_COLOR, id=42) {
    // TODO: If this is called multiple times within durationMillis,
    // only the last call will be valid. Real touch events would 
    // need to include the current state of all touches, so we'd
    // have to either:
    // a) get info from script.js:pointers and include that in how we create touch events, or
    // b) take an array of flare specs here and send them all to the script
    
    // fire off a set of events in a line radially out from x,y 
    // over durationMillis milliseconds.
    let frequencyMs = 30;
    let steps = Math.trunc(durationMillis/frequencyMs);
    let step_length = length / steps;

    
    let eventCallback;
    let offsetX, offsetY;

    let el = document.getElementsByTagName('canvas')[0];
    let attrs = {identifier: id, color};

    for (let i=0; i< steps; i+= 1){
        // NOTE: curiously, reversing the length & degrees arguments yields
        // a cool-looking spiral
        [offsetX, offsetY] = polarVectorAdd(startX, startY, step_length*i, nauticalDegrees, );

        if      (i==0)          { eventCallback = makeTouchStart;}
        else if (i == steps - 1){ eventCallback = makeTouchEnd;}
        else                    { eventCallback = makeTouchMove;}

        // console.log(`${i} x, y: ${x}, ${y},  offsets: ${offsetX}, ${offsetY}, callback: ${eventCallback}`);

        setTimeout(eventCallback, frequencyMs*i, el, offsetX, offsetY, attrs);
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

// manually create touch event. See: https://gist.github.com/morewry/538efb737ed9c4e432e4
function makeTouchEvent(eventName="touchstart"){
    // Different browsers may throw errors differently? First block fails on 
    // my desktop Firefox, but second block succeeds 
    // -ETJ 04 December 2019
    let e;
    try{
        e = document.createEvent('TouchEvent')
        e.initTouchEvent(eventName, true, true)
    }
    catch (err){
        try{
            e = document.createEvent('UIEvent')
            e.initUIEvent(eventName, true, true)
        }
        catch( err){
            e = document.createEvent('Event')
            e.initEvent(eventName, true, true)
        }
    }
    return e;
}

function makeTouchObject(x=0, y=0, extraAttrs=null){
    let obj = {pageX: x, pageY: y};
    if (extraAttrs){
        obj = Object.assign(obj, extraAttrs);
    }
    return obj;
}

function makeTouchStart(el, x = 0, y = 0, extraAttrs=null){
    let e = makeTouchEvent("touchstart");
    e.targetTouches = [makeTouchObject(x,y,extraAttrs)];
    el.dispatchEvent(e);
    return e;
} 

function makeTouchMove(el, x=0, y=0, extraAttrs=null){
    let e = makeTouchEvent("touchmove");
    e.targetTouches = [makeTouchObject(x,y,extraAttrs)];
    el.dispatchEvent(e);
    return e;
}

function makeTouchEnd(el, x = 0, y = 0, extraAttrs=null){
    let e = makeTouchEvent("touchend");
    e.changedTouches = [makeTouchObject(x,y,extraAttrs)];
    el.dispatchEvent(e);
    return e;
}


function logEvent(e){
    // console.log(``);
    let DEBUG = false;
    // DEBUG = true;
    if (DEBUG){
        console.log(`${Date.now()} ${e.type} (${e.offsetX}, ${e.offsetY})`);
    }
}

// ===============
// = ENTRY POINT =
// ===============
function main(){
    // swapConsoleLog();
    // `config` is defined in the original script.js
    config.COLORFUL = false; // If COLORFUL, our colors get changed on us
    // config.BACK_COLOR = { r: 255, g: 255, b: 255 }; // white background

    // config.TRANSPARENT = true;
    runSmoke();
}
main();
