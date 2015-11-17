var rooms = [ 'living room', 'kitchen', 'bedroom' ];

var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');
var Flux = require('flux');
var dispatcher = new Flux.Dispatcher();

var arrow;
var objLoader = new THREE.OBJLoader();
objLoader.load(
	'models/arrow.obj',
	function(object) {
		arrow = object.children[0];
		arrow.material.color.setHex(0xfffff1);
	}
);

var App = React.createClass({
	render: function() {
		return (
			<div ref='container'>
				<canvas id='canvas'></canvas>
				<App.Overlay room={this.state.roomIndex} ref='overlay' />
			</div>
		)
	},
	lon: 0,
	lat: 0,
	phi: 0,
	theta: 0,
	raycaster: new THREE.Raycaster(),
	mouse: new THREE.Vector2(),
	isMousingOverObject: false,
	getInitialState: function() {
		return { roomIndex: 1 };
	},
	componentDidMount: function() {
		this.refs.overlay = this.refs.overlay;
		overlay.style.width = window.innerWidth + 'px';
		overlay.style.height = window.innerHeight + 'px';

		this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 20000);
		this.camera.target = new THREE.Vector3(0, 0, 0);
		this.scene = new THREE.Scene();

		this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas') });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		
		var container = this.refs.container;
		container.appendChild(this.renderer.domElement);

		window.addEventListener('resize', this.onWindowResize, false);
		window.addEventListener('mousemove', this.onWindowMouseMove, false);
		document.addEventListener('mousedown', this.onDocumentMouseDown, false);
		document.addEventListener('mousemove', this.onDocumentMouseMove, false);
		document.addEventListener('mouseup', this.onDocumentMouseUp, false);
		document.addEventListener('mousewheel', this.onDocumentMouseWheel, false);
		document.addEventListener('MozMousePixelScroll', this.onDocumentMouseWheel, false);

		this.listenerID = dispatcher.register(function(payload) {
			switch (payload.type) {
			case 'left':
				var roomIndex = this.state.roomIndex;
				roomIndex--;
				if (roomIndex < 0) {
					roomIndex = rooms.length - 1;
				}
				this.setState({ roomIndex: roomIndex });
				break;
			case 'right':
				var roomIndex = this.state.roomIndex;
				roomIndex = (roomIndex + 1) % rooms.length;
				this.setState({ roomIndex: roomIndex });
				break;
			}
		}.bind(this));

		console.log(rooms[this.state.roomIndex]);
		this.load(rooms[this.state.roomIndex]);
		this.animate();
	},
	componentDidUpdate: function() {
		this.load(rooms[this.state.roomIndex]);
	},
	componentWillUnmount: function() {
		dispatcher.unregister(this.listenerID);
	},
	onWindowResize: function() {
		this.camera.aspect = window.innerWidth / window.innerHeight;
		this.camera.updateProjectionMatrix();

		this.renderer.setSize(window.innerWidth, window.innerHeight);
		this.refs.overlay.style.width = window.innerWidth + 'px';
		this.refs.overlay.style.height = window.innerHeight + 'px';
	},
	onWindowMouseMove: function(event) {
		this.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		this.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;	
	},
	onDocumentMouseDown: function(event) {
		event.preventDefault();

		this.isUserInteracting = true;

		this.onPointerDownX = event.clientX;
		this.onPointerDownY = event.clientY;

		this.onPointerDownLon = this.lon;
		this.onPointerDownLat = this.lat;

		this.raycaster.setFromCamera(this.mouse, this.camera);
		var intersects = this.raycaster.intersectObjects(this.scene.children, true).map(function(val) {
			return val.object;
		});

		for (var i in intersects) {
			if (intersects[i].name == 'navigation') {
				this.setState({ roomIndex: rooms.indexOf(intersects[i].destination) });
				break;
			} else if (intersects[i].name == 'product') {
				dispatcher.dispatch({ type: 'clickedProduct', product: intersects[i].product });
				break;
			}
		}
	},
	onDocumentMouseMove: function(event) {
		if (this.isUserInteracting === true) {
			this.lon = (this.onPointerDownX - event.clientX) * 0.1 + this.onPointerDownLon;
			this.lat = (event.clientY - this.onPointerDownY) * 0.1 + this.onPointerDownLat;
		}
	},
	onDocumentMouseUp: function(event) {
		this.isUserInteracting = false;
	},
	onDocumentMouseWheel: function(event) {
		// WebKit
		if (event.wheelDeltaY) {
			this.camera.fov -= event.wheelDeltaY * 0.05;
		// Opera / Explorer 9
		} else if (event.wheelDelta) {
			this.camera.fov -= event.wheelDelta * 0.05;
		// Firefox
		} else if (event.detail) {
			this.camera.fov += event.detail * 1.0;
		}

		this.camera.updateProjectionMatrix();
	},
	animate: function() {
		requestAnimationFrame(this.animate);
		this.update();
	},
	update: function() {
		if (this.isUserInteracting === false) {
			//this.lon += 0.1;
		}

		this.lat = Math.max(-85, Math.min(85, this.lat));
		this.phi = THREE.Math.degToRad(90 - this.lat);
		this.theta = THREE.Math.degToRad(this.lon);

		this.camera.target.x = 10000 * Math.sin(this.phi) * Math.cos(this.theta);
		this.camera.target.y = 10000 * Math.cos(this.phi);
		this.camera.target.z = 10000 * Math.sin(this.phi) * Math.sin(this.theta);

		var target = this.camera.target;
		this.camera.lookAt(target);

		/*
		// distortion
		camera.position.copy(camera.target).negate();
		*/

		this.raycaster.setFromCamera(this.mouse, this.camera);
		var intersects = this.raycaster.intersectObjects(this.scene.children, true).map(function(val) {
			return val.object;
		});

		this.isMousingOverObject = false;
		for (var i in this.scene.children) {
			var child = this.scene.children[i];
			var isMousedOver = intersects.indexOf(child) >= 0;
			if (!child.name || child.name.length == 0) {
				continue;
			}

			if (isMousedOver) {
				this.isMousingOverObject = true;
				if (child.name == 'product') {
					child.material.color.set(0xffcc00);
				}
			} else {
				//child.material.color.set(child.origColor);
			}

			if (child.name == 'navigation') {
				//child.rotation.z += 0.05;
				child.rotateOnAxis(new THREE.Vector3(1, 0, 0), 0.05);
			}
		}

		if (this.isMousingOverObject) {
			document.body.style.cursor = 'pointer';
		} else {
			document.body.style.cursor = 'default';
		}

		this.renderer.render(this.scene, this.camera);
	},
	load: function(name) {
		$.ajax({
			url: 'data/' + name + '.json',
			method: 'GET',
			dataType: 'json',
		}).done(function(data) {
			localStorage.setItem('location', name);
			this.clearPanorama();
			this.clearObjects();
			this.loadPanorama(name);
			this.loadObjects(data);
		}.bind(this)).fail(function(data) {
			alert('Failed to load data!');
		}.bind(this));
	},
	clearPanorama: function() {
		if (this.mesh) {
			this.mesh.material.map.dispose();
			this.mesh.material.dispose();
			this.mesh.geometry.dispose();
			this.scene.remove(this.mesh);
		}
	},
	loadPanorama: function(name) {
		this.light = new THREE.PointLight(0xffffff, 1, 10000, 0);
		this.light.position.set(0, 100, 0);
		this.scene.add(this.light);

		this.geometry = new THREE.SphereGeometry(10000, 60, 40);
		this.geometry.scale(-1, 1, 1);
		this.material = new THREE.MeshBasicMaterial({ map: THREE.ImageUtils.loadTexture('images/' + name + '.jpg') });
		this.mesh = new THREE.Mesh(this.geometry, this.material);
		this.scene.add(this.mesh);
	},
	clearObjects: function() {
		for (var i in this.scene.children) {
			this.scene.remove(this.scene.children[i]);
		}
		this.scene.children = [];
	},
	loadObjects: function(data) {
		for (var i in data) {
			var obj = data[i];

			var item;
			switch (obj.type) {
			case 'product':
				item = this.loadProduct(obj);
				break;
			case 'navigation':
				item = this.loadNavigation(obj);
				break;
			}

			item.position.x = obj.position.x;
			item.position.y = obj.position.y;
			item.position.z = obj.position.z;
			this.scene.add(item);

			var label = obj.label;
			if (label) {
				var textMaterial = new THREE.MeshBasicMaterial({ color: parseInt(label.color), side: THREE.DoubleSide });
				var textGeometry = new THREE.TextGeometry(obj.name ? obj.name : label.text, {
					size: label.size ? label.size : 12,
					height: obj.type == 'navigation' ? 4 : 1,
				});
				if (label.rotateX) {
					textGeometry.rotateX(label.rotateX);
				}
				if (label.rotateY) {
					textGeometry.rotateY(label.rotateY);
				}
				if (label.rotateZ) {
					textGeometry.rotateZ(label.rotateZ);
				}

				var text = new THREE.Mesh(textGeometry, textMaterial);
				text.position.x = label.position.x;
				text.position.y = label.position.y;
				text.position.z = label.position.z;
				this.scene.add(text);
			}
			this.camera.lookAt(new THREE.Vector3(obj.position.x, obj.position.y, obj.position.z));
		}
	},
	loadProduct: function(obj) {
		var itemMaterial = new THREE.MeshBasicMaterial({ color: parseInt(obj.color), side: THREE.DoubleSide });
		if (obj.opacity) {
			itemMaterial.opacity = obj.opacity;
		}
		if (obj.transparent) {
			itemMaterial.transparent = obj.transparent;
		}

		var itemGeometry = new THREE.BoxGeometry(obj.dimension.width, obj.dimension.height, obj.dimension.depth);
		if (obj.rotateX) {
			itemGeometry.rotateX(obj.rotateX);
		}
		if (obj.rotateY) {
			itemGeometry.rotateY(obj.rotateY);
		}
		if (obj.rotateZ) {
			itemGeometry.rotateZ(obj.rotateZ);
		}

		var item = new THREE.Mesh(itemGeometry, itemMaterial);
		item.name = obj.type;
		item.product = obj;
		return item;
	},
	loadNavigation: function(obj) {
		var item = arrow.clone();
		item.name = obj.type;
		if (obj.scale) {
			item.scale.x = obj.scale.x;
			item.scale.y = obj.scale.y;
			item.scale.z = obj.scale.z;
		}
		if (obj.destination) {
			item.destination = obj.destination;
		}
		if (obj.rotateX) {
			item.rotation.x = obj.rotateX;
		}
		if (obj.rotateY) {
			item.rotation.y = obj.rotateY;
		}
		if (obj.rotateZ) {
			item.rotation.z = obj.rotateZ;
		}
		return item;
	},
});

App.Overlay = React.createClass({
	render: function() {
		return (
			<div id='overlay' className='flex row'>
				<App.Topbar room={this.props.room} />
				<App.Sidebar />
			</div>
		)
	},
});

App.Topbar = React.createClass({
	render: function() {
		var center = this.props.room;
		var left = center - 1 >= 0 ? center - 1 : rooms.length - 1;
		var right = (center + 1) % rooms.length;
		return (
			<div id='topbar-container'>
				<div id='topbar'>
					<h3>{rooms[left]}</h3>
					<h1 className='pointer' onClick={this.handleLeft}>&#60;</h1>
					<h1>{rooms[center]}</h1>
					<h1 className='pointer' onClick={this.handleRight}>&#62;</h1>
					<h3>{rooms[right]}</h3>
				</div>
			</div>
		)
	},
	handleLeft: function(event) {
		dispatcher.dispatch({ type: 'left' });
	},
	handleRight: function(event) {
		dispatcher.dispatch({ type: 'right' });
	},
});

App.Sidebar = React.createClass({
	render: function() {
		var product = this.state.product;
		if (!product) {
			return null;
		}
		return (
			<div id='sidebar'>
				<div id='sidebar-close' onClick={this.handleClose}>X</div>
				<h2>{product.category}</h2>
				<h1>{product.name}</h1>
				<h2>{product.material}</h2>
				<ul>{
					product.features.map(function(feature, i) {
						return <li key={i}>{feature}</li>;
					})
				}</ul>
				<h1>${product.price}</h1>
			</div>
		)
	},
	getInitialState: function() {
		return { product: null };
	},
	componentDidMount: function() {
		this.listenerID = dispatcher.register(function(payload) {
			switch (payload.type) {
			case 'clickedProduct':
				this.setState({ product: payload.product });
				break;
			}
		}.bind(this));
	},
	componentWillUnmount: function() {
		dispatcher.unregister(this.listenerID);
	},
	handleClose: function(event) {
		event.preventDefault();

		this.setState({ product: null });
	},
});

ReactDOM.render(<App />, document.getElementById('root'));
