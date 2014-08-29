function render(sortby) {

	// since render can get called multiple times,
	// empty out the svg each time
	$('.main-svg').remove();

	// sort by awesomeness if (for some reason) no sortby is passed
	var sortby = sortby || 'awesome';

	// get window height so SVG is full-height
	var WINDOWHEIGHT = parseInt(window.innerHeight);

	// returns true for ski areas that have enough data for meaningful visualization
	function isComplete(area) {
		if (area.expert === undefined) area.expert = 0;
		if (area.advanced === undefined) area.advanced = 0;
		if (area.yearlySnowfall === undefined ) area.yearlySnowfall = 0;
		return ( area.state && area.top && area.base && area.skiableAcres );
	}

	// set data to filtered array
	var data = skiAreaList.filter(isComplete)

	// returns the list of ski areas in a given state:
	function selectByState(skiAreaList,state){
		return skiAreaList.filter( function(skiArea){return skiArea.state === state;} )
	}
	
	console.log("number of areas: ", data.length)
	// Type in whatever state you want!
	var selectedState = "California"
	data = selectByState(data,selectedState);
	console.log("ski areas in "+selectedState, data);
	console.log("number of areas in "+selectedState, data.length);

	// sort array by snowfall
	if (data.length === 0) alert("no ski areas in this state!");
	else var sortedSnowfall = data.sort(function(a,b) {return a.yearlySnowfall - b.yearlySnowfall; });

	// number value of lowest snowfall is first item in sorted array
	var lowestSnow = sortedSnowfall[0].yearlySnowfall;

	var SNOWCONSTANT = 0.1;

	// make an array with a certain length to use as snowfall data
	//  ... new Array(3) would make [,,]
	//  ... scale by reducing snow values by lowestSnow to normalize
	//  ... include width (2 * acres / top - bottom) to increase density over wide mountains
	//  ... SNOWCONSTANT keeps number manageable
	var makeSnowFall = (function() {
		for (var i=0; i<data.length; i++) {
			data[i].snowfall = new Array(
				Math.floor(
					(data[i].yearlySnowfall - lowestSnow) * (data[i].skiableAcres / (data[i].top - data[i].base)) * SNOWCONSTANT + 1
				)
			)
		}
	})();

	// awesomeness constants
	var SNOWFALLSCALE = 10
	var EXPERTSCALE = 40
	var ADVANCEDSCALE = EXPERTSCALE
	var ACRESSCALE = 0.8
	var VERTSCALE = 1


	// mountain building & snowflake constants
	var SVG_HEIGHT = WINDOWHEIGHT
	var AWESOMESCALE = 500
	var XSCALE = 200
	var WIDTHSCALE = 200
	var SVG_WIDTH = XSCALE * data.length + 100
	var YHEIGHT = SVG_HEIGHT
	var HEIGHTSCALE = .2

	// FUNCTION TO DETERMINE HOW AWESOME EACH MOUNTAIN IS
	//	... normalize numbers using constants
	function makeAwesomeness(skiArea){
	  var n = ACRESSCALE * skiArea.skiableAcres
	  	+ SNOWFALLSCALE * skiArea.yearlySnowfall 
	  	+ EXPERTSCALE * skiArea.expert 
	  	+ ADVANCEDSCALE * skiArea.advanced
	  	+ VERTSCALE * (skiArea.top - skiArea.base)
	  return n / AWESOMESCALE;
	}

	// store `awesomeness` as a value in data array
	// ... awesomeness is a number generated by makeAwesome()
	for (i=0;i<data.length;i++) {
	  data[i].awesomeness = makeAwesomeness(data[i]);
	}

	// sort array by `awesomeness` so mtns are in order
	// ... left to right, by most to least awesome
	if (sortby === 'awesome') {
		data.sort(function(a,b) {
			return b.awesomeness - a.awesomeness;
		})
	}
	else if (sortby === 'snowfall') {
		data.sort(function(a,b) {
			return b.yearlySnowfall - a.yearlySnowfall;
		});
	}
	else if (sortby === 'difficult') {
		data.sort(function(a,b) {
			console.log(b)
			return (b.advanced + b.expert) - (a.advanced + a.expert);
		})
	}
	else if (sortby === 'area') {
		data.sort(function(a,b) {
			return b.skiableAcres - a.skiableAcres;
		})
	}

	// SVG points to make triangles
	// ... save to data[i]
	// ... bottom left, bottom right, top center
	for(i=0;i<data.length;i++){
		var width = (2 * data[i].skiableAcres / (data[i].top - data[i].base)) * WIDTHSCALE;
	  data[i].points=[
		  {x: i * XSCALE, y: YHEIGHT },
		  {x: i * XSCALE + width, y: YHEIGHT },
		  {x: i * XSCALE + (width / 2), y: YHEIGHT - (data[i].top - data[i].base) * HEIGHTSCALE }
	  ]
	}

	var svg = d3.select('body')
		.append('svg')
		.attr('class', 'main-svg')
		.attr('width', SVG_WIDTH)
		.attr('height', SVG_HEIGHT)

	// ------------------------ MAKE TRIANGLE MOUNTAINS ------------------------
	var mtns = svg.selectAll('polygon')
		.data(data)
		.enter()
		.append('polygon')
		.attr('points', function(d) {
			return d.points.map(function(item) { 
				// use previously created points array to populate 'points' attribute
				return [item.x,item.y].join(',');
			}).join(' ');
		})
		// fill each mountain with color
		// ... more blue = more advanced
		// ... more green = more easy
		// ... 70% opacity
		.attr('fill', function(d) {
			return 'rgba(0, ' + Math.round( (100 - (d.advanced + d.expert)) * 2.55) + ',' + Math.round((d.advanced + d.expert) * 2.55) + ' , .7)'
		});

	// ------------------------ MAKE MOUNTAIN TITLE TEXT ------------------------
	var YSHIFT = (WINDOWHEIGHT-100)/data.length;
	var text = svg.selectAll('text')
		.data(data)
		.enter()
		.append('text')
		.text(function(d) {
			return d.name
		})
		.attr('x', function(d, i) {
			return XSCALE * i +50
		})
		// each label will be YSHIFT below the last to avoid stacking
		.attr('y', function(d, i) {
			return YSHIFT * i + 50
		})
		// css stuff...
		.attr('font-family', 'Open Sans')
		.style('text-transform', 'uppercase')
		.style('letter-spacing', '2px')
		.style('font-size', '13px')
		.attr('fill', '#555')



	// ------------------------ DISPLAY SKI AREA INFO (on hover) ------------------------
	var infoBox = d3.select('body')
		.selectAll('.info')
		.data(data)
		.enter()
		.append('p')
		.attr('class', 'info')
		.attr('style', function(d, i) {
			// console.log(XSCALE, i)
			return 'left: ' + (XSCALE * i + XSCALE/2) + 'px; top: ' + d.points[2].y + 'px;'
		})
		.html(function(d) {
			// console.log(d)
			return 'Yearly snowfall: ' + d.yearlySnowfall + ' inches<br>Skiable acres: ' + d.skiableAcres 
		})


	// ------------------------ MAKE SNOW FALL! ------------------------
	var interval = 4000;

	// for each mountain...
	setInterval(function() {
		for (var j=0, len=data.length; j<len; j++) {

			// snowflake constructor (kinda)
			// makes circles with...
			// 	- class 'snow'
			// 	- random radius between 5 and 15
			// 	- random x-coordinate (within mtn width)

				var snowflake = svg.selectAll('.snow')
					.select('.snow')
					// data creates 2 response variables that are passed into all callback functions
					.data(data[j].snowfall)
					.enter()
					.append('circle')
					.attr('class', 'snow')
					.attr('fill', 'white')
					.attr('r', function(d) {
						var x = Math.random();
						// radius is usually a random number between 3 and 6
						if (x > 0.02) {
							return Math.round(Math.random()*3+2)
						}
						// rarely...
						else if (x > .0005 ) {
							return 7
						}
						else if (x > .000005) {
							return 10
						}
						else if (x > .0000001) {
							return 15
						}
						// snow can start sooner w/o big flakes... :(
						// else {
						// 	// 1 in 10000000 snowflakes... 
						// 	return 600
						// }
					})
					.attr('cx', function() {
						// snow falls at any random x-value within its mountain's width
						var width = (XSCALE * data[j].skiableAcres)/((data[j].top-data[j].base))
						var randomWidth = Math.random()*width
						return (XSCALE * j + randomWidth)
					})
					// start snow at -600 px, since huge snowflake has that radius
					.attr('cy', '-40')
					.transition()
					.ease('linear')
					.duration(interval)
					// d represents the first data response variable (data value at i)
					// i represents the 2nd data response variable (iteration/index)
					.delay(function(d, i) {
						return Math.random() * interval * 1.5 / data[j].snowfall.length * i
					})
					.style('opacity', '0')
					// position at end of animation
					.attr('cy', function() {
						return SVG_HEIGHT - 200
					})
					// because snowflakes are created on an interval,
					// remove them at the end of their animation to free up memory
					.each('end', function() {
						this.remove()
					})

		}
	}, interval/2)
}


$(function() {

	render('awesome');
	
	// ------------------------ PUT LAST .sink LABEL AT FAR RIGHT ------------------------
	var DOCWIDTH = parseInt($(document).width());
	$('.key.sink').width(DOCWIDTH - 450)
	$('.sink.right').css('left', DOCWIDTH - 180 + 'px')

	// ------------------------ FAKE <SELECT> MENUS ------------------------
	$('.fake-select').change(function() {
		var val = $(this).val();
		render(val)
		$('var').text(val)
	});

});



