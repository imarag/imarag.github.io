
let verticalLinesList;
let annotationsList;
let annotationsText = ['P', 'S'];
let PSArrivalValues;
let currentSelectedWave = 'P';
let wavesPicked;
let layout;

let buttonRemoveP = document.querySelector("#button-remove-p");
let buttonRemoveS = document.querySelector("#button-remove-s");
let buttonPWave = document.querySelector("#button-p-wave");
let buttonSWave = document.querySelector("#button-s-wave");
let selectFilter = document.querySelector("#filter");
let leftFilter = document.querySelector("#left-filter");
let rightFilter = document.querySelector("#right-filter");
let uploadButtonTop = document.querySelector("#upload-button-top");
let uploadButtonBottom = document.querySelector("#upload-button-bottom");
let uploadInput = document.querySelector('#upload-input')
let saveArrivals = document.querySelector("#save-arrivals");

let listDisabled = [
    buttonPWave, buttonSWave, selectFilter, 
    leftFilter, rightFilter, saveArrivals
];

buttonPWave.style.backgroundColor = "#333";

let config = {
    
    scrollZoom: true,
    responsive: true,
    displayModeBar: true,
    modeBarButtons: [['pan2d', 'zoom2d', 'resetScale2d', 'resetViews', 'toggleSpikelines']]
    
};


saveArrivals.addEventListener('click', function() {
    if (!PSArrivalValues['P'] && !PSArrivalValues['S']) {
        alert("You must select at least one arrival to use this option!");
    }
    else {
        let text = `The arrivals saved are: P --> ${PSArrivalValues['P']} and S --> ${PSArrivalValues['S']}`
        alert(text);
    }
})

uploadButtonTop.addEventListener('click', function() {
    uploadInput.click();
  });

uploadButtonBottom.addEventListener('click', function() {
uploadInput.click();
});

uploadInput.addEventListener('change', function(event) {

    let uploadFileParagraph = document.querySelector("#upload-file-paragraph");
    
    uploadFileParagraph.style.display = 'none';

    const mseedFile = uploadInput.files[0];
    
    const chunkSize = 1024 * 1024;
    let offset = 0;

        // Create a new FormData object
    const formData = new FormData();

    // Append the MSeed file to the FormData object
    formData.append('file', mseedFile);

    fetch('/upload-mseed-file', {
        method: 'POST',
        body: formData
      })
        .then(response => response.json())
        .then(mseedData => {
            console.log(mseedData);
            let convertedMseedData = prepareTracesList(mseedData);
            createNewPlot(convertedMseedData);
        })
        .catch(error => {
          // Handle any errors during the upload process
          console.error('Error uploading MSeed file:', error);
        });
})





selectFilter.addEventListener('change', () => {
    applyFilterPost(selectFilter.value);
})

leftFilter.addEventListener('keydown', (e) => {
    if (e.key == "Enter"){ 
        applyFilterPost(leftFilter.value + '-' + rightFilter.value);
    }
})

rightFilter.addEventListener('keydown', (e) => {
    if (e.key == "Enter"){ 
        applyFilterPost(leftFilter.value + '-' + rightFilter.value);
    }
})

buttonPWave.addEventListener('click', () => {
    currentSelectedWave = 'P';
    buttonPWave.style.backgroundColor = "#333";
    buttonSWave.style.backgroundColor = "#6c757d";
    
});

buttonSWave.addEventListener('click', () => {
    currentSelectedWave = 'S';
    buttonSWave.style.backgroundColor = "#333";
    buttonPWave.style.backgroundColor = "#6c757d";
});

buttonRemoveP.addEventListener('click', () => {
    
    buttonRemoveP.disabled = true;
    buttonPWave.style.backgroundColor = '#333';
    buttonSWave.style.backgroundColor = '#6c757d';
    currentSelectedWave = 'P';
    PSArrivalValues['P'] = null;
    
    wavesPicked = wavesPicked.filter(item => item !== 'P');
    
    if (wavesPicked.length === 0) {
        buttonSWave.style.backgroundColor = '#6c757d';
    }

    let newVerticalLinesList = [];
    let newAnnotationsList = [];

    verticalLinesList.forEach(function(item, index){
    if (item.which != 'P') {
        newVerticalLinesList.push(item);
    }
    });
    
    annotationsList.forEach(function(item, index){
    if (item.which != 'P') {
        newAnnotationsList.push(item);
    }
    });

    verticalLinesList = newVerticalLinesList;
    annotationsList = newAnnotationsList;

    Plotly.relayout('graph', {
        shapes: verticalLinesList, annotations: annotationsList
    }, config)

});

buttonRemoveS.addEventListener('click', () => {
    buttonRemoveS.disabled = true;
    buttonSWave.style.backgroundColor = '#333';
    buttonPWave.style.backgroundColor = '#6c757d';
    
    currentSelectedWave = 'S';
    PSArrivalValues['S'] = null;

    wavesPicked = wavesPicked.filter(item => item !== 'S');

    if (wavesPicked.length === 0) {
        buttonPWave.disabled = false;
        buttonSWave.disabled = false;
    }

    let newVerticalLinesList = [];
    let newAnnotationsList = [];

    verticalLinesList.forEach(function(item, index){
    if (item.which != 'S') {
        newVerticalLinesList.push(item);
    }
    });
    
    annotationsList.forEach(function(item, index){
    if (item.which != 'S') {
        newAnnotationsList.push(item);
    }
    });

    verticalLinesList = newVerticalLinesList;
    annotationsList = newAnnotationsList;

    Plotly.relayout('graph', {
    shapes: verticalLinesList, annotations: annotationsList
    }, config)
});


function prepareTracesList(mseedDataObject) {
    let xData;
    let yData;
    let tracesList = [];
    let metr = 1;
    for (tr in mseedDataObject) {
        tracesList.push(
            { 
                x: mseedDataObject[tr]['xdata'], 
                y: mseedDataObject[tr]['ydata'], 
                type: 'scatter', 
                mode: 'lines', 
                name: `Channel: ${mseedDataObject[tr]['stats']['channel']}` , 
                xaxis:`x${metr}`, 
                yaxis: `y${metr}`,
                line: {color: '#367AFA'}
            }
    );
        metr += 1;
    };
    return tracesList;
}


function applyFilterPost(filterValue) {
    fetch(`/apply-filter?filter=${filterValue}`)
    .then(response => {
        let filteredJSONData = response.json();
        console.log(filteredJSONData);
        return filteredJSONData
    })
    .then(mseedData => {
            console.log(mseedData);
            let convertedMseedData = prepareTracesList(mseedData);
            console.log(convertedMseedData);
            createNewPlot(convertedMseedData);
        })
    .catch(error => {
            console.error('Error:', error);
        });
}



function createNewPlot(tracesList) {
    verticalLinesList  = [];
    annotationsList = [];   
    wavesPicked = [];
    PSArrivalValues = {P: null, S: null};
    buttonPWave.style.backgroundColor = "#333";

    layout = {
        title: '',
        height: 900,
        grid: {rows: 3, columns: 1, pattern: 'independent'},
        shapes: [ ],
        annotations: [],
        legend: {
            font: {
            size: 20 // Adjust the font size as desired
            },
        }
    };

    for (el of listDisabled) {
        el.disabled = false;
    }

    Plotly.newPlot('graph', tracesList, layout, config).then(function(graph) {

        graph.on('plotly_doubleclick', function() {
            Plotly.d3.event.preventDefault();
        }).on('plotly_click', function(data) {
            const xClick = data.points[0].x;

            if (wavesPicked.length === 2) {
                return;
            }

            if (currentSelectedWave === 'P') {
                buttonPWave.disabled = true;
                buttonPWave.style.backgroundColor = '#6c757d';
                buttonSWave.style.backgroundColor = '#333';
                wavesPicked.push('P');
                PSArrivalValues['P'] = xClick;
            }
            else {
                buttonSWave.disabled = true;
                buttonSWave.style.backgroundColor = '#6c757d';
                buttonPWave.style.backgroundColor = '#333';
                wavesPicked.push('S');
                PSArrivalValues['S'] = xClick;
            }

            if (wavesPicked.length === 2) {
                buttonPWave.disabled = true;
                buttonSWave.disabled = true;
                buttonPWave.style.backgroundColor = '#6c757d';
                buttonSWave.style.backgroundColor = '#6c757d';
                
            }

            

            for (let i=0; i<tracesList.length; i++) {
                const yValues = tracesList[i]["y"].map(value => Number(value));
                const yMin = Math.min.apply(null, yValues);
                const yMax = Math.max.apply(null, yValues);
            verticalLinesList.push(
                {
                    type: 'line',
                    x0: xClick,
                    x1: xClick,
                    y0: yMin,
                    y1: yMax,
                    xref: `x${i+1}`,
                    yref: `y${i+1}`,
                    which: currentSelectedWave,
                    line: {color: 'black', width: 4}
                });
            
            annotationsList.push(
                {
                    x: xClick-2,
                    y: yMax/1.5,
                    xref: `x${i+1}`,
                    yref: `y${i+1}`,
                    text: currentSelectedWave,
                    which: currentSelectedWave,
                    showarrow: false,
                    font: {color: 'red', size: 40}
                });
            }


            Plotly.relayout('graph', {
            shapes: verticalLinesList, annotations: annotationsList
            }, config)

            if (currentSelectedWave == 'P') {
                currentSelectedWave = 'S';
                buttonRemoveP.disabled = false;
            }
            else {
                currentSelectedWave = 'P';
                buttonRemoveS.disabled = false;
            }

        });
    })
}

