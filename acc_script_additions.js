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

function touchFlare(startX, startY, length,  nauticalDegrees, durationMillis=500, color=DEFAULT_COLOR, id=42) {

    // let startX, startY, and length be integer pixel values
    // At some frame rate, send touch events simulating a finger in a straight line
    // over `duration` seconds.
    // ETJ DEBUG
    // console.log(`canvas: (${canvas.width}, ${canvas.height})`);
    // END DEBUG
    let endX, endY; 
    [endX, endY] = polarVectorAdd(startX, startY, length, nauticalDegrees);
    let el = document.getElementsByTagName('canvas')[0];
    
    let attrs = {identifier: id, color}
    let startEvent = makeTouchStart(el, startX, startY, attrs);

    id = startEvent.targetTouches[0].identifier;

    let fps = 60; 
    // let steps = fps * durationMillis / 1000; 
    let steps = length/50;
    let dt = durationMillis/steps;
    for (let t = dt; t < durationMillis; t += dt){
        let x = remap(t, 0, durationMillis, startX, endX);
        let y = remap(t, 0, durationMillis, startY, endY);
        let eventCallback = () => { 
            makeTouchMove(el, x, y, attrs);
        }
        setTimeout( eventCallback, t);
    }
    // TODO: Do we need this touchend event?
    setTimeout(() => {makeTouchEnd(el, endX, endY, attrs)}, durationMillis);

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

// ===============
// = ENTRY POINT =
// ===============
function main(){
    swapConsoleLog();
    // `config` is defined in the original script.js
    config.COLORFUL = false; // If COLORFUL, our colors get changed on us
    config.BACK_COLOR = { r: 255, g: 255, b: 255 }; // white background

    // config.TRANSPARENT = true;
}
main();
