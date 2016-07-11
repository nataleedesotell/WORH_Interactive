//wrap it all in an anonymous function
(function(){
//list attributes in an array for data join / for the dropdown
var attrArray = ["Rural-Urban Continuum Codes", "NCHS Urban-Rural Classification Scheme", "Urban Influence Codes", "Index of Relative Rurality", "Frontier Communities"];
//set up initial attribute
var expressed = attrArray[0];
// dimensions of the bar graph = a function of window width
var chartWidth = window.innerWidth * 0.35,
    chartHeight = 300,
    leftPadding = 35,
    rightPadding = 5,
    topBottomPadding = 10,
    chartInnerWidth = chartWidth - leftPadding - rightPadding
    chartInnerHeight = chartHeight - topBottomPadding * 2,
    translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //will eventually be a dynamic title that changes when the user selects a new classification type
      var dynamicTitle = d3.select("body")
              .attr("x", 100)
              .attr("y", 100)
              .attr("class", "dynamicTitle")
              .attr("text-anchor", "middle");

//START PIE CHART DATA
function createPieCharts (data) {
              var width = 960,
                  height = 500,
                  radius = Math.min(width, height) / 2;

              var color = d3.scale.ordinal()
                  .range(["#98abc5", "#8a89a6", "#7b6888", "#6b486b", "#a05d56", "#d0743c", "#ff8c00"]);

              var arc = d3.svg.arc()
                  .outerRadius(radius - 10)
                  .innerRadius(0);

              var labelArc = d3.svg.arc()
                  .outerRadius(radius - 40)
                  .innerRadius(radius - 40);

              var pie = d3.layout.pie()
                  .sort(null)
                  .value(function(d) { return d.population; });

              var svg = d3.select("body").append("svg")
                  .attr("width", width)
                  .attr("height", height)
                .append("g")
                  .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

              d3.csv("data.csv", type, function(error, data) {
                if (error) throw error;

                var g = svg.selectAll(".arc")
                    .data(pie(data))
                  .enter().append("g")
                    .attr("class", "arc");

                g.append("path")
                    .attr("d", arc)
                    .style("fill", function(d) { return color(d.data.age); });

                g.append("text")
                    .attr("transform", function(d) { return "translate(" + labelArc.centroid(d) + ")"; })
                    .attr("dy", ".35em")
                    .text(function(d) { return d.data.age; });
              });

              function type(d) {
                d.population = +d.population;
                return d;
              }
            };

//END PIE CHART DATA


//yScale for chart, give the axis a domain
var yScale = d3.scale.linear()
    .range([chartHeight, 0])
    .domain([0, 12]);

//when window loads, initiate map
window.onload = setMap();

//set up the choropleth
function setMap() {
  console.log(dynamicTitle);
    //width is a function of window size
    var width = window.innerWidth * 0.5,
        height = window.innerHeight;

    // map variable, an svg element with attributes styled in style.css
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);


//set the projection for WI, equal area because choropeth
    var projection = d3.geo.albers()
        .scale(5000)
        .center([0.00, 44.437778])
        .rotate ([90.130186, 0, 0])
        .parallels([42, 46])
        .translate([width / 2, height / 2]);

        //path to draw the map
    var path = d3.geo.path()
        .projection(projection);

        //load in the data
    d3_queue.queue()
        .defer(d3.csv, "data/County_Classifications.csv")
        .defer(d3.json, "data/WI_Counties.topojson")
        .await(callback);

//set up callback function with 3
  function callback(error, csvData, wi){
    //translate WI TopoJSON using the topojson.feature() method
    var wiCounties = topojson.feature(wi, wi.objects.WI_Counties).features;
    wiCounties = joinData(wiCounties, csvData);

    //add color scale
    var colorScale = makeColorScale(csvData);
    //add enumeration units to the map
    setEnumerationUnits(wiCounties, map, path, colorScale);
    //add the chart to the map
    setChart(csvData, colorScale);
    //add the dropdown
    createDropdown(csvData);
    createPieCharts(data);
    };
};//end of setMap

//function to join our data since we brought csv/topo in separately
function joinData(wiCounties, csvData) {
    //loop through csv to assign attribute values to the counties
    for (var i=0; i<csvData.length; i++){
        //variable for the current county in topo
        var csvCounty = csvData[i];
        //variable for the csv primary key
        var csvKey = csvCounty.NAME;
        //loop through geojson regions to find correct region
        for (var a=0; a<wiCounties.length; a++){
            //the current county geojson properties
            var geojsonProps = wiCounties[a].properties;
            //the geojson primary key
            var geojsonKey = geojsonProps.NAME;
            //if primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey){
                //assign all attributes and values
                attrArray.forEach(function(attr){
                    //get csv attribute value, take it in as a string and return as a float
                    var val = parseFloat(csvCounty[attr]);
                    //assign the attribute and its value to geojson properties
                    geojsonProps[attr] = val;
                });
            };
        };
    };
    return wiCounties;
};

//function to set the enumeration units in the map
function setEnumerationUnits(wiCounties, map, path, colorScale) {
    //variable counties, styled in style.css
    var counties = map.selectAll(".counties")
        .data(wiCounties)
        .enter()
        .append("path")
        .attr("class", function(d) {
            return "counties " + d.properties.NAME;
        })
        .attr("d", path)
        //fill the counties with the choropleth colorScale
        .style("fill", function(d){
            return choropleth(d.properties, colorScale);
        })
        //when the mouse goes over an enumeration unit, call highlight function
        .on("mouseover", function(d){
            highlight(d.properties);
        })
        //when the mouse leaves an emumeration unit, clal the dehighlight function
        .on("mouseout", function(d){
            dehighlight(d.properties);
        })
        //when the mouse moves over enumeration units, call moveLabel function
        .on("mousemove", moveLabel);

//set up a variable for the dehighlight function -- what the style will return to on mouseout
    var desc = counties.append("desc")
        .text('{"stroke": "black", "stroke-width": "0.5"}');

};


//create a colorbrewer scale for the choropleth
function makeColorScale(data){
    var colorClasses = [
        "#E9E7e7",
        "#D3D0D0",
        "#BDB8B8",
        "#A7A1A1",
        "#B9BAA8",
        "#9CA185",
        "#838B69",
        "#6D7850",
        "#687056",
        "#5F6254",
        "#5F6245",
        "#4A4B47"
    ];

    //colors for 10 and 11 appear to be exactly the same in the report
    //so they are also the same here, probably need to fix that later on

    //leave a note that although we are breaking with cartographic principles
    //with so many classes in the choropleth, the retrieve function overcomes
    //that issue

    //create color scale generator,
    var colorScale = d3.scale.quantile()
        .range(colorClasses);

    //build two-value array of minimum and maximum expressed attribute values
    var minmax = [
        d3.min(data, function(d) { return parseFloat(d[expressed]); }),
        d3.max(data, function(d) { return parseFloat(d[expressed]); })
    ];
    //assign two-value array as scale domain
    colorScale.domain(minmax);

    return colorScale;
};
//function to test for data value and return color
function choropleth(props, colorScale){

    //make sure attribute value is a number
    var val = parseFloat(props[expressed]);
    //if attribute value exists, assign a color; otherwise assign gray
    if (val && val != NaN){
        return colorScale(val);
        var dynamicTitle = map.append(".dynamicTitle")
        .text("test text for dynamic title");
    } else {
        return "#CCC";

  };
};
// creates coordinated bar chart
function setChart(csvData, colorScale) {

    // creates a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    // creates a rectangle to set a background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    // sets bars for each state
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.NAME;
        })

        .attr("width", chartInnerWidth / csvData.length - 1)

        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d, i){
            return 460 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        })
        .on("mouseover", highlight)
        .on("mouseout", dehighlight)
        .on("mousemove", moveLabel);

    //below Example 2.2 line 31...add style descriptor to each rect
    var desc = bars.append("desc")
        .text('{"stroke": "none", "stroke-width": "0px"}');


    //creates a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 300)
        .attr("y", 30)
        .attr("class", "chartTitle")
        .attr("text-anchor", "middle")

    //creates vertical axis generator
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");

    //places axis on the chart
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //creates a frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    updateChart(bars, csvData.length, colorScale);
};

function createDropdown(csvData){
    //add select element
    var dropdown = d3.select("body")
        .append("select")
        .attr("class", "dropdown")
        .on("change", function(){
            changeAttribute(this.value, csvData)
        });

    //add initial option for the dropdown
    var titleOption = dropdown.append("option")
        .attr("class", "titleOption")
        .attr("disabled", "true")
        .text("Select Classification");

    //add attribute name options using attrArray
    var attrOptions = dropdown.selectAll("attrOptions")
        .data(attrArray)
        .enter()
        .append("option")
        .attr("value", function(d){ return d })
        .text(function(d){ return d });
};

function changeAttribute(attribute, csvData){
    //change the expressed attribute
    expressed = attribute;

    //recreate the color scale
    var colorScale = makeColorScale(csvData);

    //recolor enumeration units
    var counties = d3.selectAll(".counties")
        .transition()
        //almost a second of delay for smooth loading of the counties when changing attribute
        .duration(900)
        .style("fill", function(d){
            return choropleth(d.properties, colorScale)
        });

    var bars = d3.selectAll(".bar")
        //re-sort bars
        .sort(function(a, b){
            return b[expressed] - a[expressed];
        })
        .transition()
        .delay(function(d, i) {
            return i * 20
        })
        //450 millisecond delay for smooth loading
        .duration(450);

    updateChart(bars, csvData.length, colorScale);
};
//function to update the chart as the attribute changes
function updateChart(bars, n, colorScale) {
    bars.attr("x", function(d, i){
            return i * (chartInnerWidth / n) + leftPadding;
        })
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return choropleth(d, colorScale);
        })

        var chartTitle = d3.select(".chartTitle")
        .text("Rurality in the " + '"' + expressed + '"' + " System",'{"font-color": "white"}');
};

//function to highlight enumeration units and bars on mouseover
function highlight(props){
    //change stroke on mouseover
    var selected = d3.selectAll("." + props.NAME)
        .style({
            "stroke": "white",
            "stroke-width": "4"
        });
    setLabel(props);
};

function dehighlight(props) {
    var selected = d3.selectAll("." + props.NAME)
        .style({
            "stroke": function(){
                return getStyle(this, "stroke")
            },
            "stroke-width": function(){
                return getStyle(this, "stroke-width")
            }
        });
//grab the style in "desc" to restyle the county after mouseout
    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();
//set up variable styleObject to parse as string as JSON
        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
    };
    d3.select(".infolabel")
        .remove();
};

function setLabel(props) {
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr({
            //set up class named infolabel to edit style
            "class": "infolabel",
            //use the attribute NAME to label the county
            "id": props.NAME + "_label"
        })
        .html(labelAttribute);

    var countyName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.NAME);
};
//set up function for label placement as mouse moves
function moveLabel(){
    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to give the label its coordinates
    var x1 = d3.event.clientX + 10,
        y1 = d3.event.clientY - 75,
        x2 = d3.event.clientX - labelWidth - 15,
        y2 = d3.event.clientY + 20;

    //horizontal label coordinate, testing for overflow
    var x = d3.event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
    //vertical label coordinate, testing for overflow
    var y = d3.event.clientY < 75 ? y2 : y1;

    d3.select(".infolabel")
        .style({
            "left": x + "px",
            "top": y + "px"
        });


};

})(); //last line of main.js
