var gestureVideo = document.createElement("video");
gestureVideo.autoplay=true;
gestureVideo.width=300;
gestureVideo.style.display="none";
var gestureCanvas = document.createElement("canvas");
var debugCanvas = document.createElement("canvas");
var _ = gestureCanvas.getContext('2d');
var debugCTX = debugCanvas.getContext('2d');

var gestureCompression=1;
var webcamWidth=0, webcamHeight=0;
var gesturePrevTime=0;

var xMoveThresh=15;
var yMoveThresh = 10;
var brightthresh=400;
var overthresh=2000;

var lastGesture=false;
var gestureThresh=450;
var gestureDown=false;
var gestureWasdown=false;

var huemin = 205/360;
var huemax = 220/360;
var satmin=0.8;
var satmax=1.0;
var valmin=0.4;
var valmax=1.0;

var gestureAvg=0;
var gestureState=0;//States: 0 waiting for gesture, 1 waiting for next move after gesture, 2 waiting for gesture to end

var velocityThresh = 100;

var lastGestureFrameTime=0;

var webcamFrameRate = 30;

var lastTime = 0;
var prevXY;

var hInterval = 5;
var sInterval = 10;
var vInterval = 10;

var needToGetHand=true;
var capsDown = false;

var velocityThresh = 35;
var verticalVelocityThresh = 20;

var waitBetweenGestures = 750;

var lastSkinFilters=[];;


$(document).keydown(function(e){
	if(e.key=='CapsLock'){
		capsDown=true;
	}
});

$(document).keyup(function(e){
	if(e.key=='CapsLock'){
		capsDown=false;
	}
});

function getArr(){

	imgData = _.getImageData((gestureCanvas.width-gestureCanvas.height*.5)/2,gestureCanvas.height*.5/2,gestureCanvas.height*.5,gestureCanvas.height*.5);

	data = imgData.data;

	arr = new Array(360/hInterval+1);
	for(var i=0;i<arr.length;i++){
		arr[i]=new Array(100/sInterval+1);
		for(var j=0;j<arr[i].length;j++){
			arr[i][j] = new Array(100/vInterval+1);
			for(var k=0;k<arr[i][j].length;k++){
				arr[i][j][k]=0;
			}
		}
	}



	for(var i=0;i<data.length;i+=4){
		if(data[i+3]==255){
			hsv = rgb2Hsv(data[i],data[i+1],data[i+2]);

			h = Math.round(hsv[0]*360/hInterval);
			s=Math.round(100*hsv[1]/sInterval);
			v=Math.round(100*hsv[2]/vInterval);
			//console.log(h);
			arr[h][s][v]++;
		}
	}

	for(var i=0;i<arr.length;i++){
		for(var j=arr[i].length-1;j>0;j--){
			for(var k = arr[i].length-j;k>0;k--){
				//console.log(i+ " " + k);
				if(arr[i][k][0]<arr[i][k-1][0]){
					var tmp = arr[i][k][0];
					arr[i][k][0] = arr[i][k-1][0];
					arr[i][k-1][0] = tmp;
				}
			}
		}
	}

	
	console.log(arr);
	needToGetHand=false;

	document.body.removeChild(debugCanvas);
	gestureVideo.srcObject.getVideoTracks()[0].stop();
	navigator.mediaDevices.getUserMedia({video: { width: 192, height: 108 } }).then(function(stream){
		gestureVideo.srcObject=stream;
		$(gestureVideo).on('play',function(){
			console.log(gestureVideo.videoWidth + " " + gestureVideo.videoHeight);
			requestAnimationFrame(dump, gestureCanvas);	
		});
		
	})
	.catch(function(error){
		throw new Error('OOOOOOOH! DEEEEENIED!');
	});
};

initGestureRecognition();


function initGestureRecognition(){
	document.body.appendChild(gestureVideo);

	navigator.mediaDevices.getUserMedia({video: { width: 1280, height: 720 } }).then(function(stream){
		console.log("helolo");
		gestureVideo.srcObject=stream;
		console.log(gestureVideo.videoWidth + " " + gestureVideo.videoHeight);
		$(gestureVideo).on('play', function(){
			if(needToGetHand){
				console.log(gestureVideo.videoWidth + " " + gestureVideo.videoHeight);
				document.body.appendChild(debugCanvas);
				debugCanvas.style.position = "absolute";
				setTimeout(getArr, 3000);
				requestAnimationFrame(dump, gestureCanvas);
			}
		});
	})
	.catch(function(error){
		throw error;
	});
};

function dump(elapsedTime){

	var delta = elapsedTime - (lastGestureFrameTime);

    requestAnimationFrame(dump, gestureCanvas);
    if (lastGestureFrameTime && delta < 1000/(webcamFrameRate+4)) {
      return;
    }

    lastGestureFrameTime = elapsedTime;

	if (screen.width<screen.height) {
	    if(gestureCanvas.width!=gestureVideo.videoHeight || gestureCanvas.height!=gestureVideo.videoWidth){
			webcamWidth=Math.floor(gestureVideo.videoHeight/gestureCompression);
	    	webcamHeight=Math.floor(gestureVideo.videoWidth/gestureCompression);
			gestureCanvas.width=debugCanvas.width=webcamWidth;
			gestureCanvas.height=debugCanvas.height=webcamHeight;
			debugCanvas.style.width = window.innerWidth+"px";
			debugCanvas.style.height = window.innerHeight+"px";
			_.imageSmoothingEnabled=false;
	    }
	    _.translate(webcamWidth/2,webcamHeight/2);
	    _.rotate(90*Math.PI/180);
	    _.transform(-1,0,0,1,0,0);
	    _.drawImage(gestureVideo,-webcamHeight/2,-webcamWidth/2,webcamHeight,webcamWidth);
	    _.setTransform(1,0,0,1,0,0);
	} else {
	    if(gestureCanvas.width!=gestureVideo.videoWidth || gestureCanvas.height!=gestureVideo.videoHeight){
			webcamWidth=Math.floor(gestureVideo.videoWidth/gestureCompression);
			webcamHeight=Math.floor(gestureVideo.videoHeight/gestureCompression);
			gestureCanvas.width=debugCanvas.width=webcamWidth;
			gestureCanvas.height=debugCanvas.height=webcamHeight;
			debugCanvas.style.width = window.innerWidth+"px";
			debugCanvas.style.height = window.innerHeight+"px";
			
			_.imageSmoothingEnabled=false;
		}
		_.setTransform(-1,0,0,1,webcamWidth,0);
		_.drawImage(gestureVideo,0,0,webcamWidth,webcamHeight);
	}
	
	try{
		draw=_.getImageData(0,0,webcamWidth,webcamHeight);
	} catch(err){
		return;
	}
	
	if(needToGetHand){
		debugCTX.putImageData(draw,0,0);
		debugCTX.strokeStyle="red";
		debugCTX.lineWidth=2;

		if (screen.width<screen.height) {
			debugCTX.strokeRect(gestureCanvas.width*.45/2,(gestureCanvas.height-gestureCanvas.width*.55)/2,gestureCanvas.width*.55,gestureCanvas.width*.55);
		} else {
			debugCTX.strokeRect((gestureCanvas.width-gestureCanvas.height*.55)/2,gestureCanvas.height*.45/2,gestureCanvas.height*.55,gestureCanvas.height*.55);
		}
	} else {
		test(skinfilter());
	}
};

/*huemin=0.0
huemax=0.10
satmin=0.0
satmax=1.0
valmin=0.4
valmax=1.0*/

function skinfilter(){
	

	skin_filter=_.getImageData(0,0,webcamWidth,webcamHeight)
	var total_pixels=skin_filter.width*skin_filter.height
	var index_value=total_pixels*4
	
	var count_data_big_array=0;
	for (var y=0 ; y<webcamHeight ; y++)
	{
		for (var x=0 ; x<webcamWidth ; x++)
		{
			index_value = x+y*webcamWidth;
			r = draw.data[count_data_big_array];
    		g = draw.data[count_data_big_array+1];
    		b = draw.data[count_data_big_array+2];
    		a = draw.data[count_data_big_array+3];

    		var myHsv = rgb2Hsv(r,g,b);

    		var myH = Math.round(myHsv[0]*360/hInterval);
			var myS = Math.round(100*myHsv[1]/sInterval);
			var myV = Math.round(100*myHsv[2]/vInterval);


    		//When the hand is too lose (hsv[0] > 0.59 && hsv[0] < 1.0)
			//Skin Range on HSV values
			if(arr[myH][myS][myV]>5){
	       		skin_filter[count_data_big_array]=r;
				skin_filter[count_data_big_array+1]=g;
				skin_filter[count_data_big_array+2]=b;
				skin_filter[count_data_big_array+3]=a;
        	}else{
        		skin_filter.data[count_data_big_array]=0;
				skin_filter.data[count_data_big_array+1]=0;
				skin_filter.data[count_data_big_array+2]=0;
				skin_filter.data[count_data_big_array+3]=0;
        	}

            count_data_big_array=index_value*4;
		}
	}

	return skin_filter;
};

function rgb2Hsv(r, g, b){
	
    r = r/255;
    g = g/255;
    b = b/255;

    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);

    var h, s, v = max;

    var d = max - min;

    s = max == 0 ? 0 : d / max;

    if(max == min){
        h = 0; // achromatic
    }else{

        switch(max){
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
    	}
   		h /= 6;
   	}

    return [h, s, v];
}


function test(skin_filter){
	var delt=_.createImageData(webcamWidth,webcamHeight);
	if(lastSkinFilters.length!=0){
		var last_filter = lastSkinFilters.shift();
		var totalx=0,totaly=0,totald=0,totaln=delt.width*delt.height
		,dscl=0
		,pix=totaln*4;

		while(pix-=4){
			
			if(skin_filter.data[pix+3]!=0 && last_filter.data[pix+3]==0){
				delt.data[pix]=0;
			 	delt.data[pix+1]=140;
			 	delt.data[pix+2]=255;
			 	delt.data[pix+3]=255;
			 	totald+=1
			 	totalx+=((pix/4)%webcamWidth);
			 	totaly+=(Math.ceil((pix/4)/webcamWidth));
			}
			else{
				delt.data[pix]=0;
				delt.data[pix+1]=0;
				delt.data[pix+2]=0;
				delt.data[pix+3]=0;
			}
		}
	}
	
	if(totald){
		gestureDown={
			x:totalx/totald,
			y:totaly/totald,
			d:totald
		}
		handledown();
	}
	lastSkinFilters.push(skin_filter);
	//debugCTX.putImageData(delt,0,0);
}

function calibrate(){
	gestureWasdown={
		x:gestureDown.x,
		y:gestureDown.y,
		d:gestureDown.d
	}
};

function consoleLog(message){
	if(capsDown){
		console.log(message);
	}
};

function handledown(){
	gestureAvg=0.9*gestureAvg+0.1*gestureDown.d
	var davg=gestureDown.d-gestureAvg,good=davg>brightthresh;
	//console.log("davg " + davg);

	var velocityX, velocityY;

	var nowTime = new Date().getTime();
	if(lastTime!=0){
		velocityX = (gestureDown.x-prevXY.x)/(nowTime-lastTime)*1000;
		consoleLog("velocity X " + velocityX);
		velocityY = (gestureDown.y-prevXY.y)/(nowTime-lastTime)*1000;
		consoleLog("velocity Y " + velocityY); 
	}
	lastTime = nowTime;
	prevXY = {x:gestureDown.x, y:gestureDown.y};

	var fastXVelocity = Math.abs(velocityX)>velocityThresh;
	var fastYVelocity = Math.abs(velocityY)>verticalVelocityThresh;

	var dx=gestureDown.x-gestureWasdown.x,dy=gestureDown.y-gestureWasdown.y;
	var dirx = Math.abs(dy)<Math.abs(dx)//(dx,dy) is on a bowtie

	switch(gestureState){
		case 0:
			if((fastXVelocity && dirx || fastYVelocity && !dirx) && good && (gesturePrevTime==0 || new Date().getTime()-gesturePrevTime>1000)){//Found a gesture, waiting for next move
				gestureState=1;
				calibrate();
			}
			break
		case 2://Wait for gesture to end
			if(!good){//Gesture ended
				gestureState=0;
			}
			break;
		case 1://Got next move, do something based on direction
			if(good && (Math.abs(dx)>xMoveThresh || Math.abs(dy)>yMoveThresh)){
				console.log("moved");
				if(stage==STAGES.MEDIA){
					//console.log(good,davg)
					if(dx<-xMoveThresh&&dirx){
						console.log('left')
						shiftImage(1);
					}
					else if(dx>xMoveThresh&&dirx){
						console.log('right')
						shiftImage(-1);
					} else if(dy>yMoveThresh&&!dirx){
						console.log('down');
						exitMediaStage();
						drawImage();
					}
				} else if(stage==STAGES.MEDIA_GALLERY){
					if(dy>yMoveThresh&&!dirx){
						console.log('down')
						scrollingUp=false;
						scrollSpeed=3;
						decelleration=4;
						if(!(scrollingAnimation===undefined)){
							scrollingAnimation=clearInterval(scrollingAnimation);
						}
						scrollingAnimation = setInterval(scrolling,1000/scrollFrameRate);
					} else if(dy<-yMoveThresh&&!dirx){
						console.log('up')
						scrollingUp=true;
						scrollSpeed=3;
						decelleration=4;
						if(!(scrollingAnimation===undefined)){
							scrollingAnimation=clearInterval(scrollingAnimation);
						}
						scrollingAnimation = setInterval(scrolling,1000/scrollFrameRate);
					}

					
				}
				
				gestureState=2;
				gesturePrevTime=new Date().getTime();
			} else if (!good){
				//calibrate();
				gestureState=0;
				gesturePrevTime=0;
			}
			
			break;
	}
};


/*document.ondblclick = function(){

	var link = document.createElement("a");
    link.download = "";
    link.href= canvas.toDataURL("image/jpeg",0.95);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    delete link;
};*/