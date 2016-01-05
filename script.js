var filePath = "figure2.txt";
var mouse2D,target = new THREE.Vector3( 0, 200, 0 );
var container,camera, scene, renderer;
var pixels= new Array(); //tableau de pixels

var pixelsRefs = new Array(); //reference vers les positions des pixels

/*** L'array qui va stocker les points du polygone ***/
var poly = new Array();

/*** Définition de l'arrête qui va stocker les infos sous forme de tableau ***/
var arretes = new Array();

/*** Controle de ce que veut faire  l'utilisateur ***/
var draw = true;
var selRot = false;

/*** Le centre de rotation  Par défaut le "milieu" de la grille ***/
var centerRot = new THREE.Vector2();

var segments = new Array(); //liste des segments obtenus par la fonction de segmentation
var dM = new Array(); //courbe

//Initialisation jQuery
$(document).ready(function(){
	init();
	readFile();
	animate();
});


function init() {
	container = document.createElement( 'div' );
	document.body.appendChild( container );
	camera = new THREE.PerspectiveCamera( 40, 1, 1, 10000 );
	camera.position.y = 705;
	scene = new THREE.Scene();
	points = new Array();
	
	// Grid
	var size = 256, step = 4;
	var geometry = new THREE.Geometry();
	for ( var i = - size; i <= size; i += step ) {
		geometry.vertices.push( new THREE.Vector3( - size, 0, i ) );
		geometry.vertices.push( new THREE.Vector3(   size, 0, i ) );
		geometry.vertices.push( new THREE.Vector3( i, 0, - size ) );
		geometry.vertices.push( new THREE.Vector3( i, 0,   size ) );
	}

	var line = new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 0.4 } ) );
	line.type = THREE.LinePieces;
	scene.add( line );
	mouse2D = new THREE.Vector3( 0, 10000, 0.5 );
	renderer = new THREE.CanvasRenderer();
	renderer.setClearColor( 0x0 );
	renderer.setSize( 1000, 800 );
	container.appendChild(renderer.domElement);

	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
	//document.addEventListener( 'mousedown', onDocumentMouseDown, false );
	document.addEventListener("keydown", onDocumentKeyDown, false);
	
	var cubeGeometry = new THREE.BoxGeometry( 3, 0, 3 );
	var cubeMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff, overdraw: 1 } );
	
	var milieuRepere = 128/2;
	
	for(var i =0;i<128;i++) //y
	{
		for(var j =0;j<128;j++) //x
		{
			var pixel = new THREE.Mesh( cubeGeometry, cubeMaterial.clone() );
			pixel.position.x = -254+4*i;
			pixel.position.z = 254-4*j;
			pixel.visible = false;
			scene.add(pixel);
			pixels.push(pixel);
			
			//ref vers le pixel crée (coordonnées x et j basées sur l'emplacement des cubes, pour avoir des positions + claires (ex : cube 0,0))
			var pixelRef = new Object();
			
			//Les points avant milieu repère (0) sont négatifs sinon +, si c'est égal au milieuRepere alors 0
			if( j< milieuRepere)
			{
				pixelRef.x = j - milieuRepere;
			}
				
				
			else if(j == milieuRepere)
			{
				pixelRef.x = 0;
			}
					
			else if( j > milieuRepere)
			{
				pixelRef.x = j - milieuRepere;
			}
			
			
			if( i< milieuRepere)
			{
				pixelRef.y = (milieuRepere - i);
			}
					
			else if(i == milieuRepere)
			{
				pixelRef.y = 0;
			}
					
			else if ( i> milieuRepere)
			{
				pixelRef.y = -(i - milieuRepere);
			}
			
				
			pixelRef.mesh = pixel;
			pixelRef.colored = false;
			
			pixelsRefs.push(pixelRef);
		}
	}
	
	/*for(var i=0; i< pixelsRefs.length;i++)
	{
		console.log("pixel : "+pixelsRefs[i].x+", "+pixelsRefs[i].y);
	} */
	
	
	
}

/**
* Fonction de segmentation
**/
function segmentation(xStart, yStart, N)
{
	dM = new Array(); //courbe
	var h,k, xk, yk, alpha, beta, gamma, delta, phi ,psi, a, b, mu, Ux, Uy, Lx, Ly;
	
	h = 0; 
	xh = xStart;
	yh = yStart;
	
	while(h < N)
	{
		movingFrame(h,k, xk, yk, alpha, beta, gamma, delta, phi ,psi, a, b, mu, Ux, Uy, Lx, Ly);
		recognizeSegment(k,xk,yk,a,b,mu);
		
		//h = k;
		//xh = xk;
		//yh = yk;
		
		//Pour minimiser le nombre de segments
		//on utilise le pixel de fin d'un segment comme debut
		//du segment suivant
		if(k == N)
			h = N;
			
		else
			h = k+1;
			xh = xk + dM[h].x;
			yh = yk + dM[h].y;
	}
	
}

/**
* Fonction pour déplacer le repère
**/
function movingFrame(h,k, xk, yk, alpha, beta, gamma, delta, phi ,psi, a, b, mu, Ux, Uy, Lx, Ly)
{
	var dx, dy, ddx, ddy;
	
	k = h;
	xk = xh;
	yk = yh;
	
	dx = dM[h+1].x;
	dy = dM[h+1].y;
	
	while (k < N && dM[k].x == dx && dM[k+1].y == dy)
	{
		l++;
		xk = xk + dM[k].x;
		yk = yk + dM[k].y;
	}
	
	var rot = rotation(xh, yh,dx,dy);
	
	if(k < N)
		adjust_axis(dx,dy, dM[k+1].x, dM[k+1].y, rot);
	
	if(dx == 0 || dy == 0)
		Lx = k -h;
	else
		Lx = 0;
	a = 1;
	b = Lx+1;
	mu = 0;
	Ly = 0;
	Ux = 0;
	Uy = 0;
}
		

/**
* Fonction de rotation(retourne un objet Rotation)
**/
function rotation(xh,yh,dx,dy)
{
	var alpha, beta, gamma, delta, phi, psi;
	
	if(dx == 1 && dy >=0)
	{
		alpha = 1; beta = 0; phi = -xh;
		gamma = 0; delta = 1; psi = -yh;
	}
	
	else if(dx <= 0 && dy == 1)
	{
		alpha = 0; beta = 1; phi = yh;
		gamma = -1; delta = 0; psi = xh;
	}
	
	else if(dx == -1 && dy <= 0)
	{
		alpha = -1; beta = 0; phi = xh;
		gamma = 0; delta = -1; psi = yh;
	}
	
	else if(dx >= 0 && dy == -1)
	{
		alpha = 0; beta = -1; phi = yh;
		gamma = 1; delta = 0; psi = -xh;
	}
	
	var rotation = new Object();
	rotation.alpha =alpha;
	rotation.beta = beta;
	rotation.gamma = gamma;
	rotation.delta = delta;
	rotation.phi = phi;
	rotation.psi = psi;
	
	return rotation;
}

/**
* Ajuster l'axe de rotation du frame selon les vecteurs ddx ddy
params = dx, dy, ddx, ddy, rot (objet rotation)
**/
function adjustAxis(dx,dy,ddx,ddy, rot)
{
	if(dy ==0 && ddx == dx && ddy == -dx)
		changeVerticalAxis(rot);

	else if(dx ==0 && ddx == dy && ddy == dy)
		changeHorizontalAxis(rot);

	else
	{
		if ((dx == dy && ddx == 0 && ddy == dy) || (dx == -dy && ddx == dx && ddy == 0))
		{
			exchangeAxis(rot);
		}
	}
}

function changeVerticalAxis(rot)
{
	if(rot.delta != 0)
	{
		rot.delta = -rot.delta;
		rot.psi = -rot.psi;
	}
	
	else if(rot.beta != 0)
	{
		rot.beta = -rot.beta;
		rot.phi = -rot.phi;
	}
}

function changeHorizontalAxis(rot)
{
	if(rot.alpha != 0)
	{
		rot.alpha = -rot.alpha;
		rot.phi = -rot.phi;
	}
	
	else if(rot.gamma != 0)
	{
		rot.gamma = -rot.gamma;
		rot.psi = -rot.psi;
	}
}

function exchangeAxis(rot)
{
	var tmp =0;
	
	tmp = rot.alpha; alpha = gamma; gamma = tmp;
	tmp = beta; beta = delta; delta = tmp;
	tmp = phi; phi = psi; psi = tmp;
}



/**Méthode pour lire les points depuis le fichier txt **/
function readFile()
{
	var urls = [filePath];
	xhrDoc= new XMLHttpRequest();   
	xhrDoc.open('GET', urls[0] , false);
	if (xhrDoc.overrideMimeType)
		xhrDoc.overrideMimeType('text/plain; charset=x-user-defined')
	xhrDoc.onreadystatechange =function()
	{
		if (this.readyState == 4)
		{
			if (this.status == 200)
		   {
				var data= this.response; //string reponse
				//console.log(data);
				
				var regX = new RegExp (/(-*[0-9]+,-*[0-9]+){1}/gi);
				var result;
				while((result = regX.exec(data)) !== null) {
					var pt = result[0]; // récuperer la paire 
					var ptVals = pt.split(","); //split la paire avec la virgule
					console.log(ptVals[0]+","+ptVals[1]);
					var x = ptVals[0];
					var y = ptVals[1];
					
					drawPixelAt(x,y,new THREE.Color(1,0,0));
					
				}

				//console.log(dataArray);
				//parcours de chaque paire de points
				
				
		   }

		}                   
	}
	xhrDoc.send();
}




function onDocumentKeyDown( event ) {
	var keyCode = ('which' in event) ? event.which : event.keyCode;
	//alert ("The Unicode key code of the released key: " + keyCode);
	switch(keyCode)
	{
		case 37 :// fleche gauche
			//effacer();
		break;
		case 38 :// fleche haut
			//drawPoly();
		break;
		case 39 :// fleche droite
			//FillPoly();
		break;
		case 40 :// fleche bas
			//rotation((Math.PI)/6, centerRot);
			//drawPoly();
			//FillPoly();
		break;

		case 66://touche b
			//bernstein(poly[0],poly[1],poly[2], 0.001);
		break;

		case 67://touche c
			//BezierComplex();
		break;

	}

}
function onDocumentMouseDown( event ) {
	event.preventDefault();
	console.log(mouse2D.y,mouse2D.x);
	
	//colorier le pixel
	drawPixel(Math.floor(mouse2D.x/1000*128),Math.floor(mouse2D.y/800*128),new THREE.Color( 1, 0, 0 ));
	
	if(draw)
	{	
		poly.push(new THREE.Vector3(Math.floor(mouse2D.x/1000*128),Math.floor(mouse2D.y/800*128),1));
	}
	if(selRot)
	{
		centerRot = new THREE.Vector2(Math.floor(mouse2D.x/1000*128),Math.floor(mouse2D.y/800*128));
	}
	//drawPixel(0,0,new THREE.Color( 1, 0, 0 ));
}

/**
* Méthode pour colorier un pixel (version un peu améliorée)
**/
function drawPixelAt(x,y,color)
{
	for(var i=0; i< pixelsRefs.length;i++)
	{
		if(pixelsRefs[i].x == x && pixelsRefs[i].y == y)
		{
			pixelsRefs[i].mesh.visible = true;
			pixelsRefs[i].mesh.material.color = color;
			pixelsRefs[i].colored = true;
			console.log("painted "+pixelsRefs[i].x+","+pixelsRefs[i].y);
		}
	}
}


//colorier pixel
function drawPixel(x,y,color){
	if(x>=0 && x<128 && y>=0 && y<128 &&Math.floor(x)==x && Math.floor(y)==y) 
		pixels[x+128*y].visible=true;
	pixels[x+128*y].material.color = color;
}


function readPixel(x,y){return pixels[x+128*y].visible;}
function animate() {requestAnimationFrame( animate );render();}
function render() {camera.lookAt( target );renderer.render( scene, camera );}
function onDocumentMouseMove( event ) {event.preventDefault();mouse2D.x = event.clientX;mouse2D.y = event.clientY;
}


