/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 * @author paulirish / http://paulirish.com/
 */

THREE.FirstPersonControls = function ( object, domElement ) {

	this.object = object;
	this.target = new THREE.Vector3( 0, 0, 0 );

	this.domElement = ( domElement !== undefined ) ? domElement : document;

	this.enabled = true;

	this.movementSpeed = 4.0;
	this.lookSpeed = 0.1;

	this.lookVertical = true;
	this.autoForward = false;

	this.activeLook = true;

	this.heightSpeed = false;
	this.heightCoef = 1.0;
	this.heightMin = 0.0;
	this.heightMax = 1.0;

	this.constrainVertical = true;
	this.verticalMin = 1;
	this.verticalMax = 2;//Math.PI;

	this.autoSpeedFactor = 0.0;

	this.mouseX = 0;
	this.mouseY = 0;

	this.lat = 0;
	this.lon = 0;
	this.phi = 0;
	this.theta = 0;
	// jg add
	this.moveJump = false;//暂不支持
	this.mouseRightDown = false;
	this.surfaceFloor = null;// 可以走的地板
	this.gravity = 0.11;//重力
	this.birdsEye = 100;//鸟瞰距离	
	this.kneeDeep = 0.4;
	this.timeLeft = 6;//循环计时
	this.raycaster = new THREE.Raycaster();
	this.originPos = [-2, 18.7, 25 ];//出生点
	this.dropDistance = -123;//下降到达多少距离后重置到重生点
	this.raycaster.ray.direction.set( 0, -1, 0 );//向地面
	this.initEnabled = true;//初始化时候的摄影机操作
	// jg add end
	this.moveForward = false;
	this.moveBackward = false;
	this.moveLeft = false;
	this.moveRight = false;

	this.mouseDragOn = false;

	this.viewHalfX = 0;
	this.viewHalfY = 0;

	if ( this.domElement !== document ) {
		this.domElement.setAttribute( 'tabindex', - 1 );
	}

	this.handleResize = function () {

		if ( this.domElement === document ) {

			this.viewHalfX = window.innerWidth / 2;
			this.viewHalfY = window.innerHeight / 2;

		} else {

			this.viewHalfX = this.domElement.offsetWidth / 2;
			this.viewHalfY = this.domElement.offsetHeight / 2;

		}

	};

	this.onMouseDown = function ( event ) {

		if ( this.domElement !== document ) {

			this.domElement.focus();

		}

		event.preventDefault();
		event.stopPropagation();

		if ( this.activeLook ) {

			switch ( event.button ) {

				//case 0: this.moveForward = true; break;
				//case 2: this.moveBackward = true; break;
				//jg add
				case 2: this.mouseRightDown = true; break;
				

			}

		}

		this.mouseDragOn = true;

	};

	this.onMouseUp = function ( event ) {

		event.preventDefault();
		event.stopPropagation();

		if ( this.activeLook ) {

			switch ( event.button ) {

				//case 0: this.moveForward = false; break;
				//case 2: this.moveBackward = false; break;
				case 2: this.mouseRightDown = false; break;

			}

		}

		this.mouseDragOn = false;

	};

	this.onMouseMove = function ( event ) {

		if ( this.domElement === document ) {

			this.mouseX = event.pageX - this.viewHalfX;
			this.mouseY = event.pageY - this.viewHalfY;

		} else {

			this.mouseX = event.pageX - this.domElement.offsetLeft - this.viewHalfX;
			this.mouseY = event.pageY - this.domElement.offsetTop - this.viewHalfY;

		}

	};

	this.onKeyDown = function ( event ) {

		//event.preventDefault();

		switch ( event.keyCode ) {

			//case 32: /*space*/ this.moveJump = true; break;
			case 16: /*shift*/ this.speedUp = true; break;

			case 38: /*up*/
			case 87: /*W*/ this.moveForward = true; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = true; break;

			case 40: /*down*/
			case 83: /*S*/ this.moveBackward = true; break;

			case 39: /*right*/
			case 68: /*D*/ this.moveRight = true; break;

			case 82: /*R*/ this.moveUp = true; break;
			case 70: /*F*/ this.moveDown = true; break;

		}

	};

	this.onKeyUp = function ( event ) {

		switch ( event.keyCode ) {

			case 32: /*space*/ this.moveJump = true; break;
			case 16: /*shift*/ this.speedUp = false; break;

			case 38: /*up*/
			case 87: /*W*/ this.moveForward = false; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = false; break;

			case 40: /*down*/
			case 83: /*S*/ this.moveBackward = false; break;

			case 39: /*right*/
			case 68: /*D*/ this.moveRight = false; break;

			case 82: /*R*/ this.moveUp = false; break;
			case 70: /*F*/ this.moveDown = false; break;

		}

	};
	//重置enabled == ture 时候到出生点
	this.resetToOrigin = function () {
		this.initEnabled = true;
	}
	
	this.update = function( delta ) {

		if ( this.enabled === false )			
			return;		

		if ( this.heightSpeed ) {

			var y = THREE.Math.clamp( this.object.position.y, this.heightMin, this.heightMax );
			var heightDelta = y - this.heightMin;

			this.autoSpeedFactor = delta * ( heightDelta * this.heightCoef );

		} else {

			this.autoSpeedFactor = 0.0;

		}

		// jg add
		// 右键时候 在跟随
		if ( this.mouseRightDown || this.initEnabled) {

			if ( this.initEnabled ) {//初始化到出生点
				this.object.position.set( this.originPos[0],this.originPos[1],this.originPos[2] );
				this.initEnabled = false;
			}

			var actualLookSpeed = delta * this.lookSpeed;

			if ( ! this.activeLook ) {

				actualLookSpeed = 0;

			}
			var verticalLookRatio = 1;

			if ( this.constrainVertical ) {

				verticalLookRatio = Math.PI / ( this.verticalMax - this.verticalMin );

			}

			this.lon += this.mouseX * actualLookSpeed;
			if ( this.lookVertical ) this.lat -= this.mouseY * actualLookSpeed * verticalLookRatio;

			this.lat = Math.max( - 85, Math.min( 85, this.lat ) );
			this.phi = THREE.Math.degToRad( 90 - this.lat );

			this.theta = THREE.Math.degToRad( this.lon );

			if ( this.constrainVertical ) {

				this.phi = THREE.Math.mapLinear( this.phi, 0, Math.PI, this.verticalMin, this.verticalMax );

			}
		}
		
		if( this.object.position.y < this.dropDistance ) {// 如果掉入地面 重置到地面上
			this.object.position.set( this.originPos[0],this.originPos[1],this.originPos[2] );
		}
		// 控制行走
		// 地形边缘检测先不做
		// 行走碰撞检查,先不做了
		var actualMoveSpeed = 1;

		if ( this.speedUp ) {//按住shift 加速
			actualMoveSpeed = delta * this.movementSpeed * 1.5;
		} else {
			actualMoveSpeed = delta * this.movementSpeed;
		}
		
		this.raycaster.ray.origin.copy( this.object.position );
		if ( this.moveForward || ( this.autoForward && ! this.moveBackward ) ) this.object.translateZ( - ( actualMoveSpeed + this.autoSpeedFactor ) );
		if ( this.moveBackward ) this.object.translateZ( actualMoveSpeed );

		if ( this.moveLeft ) this.object.translateX( - actualMoveSpeed );
		if ( this.moveRight ) this.object.translateX( actualMoveSpeed );

		if (this.surfaceFloor != null) {
			this.timeLeft += delta;		
			var dt = 0.001;
			while( this.timeLeft >= dt ) {//当前帧检测,就是出现卡顿跳帧,然后人掉下去
				this.raycaster.ray.origin.copy( this.object.position );
				this.raycaster.ray.origin.y += this.birdsEye;

				var isDrop = true;
				var hits = this.raycaster.intersectObject ( this.surfaceFloor, true );
				if( ( hits.length > 0 ) && ( hits[0].face.normal.y > 0 ) ) {
					var actualHeight = hits[0].distance - this.birdsEye;
					// 碰到地面
					if( ( this.object.position.y <= 2 ) && ( Math.abs( actualHeight ) < this.kneeDeep ) ) {
						this.object.position.set( this.object.position.x, this.object.position.y - actualHeight, this.object.position.z );
						isDrop = false;
					}
				}
				if (isDrop) {// 模拟重力
					this.object.position.set( this.object.position.x,this.object.position.y - this.gravity, this.object.position.z );
				}
				this.timeLeft -= dt;
			}
		}
		// if ( this.moveUp ) this.object.translateY( actualMoveSpeed );
		// if ( this.moveDown ) this.object.translateY( - actualMoveSpeed );
		this.object.position.set( this.object.position.x, this.object.position.y + 1.7, this.object.position.z );
		if( this.moveJump) {//跳
			this.object.position.set( this.object.position.x, this.object.position.y + 5, this.object.position.z );
			this.moveJump = false;
		}
		// jg add end
		var targetPosition = this.target,position = this.object.position;

		targetPosition.x = position.x + 100 * Math.sin( this.phi ) * Math.cos( this.theta );
		targetPosition.y = position.y + 100 * Math.cos( this.phi );
		targetPosition.z = position.z + 100 * Math.sin( this.phi ) * Math.sin( this.theta );

		this.object.lookAt( targetPosition );

		// 离地下1.7米 模拟人的视角
		
	};

	function contextmenu( event ) {

		event.preventDefault();

	}

	this.dispose = function() {

		this.domElement.removeEventListener( 'contextmenu', contextmenu, false );
		this.domElement.removeEventListener( 'mousedown', _onMouseDown, false );
		this.domElement.removeEventListener( 'mousemove', _onMouseMove, false );
		this.domElement.removeEventListener( 'mouseup', _onMouseUp, false );

		window.removeEventListener( 'keydown', _onKeyDown, false );
		window.removeEventListener( 'keyup', _onKeyUp, false );

	};

	var _onMouseMove = bind( this, this.onMouseMove );
	var _onMouseDown = bind( this, this.onMouseDown );
	var _onMouseUp = bind( this, this.onMouseUp );
	var _onKeyDown = bind( this, this.onKeyDown );
	var _onKeyUp = bind( this, this.onKeyUp );

	this.domElement.addEventListener( 'contextmenu', contextmenu, false );
	this.domElement.addEventListener( 'mousemove', _onMouseMove, false );
	this.domElement.addEventListener( 'mousedown', _onMouseDown, false );
	this.domElement.addEventListener( 'mouseup', _onMouseUp, false );

	window.addEventListener( 'keydown', _onKeyDown, false );
	window.addEventListener( 'keyup', _onKeyUp, false );

	function bind( scope, fn ) {

		return function () {

			fn.apply( scope, arguments );

		};

	}

	this.handleResize();

};
