/*
	This plugin is created by Koen Griffioen. Code adapted from the Openseadragon-selection plugin.
	If you need to contact me, please find me on github, KTGLeiden.
*/

(function($) {
    'use strict';

    if (!$.version || $.version.major < 2) {
        throw new Error('This version of OpenSeadragonScreenshot requires OpenSeadragon version 2.0.0+');
    }

    $.Viewer.prototype.screenshot = function(options) {
        if (!this.screenshotInstance || options) {
            options = options || {};
            options.viewer = this;
            this.screenshotInstance = new $.Screenshot(options);
        }
        return this.screenshotInstance;
    };


    /**
    * @class Screenshot
    * @classdesc Provides functionality for taking a screenshot
    * @memberof OpenSeadragon
    * @param {Object} options
    */
    $.Screenshot = function ( options ) {

        $.extend( true, this, {
            // internal state properties
            viewer:                 null,
            buttonActiveImg:        true,
            screenshotWidth: 	    1000, // Starting default
            screenshotHeight: 		1000, // Starting default
            showingMenu: 			false,
            makingScreenshot : 		false,
            menuDiv:  				null,
            loadingDiv: 			null,
            toggleButton:           null,
			prefixUrl:			  'assets/openseadragon/',
            navImages:              {
                screenshot: {
                    REST:   'selection_rest.png',
                    GROUP:  'selection_grouphover.png',
                    HOVER:  'selection_hover.png',
                    DOWN:   'selection_pressed.png'
                },
            },
            // options
            showOptions: 			false,
            showScreenshotControl:  true,
            keyboardShortcut:       null
        }, options );

        $.extend( true, this.navImages, this.viewer.navImages );
        
      

        

 		// Add button
        var prefix = this.prefixUrl || this.viewer.prefixUrl || '';
        var useGroup = this.viewer.buttonGroup;
        var anyButton = useGroup ? this.viewer.buttonGroup[0] : null;
        var onFocusHandler = anyButton ? anyButton.onFocus : null;
        var onBlurHandler = anyButton ? anyButton.onBlur : null;
        if (this.showScreenshotControl) {
            this.toggleButton = new $.Button({
                element:    this.toggleButton ? $.getElement( this.toggleButton ) : null,
                clickTimeThreshold: this.viewer.clickTimeThreshold,
                clickDistThreshold: this.viewer.clickDistThreshold,
                tooltip:    'Make Screenshot',
                srcRest:    prefix + this.navImages.screenshot.REST,
                srcGroup:   prefix + this.navImages.screenshot.GROUP,
                srcHover:   prefix + this.navImages.screenshot.HOVER,
                srcDown:    prefix + this.navImages.screenshot.DOWN,
                onRelease:  this.toggleScreenshotMenu.bind( this ),
                onFocus:    onFocusHandler,
                onBlur:     onBlurHandler
            });
            if (useGroup) {
                this.viewer.buttonGroup.buttons.push(this.toggleButton);
                this.viewer.buttonGroup.element.appendChild(this.toggleButton.element);
            }
            if (this.toggleButton.imgDown) {
                this.buttonActiveImg = this.toggleButton.imgDown.cloneNode(true);
                this.toggleButton.element.appendChild(this.buttonActiveImg);
            }
		}

	    this.outerTracker = new $.MouseTracker({
	        element:            this.viewer.drawer.canvas,
	        clickTimeThreshold: this.viewer.clickTimeThreshold,
	        clickDistThreshold: this.viewer.clickDistThreshold,
	        clickHandler:       $.delegate( this, onOutsideClick ),
	        startDisabled:      !this.showingMenu,
	    });
	};

	// Optional shortcut
    function onKeyPress(e) {
        var key = e.keyCode ? e.keyCode : e.charCode;
        if (key === 13) {
            this.confirm();
        } else if (String.fromCharCode(key) === this.keyboardShortcut) {
            this.toggleScreenshotMenu();
        }
    }

    function onOutsideClick() {
    	this.closeMenu();
    }

    $.extend( $.Screenshot.prototype, $.ControlDock.prototype, /** @lends OpenSeadragon.ControlDock.prototype */{

        closeMenu: function(){
        	if(this.menuDiv)
    			this.menuDiv.style.display = "none";
    		this.showingMenu = false;
    		this.outerTracker.setTracking(false);
    		return true;
        },

        takeScreenshot: function() {
        	var makingScreenshot = true;

    	
	    	var containerSize = this.viewer.viewport.containerSize;

	    	var originalCSx = containerSize.x;
	    	var originalCSy = containerSize.y;


	    	var viewer = this.viewer;
	    	var loadingDiv = this.loadingDiv;
	    	// We need this function because we have to wait for the image to be fully loaded!
	    	var downloadFunction = function(){
				console.log(viewer)
        		viewer.world.getItemAt(0).removeAllHandlers('fully-loaded-change');
    
	    		if(!makingScreenshot){
	    			return;
	    		}

				var Canvas = viewer.drawer.canvas;
				

				Canvas.toBlob(function(blob){
					// save with saveas
					saveAs(blob, "screenshot.png")
    				const blobUrl = URL.createObjectURL(blob);
					console.log(blobUrl)
			        viewer.element.style.height = originalCSy + "px";
			        viewer.element.style.width = originalCSx + "px";
				});
				return;
	    	}

	    	if(!this.showOptions){
	    		if(viewer.world.getItemAt(0).getFullyLoaded()){
	    			downloadFunction();
	    		}
	    		else{
	    			viewer.world.getItemAt(0).addHandler('fully-loaded-change', downloadFunction);
	    		}
	    	}
	    	else{
		    	requestAnimationFrame(function(){ // NEeded for HTML/JS to find out the viewport just resized
					viewer.forceRedraw();
		    		if(viewer.world.getItemAt(0).getFullyLoaded()){
		    			downloadFunction();
		    		}
		    		else{
		    			viewer.world.getItemAt(0).addHandler('fully-loaded-change', downloadFunction);
		    		}
				});
		    }


        	return true;
        },

        toggleScreenshotMenu: function(){
        	this.takeScreenshot();
	    	return true;
        },

        showMenu: function(){
        	this.menuDiv.style.display = "inline";
        	this.showingMenu = true;
        },

        menuUpdate: function(){
			var ar = this.viewer.viewport.containerSize.y / this.viewer.viewport.containerSize.x;
    		var ZFchecked = document.getElementById('screenshotZFCheck').checked;
    		var thisVPChecked = document.getElementById('screenshotUseVpSize').checked;
    		if(thisVPChecked){
    			this.screenshotWidth = this.viewer.viewport.containerSize.x;
    			this.screenshotHeight = this.viewer.viewport.containerSize.y;
    		}
    		else{
				var ZF = document.getElementById('screenshotZFInput').value;

				var viewportWidth = this.viewer.viewport.containerSize.x;
				var viewportHeight = this.viewer.viewport.containerSize.y;

				this.screenshotWidth = viewportWidth * ZF;
				this.screenshotHeight = viewportHeight * ZF;

				document.getElementById('screenshotZFDisplay').innerHTML = ZF;
    		}
			document.getElementById('screenshotTextMessage').innerHTML = "Size: " + Math.round(this.screenshotWidth) + "x" + Math.round(this.screenshotHeight);
        }
    });



})(OpenSeadragon);
