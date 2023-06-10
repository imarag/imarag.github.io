
let initialWaveformButton = document.querySelector("#initial-waveform-button");
let detrendButton = document.querySelector("#detrend-button");
let trimButton = document.querySelector("#trim-button");
let trimOption = document.querySelector("#trim-option");
let taperButton = document.querySelector("#taper-button");
let detrendType = document.querySelector("#detrend-type");
let taperType = document.querySelector("#taper-type");
let taperSide = document.querySelector("#taper-side");
let taperLength = document.querySelector("#taper-length");
let trimLeftSide = document.querySelector("#left-side");
let trimRightSide = document.querySelector("#right-side");
let uploadButtonTop = document.querySelector("#upload-button-top");
let uploadButtonBottom = document.querySelector("#upload-button-bottom");
let uploadInput = document.querySelector('#upload-input');
let spinnerDiv = document.querySelector("#spinner-div");

let config;
let layout;



let listDisabled = [
    detrendButton, taperButton, trimButton
];

spinnerDiv.style.display = 'none';


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
    spinnerDiv.style.display = 'block';

    formData.append('file', mseedFile);
    formData.append('view-page', 'signal-processing');

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
                spinnerDiv.style.display = 'none';
                alert('Error: ' + data['error-message']);
                throw new Error(data['error-message']);
            })
        }
    })
    .then(mseedData => {
        spinnerDiv.style.display = 'none';
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

    for (el of listDisabled) {
        el.disabled = false;
    }
}




function createNewPlot(tracesList) {
    Plotly.newPlot('graph', tracesList, layout, config);
}


detrendButton.addEventListener('click', () => { 
    processGETRequest(
        'detrend', {"detrend-type": detrendType.value}
    ) 
});
taperButton.addEventListener('click', () => { 
    processGETRequest(
        'taper', {"taper-type": taperType.value, "taper-side": taperSide.value, "taper-length": taperLength.value}
    ) 
});
trimButton.addEventListener('click', () => { 
    processGETRequest(
        'trim', {"trim-left-side": trimLeftSide.value, "trim-right-side": trimRightSide.value}
    ) 
});



function processGETRequest(method, methodObject) {
    console.log(methodObject);
    let URLFromObject = '';
    for (item in methodObject) {
        URLFromObject += `&${item}=${methodObject[item]}`;
    }
    console.log(URLFromObject);
    fetch(`/apply-processing?method=${method}&${URLFromObject}`)
    .then(response => { 
        if (response.ok) {
            return response.json();
        }
        else {
            return response.json().then(data => {
                spinnerDiv.style.display = 'none';
                alert('Error: ' + data['error-message']);
                throw new Error(data['error-message']);
            })
        }
    })
    .then(mseedData => {
        spinnerDiv.style.display = 'none';
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
}




// function sendPostRequest(postObject) {
//     fetch("/update-stream-json-file", {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(postObject)
//         })
//     .then(() => {
//             console.log('JSON file updated successfully');
//             plotData();
//         })
//     .catch(error => {
//             console.error('Error:', error);
//         });
//     }


// function plotData() {
//     fetch("/get-stream-json-file")
//         .then(response => {
//             if (response.ok) {
//                 return response.json();  // Assuming the response is JSON
                
//             } else {
//                 throw new Error('Request failed');
//             }
//         })
//         .then(data => {
        
//             let traces_list = [];
//             let x_time = [];
//             let fs = data["trace-0"]['stats']['sampling_rate'];

//             let N = data["trace-0"]["data"].length;
//             let Delta = N / fs;
//             let dt = 1 / fs;
//             for (let i=0; i<Delta; i=i+dt) {
//                 x_time.push(i);
//             }
//             let metr = 1;
//             for (k in data) {
//                 traces_list.push({ x: x_time, y: data[k]['data'], type: 'scatter', mode: 'lines', name: `Channel: ${data[k]['stats']['channel']}` , xaxis:`x${metr}`, yaxis: `y${metr}`});
//                 metr += 1;
//             }
//             console.log(data);
            
//             var layout = {
//                 title: 'Line Chart Subplots',
//                 grid: { rows: 3, columns: 1, pattern: 'independent' },
//                 height: 900
//                 };

//             Plotly.newPlot('chart', traces_list, layout);

//         })
//         .catch(error => {
//             console.error(error);
//         });
// }

