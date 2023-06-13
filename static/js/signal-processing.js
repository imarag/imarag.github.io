

let detrendTypeSelect = document.querySelector("#detrend-type-select");
let detrendTypeSelectExpanding = document.querySelector("#detrend-type-select-expanding");
let detrendApplyButton = document.querySelector("#detrend-apply-button");
let detrendApplyButtonExpanding = document.querySelector("#detrend-apply-button-expanding");
let detrendFormElement = document.querySelector("#detrend-form-element");
let detrendFormElementExpanding = document.querySelector("#detrend-form-element-expanding");

let taperTypeSelect = document.querySelector("#taper-type-select");
let taperTypeSelectExpanding = document.querySelector("#taper-type-select-expanding");
let taperSideSelect = document.querySelector("#taper-side-select");
let taperSideSelectExpanding = document.querySelector("#taper-side-select-expanding");
let taperLengthInput = document.querySelector("#taper-length-input");
let taperLengthInputExpanding = document.querySelector("#taper-length-input-expanding");
let taperApplyButton = document.querySelector("#taper-apply-button");
let taperApplyButtonExpanding = document.querySelector("#taper-apply-button-expanding");
let taperFormElement = document.querySelector("#taper-form-element");
let taperFormElementExpanding = document.querySelector("#taper-form-element-expanding");

let trimLeftSideInput = document.querySelector("#trim-left-side-input");
let trimLeftSideInputExpanding = document.querySelector("#trim-left-side-input-expanding");
let trimRightSideInput = document.querySelector("#trim-right-side-input");
let trimRightSideInputExpanding = document.querySelector("#trim-right-side-input-expanding");
let trimApplyButton = document.querySelector("#trim-apply-button");
let trimApplyButtonExpanding = document.querySelector("#trim-apply-button-expanding");
let trimFormElement = document.querySelector("#trim-form-element");
let trimFormElementExpanding = document.querySelector("#trim-form-element-expanding");

let processingPillsContainer = document.querySelector("#processing-pills-container")

let allFilterPills = [];

detrendTypeSelect.addEventListener('change', () => {
    detrendTypeSelectExpanding.value = detrendTypeSelect.value;
})

detrendTypeSelectExpanding.addEventListener('change', () => {
    detrendTypeSelect.value = detrendTypeSelectExpanding.value;
})

taperTypeSelect.addEventListener('change', () => {
    taperTypeSelectExpanding.value = taperTypeSelect.value;
})

taperTypeSelectExpanding.addEventListener('change', () => {
    taperTypeSelect.value = taperTypeSelectExpanding.value;
})

taperSideSelect.addEventListener('change', () => {
    taperSideSelectExpanding.value = taperSideSelect.value;
})

taperSideSelectExpanding.addEventListener('change', () => {
    taperSideSelect.value = taperSideSelectExpanding.value;
})

taperLengthInput.addEventListener('change', () => {
    taperLengthInputExpanding.value = taperLengthInput.value;
})

taperLengthInputExpanding.addEventListener('change', () => {
    taperLengthInput.value = taperLengthInputExpanding.value;
})

trimLeftSideInput.addEventListener('change', () => {
    trimLeftSideInputExpanding.value = trimLeftSideInput.value;
})

trimLeftSideInputExpanding.addEventListener('change', () => {
    trimLeftSideInput.value = trimLeftSideInputExpanding.value;
})

trimRightSideInput.addEventListener('change', () => {
    trimRightSideInputExpanding.value = trimRightSideInput.value;
})

trimRightSideInputExpanding.addEventListener('change', () => {
    trimRightSideInput.value = trimRightSideInputExpanding.value;
})

detrendFormElement.addEventListener('submit', applyGETRequest);
detrendFormElementExpanding.addEventListener('submit', applyGETRequest);
taperFormElement.addEventListener('submit', applyGETRequest);
taperFormElementExpanding.addEventListener('submit', applyGETRequest);
trimFormElement.addEventListener('submit', applyGETRequest);
trimFormElementExpanding.addEventListener('submit', applyGETRequest);

let spinnerDiv = document.querySelector("#spinner-div");

let uploadButtonBottom = document.querySelector("#upload-button-bottom");
let loadButtonBottom = document.querySelector("#load-button-bottom");
let uploadInput = document.querySelector('#upload-input');
let uploadFileParagraph = document.querySelector("#upload-file-paragraph");

let waveformColors = ['#FFF256', '#6495ED', '#FF5677', '#DAF7A6', '#FFFFFF']
let config;
let layout;


// disabled all forms at the beginning
let allForms = document.querySelectorAll('form');
allForms.forEach(function(form) {
    let formElements = form.elements;
    for (var i = 0; i < formElements.length; i++) {
      formElements[i].disabled = true;
    }
})

// display none for the spinner at the beginning
spinnerDiv.style.display = 'none';

// upload button clicked
uploadButtonBottom.addEventListener('click', function() {
    uploadInput.click();
});

// when the user uploads a file what will happen
uploadInput.addEventListener('change', function(event) {

    // display the paragraph with the upload buttons, none
    uploadFileParagraph.style.display = 'none';

    // get the first file that the user selected
    const mseedFile = uploadInput.files[0];
    
    const chunkSize = 1024 * 1024;
    let offset = 0;

    // Create a new FormData object
    const formData = new FormData();

    // display block for the spinner while the waveform is being fetched and plotted
    spinnerDiv.style.display = 'block';

    // append the file that the user uploaded and a string indicating the page that triggered the mseed upload (check the flask server)
    formData.append('file', mseedFile);
    formData.append('view-page', 'signal-processing');

    // now use a post request to upload the file at the server at the URL /upload-mseed-file
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
                // spinner display none if something wrong
                spinnerDiv.style.display = 'none';
                throw new Error(data['error-message']);
            })
        }
    })
    .then(mseedData => {
        // spinner display block if everything ok
        spinnerDiv.style.display = 'none';
        // remove disable condition from form elements
        allForms.forEach(function(form) {
            let formElements = form.elements;
            for (var i = 0; i < formElements.length; i++) {
              formElements[i].disabled = false;
            }
        })
        createNewPlot(mseedData);
    })
    .catch(error => {
        // show the toast message
        showToastMessage('Error: ' + error);
        console.error('Error uploading MSeed file:', error);
    });
})

// create a function to show the toast message
function showToastMessage(message) {
    var toastElement = document.querySelector('#liveToast');
    var toastBodyElement = document.querySelector('#toast-body');
    toastBodyElement.textContent = message;
    var toast = new bootstrap.Toast(toastElement);
    toast.show();
}


function applyGETRequest(event) {
    event.preventDefault(); // Prevent the default form submission
    let pillText;
    // get the form that triggered the function
    let formElement = event.target;
    // get its action url
    let formActionURL = new URL(formElement.action);
    // get just the /my-form-url without the server name attached at the start of the url
    formActionURL = formActionURL.pathname;
    
    // create a form data object
    var formData = new FormData(formElement);
    // create a query string from the form elements
    var queryString = new URLSearchParams(formData).toString();
    // activate the spinner
    spinnerDiv.style.display = 'block';
    
    if (formActionURL === '/apply-processing-detrend') {
        pillText = `detrend-${formData.get('detrend-type-select')}`;
    }
    else if (formActionURL === '/apply-processing-taper') {
        pillText = `taper-${formData.get('taper-type-select')}-${formData.get('taper-side-select')}-${formData.get('taper-length-input')}`;
    }
    else {
        pillText = `trim-${formData.get('trim-left-side-input')}-${formData.get('trim-right-side-input')}`;
    }
    console.log(pillText);
    // do a fetch get request
    fetch(`${formActionURL}?` + queryString)
    .then(response => { 
            if (response.ok) {
                let responseData = response.json();
                return responseData;
            }
            else {
                return response.json().then(data => {
                    // spinner display none if something wrong
                    spinnerDiv.style.display = 'none';
                    throw new Error(data['error-message']);
                })
            }
        })

        .then(mseedData => {
            // deactivate spinner
            spinnerDiv.style.display = 'none';
            let newProcessingPillColumn = document.createElement('div');
            newProcessingPillColumn.className = 'col-auto';
            let newProcessingPillButton = document.createElement('button');
            newProcessingPillButton.addEventListener('click', () => {
                deletePillFilter(newProcessingPillColumn, newProcessingPillButton);
            });
            let newProcessingPillSpan = document.createElement('span');
            newProcessingPillButton.className = 'btn btn-primary fs-6';
            newProcessingPillSpan.className = 'ms-1 text-dark fw-bold';
            newProcessingPillButton.textContent = pillText;
            newProcessingPillSpan.textContent = 'X';
            newProcessingPillButton.appendChild(newProcessingPillSpan)
            processingPillsContainer.appendChild(newProcessingPillColumn);
            newProcessingPillColumn.appendChild(newProcessingPillButton);
            allFilterPills.push(newProcessingPillButton);
            createNewPlot(mseedData);
        })
        .catch(error => {
            spinnerDiv.style.display = 'none';
            // show the toast message
            showToastMessage('Error: ' + error);
            console.error('Error uploading MSeed file:', error);
        });       
}



function deletePillFilter(elementToDelete, pillButton) {
    
    let pillText = pillButton.textContent;
    console.log(allFilterPills);
    allFilterPills = allFilterPills.filter((bt) => bt !== pillButton);
    console.log(allFilterPills);
    let allActiveFiltersString = '';
     allFilterPills.forEach((bt) => {
        allActiveFiltersString += bt.textContent.slice(0, -1) + ' ';
    })
    processingPillsContainer.removeChild(elementToDelete);
    spinnerDiv.style.display = 'block';
    console.log(allActiveFiltersString);
    fetch(`/delete-applied-filter?filter=${allActiveFiltersString}`)
    .then(response => { 
            if (response.ok) {
                let responseData = response.json();
                return responseData;
            }
            else {
                return response.json().then(data => {
                    // spinner display none if something wrong
                    spinnerDiv.style.display = 'none';
                    throw new Error(data['error-message']);
                })
            }
        })

        .then(mseedData => {
            // deactivate spinner
            spinnerDiv.style.display = 'none';
            createNewPlot(mseedData);
        })
        .catch(error => {
            spinnerDiv.style.display = 'none';
            // show the toast message
            showToastMessage('Error: ' + error);
            console.error('Error uploading MSeed file:', error);
        }); 

}


function createNewPlot(mseedDataObject) {

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

    let tracesList = [];
    let metr = 1;
    for (tr in mseedDataObject) {
        tracesList.push(
            { 
                x: mseedDataObject[tr]['xdata'], 
                y: mseedDataObject[tr]['ydata'], 
                type: 'scatter', 
                mode: 'lines', 
                name: `Channel: ${mseedDataObject[tr]['stats']['channel']}`, 
                xaxis:`x${metr}`, 
                yaxis: `y${metr}`,
                line: {color: waveformColors[metr-1]}
            }
    );
        metr += 1;
    };

    Plotly.newPlot('graph', tracesList, layout, config);
}










// detrendButton.addEventListener('click', () => { 
//     processGETRequest(
//         'detrend', {"detrend-type": detrendType.value}
//     ) 
// });
// taperButton.addEventListener('click', () => { 
//     processGETRequest(
//         'taper', {"taper-type": taperType.value, "taper-side": taperSide.value, "taper-length": taperLength.value}
//     ) 
// });
// trimButton.addEventListener('click', () => { 
//     processGETRequest(
//         'trim', {"trim-left-side": trimLeftSide.value, "trim-right-side": trimRightSide.value}
//     ) 
// });



// function processGETRequest(method, methodObject) {
//     console.log(methodObject);
//     let URLFromObject = '';
//     for (item in methodObject) {
//         URLFromObject += `&${item}=${methodObject[item]}`;
//     }
//     console.log(URLFromObject);
//     fetch(`/apply-processing?method=${method}&${URLFromObject}`)
//     .then(response => { 
//         if (response.ok) {
//             return response.json();
//         }
//         else {
//             return response.json().then(data => {
//                 spinnerDiv.style.display = 'none';
//                 alert('Error: ' + data['error-message']);
//                 throw new Error(data['error-message']);
//             })
//         }
//     })
//     .then(mseedData => {
//         spinnerDiv.style.display = 'none';
//         if (mseedData['warning-message']) {
//             alert('Warning: ' + mseedData['warning-message']);
//         }

//         let convertedMseedData = prepareTracesList(mseedData);
//         initializeParameters();
//         createNewPlot(convertedMseedData);
//     })
//     .catch(error => {
//       // Handle any errors during the upload process
//       console.error('Error uploading MSeed file:', error);
//     });
// }






























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

