let signalStart = document.querySelector("#signal-start");
let noiseStart = document.querySelector("#noise-start");
let windowLength = document.querySelector("#windowLength");
let noiseCheckbox = document.querySelector("#noise-fourier");
let noiseDiv = document.querySelector("#noise-div");
let uploadButtonTop = document.querySelector("#upload-button-top");
let uploadInput = document.querySelector('#upload-input');
let optionsDiv = document.querySelector("#options-menu");
let windowButton = document.querySelector("#window-signal-button");
let signalButton = document.querySelector("#whole-signal-button");
let computeFourier = document.querySelector("#compute-fourier-button");
let optionsDivActive = false;

signalButton.addEventListener('click', () => {
    calculateFourier('signal')
})

computeFourier.addEventListener('click', () => {
    calculateFourier('window')
})


windowButton.addEventListener("click", (event) => {

    if (optionsDivActive) {
        optionsDiv.classList.remove('active');
        optionsDivActive = false;
        
    }
    else {
        optionsDiv.classList.add('active');
        optionsDivActive = true;
    }
})

noiseCheckbox.addEventListener("change", (event) => {
    let noiseCheckboxChecked = event.target.checked;

    if (noiseCheckboxChecked) {
        noiseDiv.classList.add('active');
    }
    else {
        noiseDiv.classList.remove('active');
    }
})



uploadButtonTop.addEventListener('click', function() {
    uploadInput.click();
});

uploadInput.addEventListener('change', function(event) {



    const mseedFile = uploadInput.files[0];
    
    const chunkSize = 1024 * 1024;
    let offset = 0;

        // Create a new FormData object
    const formData = new FormData();

    formData.append('file', mseedFile);
    formData.append('view-page', 'fourier');

    fetch('/upload-mseed-file', {
        method: 'POST',
        body: formData
      })
    .then(response => { 
        if (response.ok) {
            return response.json();
        }
        else {
            return response.json().then(data => {
                alert('Error: ' + data['error-message']);
                throw new Error(data['error-message']);
            })
        }
    })
    .then(mseedData => {
        if (mseedData['warning-message']) {
            alert('Warning: ' + mseedData['warning-message']);
        }
        let convertedMseedData = prepareTracesList(mseedData);
        initializeParameters();
        createNewPlot(convertedMseedData);
    })
    .catch(error => {
        // Handle any errors during the upload process
        console.error('Error uploading MSeed file:', error);
    });
})


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


function initializeParameters() {
    
    config = {
        scrollZoom: true,
        responsive: true,
        displayModeBar: true,
        modeBarButtons: [['pan2d', 'zoom2d', 'resetScale2d', 'resetViews', 'toggleSpikelines']]
    };
    
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

    
}

function createNewPlot(tracesList) {
    
    Plotly.newPlot('time-signal', tracesList, layout, config);
}



function calculateFourier(where) {
   
    fetch(`/compute-fourier?where=${where}`)
    .then(response => {response.json()})
    .then()

}